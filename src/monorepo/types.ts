import {
  ComponentFlavorConfig,
  IResourceConfig,
  ProjectFlavorConfig,
  TaskConfig,
} from '@/config/types.js';

export type ComponentIdentifiable<T> = T & {
  id: string;
  name: string;
  component: string;
};

export type ResourceInfo = ComponentIdentifiable<IResourceConfig>;

export type Resources = {
  [k: string]: ResourceInfo;
};

export type ProjectFlavors = {
  [k: string]: ProjectFlavorConfig;
};

export type ComponentFlavorInfo = ComponentIdentifiable<ComponentFlavorConfig>;

export type ComponentFlavors = {
  [k: string]: ComponentFlavorInfo;
};

export type TaskInfo = ComponentIdentifiable<TaskConfig>;

export type Tasks = {
  [k: string]: TaskInfo;
};
