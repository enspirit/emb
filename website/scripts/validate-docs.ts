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

import { spawn } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import remarkParse from 'remark-parse';
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

// Debug logging helper
const DEBUG = process.env.DEBUG_VALIDATE === '1';
function debug(msg: string) {
  if (DEBUG) {
    const timestamp = new Date().toISOString();
    console.log(`[DEBUG ${timestamp}] ${msg}`);
  }
}

const COMMAND_TIMEOUT = 30000; // 30 seconds

async function runCommand(cmd: string, cwd?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  // Handle `| head -N` specially to avoid SIGPIPE issues on Linux
  // Instead of piping, we run the command and truncate output ourselves
  const headMatch = cmd.match(/^(.+)\s*\|\s*head\s+-(\d+)$/);
  let actualCmd = cmd;
  let headLines: number | undefined;

  if (headMatch) {
    actualCmd = headMatch[1].trim();
    headLines = parseInt(headMatch[2], 10);
    debug(`Detected head pipe: will truncate to ${headLines} lines`);
  }

  debug(`Running command: ${actualCmd.slice(0, 100)}${actualCmd.length > 100 ? '...' : ''}`);
  debug(`  cwd: ${cwd}`);

  const startTime = Date.now();

  return new Promise((resolve) => {
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let killed = false;

    // Spawn with shell, completely detached stdin
    const child = spawn(actualCmd, {
      cwd,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'], // Explicitly ignore stdin
      env: {
        ...process.env,
        NO_COLOR: '1',
        FORCE_COLOR: '0',
        CI: '1',
        TERM: 'dumb',
      },
    });

    // Set up timeout
    const timeoutId = setTimeout(() => {
      debug(`  TIMEOUT: Killing process after ${COMMAND_TIMEOUT}ms`);
      killed = true;
      // Kill the entire process group
      try {
        process.kill(-child.pid!, 'SIGKILL');
      } catch {
        child.kill('SIGKILL');
      }
    }, COMMAND_TIMEOUT);

    child.stdout?.on('data', (chunk) => stdoutChunks.push(chunk));
    child.stderr?.on('data', (chunk) => stderrChunks.push(chunk));

    child.on('error', (err) => {
      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;
      debug(`  ERROR after ${elapsed}ms: ${err.message}`);
      resolve({
        stdout: '',
        stderr: err.message,
        exitCode: 1,
      });
    });

    child.on('close', (code) => {
      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;

      if (killed) {
        debug(`  KILLED after ${elapsed}ms (timeout)`);
        resolve({
          stdout: '',
          stderr: `Command timed out after ${COMMAND_TIMEOUT}ms`,
          exitCode: 124,
        });
        return;
      }

      let stdout = Buffer.concat(stdoutChunks).toString().trimEnd();
      const stderr = Buffer.concat(stderrChunks).toString().trimEnd();

      // Apply head -N truncation if needed
      if (headLines !== undefined) {
        stdout = stdout.split('\n').slice(0, headLines).join('\n');
      }

      debug(`  completed in ${elapsed}ms, exit code: ${code ?? 0}`);
      debug(`  stdout length: ${stdout.length}, stderr length: ${stderr.length}`);

      resolve({
        stdout,
        stderr,
        exitCode: code ?? 0,
      });
    });
  });
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
  debug(`Processing file: ${path}`);
  const src = await readFile(path, 'utf8');
  const tree = unified().use(remarkParse).parse(src);

  const result: ValidationResult = {
    file: relative(websiteDir, path),
    blocks: [],
    passed: true,
  };

  const nodes = tree.children;
  let pendingExec: { command: string; meta: ParsedMeta; cwd?: string } | undefined;

  debug(`  Found ${nodes.length} nodes in file`);

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    // Check if this is an output block following an exec block
    if (pendingExec && node.type === 'code') {
      const code = node as CodeBlock;
      if (code.lang === 'output') {
        debug(`  [Node ${i}] Output block following exec`);
        // This output block is an assertion for the pending exec
        const blockResult: BlockResult = {
          command: pendingExec.command,
          cwd: pendingExec.cwd,
          expectedOutput: code.value,
          passed: true,
          skipped: false,
        };

        if (pendingExec.meta.skip) {
          debug(`    Skipping (marked as skip)`);
          blockResult.skipped = true;
          result.blocks.push(blockResult);
        } else {
          debug(`    Executing command with assertion...`);
          // Run the command and compare
          const execResult = await runCommand(pendingExec.command, pendingExec.cwd);
          debug(`    Command completed`);
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
      debug(`  [Node ${i}] Processing pending exec without assertion`);
      const blockResult: BlockResult = {
        command: pendingExec.command,
        cwd: pendingExec.cwd,
        passed: true,
        skipped: pendingExec.meta.skip === true,
      };

      if (!pendingExec.meta.skip) {
        debug(`    Executing command (no assertion)...`);
        const execResult = await runCommand(pendingExec.command, pendingExec.cwd);
        debug(`    Command completed`);
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
        debug(`  [Node ${i}] Found exec block: ${code.value.slice(0, 50)}...`);
        debug(`    lang=${lang}, cwd=${cwd}, skip=${meta.skip}`);
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

  debug(`Found ${files.length} markdown files to validate`);

  for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
    const file = files[fileIdx];
    const fileStartTime = Date.now();
    console.log(`[${fileIdx + 1}/${files.length}] Validating: ${relative(websiteDir, file)}`);
    const result = await processFile(file);
    results.push(result);

    const fileElapsed = Date.now() - fileStartTime;
    debug(`  File completed in ${fileElapsed}ms`);

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
