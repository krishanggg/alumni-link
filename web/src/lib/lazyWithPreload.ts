/* eslint-disable @typescript-eslint/no-explicit-any -- mirrors React's own `lazy<T extends ComponentType<any>>` so components with required props keep their types */
import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';

type ModuleFactory<T extends ComponentType<any>> = () => Promise<{ default: T }>;

export type PreloadableComponent<T extends ComponentType<any>> = LazyExoticComponent<T> & {
  /**
   * Start downloading (and evaluating) the chunk before it's rendered — e.g. on
   * hover/focus of the control that navigates to it, or on idle. `import()`
   * caches by specifier, so calling this more than once is free.
   */
  preload: ModuleFactory<T>;
};

export function lazyWithPreload<T extends ComponentType<any>>(
  factory: ModuleFactory<T>,
): PreloadableComponent<T> {
  const Component = lazy(factory) as PreloadableComponent<T>;
  Component.preload = factory;
  return Component;
}
