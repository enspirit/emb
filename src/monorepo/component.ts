import jsonpatch from 'fast-json-patch';
import { join } from 'node:path';

import { ComponentConfig, ComponentFlavorConfig } from '@/config/schema.js';
import {
  ComponentFlavors,
  Monorepo,
  ResourceInfo,
  Resources,
  Tasks,
  toIdentifedHash,
} from '@/monorepo';

export class Component implements ComponentConfig {
  public readonly rootDir: string;
  public readonly tasks: Tasks;
  public readonly resources: Resources;
  public readonly flavors: ComponentFlavors;

  constructor(
    public readonly name: string,
    public readonly config: ComponentConfig,
    protected monorepo: Monorepo,
  ) {
    this.rootDir = config.rootDir || name;
    this.tasks = toIdentifedHash(config.tasks || {}, this.name);
    this.resources = toIdentifedHash(
      // Due to the schema.json -> typescript conversion weirdness
      (config.resources as { [k: string]: ResourceInfo }) || {},
      this.name,
    );
    this.flavors = toIdentifedHash(config.flavors || {}, this.name);
  }

  flavor(name: string, mustExist = true): ComponentFlavorConfig {
    const flavor = this.flavors[name];

    if (!flavor && mustExist) {
      throw new Error(`Unknown flavor: ${name}`);
    }

    return flavor;
  }

  cloneWith(config: Partial<ComponentConfig>): ComponentConfig {
    return new Component(
      this.name,
      {
        ...this.config,
        ...config,
      },
      this.monorepo,
    );
  }

  toJSON(): ComponentConfig {
    return structuredClone(this.config);
  }

  withFlavor(name: string): Component {
    const original = this.toJSON();
    const patches = this.flavor(name).patches || [];

    const errors = jsonpatch.validate(patches, original);

    if (errors) {
      throw new Error('Invalid patch(es) detected');
    }

    const patched = patches.reduce((doc, patch, index) => {
      return jsonpatch.applyReducer(doc, patch, index);
    }, original);

    return new Component(this.name, patched, this.monorepo);
  }

  join(path: string) {
    return this.monorepo.join(join(this.rootDir, path));
  }
}
