/* eslint-disable no-async-promise-executor */
/* eslint-disable no-console */
/* eslint-disable default-case */
/* eslint-disable no-self-compare */
/* eslint-disable @typescript-eslint/no-shadow */
import { randomUUID } from 'crypto';
import { Worker } from 'worker_threads';
import { getConfig, tempPath } from '../../main/utils';

export default function convertAudioToSample(
  buffer: Buffer,
  mimeType: string
): Promise<Float64Array | Float32Array> {
  const worker = new Worker('./src/libs/audioConverterToSample/worker.js');
  const taskId = randomUUID();
  return new Promise(async (resolve, reject) => {
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
      worker.terminate();
    };

    worker.on('message', message);

    worker.postMessage({
      id: taskId,
      buffer,
      mimeType,
      options: {
        tempPath,
        customffmpegPath: (await getConfig()).ffmpegPath,
      },
    });
  });
}
