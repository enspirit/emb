import { Component } from '@/monorepo';

export const shortId = (id: string) => {
  return id.slice(0, 12);
};

/**
 * This is too naive and will need better logic to ensure
 * we take care of flavors etc
 */
export const getSentinelFile = (component: Component): string => {
  return `sentinels/docker/build/${component.name}.built`;
};
