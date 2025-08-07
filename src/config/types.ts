export type Component = {
  name: string;
};

export type Service = {
  name: string;
};

export type UserConfig = {
  components: Array<string | { name: string }>;
  defaults?: DefaultSettings;
  project: string | { name: string };
  vars?: Record<string, string>;
};

export type IProjectConfig = {
  name: string;
  rootDir: string;
};

export type ComponentConfig = {
  buildArgs?: Record<PropertyKey, string>;
  context: string;
  dockerfile?: string;
  labels?: Record<string, string>;
  name: string;
  target?: string;
};

export type DefaultSettings = {
  docker?: {
    buildArgs?: Record<string, string>;
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
  flavors?: Record<string, FlavorConfig>;
  project: IProjectConfig;
  vars?: Record<string, string>;
};
