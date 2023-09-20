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

        extractor = await pipeline(props.type, props.model, {
          ...props.options,
          progress_callback: (progress) => {
            parentPort.postMessage({
              event: 'loadModel-progress',
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
        const results = [""];
        let lastTokensLength = 0;
        await extractor?.(props.input, {
          chunk_length_s: 20,
          stride_length_s: 5,
          ...props.options,
          callback_function (beams) {
            const decodedText = extractor.tokenizer.decode(beams[0].output_token_ids, {
                skip_special_tokens: true,
            })

            if (beams[0].output_token_ids.length < lastTokensLength) results.push("");

            results[results.length - 1] = decodedText;

            lastTokensLength = beams[0].output_token_ids.length;

            parentPort.postMessage({
              id: props.id,
              event: 'update',
              props:{
                index: results.length -1,
                result: decodedText.trim()
              }
            });
        }
        });

        await new Promise((resolve)=>{
          const lastResults = results.join("");
          const intime = setInterval(()=>{
            if(lastResults === results.join("")){
              resolve(null);
              clearInterval(intime);
            }
          }, 500)
        })


        parentPort.postMessage({
          id: props.id,
          event: "result",
          props:{
            result: results.join("\n")
          }
        });

      } catch (error) {
        parentPort.postMessage({
          id: props.id,
          event: "error",
          props:{
            error: error?.message || error
          }
        });
      }
  }
});
