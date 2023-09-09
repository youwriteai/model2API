/* eslint-disable no-promise-executor-return */
/* eslint-disable consistent-return */
/* eslint-disable no-throw-literal */
/* eslint-disable import/no-cycle */
/* eslint-disable promise/param-names */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable no-console */
/* eslint-disable no-plusplus */
/* eslint-disable prefer-destructuring */
/* eslint-disable func-names */
import fs from 'fs/promises';
import path from 'path';
import mime from 'mime-types';
import { randomUUID } from 'crypto';
import { WaveFile } from 'wavefile';
import type ff from 'fluent-ffmpeg';
import {
  getConfig,
  saveConfig,
  tempPath,
  tryGussingFfmpegLoc,
} from '../../main/utils';

function runFfmpegSync<T>(command: T): Promise<T> {
  return new Promise((s, r) => {
    // @ts-ignore
    command.on('end', s).on('error', r);
  });
}

const ffmpegDecoder: {
  decodeAudio: any;
  ffmpeg?: typeof ff;
  ffmpegPth: string;
} = {
  ffmpegPth: '',
  async decodeAudio(data: Buffer, mimeType: string) {
    if (!this.ffmpeg) {
      this.ffmpeg = (await import('fluent-ffmpeg')).default;

      this.ffmpegPth =
        (await getConfig()).ffmpegPath || (await tryGussingFfmpegLoc());

      await saveConfig({
        ffmpegPath: this.ffmpegPth,
      });
    }

    process.stdout.write(`ffmpeg loc ${this.ffmpegPth}`);
    this.ffmpeg?.setFfmpegPath(this.ffmpegPth);
    const command = this.ffmpeg?.({});
    const ext = mime.extension(mimeType);
    const tempFilePathOld = path.join(tempPath, `${randomUUID()}.old.${ext}`);
    const tempFilePath = path.join(tempPath, `${randomUUID()}.wav`);
    try {
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
    } catch (err: any) {
      console.log('Error here ?', err);
    } finally {
      await new Promise((s) => setTimeout(s, 500));
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
export default ffmpegDecoder;
