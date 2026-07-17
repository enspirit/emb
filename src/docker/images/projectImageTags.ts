/**
 * Filter an image's RepoTags down to the ones that belong to the given EMB
 * project.
 *
 * EMB image tags follow the `<project>/<component>:<tag>` convention, so the
 * match is anchored on the `<project>/` boundary. A plain prefix match would
 * also capture a *different* project whose name merely starts the same way
 * (e.g. `foobar/...` when the project is `foo`).
 *
 * @param repoTags - The image's RepoTags (may be null/undefined)
 * @param projectName - The EMB project (monorepo) name
 * @returns The subset of tags owned by the project
 */
export function projectImageTags(
  repoTags: null | string[] | undefined,
  projectName: string,
): string[] {
  return (repoTags ?? []).filter((tag) => tag.startsWith(`${projectName}/`));
}
