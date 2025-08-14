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

export class AmbiguousReferenceError extends EMBError {
  constructor(
    msg: string,
    public ref: string,
    public matches: string[],
  ) {
    super('AMBIGUOUS_REF', msg);
  }
}

export class UnkownReferenceError extends EMBError {
  constructor(
    msg: string,
    public ref: string,
  ) {
    super('UNKNOWN_REF', msg);
  }
}

export class ItemCollisionsError extends EMBError {
  constructor(
    msg: string,
    public collisions: Array<string>,
  ) {
    super('ITEM_COLLISIONS', msg);
  }
}

export class CircularDependencyError extends EMBError {
  constructor(
    msg: string,
    public readonly deps: Array<Array<string>>,
  ) {
    super('CIRCULAR_DEPS', msg);
  }
}

export class ShellExitError extends EMBError {
  constructor(
    msg: string,
    public service: string,
    public exitCode: number,
    public signal?: NodeJS.Signals | null,
  ) {
    super('SHELL_EXIT_ERR', msg);
  }
}

export class NoContainerFoundError extends EMBError {
  constructor(
    msg: string,
    public component: string,
  ) {
    super('CMP_NO_CONTAINER', msg);
  }
}

export class MultipleContainersFoundError extends EMBError {
  constructor(
    msg: string,
    public component: string,
  ) {
    super('CMP_NO_CONTAINER', msg);
  }
}

export class ComposeExecError extends EMBError {
  constructor(
    msg: string,
    public exitCode: number,
    public signal?: NodeJS.Signals | null,
  ) {
    super('COMPOSE_EXEC_ERR', msg);
  }
}
