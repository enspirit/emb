import { IMonorepoConfig } from '../../src/config/index.js';

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
      dependencies: ['base'],
      name: 'backend',
    },
    // Docker build targets
    {
      context: 'frontend',
      dependencies: ['base'],
      name: 'frontend',
      target: 'development',
    },
    // Base image for backend/frontend
    {
      context: 'base',
      name: 'base',
      target: 'development',
    },
  ],
  defaults: {
    docker: {
      // eslint-disable-next-line no-template-curly-in-string
      tag: '${vars:dockerTag}',
    },
  },
  flavors: [
    {
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
      name: 'development',
    },
    {
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
      name: 'production',
    },
  ],
  project: {
    name: 'simple',
    rootDir: '/tmp/simple',
  },
  vars: {
    // eslint-disable-next-line no-template-curly-in-string
    dockerTag: '${env:DOCKER_TAG:-latest}',
  },
};
