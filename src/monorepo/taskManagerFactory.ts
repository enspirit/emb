import { Manager } from '@listr2/manager';
import {
  ListrContext,
  ListrDefaultRendererLogLevels,
  ListrRendererValue,
  ListrSecondaryRendererValue,
  PRESET_TIMER,
} from 'listr2';

export function taskManagerFactory<
  Ctx = ListrContext,
  FallbackRenderer extends ListrRendererValue = ListrSecondaryRendererValue,
>(
  renderer?: ListrRendererValue,
): Manager<Ctx, ListrRendererValue, FallbackRenderer> {
  if (renderer === 'silent') {
    return new Manager({
      renderer: 'silent',
    });
  }

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
  });
}
