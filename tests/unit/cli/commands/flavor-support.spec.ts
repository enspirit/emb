import { describe, expect, test } from 'vitest';

import { FlavoredCommand } from '@/cli';
import RestartCommand from '@/cli/commands/restart.js';
import StartCommand from '@/cli/commands/start.js';

// start/restart must support flavors like their sibling lifecycle commands
// (up/down/stop/ps), otherwise `--flavor`/`EMB_FLAVOR` is rejected or silently
// ignored and they target the wrong compose stack (report finding #1).
describe('CLI / flavor support for start & restart', () => {
  test('StartCommand extends FlavoredCommand and declares --flavor', () => {
    expect(StartCommand.baseFlags).toHaveProperty('flavor');
    expect(StartCommand.prototype).toBeInstanceOf(FlavoredCommand);
  });

  test('RestartCommand extends FlavoredCommand and declares --flavor', () => {
    expect(RestartCommand.baseFlags).toHaveProperty('flavor');
    expect(RestartCommand.prototype).toBeInstanceOf(FlavoredCommand);
  });
});
