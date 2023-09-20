/* eslint-disable no-async-promise-executor */
/* eslint-disable import/no-webpack-loader-syntax */
/* eslint-disable no-use-before-define */
/* eslint-disable default-case */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Worker } from 'worker_threads';
import type { PretrainedOptions } from '@xenova/transformers';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import { appPath } from '../../../../main/utils';

const workerPath = path.join(appPath, './workers/xenova.worker.js');

export function loadModel(
  type: string,
  model: string,
  options: PretrainedOptions
): Promise<Worker> {
  return new Promise(async (resolve, reject) => {
    const worker = new Worker(workerPath);
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

const worker = `
/* eslint-disable default-case */
/* eslint-disable prettier/prettier */
/* eslint-disable no-console */
// worker.js
const { parentPort } = require('node:worker_threads');

let extractor;
console.log("hello from the web worker")

parentPort.on('message', async (props) => {
switch (props.event) {
  case "loadModel":
    try {
      console.log({ props });

      // eslint-disable-next-line no-new-func
      const { pipeline } = await Function(
        'return import("@xenova/transformers")'
      )();

      extractor = await pipeline(props.type, props.model, {
        ...props.options,
        progress_callback: (progress) => {
          parentPort.postMessage({
            event:'loadModel-progress',
            props:{
              progress
            }
          });
        },
      });

      parentPort.postMessage({
        event: "loadModel-done"
      });

    } catch (error) {
      parentPort.postMessage({
        event: 'loadModel-error',
        props:{
          error
        }
      });
    }
    break;

  case "execute":
    try {
      const result = await extractor?.(props.input, {
        pooling: 'mean',
        normalize: true,
        ...props.options,
      });

      parentPort.postMessage({
        id: props.id,
        event: "result",
        props:{
          result: JSON.parse(JSON.stringify(result))
        }
      });

    } catch (error) {
      parentPort.postMessage({
        id: props.id,
        event: "error",
        props:{
          error: error?.message || error
        }
      });
    }
}
});
`;

try {
  fs.statSync(workerPath);
} catch {
  try {
    fs.mkdirSync(path.dirname(workerPath));
  } catch {
    /* empty */
  } finally {
    fs.writeFileSync(workerPath, worker, 'utf-8');
  }
}
