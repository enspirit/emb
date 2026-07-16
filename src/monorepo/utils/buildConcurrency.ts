import { cpus } from 'node:os';

/** Upper bound for the 'auto' setting, kept conservative for heavy builds. */
export const AUTO_CONCURRENCY_CAP = 4;

/** The 'auto' concurrency: the CPU count, capped and floored to >= 1. */
export const autoConcurrency = (): number =>
  Math.max(1, Math.min(cpus().length, AUTO_CONCURRENCY_CAP));

export type ConcurrencySetting = 'auto' | number;

/**
 * Resolve the effective build concurrency from the `--jobs` flag and the
 * `defaults.build.concurrency` config, following: flag > config > 1 (serial).
 * A setting of 'auto' resolves to {@link autoConcurrency}; a numeric setting is
 * floored and clamped to >= 1. Builds are therefore serial by default and
 * parallelism is opt-in.
 */
export const resolveBuildConcurrency = (sources: {
  jobs?: ConcurrencySetting;
  configured?: ConcurrencySetting;
}): number => {
  const setting = sources.jobs ?? sources.configured;

  if (setting === undefined) {
    return 1;
  }

  if (setting === 'auto') {
    return autoConcurrency();
  }

  return Math.max(1, Math.floor(setting));
};
