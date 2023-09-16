/* eslint-disable no-nested-ternary */
/* eslint-disable no-console */
import { IpcMain } from 'electron';
import fastify from 'fastify';
import { defaultSettings } from '../utils';
import EmbeddingsService from './embedding';
import ServiceInterface, { DefaultSettings } from './types';
import whisperService from './whisper';

const Services = [whisperService, EmbeddingsService];

export default class ServicesSafe {
  services: ServiceInterface[] = [];

  settings: DefaultSettings;

  constructor(settings: DefaultSettings) {
    this.settings = settings;
  }

  setupIpc(ipcMain: IpcMain) {
    Services.forEach((Service) => {
      const t = new Service(
        ipcMain,
        this,
        defaultSettings.servicesConfig[Service.serviceName]
      );
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
          s.load(defaultSettings.servicesConfig[s.serviceName], (progress) =>
            console.log(`Service ${s.serviceName}: ${progress}`)
          )
        )
    );
  }
}
