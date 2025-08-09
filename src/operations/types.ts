export interface IOperation<I = unknown, O = unknown> {
  run(input: I): Promise<O>;
}
