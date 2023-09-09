/* eslint-disable prefer-const */
/* eslint-disable no-use-before-define */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
import { BrowserWindow, ipcMain } from 'electron';
import fastify from 'fastify';
import cors from '@fastify/cors';
// @ts-ignore
import fastifyExpressPlugin from '@fastify/express';
// @ts-ignore
import queue from 'express-queue';
import ServicesSafe from './services';
import setupElectronTools from './electron';
import { getConfig } from './utils';

try {
  (async () => {
    const settings = await getConfig();

    // Initialize Express
    let serverApp = fastify();

    let queueExpress = queue({
      activeLimit: settings.activeLimit,
      queuedLimit: settings.queuedLimit,
    });

    const services = new ServicesSafe(settings);

    async function initServer(port: number) {
      serverApp = fastify();
      queueExpress = queue({
        activeLimit: settings.activeLimit,
        queuedLimit: settings.queuedLimit,
      });

      await serverApp.register(fastifyExpressPlugin);

      // @ts-ignore
      serverApp.use(queueExpress);

      await serverApp.register(cors, {
        // put your options here
        allowedHeaders: '*',
      });

      // serverApp.options('/*', async (_req, reply) => {
      //   return reply.status(200);
      // });

      await services.setupServerApp(serverApp);

      serverApp.listen({
        port,
      });
    }

    async function closeServer() {
      if (serverApp) await serverApp.close();
      return null;
    }

    async function startServer(port: number) {
      await closeServer();
      await initServer(port);

      console.log(`Server Running on port ${port}`);
    }

    services.setupIpc(ipcMain);
    let mainWindow: BrowserWindow | null = null;

    if (settings.gui) {
      ipcMain.on('start-server', async (event, { port }) => {
        try {
          await startServer(port);
          event.reply('server-status', `Running`, port);
        } catch (err: any) {
          console.log(err);
          event.reply('error', err.message);
        }
      });

      ipcMain.setMaxListeners(200);

      ipcMain.on('stop-server', async (event) => {
        await closeServer();
        console.log('Server stopped.');
        event.reply('server-status', 'Stopped');
      });

      ipcMain.on('change-port', async (event, newPort) => {
        await startServer(newPort);
      });

      ipcMain.on('ipc-example', async (event, arg) => {
        const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
        console.log(msgTemplate(arg));
        event.reply('ipc-example', msgTemplate('pong'));
      });

      setupElectronTools(mainWindow);
    } else {
      (async () => {
        await startServer(settings.port);

        await services.start(settings.starting);
      })();
    }
  })();
} catch (err: any) {
  process.stdout.write(err.message || err);
}
