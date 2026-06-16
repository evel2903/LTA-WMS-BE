export type EnqueueExampleJobRequest = {
  Message: string;
};

export type EnqueueExampleJobResult = {
  JobId: string;
};

export const EXAMPLE_JOB_QUEUE = Symbol('IExampleJobQueue');

export interface IExampleJobQueue {
  Enqueue(request: EnqueueExampleJobRequest): Promise<EnqueueExampleJobResult>;
}
