import path from 'path';
import { appPath } from '../main/utils';

export const workersDir = path.join(appPath, './dist/workers');

export function getWorkerPath(workerName: string) {
  return path.join(workersDir, `./${workerName}.js`);
}
