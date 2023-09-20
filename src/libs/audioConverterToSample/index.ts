/* eslint-disable no-use-before-define */
/* eslint-disable no-undef */
/* eslint-disable import/no-duplicates */
/* eslint-disable import/no-webpack-loader-syntax */
/* eslint-disable no-async-promise-executor */
/* eslint-disable no-console */
/* eslint-disable default-case */
/* eslint-disable no-self-compare */
/* eslint-disable @typescript-eslint/no-shadow */
import { randomUUID } from 'crypto';
import { Worker } from 'worker_threads';
import path from 'path';
import { platform } from 'os';
import { getWorkerPath } from '../workersPaths';
import { getConfig, saveConfig, tempPath } from '../../main/utils';

const workerPath = getWorkerPath('audioConverterToSample');

export default function convertAudioToSample(
  buffer: Buffer,
  mimeType: string
): Promise<Float64Array | Float32Array> {
  const worker = new Worker(workerPath);
  const id = randomUUID();
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
      if (id !== id) return;
      switch (event) {
        case 'result':
          resolve(props.result);
          break;

        case 'error':
          console.log('error', props);
          reject(props.error);
          break;
      }
      worker.off('message', message);
    };

    worker.on('message', message);

    const currentPath = (await getConfig()).ffmpegPath;
    const ffmpegPath = currentPath || (await tryGussingFfmpegLoc());

    if (currentPath !== ffmpegPath)
      await saveConfig({
        ffmpegPath,
      });

    worker.postMessage({
      id,
      buffer,
      mimeType,
      options: {
        tempPath,
        customffmpegPath: ffmpegPath,
      },
    });
  });
}

const pf = platform();
async function tryGussingFfmpegLoc() {
  const listofPossiblePaths = [];

  if (pf === 'win32') {
    const paths = (process.env.path || '')?.split(';');
    paths.forEach((p) => {
      if (
        p.toLowerCase().includes(`ffmpeg`) &&
        p.toLowerCase().includes(`bin`)
      ) {
        listofPossiblePaths.push(path.join(p, './ffmpeg.exe'));
      }
    });
  } else {
    const { default: ffmpegPath } = await import('@ffmpeg-installer/ffmpeg');
    listofPossiblePaths.push(
      ffmpegPath.path?.replace('app.asar', 'app.asar.unpacked') ||
        `/usr/bin/ffmpeg`
    );
  }
  return listofPossiblePaths[0];
}
