import { UserConfig } from '@/config/types.js';

export const CompleteExample: UserConfig = {
  project: {
    name: 'simple',
    rootDir: '/tmp/simple',
  },
  plugins: [],
  tasks: {},
  vars: {
    foo: 'bar',
  },
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
  components: {
    // Simplest component
    gateway: {
      resources: {
        image: {
          type: 'docker/image',
          params: {
            context: 'gateway',
          },
        },
      },
    },
    // Build args
    backend: {
      resources: {
        image: {
          type: 'docker/image',
          params: {
            buildArgs: {
              API_KEY: 'secret',
            },
            context: 'backend',
            dependencies: ['base'],
          },
        },
      },
    },
    // Docker build targets
    frontend: {
      resources: {
        image: {
          type: 'docker/iamge',
          params: {
            context: 'frontend',
            dependencies: ['base'],
            target: 'development',
          },
        },
      },
    },
    // Base image for backend/frontend
    base: {
      resources: {
        image: {
          type: 'docker/image',
          params: {
            context: 'base',
            target: 'development',
          },
        },
      },
    },
  },
  flavors: {
    development: {
      patches: [
        {
          op: 'replace',
          path: '/components/frontend/resources/image/params/target',
          value: 'development',
        },
      ],
    },
    production: {
      patches: [
        {
          op: 'replace',
          path: '/components/frontend/resources/image/params/target',
          value: 'production',
        },
      ],
    },
  },
};
