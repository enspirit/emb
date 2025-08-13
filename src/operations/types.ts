export interface IOperation<I, O> {
  run(input: I): Promise<O>;
}
