export interface IOperation<I = void, O = unknown> {
  run(input: I): Promise<O>;
}
