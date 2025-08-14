import { EMBConfig, ResourceConfig } from './schema.js';

export * from './schema.js';

type RemoveIndexSignature<T> = {
  [K in keyof T as K extends string ? (string extends K ? never : K) : K]: T[K];
};
export type PluginConfig = Required<EMBConfig>['plugins'][number];
export type ProjectConfig = EMBConfig['project'];
export type IResourceConfig = RemoveIndexSignature<ResourceConfig>;
export type QualifiedResourceConfig = IResourceConfig & {
  id: string;
};
