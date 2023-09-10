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

const serviceName = 'Whisper';

export default class whisperService
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
      prefix: '/api/audio/transcriptions',
      throwFileSizeLimit: false,
      // attachFieldsToBody: true,
      addToBody: true,
    });

    app.post(
      '/api/audio/transcriptions',
      {
        schema: {
          consumes: ['multipart/form-data'],
          body: {
            type: 'object',
            properties: {
              model: {
                type: 'string',
              },
              file: {
                format: 'binary',
              },
            },
          },
        },
      },
      async (req, reply) => {
        try {
          const { file, model } = (await req.body) as {
            model: string;
            file: {
              data: any;
              mimetype: string;
            }[];
          };
          if (model && model !== this.actualModel) {
            this.actualModel = Models.includes(model) ? model : Models[0];
            await this.load(
              { selectedModel: this.actualModel },
              this.sendStatus.bind(this)
            );
          }

          if (!this.extractor)
            await this.load(
              { selectedModel: this.actualModel },
              this.sendStatus.bind(this)
            );

          if (!file?.[0]) throw new Error('You need at least one audio file');

          const data = file[0];
          const buff = data.data;

          let result = '';
          if (data && buff) {
            const audioData = await convertAudioToSample(buff, data.mimetype);
            result = await this.transcript(audioData);
          }

          return reply.send({
            text: result,
          });
        } catch (error: any) {
          return reply.status(500).send({ error: error.message });
        }
      }
    );
    app.get('/api/audio/transcriptions/models', (req, reply) => {
      reply.send({ models: Models });
    });
  }

  async transcript(input: Float32Array | Float64Array): Promise<string> {
    const results = await this.extractor?.(input);
    return results?.text;
  }
}
