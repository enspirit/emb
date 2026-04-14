export type WatchedPath = {
  path: string;
  mtime: number;
};

export type StrategyResult = {
  mtime: number;
  reason: string;
  watched?: WatchedPath[];
};

export type StrategyContext = {
  dockerContext: string;
  monorepoRoot: string;
};
