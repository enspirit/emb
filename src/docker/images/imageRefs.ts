export type ImageRef = {
  name: string;
  tag: string;
};

/**
 * Split an image reference into its name and tag.
 *
 * The tag separator is the last ':' after the last '/', so registry ports
 * (`localhost:5000/project/api:1.0`) are kept in the name.
 */
export const parseImageRef = (ref: string): ImageRef => {
  const colon = ref.lastIndexOf(':');

  if (colon <= ref.lastIndexOf('/')) {
    return { name: ref, tag: 'latest' };
  }

  return { name: ref.slice(0, colon), tag: ref.slice(colon + 1) };
};

/**
 * Keep the image references whose tag is exactly one of `tags`.
 * An empty or missing `tags` list keeps every reference.
 */
export const filterImageRefsByTag = (
  refs: Array<string>,
  tags?: Array<string>,
): Array<string> => {
  if (!tags?.length) {
    return refs;
  }

  return refs.filter((ref) => tags.includes(parseImageRef(ref).tag));
};
