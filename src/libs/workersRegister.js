/* eslint-disable no-restricted-syntax */

'strict';

const path = require('path');
const fs = require('fs');

const appPath = path.join(process.cwd(), './release/app/dist');

const workersPath = path.join(appPath, './workers');

const workers = [
  {
    name: 'xenova',
    path: 'src/libs/@xenova/transformers/worker/worker.js',
  },
  {
    name: 'audioConverterToSample',
    path: 'src/libs/audioConverterToSample/worker.js',
  },
];

try {
  fs.statSync(workersPath);
} catch {
  try {
    fs.mkdirSync(workersPath, {
      recursive: true,
    });
  } catch {
    /* empty */
  }
}

for (const worker of workers) {
  const content = fs.readFileSync(worker.path, 'utf-8');
  fs.writeFileSync(path.join(workersPath, `./${worker.name}.js`), content);
}
