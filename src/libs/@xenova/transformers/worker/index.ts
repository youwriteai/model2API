/* eslint-disable default-case */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Worker } from 'worker_threads';
import type { PretrainedOptions } from '@xenova/transformers';
import { randomUUID } from 'crypto';

export function loadModel(
  type: string,
  model: string,
  options: PretrainedOptions
): Promise<Worker> {
  const worker = new Worker('./src/libs/@xenova/transformers/worker/worker.js');

  return new Promise((resolve, reject) => {
    const message = ({ event, props }: { event: string; props: any }) => {
      switch (event) {
        case 'loadModel-done':
          console.log('done', props);
          resolve(worker);

          worker.off('message', message);
          break;

        case 'loadModel-error':
          console.log('error', props);
          reject(props.error);

          worker.off('message', message);
          break;

        case 'loadModel-progress':
          options.progress_callback?.(props.progress);
          break;
      }
    };

    worker.on('message', message);

    worker.postMessage({
      event: 'loadModel',
      type,
      model,
      options: {
        ...options,
        progress_callback: undefined,
      },
    });
  });
}

export default async function execute(
  worker: Worker | null | undefined,
  input: any,
  otherOptions?: any
): Promise<any> {
  if (!worker) throw new Error('Not initialized');
  const taskId = randomUUID();
  return new Promise((resolve, reject) => {
    const message = ({
      id,
      event,
      props,
    }: {
      id: string;
      event: string;
      props: any;
    }) => {
      if (id !== taskId) return;
      switch (event) {
        case 'result':
          resolve(props.result);
          break;

        case 'error':
          reject(props.error);
          break;
      }
      worker.off('message', message);
    };

    worker.on('message', message);

    worker.postMessage({
      id: taskId,
      event: 'execute',
      input,
      options: otherOptions,
    });
  });
}
