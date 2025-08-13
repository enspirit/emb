import { EMBConfig, ResourceConfig } from './schema.js';

export * from './schema.js';

type RemoveIndexSignature<T> = {
  [K in keyof T as K extends string ? (string extends K ? never : K) : K]: T[K];
};

export type ProjectConfig = Required<EMBConfig['project']>;
export type UserConfig = EMBConfig & {
  project: ProjectConfig;
};
export type PluginConfig = Required<EMBConfig>['plugins'][number];

export type IResourceConfig = RemoveIndexSignature<ResourceConfig>;
export type QualifiedResourceConfig = IResourceConfig & {
  id: string;
};
