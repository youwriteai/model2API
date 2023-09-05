/* eslint-disable no-unreachable */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable class-methods-use-this */
// post events {service-name}-models, {service-name}-status, {service-name}-load, {service-name}-unload

import { IpcMain } from 'electron';
import fastify from 'fastify';
import { AsyncReturnType } from 'types/utils';
import { pipeline as Pip } from '@xenova/transformers';
import path from 'path';
import { ExtractorStatus } from 'types/extractor-status';
import { getAvailableModels, modelsDir } from '../utils';
import Models from '../../consts/models';
import ServiceInterface from './types';
import ServiceBase from './base';

const serviceName = 'embeddings';

export default class EmbeddingsService
  extends ServiceBase
  implements ServiceInterface
{
  static serviceName = serviceName;

  serviceName = serviceName;

  extractor: AsyncReturnType<typeof Pip> | null | undefined;

  actualModel: string = Models[0];

  constructor(ipc: IpcMain) {
    super();
    this.ipc = ipc;
  }

  async load(props: { selectedModel: string }, cb: (progress: any) => void) {
    await this.initializeExtractor(props.selectedModel, cb);
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
    app.post('/api/embeddings', async (req, reply) => {
      try {
        // @ts-ignore
        const { input, model } = (await req.body()) as any;

        if (model && model !== this.actualModel) {
          this.actualModel = Models.includes(model) ? model : Models[0];
          await this.initializeExtractor(this.actualModel);
        }
        if (!this.extractor) {
          return reply.status(500).send({ error: 'Extractor not initialized' });
        }

        const results = {
          model: this.actualModel,
          usage: {
            prompt_tokens: 8,
            total_tokens: 8,
          },
          data: (
            await Promise.all(
              Array.isArray(input)
                ? input.map((singleInput) =>
                    this.createEmbedding(singleInput, model)
                  )
                : [this.createEmbedding(input, model)]
            )
          ).map((embedding: any, index: any) => ({
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

  async initializeExtractor(
    selectedModel: string,
    cb?: (data: ExtractorStatus) => void
  ) {
    // eslint-disable-next-line no-new-func
    const { pipeline }: { pipeline: typeof Pip } = await Function(
      'return import("@xenova/transformers")'
    )();
    this.extractor = await pipeline('feature-extraction', selectedModel, {
      progress_callback: cb,
      // quantized: false,
      cache_dir: modelsDir,
    });
  }

  async createEmbedding(input: string, _model: string): Promise<any> {
    const results = await this.extractor?.(input, {
      pooling: 'mean',
      normalize: true,
    });
    return results?.data;
  }
}
