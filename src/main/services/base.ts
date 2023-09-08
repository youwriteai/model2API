/* eslint-disable class-methods-use-this */
/* eslint-disable no-console */
import { IpcMain } from 'electron';
import fastify from 'fastify';
import { getAvailableModels } from '../utils';
import Models from '../../consts/models';
import ServiceInterface from './types';
import type ServicesSafe from '.';

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
          event.reply(`${this.serviceName}-status`, data);
        });
      } catch (err: any) {
        console.log(err);
        event.reply('error', err.message);
      }
    });

    this.ipc?.on(`${this.serviceName}-status`, async (event) => {
      event.reply(`${this.serviceName}-status`, await this.getStatus());
    });

    this.ipc?.on(`${this.serviceName}-models`, async (event) => {
      event.reply(`${this.serviceName}-models`, await this.getModels());
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setupServer(_app: ReturnType<typeof fastify>): Promise<void> {
    throw new Error(
      `Method setupServer not implemented. in service ${this.serviceName}`
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
    // eslint-disable-next-line no-empty-function
  ) {}
}
