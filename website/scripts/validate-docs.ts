/**
 * Documentation Validator
 *
 * This script parses markdown files and executes code blocks marked with `exec`.
 * It validates that the output matches expected output blocks, combining
 * documentation with integration testing.
 *
 * Code block syntax:
 *   ```shell exec cwd="../examples"
 *   emb components
 *   ```
 *
 * Options:
 *   - exec: Mark the block for execution
 *   - cwd="path": Set working directory (relative to website/)
 *   - assert: Following output block is an assertion (fail if different)
 *   - skip: Skip execution (useful for commands that require user input)
 *
 * Output blocks:
 *   ```output
 *   Expected output here
 *   ```
 */

import { execaCommand } from 'execa';
import { mkdir, readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const websiteDir = join(__dirname, '..');

interface CodeBlock {
  type: 'code';
  lang?: string;
  meta?: string;
  value: string;
}

interface ParsedMeta {
  exec?: boolean;
  assert?: boolean;
  skip?: boolean;
  cwd?: string;
  [key: string]: string | boolean | undefined;
}

interface ValidationResult {
  file: string;
  blocks: BlockResult[];
  passed: boolean;
}

interface BlockResult {
  command: string;
  cwd?: string;
  expectedOutput?: string;
  actualOutput?: string;
  passed: boolean;
  skipped: boolean;
  error?: string;
}

function parseMeta(meta?: string | null): ParsedMeta {
  const out: ParsedMeta = {};
  if (!meta) return out;

  for (const m of meta.split(/\s+/)) {
    const eqIndex = m.indexOf('=');
    if (eqIndex > 0) {
      const k = m.slice(0, eqIndex);
      const v = m.slice(eqIndex + 1).replace(/^"|"$/g, '');
      out[k] = v;
    } else if (m) {
      out[m] = true;
    }
  }

  return out;
}

async function runCommand(cmd: string, cwd?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const result = await execaCommand(cmd, {
      cwd,
      shell: true,
      timeout: 60000, // 60 second timeout
      env: {
        ...process.env,
        NO_COLOR: '1', // Disable colors for consistent output
        FORCE_COLOR: '0',
      },
    });
    return {
      stdout: result.stdout.trimEnd(),
      stderr: result.stderr.trimEnd(),
      exitCode: result.exitCode ?? 0,
    };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; exitCode?: number; message?: string };
    return {
      stdout: execError.stdout?.trimEnd() ?? '',
      stderr: execError.stderr?.trimEnd() ?? '',
      exitCode: execError.exitCode ?? 1,
    };
  }
}

function normalizeOutput(output: string): string {
  // Normalize whitespace and line endings
  return output
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trimEnd();
}

