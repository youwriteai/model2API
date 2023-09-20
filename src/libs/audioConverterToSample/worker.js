/* eslint-disable no-plusplus */
/* eslint-disable no-console */
/* eslint-disable promise/param-names */
/* eslint-disable no-use-before-define */
/* eslint-disable consistent-return */
const { parentPort } = require('node:worker_threads');

/* eslint-disable prefer-destructuring */
const { WaveFile } = require('wavefile');
const mime = require('mime-types');
const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');

async function convertAudioToSample(buffer, mimeType, options) {
  switch (mime.extension(mimeType)) {
    case 'wav': {
      const wav = new WaveFile(buffer);
      wav.toBitDepth('32f'); // Pipeline expects input as a Float32Array
      wav.toSampleRate(16000); // Whisper expects audio with a sampling rate of 16000
      let audioData = wav.getSamples();
      if (Array.isArray(audioData)) {
        if (audioData.length > 1) {
          const SCALING_FACTOR = Math.sqrt(2);

          // Merge channels (into first channel to save memory)
          for (let i = 0; i < audioData[0].length; ++i) {
            audioData[0][i] =
              (SCALING_FACTOR * (audioData[0][i] + audioData[1][i])) / 2;
          }
        }

        // Select first channel
        audioData = audioData[0];
      }
      return audioData;
    }
    default:
      return (
        (await ffmpegDecoder.decodeAudio(buffer, mimeType, options)) ||
        new Float64Array()
      );
    // return (await audioDecode(buffer)).getChannelData(0);
  }
}

function runFfmpegSync(command) {
  return new Promise((s, r) => {
    // @ts-ignore
    command.on('end', s).on('error', r);
  });
}

const ffmpegDecoder = {
  ffmpegPth: '',
  async decodeAudio(data, mimeType, { tempPath, customffmpegPath }) {
    if (!this.ffmpeg) {
      this.ffmpeg = (await import('fluent-ffmpeg')).default;

      this.ffmpegPth = customffmpegPath;

      process.stdout.write(`\nffmpeg location: ${this.ffmpegPth}\n`);
    }

    this.ffmpeg?.setFfmpegPath(this.ffmpegPth);
    const command = this.ffmpeg?.({});
    const ext = mime.extension(mimeType);
    const tempFilePathOld = path.join(tempPath, `${randomUUID()}.old.${ext}`);
    const tempFilePath = path.join(tempPath, `${randomUUID()}.wav`);
    try {
      await fs.mkdir(path.dirname(tempFilePathOld), { recursive: true });
      await fs.writeFile(tempFilePathOld, data);

      await runFfmpegSync(
        command
          .input(tempFilePathOld)
          // .setStartTime(0)
          // .audioCodec('pcm_s16le')
          // .fromFormat(mimeType)
          .format('wav')
          .save(tempFilePath)
      );

      const newFileContent = await fs.readFile(tempFilePath);
      const wav = new WaveFile(newFileContent);
      wav.toBitDepth('32f'); // Pipeline expects input as a Float32Array
      wav.toSampleRate(16000); // Whisper expects audio with a sampling rate of 16000
      let audioData = wav.getSamples();
      if (audioData && Array.isArray(audioData)) {
        if (audioData.length > 1) {
          const SCALING_FACTOR = Math.sqrt(2);

          // Merge channels (into first channel to save memory)
          for (let i = 0; i < audioData[0].length; ++i) {
            audioData[0][i] =
              (SCALING_FACTOR * (audioData[0][i] + audioData[1][i])) / 2;
          }
        }
        // Select first channel
        audioData = audioData[0];
      }

      return audioData;

      // const child = execFile(
      //   'ffmpeg',
      //   [
      //     '-i',
      //     tempFile,
      //     '-ss',
      //     start,
      //     '-t',
      //     duration,
      //     '-f',
      //     'wav',
      //     '-acodec',
      //     'pcm_s32le',
      //     'pipe:1',
      //   ],
      //   { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 },
      //   (err: any, result: any, stderr: any) => {
      //     if (err) return cb(err);
      //     context.decodeAudioData(
      //       new Uint8Array(result).buffer,
      //       function (result) {
      //         cb(null, result);
      //       },
      //       function (err) {
      //         cb(err || new Error('Decode error'));
      //       }
      //     );
      //   }
      // );
      // child.stdin.end();
    } catch (err) {
      try {
        fs.rm(tempFilePathOld);
      } catch {
        console.log("couldn't delete templFilePathOld");
      }
      try {
        fs.rm(tempFilePath);
      } catch {
        console.log("couldn't delete templFilePath");
      }
      throw new Error(err);
    } finally {
      await new Promise((s) => {
        setTimeout(s, 500);
      });
      try {
        fs.rm(tempFilePathOld);
      } catch {
        console.log("couldn't delete templFilePathOld");
      }
      try {
        fs.rm(tempFilePath);
      } catch {
        console.log("couldn't delete templFilePath");
      }
    }
  },
};

parentPort.on('message', async ({ id, buffer, mimeType, options }) => {
  try {
    const result = await convertAudioToSample(
      Buffer.from(buffer),
      mimeType,
      options
    );

    parentPort.postMessage({
      id,
      event: 'result',
      props: {
        result,
      },
    });
  } catch (error) {
    parentPort.postMessage({
      id,
      event: 'error',
      props: {
        error,
      },
    });
  }
});
