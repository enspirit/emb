import { StrategyResult } from './types.js';

export const computeAlways = (): StrategyResult => ({
  mtime: Date.now(),
  reason: 'strategy=always',
});
