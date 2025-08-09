import { IMonorepoConfig } from '@/config';

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
      tag: '${env:DOCKER_TAG}',
    },
  },
  env: {
    // eslint-disable-next-line no-template-curly-in-string
    DOCKER_TAG: '${env:DOCKER_TAG:-latest}',
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
      env: {
        DOCKER_TAG: 'production',
      },
      name: 'production',
    },
  ],
  project: {
    name: 'simple',
    rootDir: '/tmp/simple',
  },
  vars: {
    foo: 'bar',
  },
};
