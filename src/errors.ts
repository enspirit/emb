export class EMBError extends Error {
  constructor(
    public code: string,
    public message: string,
  ) {
    super(message);
  }

  toCliError(suggestions: string[], ref?: string) {
    return new CliError(this.code, this.message, suggestions, ref);
  }
}

export class CliError extends EMBError {
  constructor(
    /**
     * a unique error code for this error class
     */
    public code: string,
    /**
     * message to display related to the error
     */
    public message: string,
    /**
     * a suggestion that may be useful or provide additional context
     */
    public suggestions?: string[],
    /**
     * a url to find out more information related to this error
     * or fixing the error
     */
    public ref?: string,
  ) {
    super(code, message);
  }
}

export class AmbiguousTaskError extends EMBError {
  constructor(
    msg: string,
    public options: string[],
  ) {
    super('AMBIG_TASK', msg);
  }
}

export class UnkownReferenceError extends EMBError {
  constructor(msg: string) {
    super('UNKNOWN_REF', msg);
  }
}

export class TaskNameCollisionError extends EMBError {
  constructor(
    msg: string,
    public collisions: Array<string>,
  ) {
    super('UNKNOWN_REF', msg);
  }
}

export class CircularDependencyError extends EMBError {
  constructor(msg: string) {
    super('CIRCULAR_DEPS', msg);
  }
}
