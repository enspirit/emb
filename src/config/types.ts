import { EMBConfigSchema, Task } from './schema.js';

export type UserConfig = EMBConfigSchema;

export type IProjectConfig = {
  name: string;
  rootDir: string;
};

export type ComponentConfig = {
  buildArgs?: Record<PropertyKey, string>;
  context: string;
  dependencies?: Array<string>;
  dockerfile?: string;
  labels?: Record<string, string>;
  name: string;
  target?: string;
  tasks?: Array<Task>;
};

export type DefaultSettings = {
  docker?: {
    buildArgs?: Record<string, unknown>;
    labels?: Record<string, string>;
    tag?: string;
    target?: string;
  };
};

export type FlavorConfig = {
  components?: Array<ComponentConfig>;
  defaults?: DefaultSettings;
};

export type IMonorepoConfig = {
  components: Array<ComponentConfig>;
  defaults?: DefaultSettings;
  env?: Record<string, string>;
  flavors?: Record<string, FlavorConfig>;
  project: IProjectConfig;
  vars?: Record<string, unknown>;
};
