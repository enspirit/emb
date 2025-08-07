import { IMonorepoConfig } from "../../src/config";

export const CompleteExample: IMonorepoConfig = {
  project: {
    name: "simple",
    rootDir: "/tmp/simple"
  },
  defaults: {
    docker: {
      tag: '${vars:dockerTag}'
    }
  },
  vars: {
    dockerTag: '${env:DOCKER_TAG:-latest}'
  },
  components: [
    // Simplest component
    {
      name: 'gateway'
    },
    // Build args
    {
      name: 'backend',
      buildArgs: {
        API_KEY: 'secret'
      }
    },
    // Docker build targets
    {
      name: 'frontend',
      target: 'development'
    }
  ],
  flavors: {
    production: {
      defaults: {
        docker: {
          tag: 'production'
        }
      },
      components: [{
        name: 'frontend',
        target: 'production'
      }]
    }
  },
}
