// /* eslint-disable prefer-const */
// /* eslint-disable no-use-before-define */
// /* eslint-disable @typescript-eslint/no-unused-vars */
// /* eslint-disable no-console */
import type { BrowserWindow } from 'electron';
import { ipcMain } from 'electron';
import { saveConfig } from './utils';
import ServicesSafe from './services';

try {
  (async () => {
    const { default: fastify } = await import('fastify');
    const { default: cors } = await import('@fastify/cors');
    // @ts-ignore
    const { default: fastifyExpressPlugin } = await import('@fastify/express');
    // @ts-ignore
    const { default: queue } = await import('express-queue');
    const { default: setupElectronTools } = await import('./electron');
    const { getConfig } = await import('./utils');

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

      await serverApp.listen({
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
    const mainWindow: BrowserWindow | null = null;

    if (settings.gui) {
      ipcMain.on('start-server', async (event, { port }) => {
        try {
          await startServer(port);

          event.reply('server-status', `Running`, (settings.port = port));

          await saveConfig({
            port,
          });
        } catch (err: any) {
          console.log(err);
          event.reply('error', err.message);
        }
      });

      ipcMain.on('default-settings', async (event) => {
        try {
          event.reply('default-settings', settings.port);
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
      try {
        (async () => {
          await startServer(settings.port);

          await services.start(settings.starting);
        })();
      } catch (err: any) {
        process.stdout.write(err.message);
        process.exit();
      }
    }
  })();
} catch (err: any) {
  process.stdout.write(err.message || err);
}

// process.stdout.write(`\n${tempPath}\n${modelsDir}`);
