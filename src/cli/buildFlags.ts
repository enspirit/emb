import { Flags } from '@oclif/core';

/**
 * `--jobs`/`-j`: build up to N resources in parallel, or 'auto' (min of CPU
 * count and 4). The value is required (`-j 4`, `-j auto`); omitting the flag
 * keeps builds serial (the default is 1). Invalid values are rejected.
 */
export const jobsFlag = Flags.custom<'auto' | number>({
  char: 'j',
  description:
    "Build up to N resources in parallel, or 'auto' (min of CPU count and 4). Default: serial (1).",
  async parse(input) {
    if (input === 'auto') {
      return 'auto';
    }

    const value = Number(input);
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(
        `--jobs expects a positive integer or 'auto', got '${input}'`,
      );
    }

    return value;
  },
});

/**
 * `--keep-going`/`-k`: after a failure, keep building resources that don't
 * depend on the failed one (dependents of the failure are skipped), then report
 * all failures. Off by default (fail-fast).
 */
export const keepGoingFlag = Flags.boolean({
  char: 'k',
  description:
    'Keep building independent resources after a failure (fail-fast by default)',
});

/** Shared build-scheduling flags for build-capable commands. */
export const buildFlags = {
  jobs: jobsFlag(),
  'keep-going': keepGoingFlag,
};
