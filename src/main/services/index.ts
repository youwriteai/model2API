/* eslint-disable no-console */
import { IpcMain } from 'electron';
import fastify from 'fastify';
import { DefaultSettings, defaultSettings } from '../utils';
import EmbeddingsService from './embedding';
import ServiceInterface from './types';
import whisperService from './whisper';

const Services = [EmbeddingsService, whisperService];

export default class ServicesSafe {
  services: ServiceInterface[] = [];

  settings: DefaultSettings;

  constructor(settings: DefaultSettings) {
    this.settings = settings;
  }

  setupIpc(ipcMain: IpcMain) {
    Services.forEach((Service) => {
      const t = new Service(ipcMain, this);
      this.services.push(t);
      t.setupIpc();
    });

    ipcMain.on('services', (event) => {
      event.reply('services', this.getServices());
    });
  }

  async setupServerApp(serverApp: ReturnType<typeof fastify>) {
    await Promise.all(
      this.services.map(async (service) => {
        await service.setupServer(serverApp);
      })
    );
  }

  getServices() {
    return this.services.map((s) => s.serviceName);
  }

  async start(names: string[]) {
    return Promise.all(
      this.services
        .filter((s) => names.includes(s.serviceName))
        .map((s) =>
          s.load(defaultSettings.servicesConfig.embeddings, (progress) =>
            console.log(`Service ${s.serviceName}: ${progress}`)
          )
        )
    );
  }
}
