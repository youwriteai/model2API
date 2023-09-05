/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import fs from 'fs/promises';
import path from 'path';

export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

const exePath = process.argv[0];
export const modelsDir = path.join(
  isDevelopment ? process.cwd() : path.join(exePath, '..'),
  './models'
);

console.log(modelsDir);

// eslint-disable-next-line import/prefer-default-export
export async function getAvailableModels() {
  const folderPaths: Record<string, true> = {};
  const absoluteRootDir = path.resolve(modelsDir); // Ensure we have an absolute path

  const items = await fs.readdir(absoluteRootDir);

  for (const item of items) {
    const itemsPath = path.join(absoluteRootDir, item);
    const items2 = await fs.readdir(itemsPath);

    for (const item2 of items2) {
      folderPaths[`${item}/${item2}`] = true;
    }
  }

  return folderPaths;
}
