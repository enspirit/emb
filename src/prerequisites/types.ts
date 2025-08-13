import { Component } from '@/monorepo';

// Prerequisites
export enum PrerequisiteType {
  file = 'file',
  variable = 'variable',
}

/**
 * A prerequisite must at least include its type name
 */
export interface Prerequisite<T extends PrerequisiteType | string> {
  type: T;
}

/**
 * A file-like prerequisite includes at least its path
 */
export interface FilePrerequisite extends Prerequisite<PrerequisiteType.file> {
  path: string;
  type: PrerequisiteType.file;
}

export interface PrerequisitePlugin<
  T extends PrerequisiteType,
  P extends Prerequisite<T>,
  Output = unknown,
  Changes = unknown,
> {
  /**
   * Collect/discover prerequisistes for a path (relative to the monorepo root)
   */
  collect?(path: string): Promise<Array<P>>;

  /**
   * Returns the list of changes between the last collection and the new
   * collection.
   * Eg:
   *   list of files that have changed since the last build
   *   list of variables/value that have changed since the last build
   *
   * In case nothing has changed, the plugin must resolve to null
   */
  diff?(
    component: Component,
    prerequisistes: Array<P>,
    previous: Output,
    actual: Output,
  ): Promise<Changes | null>;

  /**
   * Computes the meta-information for a list of prerequisites
   * this meta information will be saved and used later to decide whether
   *
   * The mode specifies if the computation is made before a build is triggered
   * (and before deciding if the build should be triggered)
   * or after a new build has been made
   *
   * or not a component needs to rebuild
   * (eg: some prerequisite files have changed, some vars have changed, etc)
   */
  meta?(
    component: Component,
    prerequisites: Array<P>,
    mode: 'post' | 'pre',
  ): Promise<Output>;
}

// Checker for files:
//
// Collect all files a component depends on
// and compute their last updated time
//
// No previous build available for this checker?
//   -> build and then return now() as output
// Previous build? receive the last output (now())
// and compare it with most recent prerequisite.

// Checker for variables:
//
// Collect all variables a component depends on
// and compute a hash key=>value
//
// No previous build available for this checker?
//   -> build and then return the hash as output
// Previous build? receive the last output (hash)
// and compare it with current hash -> different ? true : false
