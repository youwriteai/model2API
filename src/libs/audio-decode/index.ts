/* eslint-disable no-plusplus */
/* eslint-disable no-return-assign */
/* eslint-disable no-undef */
/**
 * Web-Audio-API decoder
 * @module  audio-decode
 */

import wav from 'node-wav';
import AudioBufferShim from '../audio-buffer';
import getType from '../audio-type';

const AudioBuffer = globalThis.AudioBuffer || AudioBufferShim;

function createBuffer({ channelData, sampleRate }: any) {
  const audioBuffer = new AudioBuffer({
    sampleRate,
    length: channelData[0].length,
    numberOfChannels: channelData.length,
  });
  for (let ch = 0; ch < channelData.length; ch++)
    audioBuffer.getChannelData(ch).set(channelData[ch]);
  return audioBuffer;
}

export const decoders = {
  async oga(buff: Buffer) {
    // @ts-ignore
    const { OggVorbisDecoder } = await import(
      '@wasm-audio-decoders/ogg-vorbis'
    );
    const decoder = new OggVorbisDecoder();
    await decoder.ready;
    return (decoders.oga = async (buf: Buffer) =>
      buf && createBuffer(await decoder.decodeFile(buf)))(buff);
  },
  async mp3(buff: Buffer) {
    const { MPEGDecoder } = await import('mpg123-decoder');
    const decoder = new MPEGDecoder();
    await decoder.ready;
    return (decoders.mp3 = (buf: Buffer) =>
      buf && createBuffer(decoder.decode(buf)))(buff);
  },
  async flac(buff: Buffer) {
    // @ts-ignore
    const { FLACDecoder } = await import('@wasm-audio-decoders/flac');
    const decoder = new FLACDecoder();
    await decoder.ready;
    return (decoders.mp3 = async (buf: Buffer) =>
      buf && createBuffer(await decoder.decode(buf)))(buff);
  },
  async opus(buff: Buffer) {
    const { OggOpusDecoder } = await import('ogg-opus-decoder');
    const decoder = new OggOpusDecoder();
    await decoder.ready;
    return (decoders.opus = async (buf: Buffer) =>
      buf && createBuffer(await decoder.decodeFile(buf)))(buff);
  },
  async wav(buff: Buffer) {
    return (decoders.wav = async (buf: Buffer) =>
      buf && createBuffer(wav.decode(buf)))(buff);
  },
  async qoa(buff: Buffer) {
    const { decode } = await import('qoa-format');
    return (decoders.qoa = async (buf: Buffer) =>
      buf && createBuffer(decode(buff)))(buff);
  },
};

export default async function audioDecode(buf: Buffer) {
  if (!buf || (!buf.length && !buf.buffer)) throw Error('Bad decode target');
  const buff = new Uint8Array(buf.buffer || buf);

  const type = getType(buff);

  if (!type) throw Error('Cannot detect audio format');

  const k = decoders[type as keyof typeof decoders];
  if (!k) throw Error(`Missing decoder for ${type} format`);

  return k(buf);
}
