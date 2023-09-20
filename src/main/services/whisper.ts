/* eslint-disable no-unreachable */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable class-methods-use-this */
// post events {service-name}-models, {service-name}-status, {service-name}-load, {service-name}-unload

import { IpcMain } from 'electron';
import fastify from 'fastify';
import { pipeline as Pip } from '@xenova/transformers';
import fastifyMultipart from '@fastify/multipart';
import { Worker } from 'worker_threads';
import execute, { loadModel } from '../../libs/@xenova/transformers/worker';
import convertAudioToSample from '../../libs/audioConverterToSample';
import { AsyncReturnType } from '../../types/utils';
import { getAvailableModels, modelsDir } from '../utils';
import ServiceInterface, { ServiceConfig } from './types';
import ServiceBase from './base';
import type ServicesSafe from '.';
import type { ServiceInfo } from '../../types/service';

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

  extractorWorker: Worker | null | undefined;

  usedModel: string = Models[0];

  constructor(ipc: IpcMain, safe: ServicesSafe, config: ServiceConfig) {
    super(safe, config);
    this.ipc = ipc;
  }

  async load(
    props: Parameters<ServiceInterface['load']>[0],
    cb: Parameters<ServiceInterface['load']>[1]
  ) {
    const model =
      typeof props.selectedModel === 'number'
        ? Models[props.selectedModel]
        : props.selectedModel || this.usedModel || Models[0];

    this.extractorWorker = await loadModel(
      'automatic-speech-recognition',
      model,
      {
        progress_callback: cb,
        // quantized: false,
        cache_dir: modelsDir,
      }
    );
  }

  async getInfo(): Promise<ServiceInfo> {
    const available = await getAvailableModels();
    return {
      description: '',
      examples: [
        {
          urlPath: `/audio/transcriptions`,
          body: {
            file: {
              type: 'file',
              multiple: false,
              accept: 'audio/*',
            },
          },
        },
      ],
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
      limits: {
        fileSize: 999999999999999,
      },
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

          const requestingModel = this.getRequestedModel(model);

          if (!this.extractorWorker || requestingModel !== this.usedModel) {
            this.usedModel = requestingModel;
            await this.load({ selectedModel: this.usedModel }, console.log);
          }

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
    if (!this.extractorWorker) return '';
    const results = await execute(this.extractorWorker, input);
    return results?.text;
  }
}
