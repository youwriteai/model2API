/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import express, { Request, Response } from 'express';
import * as http from 'http';
import { platform } from 'os';
import { pipeline as Pip } from '@xenova/transformers';
import Models from '../consts/models';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import type { ExtractorStatus } from '../types/extractor-status';
import type { AsyncReturnType } from '../types/utils';

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

// eslint-disable-next-line no-undef
let extractor: AsyncReturnType<typeof Pip> | null = null;
let goingModel = '';
async function initializeExtractor(
  selectedModel: string,
  cb?: (data: ExtractorStatus) => void
) {
  // eslint-disable-next-line no-new-func
  const { pipeline }: { pipeline: typeof Pip } = await Function(
    'return import("@xenova/transformers")'
  )();
  extractor = await pipeline('feature-extraction', selectedModel, {
    progress_callback: cb,
    quantized: false,
  });
  goingModel = selectedModel;
}

async function unloadExtractor() {
  if (!extractor) return;

  extractor = null;
}

let actualModel: string = Models[0];
initializeExtractor(actualModel);

// Initialize Express
const expressApp = express();
expressApp.use(express.json());

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function createEmbedding(input: string, _model: string): Promise<any> {
  const results = await extractor?.(input, {
    pooling: 'mean',
    normalize: true,
  });
  return results?.data;
}

// Create a simple "Hello, World!" API endpoint
expressApp.post('/api/embeddings', async (req: Request, res: Response) => {
  try {
    const { input, model } = req.body;

    if (model && model !== actualModel) {
      actualModel = model;
      await initializeExtractor(actualModel);
    }
    if (!extractor) {
      return res.status(500).json({ error: 'Extractor not initialized' });
    }

    let embeddings;

    if (Array.isArray(input)) {
      embeddings = await Promise.all(
        input.map((singleInput) => createEmbedding(singleInput, model))
      );
    } else {
      embeddings = await createEmbedding(input, model);
    }

    const results = {
      model: actualModel,
      usage: {
        prompt_tokens: 8,
        total_tokens: 8,
      },
      data: Array.isArray(embeddings)
        ? embeddings.map((embedding, index) => ({
            object: 'embedding',
            embedding,
            index,
          }))
        : [
            {
              object: 'embedding',
              embedding: embeddings,
              index: 0,
            },
          ],
    };

    return res.json(results);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

let server: http.Server | null = null;

function closeServer() {
  if (server)
    return new Promise((resolve) => {
      server?.close(resolve);
    });
  return null;
}

let lastStatus: ExtractorStatus | null = null;
ipcMain.on('load-model', async (event, { selectedModel }) => {
  try {
    console.log('Changing to ', selectedModel, '...');
    await initializeExtractor(selectedModel, (data) => {
      lastStatus = data;
      event.reply('status', data);
    });
  } catch (err: any) {
    console.log(err);
    event.reply('error', err.message);
  }
});

ipcMain.on('status', async (event) => {
  event.reply('status', lastStatus);
});

ipcMain.on('start-server', async (event, { port, selectedModel }) => {
  try {
    if (server) {
      await closeServer();
    }
    server = http.createServer(expressApp);
    server.listen(port, () => {
      console.log(`Server running on http://localhost:${port}/`);
      event.reply(
        'server-status',
        `Server running on http://localhost:${port}/ model: ${actualModel}`
      );
    });
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
  server = http.createServer(expressApp);
  server.listen(newPort, () => {
    console.log(`Server running on http://localhost:${newPort}/`);
    event.reply(
      'server-status',
      `Server running on http://localhost:${newPort}/`
    );
  });
});

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

if (isProduction) {
  import('source-map-support').then((d) => d.install).catch(console.log);
}

if (isDevelopment) {
  import('electron-debug').then((d) => d.default()).catch(console.log);
}

const installExtensions = async () => {
  const installer = await import('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map(
        (name) => installer[name as keyof typeof installer] as any
      ),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDevelopment) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (platform() !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });

    return null;
  })
  .catch(console.log);
