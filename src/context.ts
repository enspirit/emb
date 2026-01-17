import { EmbContext } from './types.js';

let context: EmbContext;
let contextEmbRoot: string | undefined;

export const getContext = () => {
  return context;
};

export const setContext = (ctx: EmbContext): EmbContext => {
  context = ctx;
  contextEmbRoot = process.env.EMB_ROOT;

  return ctx;
};

/**
 * Check if the context's EMB_ROOT matches the current environment.
 * Used to detect when tests switch between different example monorepos.
 */
export const isContextStale = (): boolean => {
  if (!context) {
    return false;
  }

  return contextEmbRoot !== process.env.EMB_ROOT;
};

/**
 * Reset the context. Used in testing to ensure a fresh context for each test suite.
 */
export const resetContext = (): void => {
  context = undefined as unknown as EmbContext;
  contextEmbRoot = undefined;
};
