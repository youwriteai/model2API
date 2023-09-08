/* eslint-disable no-unreachable */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable class-methods-use-this */
// post events {service-name}-models, {service-name}-status, {service-name}-load, {service-name}-unload

import { IpcMain } from 'electron';
import fastify from 'fastify';
import { AsyncReturnType } from 'types/utils';
import { pipeline as Pip } from '@xenova/transformers';
import fastifyMultipart from '@fastify/multipart';
import { convertAudioToSample, getAvailableModels, modelsDir } from '../utils';
import ServiceInterface from './types';
import ServiceBase from './base';
import type ServicesSafe from '.';
import audioType from '../../libs/audio-type';

const Models = [
  'Xenova/whisper-tiny.en',
  'Xenova/whisper-tiny',
  'Xenova/whisper-small.en',
  'Xenova/whisper-small',
  'Xenova/whisper-base.en',
  'Xenova/whisper-base',
  'Xenova/whisper-medium.en',
  'Xenova/whisper-large',
  'Xenova/whisper-large-v2',
  'Xenova/nb-whisper-tiny-beta',
  'Xenova/nb-whisper-small-beta',
  'Xenova/nb-whisper-base-beta',
  'Xenova/nb-whisper-medium-beta',
];

const serviceName = 'wisper';

export default class WisperService
  extends ServiceBase
  implements ServiceInterface
{
  static serviceName = serviceName;

  serviceName = serviceName;

  extractor: AsyncReturnType<typeof Pip> | null | undefined;

  actualModel: string = Models[0];

  constructor(ipc: IpcMain, safe: ServicesSafe) {
    super(safe);
    this.ipc = ipc;
  }

  async load(props: { selectedModel: string }, cb: (progress: any) => void) {
    // eslint-disable-next-line no-new-func
    const { pipeline }: { pipeline: typeof Pip } = await Function(
      'return import("@xenova/transformers")'
    )();
    this.extractor = await pipeline(
      'automatic-speech-recognition',
      props.selectedModel,
      {
        progress_callback: cb,
        // quantized: false,
        cache_dir: modelsDir,
      }
    );
  }

  async getModels() {
    const available = await getAvailableModels();
    return {
      models: Models.map((m) => ({
        name: m,
        loaded: available[m],
      })),
    };
  }

  async setupServer(app: ReturnType<typeof fastify>) {
    await app.register(fastifyMultipart, {
      prefix: '/audio/transcriptions',
      throwFileSizeLimit: false,
    });

    app.post('/audio/transcriptions', async (req, reply) => {
      try {
        // @ts-ignore
        const model = undefined as any;

        if (model && model !== this.actualModel) {
          this.actualModel = Models.includes(model) ? model : Models[0];
          await this.load({ selectedModel: this.actualModel }, console.log);
        }
        if (!this.extractor) {
          return reply.status(500).send({ error: 'Extractor not initialized' });
        }

        const data = await req.file();
        const buff = await data?.toBuffer();

        let result = '';
        if (data && buff) {
          const audioData = await convertAudioToSample(buff);
          console.log(audioData, audioType(buff));
          result = await this.transcript(audioData);
        }

        console.log({ result });

        return reply.send({
          text: result,
        });
      } catch (error: any) {
        return reply.status(500).send({ error: error.message });
      }
    });
    app.get('/audio/transcriptions/models', (req, reply) => {
      reply.send({ models: Models });
    });
  }

  async transcript(input: Float32Array | Float64Array): Promise<string> {
    const results = await this.extractor?.(input);
    console.log(results);
    return results?.text;
  }
}
