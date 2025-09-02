export function enableRawMode(stdin: NodeJS.ReadStream) {
  const wasRaw = (stdin as { isRaw: boolean | undefined }).isRaw;
  const { isTTY } = stdin;
  if (isTTY) {
    stdin.setRawMode?.(true);
    stdin.resume();
    // Do NOT set encoding; keep it binary so control chars pass through.
  }

  return () => {
    if (isTTY) {
      stdin.setRawMode?.(Boolean(wasRaw));
      if (!wasRaw) {
        stdin.pause();
      }
    }
  };
}
