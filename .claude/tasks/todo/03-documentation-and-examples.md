# Problem to solve

Let's work on a first pragmatic website with the documentation of `Emb` its config files and examples of its usage. I'd like the documentation to start with the most straightforward/simple use case of a simple docker-based monorepo, and then show advanced usages one by one, by adding complexity to it.

# Idea

I'd like us to find a way to write the documentation in such a way that the examples of commands are actually running as integration tests inside an example monorepo. (you can look at the commits `69ca879` & `e30a22d` where I played with some ideas)

Let's start with a very first step where we put the bases for the following acceptance criterias:

* The website uses astro or equivalent
* The documentation is written in such a way that it actually runs in a monorepo (subfolder) showcasing the different use cases
* The code blocks in the documentation are used and executed to ensure the command actually work, combining documentation with integration testing

---

# Progress

## Completed

### Phase 1: Foundation (Done)

- [x] Set up Astro Starlight documentation site in `website/`
- [x] Created `validate-docs.ts` script based on remark approach from commits `69ca879` & `e30a22d`
- [x] Integrated validation with Vitest (`npm test` runs docs validation)
- [x] Adapted existing `examples/` folder as the documentation target monorepo

### Structure Created

```
website/
├── astro.config.mjs          # Starlight config for EMB
├── package.json              # Dependencies (remark, vitest, etc.)
├── vite.config.ts            # Vitest configuration
├── scripts/
│   └── validate-docs.ts      # Parses markdown, executes code blocks
├── tests/
│   └── docs.spec.ts          # Vitest integration
└── src/content/docs/
    ├── index.mdx             # Landing page
    ├── getting-started/
    │   ├── introduction.md
    │   ├── installation.md
    │   └── first-monorepo.md  # ✓ Has executable examples
    └── day-to-day/
        ├── building-images.md
        ├── running-services.md
        └── managing-components.md  # ✓ Has executable examples
```

### Code Block Syntax

```markdown
```shell exec cwd="../examples"
emb tasks
```

```output
  NAME        COMPONENT   DESCRIPTION ...
```
```

Options:
- `exec` - Mark block for execution
- `cwd="path"` - Set working directory (relative to website/)
- `skip` - Skip execution (for commands requiring Docker/user input)

### Commands

From `website/`:
- `npm run dev` - Start dev server
- `npm run build` - Build static site
- `npm run validate-docs` - Validate executable code blocks
- `npm test` - Run Vitest (includes docs validation)

---

### Phase 2: Content Expansion (Done)

- [x] Add advanced documentation pages:
  - [x] `advanced/tasks.md` - Task definition and execution
  - [x] `advanced/flavors.md` - Environment variants with JSON Patch
  - [x] `advanced/dependencies.md` - Image dependency management
  - [ ] `advanced/kubernetes.md` - K8s deployment (deferred)
- [x] Add reference documentation:
  - [x] `reference/configuration.md` - Full `.emb.yml` schema
  - [x] `reference/cli.md` - All CLI commands

---

### Phase 3: Example Monorepo Enhancement (Done)

- [x] Created self-contained tutorial monorepo in `website/tutorial/`
- [x] Added 6-step progressive tutorial documentation:
  - `tutorial/index.md` - Overview
  - `tutorial/01-project-setup.md` - Configuration basics
  - `tutorial/02-components.md` - Component discovery
  - `tutorial/03-tasks.md` - Task definition and execution
  - `tutorial/04-building.md` - Docker image builds
  - `tutorial/05-running.md` - Service orchestration
  - `tutorial/06-flavors.md` - Environment configurations
- [x] Tutorial includes executable examples validated by CI

---

## Remaining Work

### Phase 4: Deployment & CI

- [ ] Add `site` URL to `astro.config.mjs` for sitemap
- [ ] Set up GitHub Actions to run `npm test` on PRs
- [ ] Configure deployment (Netlify/Vercel/GitHub Pages)
- [ ] Add custom domain configuration

### Phase 5: Polish

- [ ] Add custom "output" language highlighting for Starlight
- [ ] Create EMB logo/branding for docs
- [ ] Add search configuration
- [ ] Consider i18n support