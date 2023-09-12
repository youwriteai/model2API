/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-console */
import { IpcMain } from 'electron';
import fastify from 'fastify';
import { getAvailableModels } from '../utils';
import Models from '../../consts/models';
import ServiceInterface from './types';
import type ServicesSafe from '.';
import type { ServiceInfo } from '../../types/service';

const serviceName = 'default';
export default class ServiceBase implements ServiceInterface {
  serviceName: string = serviceName;

  safe: ServicesSafe;

  ipc: IpcMain | undefined;

  lastStatus: any;

  constructor(safe: any) {
    this.safe = safe;
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
