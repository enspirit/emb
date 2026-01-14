/**
 * Documentation Integration Tests
 *
 * These tests validate that the code blocks in the documentation
 * actually work by executing them and checking their output.
 */

import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { validateDocs, processFile } from '../scripts/validate-docs.js';

const websiteDir = join(import.meta.dirname, '..');
const docsDir = join(websiteDir, 'src/content/docs');

describe('Documentation', () => {
  it('validates all executable code blocks', async () => {
    const results = await validateDocs(docsDir);

    const failures = results.flatMap(r =>
      r.blocks
        .filter(b => !b.passed && !b.skipped)
        .map(b => ({
          file: r.file,
          command: b.command,
          error: b.error,
        }))
    );

    if (failures.length > 0) {
      console.error('\nDocumentation validation failures:');
      for (const f of failures) {
        console.error(`\n${f.file}:`);
        console.error(`  Command: ${f.command}`);
        console.error(`  Error: ${f.error}`);
      }
    }

    expect(failures).toHaveLength(0);
  });
});

describe('Getting Started', () => {
  it('first-monorepo examples work', async () => {
    const result = await processFile(join(docsDir, 'getting-started/first-monorepo.md'));
    expect(result.passed).toBe(true);
  });
});

describe('Day to Day', () => {
  it('managing-components examples work', async () => {
    const result = await processFile(join(docsDir, 'day-to-day/managing-components.md'));
    expect(result.passed).toBe(true);
  });
});
