/* eslint-disable prefer-const */
/* eslint-disable no-use-before-define */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
import { BrowserWindow, ipcMain } from 'electron';
import * as http from 'http';
import fastify from 'fastify';
import cors from '@fastify/cors';
import ServicesSafe from './services';
import setupElectronTools from './electron';

// Initialize Express
let server: http.Server | null = null;
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

ipcMain.on('start-server', async (event, { port, selectedModel }) => {
  try {
    if (server) {
      await closeServer();
    }

    await initServer(port);

    event.reply('server-status', `Server running on http://localhost:${port}`);
  } catch (err: any) {
    console.log(err);
    event.reply('error', err.message);
  }
});

ipcMain.on('stop-server', (event) => {
  if (!server) return;
  server.close(() => {
    console.log('Server stopped.');
    event.reply('server-status', 'Server stopped.');
    server = null;
  });
});

ipcMain.on('change-port', async (event, newPort) => {
  if (!server) return;
  await closeServer();
  initServer(newPort);
});

services.setupIpc(ipcMain);

let mainWindow: BrowserWindow | null = null;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

setupElectronTools(mainWindow);
