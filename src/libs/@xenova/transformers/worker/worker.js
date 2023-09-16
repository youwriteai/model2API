/* eslint-disable default-case */
/* eslint-disable prettier/prettier */
/* eslint-disable no-console */
// worker.js
const { parentPort } = require('node:worker_threads');

let extractor;
console.log("hello from the web worker")

parentPort.on('message', async (props) => {
  switch (props.event) {
    case "loadModel":
      try {
        console.log({ props });

        // eslint-disable-next-line no-new-func
        const { pipeline } = await Function(
          'return import("@xenova/transformers")'
        )();

        this.extractor = await pipeline(props.type, props.model, {
          ...props.options,
          progress_callback: (progress) => {
            parentPort.postMessage({
              event:'loadModel-progress',
              props:{
                progress
              }
            });
          },
        });

        parentPort.postMessage({
          event: "loadModel-done"
        });

      } catch (error) {
        parentPort.postMessage({
          event: 'loadModel-error',
          props:{
            error
          }
        });
      }
      break;

    case "execute":
      try {
        const result = await extractor?.(props.input, {
          pooling: 'mean',
          normalize: true,
          ...props.options,
        });

        console.log({ result });

        parentPort.postMessage({
          id: props.id,
          event: "result",
          props:{
            result
          }
        });

      } catch (error) {
        parentPort.postMessage({
          id: props.id,
          event: "error",
          props:{
            error
          }
        });
      }
  }
});

parentPort.on('close', () => {
  console.log('goodbye worker');
});
