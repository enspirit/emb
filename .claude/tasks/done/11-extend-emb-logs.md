# Plan: Extend `emb logs` for Multi-Component Support

## Goal
Extend the `emb logs` command to support:
1. Running without a component name → show interlaced logs of all containers
2. Running with multiple component names → `emb logs cmp1 cmp2`

## Current State
- **File:** `src/cli/commands/components/logs.ts`
- Currently requires exactly one component argument (`required: true`)
- Uses dockerode's `container.logs()` to stream logs from a single container
- Has `--follow/-f` flag (default: true)

## Recommended Approach: Use `docker compose logs`

Instead of manually managing multiple dockerode streams, use `docker compose logs` directly which already handles:
- Multiple services natively
- Log interlacing with service name prefixes
- Follow mode (`-f`)
- Timestamps (`-t`)

This matches the pattern used by `ComposeStartOperation` and `ComposeRestartOperation`.

## Implementation

### 1. Create `ComposeLogsOperation`

**File:** `src/docker/compose/operations/ComposeLogsOperation.ts`

```typescript
const schema = z.object({
  services: z.array(z.string()).optional(),  // undefined = all services
  follow: z.boolean().optional().default(true),
  timestamps: z.boolean().optional().default(false),
  tail: z.number().optional(),  // number of lines
});
```

Build command: `docker compose logs [-f] [-t] [--tail N] [services...]`

Use `execa` with `stdio: 'inherit'` to forward logs directly to terminal (preserving colors and interactivity).

### 2. Update `logs.ts` Command

**Changes:**
- Change `required: true` to optional (remove or set `required: false`)
- Add `static strict = false` to allow multiple arguments
- Use `argv` instead of `args.component`
- Validate components if provided: `(argv as string[]).map(name => monorepo.component(name))`
- Call `ComposeLogsOperation` with the service names

**New Signature:**
```
emb logs              # all components
emb logs cmp1         # single component
emb logs cmp1 cmp2    # multiple components
emb logs -f cmp1      # explicit follow
emb logs --no-follow  # no follow mode
```

### 3. Optional Enhancements (Consider for future)

- Add `--tail N` flag to limit output lines
- Add `--timestamps/-t` flag to show timestamps
- Add `--since` flag for time-based filtering

## Files to Modify

1. **Create:** `src/docker/compose/operations/ComposeLogsOperation.ts`
2. **Modify:** `src/cli/commands/components/logs.ts`
3. **Modify:** `src/docker/compose/index.ts` (export new operation)

## Verification

1. Run `npm run build` to ensure compilation succeeds
2. Test scenarios:
   - `emb logs` (no args) → shows all container logs
   - `emb logs backend` → shows single component logs
   - `emb logs backend frontend` → shows both components
   - `emb logs --no-follow backend` → shows logs without following
   - `emb logs nonexistent` → shows error for invalid component
3. Run `npm test` to ensure no regressions
