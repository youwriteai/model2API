import { IpcMain } from 'electron';
import fastify from 'fastify';
import EmbeddingsService from './embedding';
import ServiceInterface from './types';

const Services = [EmbeddingsService];

export default class ServicesSafe {
  services: ServiceInterface[] = [];

  // constructor() {}

  setupIpc(ipcMain: IpcMain) {
    Services.forEach((Service) => {
      const t = new Service(ipcMain);
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
}
