/**
 * Error class for 1Password-specific errors.
 */
export class OnePasswordError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = 'OnePasswordError';
  }
}
