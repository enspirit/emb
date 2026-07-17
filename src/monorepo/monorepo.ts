import { getContext, TaskManagerFactory } from '@';
import jsonpatch from 'fast-json-patch';
import { ListrRendererValue } from 'listr2';
import { join } from 'node:path';

import { EMBConfig, JsonPatchOperation } from '@/config/types.js';
import { IOperation } from '@/operations';
import { Expandable, TemplateExpander } from '@/utils';

import { Component } from './component.js';
import { MonorepoConfig } from './config.js';
import { AbstractPluginConstructor, getPlugin } from './plugins/index.js';
import { EMBStore } from './store/index.js';
import { ResourceInfo, TaskInfo } from './types.js';

export class Monorepo {
  private _config: MonorepoConfig;
  private _store!: EMBStore;
  private _managerFactory = new TaskManagerFactory();
  private initialized = false;
  // Snapshot of the environment taken before installEnv() writes the config's
  // env block into process.env. Used as the `env` source when expanding the
  // config env block and flavor patches, so those self-referencing templates
  // (e.g. `${env:VAR:-default}`) resolve against the original environment
  // rather than values EMB itself installed for a previous flavor.
  private _originalEnv?: Record<string, string | undefined>;

  constructor(
    config: EMBConfig,
    private _rootDir: string,
    private defaultFlavor: string = 'default',
  ) {
    this._config = new MonorepoConfig(config);
  }

  get config(): EMBConfig {
    return this._config.toJSON();
  }

  get defaults() {
    return this._config.defaults;
  }

  get flavors() {
    return this._config.flavors;
  }

  get name() {
    return this._config.project.name;
  }

  get rootDir() {
    return this._config.project.rootDir
      ? join(this._rootDir, this._config.project.rootDir)
      : this._rootDir;
  }

  get currentFlavor() {
    return this.defaultFlavor;
  }

  get store() {
    return this._store;
  }

  get components() {
    return Object.entries(this._config.components).map(
      ([name, c]) => new Component(name, c, this),
    );
  }

  component(name: string) {
    return new Component(name, this._config.component(name), this);
  }

  get tasks() {
    const globalTasks = Object.values(this._config.tasks);

    return this.components.reduce<Array<TaskInfo>>((tasks, cmp) => {
      const cmpTasks = Object.entries(cmp.tasks || {}).map(([name, task]) => {
        return {
          ...task,
          name,
          component: cmp.name,
          id: `${cmp.name}:${name}`,
        };
      });

      return [...tasks, ...cmpTasks];
    }, globalTasks);
  }

  task(nameOrId: string): TaskInfo {
    const byId = this.tasks.find((t) => t.id === nameOrId);

    if (byId) {
      return byId;
    }

    const found = this.tasks.filter((t) => t.name === nameOrId);

    if (found.length > 1) {
      throw new Error(
        `Task name ambigous, found multiple matches: ${nameOrId}`,
      );
    }

    if (found.length === 0) {
      throw new Error(`Task not found: ${nameOrId}`);
    }

    return found[0];
  }

  get resources(): Array<ResourceInfo> {
    return this.components.reduce<Array<ResourceInfo>>((resources, cmp) => {
      return [...resources, ...Object.values(cmp.resources)];
    }, []);
  }

  resource(nameOrId: string): ResourceInfo {
    const byId = this.resources.find((t) => t.id === nameOrId);

    if (byId) {
      return byId;
    }

    const found = this.resources.filter((t) => t.name === nameOrId);

    if (found.length > 1) {
      throw new Error(
        `Resource name ambigous, found multiple matches: ${nameOrId}`,
      );
    }

    if (found.length === 0) {
      throw new Error(`Resource not found: ${nameOrId}`);
    }

    return found[0];
  }

  get vars(): Record<string, unknown> {
    return this._config.vars;
  }

  // Helper to get a listr2 task manager
  taskManager() {
    return this._managerFactory.factor();
  }

  setTaskRenderer(renderer: ListrRendererValue) {
    this._managerFactory.setRenderer(renderer);
  }

  // Helper to expand a record of strings
  async expand<T extends Expandable>(
    toExpand: T,
    vars?: Record<string, unknown>,
    expander = new TemplateExpander(),
  ) {
    return this.expandWith(toExpand, {
      vars,
      // Runtime expansion resolves `${env:...}` against the live process.env,
      // which includes the config's own env block installed by installEnv().
      envSource: process.env as Record<string, unknown>,
      expander,
    });
  }

  private async expandWith<T extends Expandable>(
    toExpand: T,
    {
      vars,
      envSource,
      expander = new TemplateExpander(),
    }: {
      vars?: Record<string, unknown>;
      envSource: Record<string, unknown>;
      expander?: TemplateExpander;
    },
  ) {
    const secrets = getContext()?.secrets;
    const sources: Record<
      string,
      ((key: string) => Promise<unknown>) | Record<string, unknown>
    > = {
      env: envSource,
      vars: vars || this.vars,
    };

    // Add all registered secret providers as sources
    if (secrets) {
      for (const providerName of secrets.getProviderNames()) {
        sources[providerName] = secrets.createSource(providerName);
      }
    }

    const options = {
      default: 'vars',
      sources,
    };

    return expander.expandRecord(toExpand, options);
  }

