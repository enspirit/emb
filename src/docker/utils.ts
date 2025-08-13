export const shortId = (id?: string) => {
  if (!id) {
    return '';
  }

  return id.slice(0, 12);
};
