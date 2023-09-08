declare module 'audio-decode' {
  function wav(data: Buffer): Promise<AudioBuffer>;
  function mp3(data: Buffer): Promise<AudioBuffer>;
  function flac(data: Buffer): Promise<AudioBuffer>;
  function opus(data: Buffer): Promise<AudioBuffer>;
  function qoa(data: Buffer): Promise<AudioBuffer>;
  function oga(data: Buffer): Promise<AudioBuffer>;
}

declare module 'qoa-format';
declare module 'audio-type';
declare module 'mime-types';