export async function processFile(path: string): Promise<ValidationResult> {
  const src = await readFile(path, 'utf8');
  const tree = unified().use(remarkParse).parse(src);

  const result: ValidationResult = {
    file: relative(websiteDir, path),
    blocks: [],
    passed: true,
  };

  const nodes = tree.children;
  let pendingExec: { command: string; meta: ParsedMeta; cwd?: string } | undefined;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    // Check if this is an output block following an exec block
    if (pendingExec && node.type === 'code') {
      const code = node as CodeBlock;
      if (code.lang === 'output') {
        // This output block is an assertion for the pending exec
        const blockResult: BlockResult = {
          command: pendingExec.command,
          cwd: pendingExec.cwd,
          expectedOutput: code.value,
          passed: true,
          skipped: false,
        };

        if (pendingExec.meta.skip) {
          blockResult.skipped = true;
          result.blocks.push(blockResult);
        } else {
          // Run the command and compare
          const execResult = await runCommand(pendingExec.command, pendingExec.cwd);
          blockResult.actualOutput = execResult.stdout || execResult.stderr;

          const normalizedExpected = normalizeOutput(code.value);
          const normalizedActual = normalizeOutput(blockResult.actualOutput);

          if (normalizedExpected !== normalizedActual) {
            blockResult.passed = false;
            result.passed = false;
            blockResult.error = `Output mismatch:\nExpected:\n${normalizedExpected}\n\nActual:\n${normalizedActual}`;
          }

          result.blocks.push(blockResult);
        }

        pendingExec = undefined;
        continue;
      }
    }

    // If we had a pending exec without assertion, run it anyway (for side effects)
    if (pendingExec) {
      const blockResult: BlockResult = {
        command: pendingExec.command,
        cwd: pendingExec.cwd,
        passed: true,
        skipped: pendingExec.meta.skip === true,
      };

      if (!pendingExec.meta.skip) {
        const execResult = await runCommand(pendingExec.command, pendingExec.cwd);
        blockResult.actualOutput = execResult.stdout || execResult.stderr;
        if (execResult.exitCode !== 0) {
          blockResult.error = `Command failed with exit code ${execResult.exitCode}`;
          // Don't fail the whole validation for non-zero exit codes without assertions
        }
      }

      result.blocks.push(blockResult);
      pendingExec = undefined;
    }

    // Check if this is an executable code block
    if (node.type === 'code') {
      const code = node as CodeBlock;
      const lang = (code.lang ?? '').toLowerCase();
      const meta = parseMeta(code.meta);

      if (meta.exec && ['sh', 'shell', 'bash'].includes(lang)) {
        const cwd = meta.cwd ? join(websiteDir, meta.cwd as string) : websiteDir;
        pendingExec = {
          command: code.value,
          meta,
          cwd,
        };
      }
    }
  }

  // Handle any remaining pending exec
  if (pendingExec) {
    const blockResult: BlockResult = {
      command: pendingExec.command,
      cwd: pendingExec.cwd,
      passed: true,
      skipped: pendingExec.meta.skip === true,
    };

    if (!pendingExec.meta.skip) {
      const execResult = await runCommand(pendingExec.command, pendingExec.cwd);
      blockResult.actualOutput = execResult.stdout || execResult.stderr;
    }

    result.blocks.push(blockResult);
  }

  return result;
}

async function findMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentDir: string) {
    const entries = await readdir(currentDir);
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stats = await stat(fullPath);
      if (stats.isDirectory()) {
        await walk(fullPath);
      } else if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
        files.push(fullPath);
      }
    }
  }

  await walk(dir);
  return files;
}

export async function validateDocs(docsDir: string): Promise<ValidationResult[]> {
  const files = await findMarkdownFiles(docsDir);
  const results: ValidationResult[] = [];

  for (const file of files) {
    console.log(`Validating: ${relative(websiteDir, file)}`);
    const result = await processFile(file);
    results.push(result);

    // Print results for each block
    for (const block of result.blocks) {
      if (block.skipped) {
        console.log(`  ⏭ SKIP: ${block.command.split('\n')[0].slice(0, 50)}...`);
      } else if (block.passed) {
        console.log(`  ✓ PASS: ${block.command.split('\n')[0].slice(0, 50)}...`);
      } else {
        console.log(`  ✗ FAIL: ${block.command.split('\n')[0].slice(0, 50)}...`);
        if (block.error) {
          console.log(`    ${block.error.split('\n').join('\n    ')}`);
        }
      }
    }
  }

  return results;
}

// CLI entry point
if (process.argv[1] === __filename || process.argv[1]?.endsWith('/validate-docs.ts')) {
  const docsDir = join(websiteDir, 'src/content/docs');

  console.log('EMB Documentation Validator');
  console.log('===========================\n');

  validateDocs(docsDir)
    .then((results) => {
      console.log('\n===========================');
      const totalBlocks = results.reduce((sum, r) => sum + r.blocks.length, 0);
      const passedBlocks = results.reduce((sum, r) => sum + r.blocks.filter(b => b.passed).length, 0);
      const failedFiles = results.filter(r => !r.passed);

      console.log(`Files: ${results.length}`);
      console.log(`Blocks: ${passedBlocks}/${totalBlocks} passed`);

      if (failedFiles.length > 0) {
        console.log(`\nFailed files:`);
        for (const f of failedFiles) {
          console.log(`  - ${f.file}`);
        }
        process.exit(1);
      } else {
        console.log('\nAll documentation validated successfully!');
      }
    })
    .catch((error) => {
      console.error('Error validating docs:', error);
      process.exit(1);
    });
}
