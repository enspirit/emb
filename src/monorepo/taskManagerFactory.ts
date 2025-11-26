import { Manager } from '@listr2/manager';
import {
  ListrContext,
  ListrDefaultRendererLogLevels,
  ListrRendererValue,
  ListrSecondaryRendererValue,
  PRESET_TIMER,
} from 'listr2';

export class TaskManagerFactory<
  Ctx = ListrContext,
  FallbackRenderer extends ListrRendererValue = ListrSecondaryRendererValue,
> {
  constructor(private renderer: ListrRendererValue = 'default') {}

  setRenderer(renderer: ListrRendererValue) {
    this.renderer = renderer;
  }

  factor(): Manager<Ctx, ListrRendererValue, FallbackRenderer> {
    if (this.renderer !== 'default') {
      return new Manager({
        renderer: this.renderer,
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
}
