import { EMBCollection } from '@';

export type SimpleItem = {
  id: string;
  name: string;
  deps?: Array<string>;
};

// Helper for tests
export const simpleCollection = (
  items: Iterable<SimpleItem>,
  onError?: (err: unknown) => void,
): EMBCollection<SimpleItem, 'id', 'deps'> | undefined => {
  try {
    const coll = new EMBCollection(items, {
      idField: 'id',
      depField: 'deps',
    });

    if (onError) {
      throw new Error('Constructor should have failed but did not');
    }

    return coll;
  } catch (error) {
    if (onError) {
      onError(error);
    } else {
      throw new Error('Constructor should not have failed but did');
    }
  }
};
