/* eslint-disable no-await-in-loop */
import { execaCommand } from 'execa';
import assert from 'node:assert';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function parseMeta(meta?: null | string | undefined) {
  const out: Record<string, string> = {};
  if (!meta) {
    return out;
  }

  for (const m of meta.split(/\s+/)) {
    const [k, v] = m.split('=');
    if (k && v) {
      out[k] = v.replaceAll(/^"|"$/g, '');
    } else if (k && !v) {
      out[k] = 'true';
    }
  }

  return out;
}

async function runBlock(cmd: string, cwd?: string) {
  const child = await execaCommand(cmd, { cwd, shell: true });
  return child.stdout.trimEnd();
}

export async function processFile(path: string, dumpTo: string) {
  const src = await readFile(path, 'utf8');
  const tree = unified().use(remarkParse).parse(src);

  const kids = tree.children;
  const newChildren: typeof kids = [];
  let previousOutputBlock:
    | ((typeof kids)[number] & { value: string })
    | undefined;

  for (const node of kids) {
    newChildren.push(node);

    // We are given an output block from the previous node
    if (previousOutputBlock) {
      // We are clearly suppoed to check it's valid compared to a previous
      // dump of this tool
      if (node.type === 'code' && node.lang === 'output') {
        assert.equal(previousOutputBlock.value, node.value);
      }

      // The code block was not included as an assertion, let's include it in the doc
      else {
        newChildren.push(previousOutputBlock);
      }
    }

    previousOutputBlock = undefined;

    if (node.type === 'code') {
      const code = node;
      const hasExec = /\bexec\b/.test(code.meta ?? '');
      const lang = (code.lang ?? '').toLowerCase();

      if (hasExec && (lang === 'sh' || lang === 'shell' || lang === 'bash')) {
        const meta = parseMeta(code.meta);
        const out = await runBlock(code.value, meta.cwd);

        previousOutputBlock = {
          type: 'code',
          lang: 'output',
          meta: 'generated',
          value: out || '(no output)',
        };
      }
    }
  }

  tree.children = newChildren;
  const out = await unified().use(remarkStringify).stringify(tree);
  await writeFile(dumpTo, out);
}

const docsDir = join(__dirname, '../docs/');
const distDocsDir = join(__dirname, '../dist/docs/');

await mkdir(distDocsDir, { recursive: true });

for (const file of await readdir(docsDir)) {
  console.log('GONNA PROCESS', file);
  await processFile(join(docsDir, file), join(distDocsDir, file));
}
