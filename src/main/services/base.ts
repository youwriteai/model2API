/* eslint-disable no-nested-ternary */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-console */
import { IpcMain } from 'electron';
import fastify from 'fastify';
import { getAvailableModels } from '../utils';
import Models from '../../consts/models';
import ServiceInterface, { ServiceConfig } from './types';
import type ServicesSafe from '.';
import type { ServiceInfo } from '../../types/service';

const serviceName = 'default';
export default class ServiceBase implements ServiceInterface {
  serviceName: string = serviceName;

  safe: ServicesSafe;

  ipc: IpcMain | undefined;

  lastStatus: any;

  config: ServiceConfig | null;

  usedModel: string | undefined;

  models: string[] = Models;

  constructor(safe: any, config: any) {
    this.safe = safe;
    this.config = config || null;
  }

  async setupIpc(): Promise<void> {
    this.ipc?.on(`${this.serviceName}-load`, async (event, options) => {
      try {
        await this.load(options, (data) => {
          this.lastStatus = data;
          this.sendStatus(data);
        });
      } catch (err: any) {
        console.log(err);
        this.sendError(err.message);
      }
    });

    this.ipc?.on(`${this.serviceName}-status`, async (e) => {
      e.reply?.(await this.getStatus());
    });

    this.ipc?.on(`${this.serviceName}-info`, async (e) => {
      e.reply?.(`${this.serviceName}-info`, await this.getInfo());
    });
  }

  getRequestedModel(model: string | null | undefined) {
    const k = model?.length
      ? //  priority 1: check if trying to use an existing model
        this.models.includes(model)
        ? model
        : // priority 2: check if there is an explicit alias (not a regix)
          this.config?.modelAliases?.[model] ||
          // priority 3: use Already loaded model
          this.usedModel ||
          // priority 4: check if there is regex alias
          Object.entries(this.config?.modelAliases || {}).filter(
            ([keyreg, res]) => new RegExp(keyreg).test(model)
          )[0]?.[1]
      : // if model was not provided use the already loaded model
        this.usedModel ||
        // incase of used model being undefined
        this.models[0];

    return typeof k === 'number' ? this.models[k] : k;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setupServer(_app: ReturnType<typeof fastify>): Promise<void> {
    throw new Error(
      `Method setupServer not implemented. in service ${this.serviceName}`
    );
  }

  protected sendStatus(stats: any) {
    this.ipc?.once(`${this.serviceName}-ping`, (e) =>
      e.reply(`${this.serviceName}-status`, stats)
    );
  }

  protected sendError(error: any) {
    this.ipc?.once(`${this.serviceName}-ping`, (e) =>
      e.reply(`${this.serviceName}-error`, error)
    );
  }

  async getInfo(): Promise<ServiceInfo> {
    const available = await getAvailableModels();
    return {
      examples: [],
      description: '',
      models: Models.map((m) => ({
        name: m,
        loaded: available[m],
      })),
    };
  }

  async getStatus() {
    return this.lastStatus;
  }

  async load(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: {
      selectedModel: string;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _cb: (progress: any) => void
    // eslint-disable-next-line no-empty-function, @typescript-eslint/no-empty-function
  ) {}
}
