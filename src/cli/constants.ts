import { TableOptions } from '@oclif/table';

export const TABLE_DEFAULTS: Partial<TableOptions<Record<string, unknown>>> = {
  borderStyle: 'none',
  headerOptions: {
    formatter: 'constantCase',
  },
};
