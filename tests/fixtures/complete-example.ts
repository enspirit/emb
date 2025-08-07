import { IMonorepoConfig } from '../../src/config';

export const CompleteExample: IMonorepoConfig = {
  components: [
    // Simplest component
    {
      context: 'gateway',
      name: 'gateway',
    },
    // Build args
    {
      buildArgs: {
        API_KEY: 'secret',
      },
      context: 'backend',
      name: 'backend',
    },
    // Docker build targets
    {
      context: 'frontend',
      name: 'frontend',
      target: 'development',
    },
  ],
  defaults: {
    docker: {
      // eslint-disable-next-line no-template-curly-in-string
      tag: '${vars:dockerTag}',
    },
  },
  flavors: {
    production: {
      components: [
        {
          context: 'frontend',
          name: 'frontend',
          target: 'production',
        },
      ],
      defaults: {
        docker: {
          tag: 'production',
        },
      },
    },
  },
  project: {
    name: 'simple',
    rootDir: '/tmp/simple',
  },
  vars: {
    // eslint-disable-next-line no-template-curly-in-string
    dockerTag: '${env:DOCKER_TAG:-latest}',
  },
};
