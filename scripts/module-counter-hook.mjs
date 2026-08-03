/**
 * ESM loader hook for scripts/count-modules.cjs.
 *
 * Loader hooks run on a separate thread, so counts are reported back to the
 * main thread over a MessagePort supplied at registration time.
 */
let port;

export async function initialize(data) {
  port = data.port;
}

export async function load(url, context, next) {
  const result = await next(url, context);

  if (port && result.source) {
    port.postMessage({ url, size: result.source.length });
  }

  return result;
}
