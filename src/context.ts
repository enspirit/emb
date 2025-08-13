import { EmbContext } from './types.js';

let context: EmbContext;

export const getContext = () => {
  return context;
};

export const setContext = (ctx: EmbContext): EmbContext => {
  context = ctx;

  return ctx;
};
