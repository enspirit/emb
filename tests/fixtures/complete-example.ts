import { Config } from "../../src/config";

export const CompleteExample: Config = {
  project: {
    name: "simple",
    rootDir: "/tmp/simple"
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
      components: [{
        name: 'frontend',
        target: 'production'
      }]
    }
  }
}
