import { EmbContext } from '../types.js';

let context: EmbContext;

export const getContext = () => {
  return context;
};

export const setContext = (ctx: EmbContext) => {
  if (context) {
    throw new Error('Context already set');
  }

  context = ctx;
};
