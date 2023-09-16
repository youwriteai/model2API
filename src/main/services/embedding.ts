/* eslint-disable prefer-const */
/* eslint-disable no-unreachable */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable class-methods-use-this */
// post events {service-name}-models, {service-name}-status, {service-name}-load, {service-name}-unload

import { IpcMain } from 'electron';
import fastify from 'fastify';
import { pipeline as Pip } from '@xenova/transformers';
import { AsyncReturnType } from '../../types/utils';
import { getAvailableModels, modelsDir } from '../utils';
import Models from '../../consts/models';
import ServiceInterface, { ServiceConfig } from './types';
import type ServicesSafe from '.';
import ServiceBase from './base';
import type { ServiceInfo } from '../../types/service';

const serviceName = 'Embeddings';

export default class EmbeddingsService
  extends ServiceBase
  implements ServiceInterface
{
  static serviceName = serviceName;

  serviceName = serviceName;

  extractor: AsyncReturnType<typeof Pip> | null | undefined;

  usedModel: string = Models[0];

  models = Models;

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

    // eslint-disable-next-line no-new-func
    const { pipeline }: { pipeline: typeof Pip } = await Function(
      'return import("@xenova/transformers")'
    )();
    this.extractor = await pipeline('feature-extraction', model, {
      progress_callback: cb,
      // quantized: false,
      cache_dir: modelsDir,
    });
  }

  async getInfo(): Promise<ServiceInfo> {
    const available = await getAvailableModels();
    return {
      description: '',
      examples: [
        {
          curl: `curl --location '{{basepath}}/embeddings' \\
          --header 'Content-Type: application/json' \\
          --data '{"input": ["some_input","some_input","some_input1235465","some_input3"]}'`,
          urlPath: `/embeddings`,
          body: {
            input: {
              defaultValue: [
                'some_input',
                'some_input',
                'some_input1235465',
                'some_input3',
              ],
              type: 'object',
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
    // on requesting embeddings of text
    app.post('/api/embeddings', async (req, reply) => {
      try {
        let { input, model } = (await req.body) as any;

        try {
          input = JSON.parse(input);
        } catch {
          input = [input];
        }

        const requestingModel = this.getRequestedModel(model);

        if (requestingModel !== this.usedModel) {
          this.usedModel = requestingModel;
          await this.load({ selectedModel: this.usedModel }, console.log);
        }

        // if (!this.extractor) {
        //   return reply.status(500).send({
        //     error: 'Extractor not initialized, try loading a model first',
        //   });
        // }

        const results = {
          model: this.usedModel,
          usage: {
            prompt_tokens: 8,
            total_tokens: 8,
          },
          data: (
            await Promise.all(
              input.map((singleInput: string) =>
                this.createEmbedding(singleInput)
              )
            )
          ).map((embedding, index) => ({
            object: 'embedding',
            embedding,
            index,
          })),
        };

        return reply.send(results);
      } catch (error: any) {
        return reply.status(500).send({ error: error.message });
      }
    });
    app.get('/api/embeddings/models', (req, reply) => {
      reply.send({ models: Models });
    });
  }

  async createEmbedding(input: string): Promise<any> {
    const results = await this.extractor?.(input, {
      pooling: 'mean',
      normalize: true,
    });
    return results?.data;
  }
}
