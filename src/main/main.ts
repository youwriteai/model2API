/* eslint-disable prefer-const */
/* eslint-disable no-use-before-define */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
import { BrowserWindow, ipcMain } from 'electron';
import fastify from 'fastify';
import cors from '@fastify/cors';
import ServicesSafe from './services';
import setupElectronTools from './electron';

// Initialize Express
let serverApp = fastify();

const services = new ServicesSafe();

async function initServer(port: number) {
  serverApp = fastify();

  await serverApp.register(cors, {
    // put your options here
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

ipcMain.on('start-server', async (event, { port }) => {
  try {
    await closeServer();

    await initServer(port);

    console.log(`Server Running on port ${port}`);
    event.reply('server-status', `Running`, port);
  } catch (err: any) {
    console.log(err);
    event.reply('error', err.message);
  }
});

ipcMain.on('stop-server', async (event) => {
  await closeServer();
  console.log('Server stopped.');
  event.reply('server-status', 'Stopped');
});

ipcMain.on('change-port', async (event, newPort) => {
  await closeServer();
  await initServer(newPort);
});

services.setupIpc(ipcMain);

let mainWindow: BrowserWindow | null = null;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

setupElectronTools(mainWindow);
