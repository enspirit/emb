import { Manager } from '@listr2/manager';
import {
  ListrBaseClassOptions,
  ListrDefaultRendererLogLevels,
  PRESET_TIMER,
} from 'listr2';

export function taskManagerFactory<T extends Record<PropertyKey, unknown>>(
  override?: ListrBaseClassOptions,
): Manager<T> {
  return new Manager({
    collectErrors: 'minimal',
    concurrent: false,
    exitOnError: true,
    rendererOptions: {
      collapseErrors: false,
      collapseSubtasks: false,
      collapseSkips: false,
      icon: {
        [ListrDefaultRendererLogLevels.SKIPPED_WITH_COLLAPSE]: '♺',
      },
      timer: {
        ...PRESET_TIMER,
      },
    },
    ...override,
  });
}
