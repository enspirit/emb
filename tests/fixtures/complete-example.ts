import { IMonorepoConfig } from '@/config';

export const CompleteExample: IMonorepoConfig = {
  components: [
    // Simplest component
    {
      name: 'gateway',
      docker: {
        context: 'gateway',
      },
    },
    // Build args
    {
      name: 'backend',
      docker: {
        buildArgs: {
          API_KEY: 'secret',
        },
        context: 'backend',
        dependencies: ['base'],
      },
    },
    // Docker build targets
    {
      name: 'frontend',
      docker: {
        context: 'frontend',
        dependencies: ['base'],
        target: 'development',
      },
    },
    // Base image for backend/frontend
    {
      name: 'base',
      docker: {
        context: 'base',
        target: 'development',
      },
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
          name: 'frontend',
          docker: {
            context: 'frontend',
            target: 'production',
          },
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
          name: 'frontend',
          docker: {
            context: 'frontend',
            target: 'production',
          },
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
