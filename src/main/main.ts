import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import express, { Request, Response } from 'express';
import * as http from 'http';
import bodyParser from 'body-parser';

let extractor: any; 
async function initializeExtractor(selectedModel: string) {
  const TransformersApi = Function('return import("@xenova/transformers")')();
  const { pipeline } = await TransformersApi;
  extractor = await pipeline('feature-extraction', selectedModel);
}

let actualModel: string = "Xenova/all-MiniLM-L12-v2"
initializeExtractor(actualModel);

// Initialize Express
const expressApp = express();
expressApp.use(bodyParser.json());
// Create a simple "Hello, World!" API endpoint
expressApp.post('/api/embeddings', async (req: Request, res: Response) => {
  const { input, model } = req.body;

  if (model && model !== actualModel){
    actualModel = model
    await initializeExtractor(actualModel);
  }
  try {
    if (!extractor) {
      return res.status(500).json({ error: 'Extractor not initialized'});
    }

    let embeddings;

    if (Array.isArray(input)) {
      embeddings = await Promise.all(input.map(singleInput => createEmbedding(singleInput, model)));
    } else {
      embeddings = await createEmbedding(input, model);
    }


    const results = {
      model: actualModel,
      usage: {
        prompt_tokens: 8,
        total_tokens: 8
      },
      data: Array.isArray(embeddings) ? embeddings.map((embedding, index) => ({
        object: 'embedding',
        embedding,
        index
      })) : [{
        object: 'embedding',
        embedding: embeddings,
        index: 0
      }]
    };

    return res.json(results);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

async function createEmbedding(input: string, model: string): Promise<any> {
  const results = await extractor(input, { pooling: 'mean', normalize: true });
  return results.data;
}

let server;
ipcMain.on('start-server', async (event, {port,selectedModel}) => {
  if (!server) {
    if (selectedModel !== actualModel){
      actualModel = selectedModel
      console.log("Changing to ",selectedModel,"...")
      await initializeExtractor(actualModel);
      console.log("ِActual model = ",model)
    }
    server = http.createServer(expressApp);
    server.listen(port, () => {
      console.log(`Server running on http://localhost:${port}/`);
      event.reply('server-status', `Server running on http://localhost:${port}/ model: ${actualModel}`);
    });
  }
});

ipcMain.on('stop-server', (event) => {
  if (server) {
    server.close(() => {
      console.log("Server stopped.");
      event.reply('server-status', 'Server stopped.');
      server = null;
    });
  }
});

ipcMain.on('change-port', (event, newPort) => {
  if (server) {
    server.close(() => {
      server = http.createServer(expressApp);
      server.listen(newPort, () => {
        console.log(`Server running on http://localhost:${newPort}/`);
        event.reply('server-status', `Server running on http://localhost:${newPort}/`);
      });
    });
  }
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

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
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
  if (process.platform !== 'darwin') {
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
  })
  .catch(console.log);