  private async installStore(store?: EMBStore) {
    this._store = store || new EMBStore(this);
    await this._store.init();
  }

  private async installEnv() {
    // Expand env vars at the init and then we don't expand anymore.
    // Expand against the original environment snapshot (not the live
    // process.env, which a previous flavor's installEnv may have polluted) so
    // the `${env:VAR:-default}` self-reference idiom keeps working per flavor.
    const expander = new TemplateExpander();
    const options = {
      default: 'env',
      sources: {
        env: this._originalEnv ?? process.env,
      },
    };
    const expanded = await expander.expandRecord(this._config.env, options);
    Object.assign(process.env, expanded);
  }

  // Initialize
  async init(): Promise<Monorepo> {
    if (this.initialized) {
      throw new Error('Monorepo already initialized');
    }

    await this.installStore();

    const plugins = await Promise.all(
      this._config.plugins.map(async (p) => {
        const PluginClass: AbstractPluginConstructor = getPlugin(p.name);

        // Plugin config is part of the declaration and may contain templates:
        // the vault/1password plugins document `${env:...}` placeholders in
        // their config block. Expand them against the environment before the
        // plugin ever sees the value; otherwise a literal '${env:VAULT_ADDR}'
        // is passed straight through (e.g. as the server URL), silently
        // bypassing the env fallback the template was meant to trigger.
        const config = await this.expand(p.config as Expandable);

        return new PluginClass(config, this);
      }),
    );

    this._config = await plugins.reduce(async (pConfig, plugin) => {
      const newConfig = await plugin.extendConfig?.(await pConfig);
      return newConfig ?? pConfig;
    }, Promise.resolve(this._config));

    // Capture the environment (shell env + anything plugins such as dotenv have
    // loaded) before installEnv() writes the config env block into process.env.
    this._originalEnv = { ...process.env };

    await this.installEnv();

    this.initialized = true;

    await Promise.all(
      plugins.map(async (p) => {
        await p.init?.();
      }),
    );

    return this;
  }

  // Helper to build relative path to the root dir
  join(...paths: string[]) {
    return join(this.rootDir, ...paths);
  }

  run<I extends void, O>(operation: IOperation<I, O>): Promise<O>;
  run<I extends void, O>(operation: IOperation<I, O>): Promise<O>;
  run<I, O>(operation: IOperation<I, O>, input: I): Promise<O>;
  run<I, O>(operation: IOperation<I, O>, input = undefined): Promise<O> {
    if (input === undefined) {
      return (operation as IOperation<void, O>).run();
    }

    return operation.run(input);
  }

  private async expandPatches(patches: Array<JsonPatchOperation>) {
    const expanded = Promise.all(
      patches.map(async (patch) => {
        if (!('value' in patch)) {
          return patch;
        }

        return {
          ...patch,
          // Flavor patches are part of the config declaration: expand their
          // `${env:...}` templates against the original environment snapshot,
          // not the live process.env polluted by the base flavor's installEnv.
          value: await this.expandWith(patch.value as Expandable, {
            envSource:
              this._originalEnv ?? (process.env as Record<string, unknown>),
          }),
        };
      }),
    );

    return expanded;
  }

  async withFlavor(flavorName: string): Promise<Monorepo> {
    const patches = await this.expandPatches(
      this._config.flavor(flavorName).patches || [],
    );
    const original = this._config.toJSON();
    const errors = jsonpatch.validate(patches || [], original);

    if (errors) {
      throw errors;
    }

    const withComponentPatches = await this.components.reduce(
      async (pConfig, cmp) => {
        const config = await pConfig;
        const componentPatches = await this.expandPatches(
          cmp.flavor(flavorName, false)?.patches || [],
        );

        const errors = jsonpatch.validate(
          componentPatches || [],
          config.components[cmp.name],
        );

        if (errors) {
          throw errors;
        }

        config.components[cmp.name] = componentPatches.reduce(
          (doc, patch, index) => {
            return jsonpatch.applyReducer(doc, patch, index);
          },
          config.components[cmp.name],
        );

        return config;
      },
      Promise.resolve(original),
    );

    const withGlobalPatches = patches.reduce((doc, patch, index) => {
      return jsonpatch.applyReducer(doc, patch, index);
    }, withComponentPatches);

    const newConfig = new MonorepoConfig(withGlobalPatches);

    const repo = new Monorepo(newConfig, this._rootDir, flavorName);
    // Reuse the base repo's environment snapshot so the flavored installEnv
    // expands against the original environment, not the base-flavor's install.
    repo._originalEnv = this._originalEnv;
    // Carry over the configured renderer: BaseCommand.init() may have called
    // setTaskRenderer('verbose') on the base repo before flavoring, and the
    // fresh Monorepo's factory would otherwise fall back to the default one —
    // silently dropping --verbose when combined with --flavor.
    repo.setTaskRenderer(this._managerFactory.getRenderer());
    await repo.installStore();
    await repo.installEnv();
    return repo;
  }
}
