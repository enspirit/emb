import { RebuildTriggerConfig } from '@/config/schema.js';

export type RebuildTriggerSource = 'builtin' | 'flavor' | 'resource';

export type ResolvedRebuildTrigger = RebuildTriggerConfig & {
  source: RebuildTriggerSource;
};

export type RebuildTriggerInputs = {
  resource?: RebuildTriggerConfig;
  flavor?: RebuildTriggerConfig;
};

const BUILTIN_DEFAULT: RebuildTriggerConfig = { strategy: 'auto' };

export const resolveRebuildTrigger = (
  inputs: RebuildTriggerInputs = {},
): ResolvedRebuildTrigger => {
  if (inputs.resource) {
    return { ...inputs.resource, source: 'resource' };
  }

  if (inputs.flavor) {
    return { ...inputs.flavor, source: 'flavor' };
  }

  return { ...BUILTIN_DEFAULT, source: 'builtin' };
};
