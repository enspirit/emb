import type Docker from 'dockerode';

import { createRequire } from 'node:module';

import { getContext } from '@/context.js';

/**
 * Returns the run's Docker Engine client, creating it on first use.
 *
 * dockerode drags in ssh2 and @grpc/grpc-js for transports we do not use —
 * 1.5MB of source that commands like `emb ps` (which shells out to
 * docker compose) never touch. Requiring it lazily keeps it out of the static
 * import graph.
 *
 * dockerode is CommonJS, so this can stay synchronous and callers need no
 * await. It is deliberately an accessor rather than a lazy getter on the
 * context: a getter would be re-triggered by any `{...context}` spread, which
 * would reintroduce the eager load silently.
 *
 * Cached on the context, so a client injected by tests (or by a plugin) is
 * returned as-is rather than being replaced by a real one.
 */
export const getDockerClient = (): Docker => {
  const context = getContext();

  if (context?.docker) {
    return context.docker;
  }

  const Dockerode = createRequire(import.meta.url)(
    'dockerode',
  ) as typeof import('dockerode');

  const client = new Dockerode();

  if (context) {
    context.docker = client;
  }

  return client;
};
