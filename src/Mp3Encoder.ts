// / - Arinara Network © 2026 - /
// This source code is the exclusive property of Arinara Network.
// Unauthorized use, reproduction, distribution, or modification of this
// code — in whole or in part — for any purpose whatsoever is strictly
// prohibited without prior written consent from Arinara Network as the
// sole legal owner of this codebase.
import {Mp3Encoder} from '@breezystack/lamejs';
import type {ExportChannelMode, ExportMp3Bitrate, ExportNormalizeMode} from './ExportTypes';

export interface Mp3EncodingOptions {
  bitrate?: ExportMp3Bitrate;
  channelMode?: ExportChannelMode;
  normalizeMode?: ExportNormalizeMode;
  normalizePeakDb?: number;
}

const supportedMp3SampleRates = new Set([44100, 48000]);
const sampleBlockSize = 1152;

export function encodeAudioBufferToMp3(buffer: AudioBuffer, options: Mp3EncodingOptions = {}) {
  if (!supportedMp3SampleRates.has(buffer.sampleRate)) {
    throw new Error('MP3 export supports 44.1 kHz or 48 kHz sample rates.');
  }

  const outputChannelCount = options.channelMode === 'mono' ? 1 : 2;
  const bitrate = options.bitrate ?? 192;
  const encoder = new Mp3Encoder(outputChannelCount, buffer.sampleRate, bitrate);
  const sourceChannels = getSourceChannelData(buffer);
  const outputGain = getOutputGain(sourceChannels, options);
  const mp3Chunks: Uint8Array[] = [];

  for (let sampleOffset = 0; sampleOffset < buffer.length; sampleOffset += sampleBlockSize) {
    const frameCount = Math.min(sampleBlockSize, buffer.length - sampleOffset);
    const left = createPcmBlock(sourceChannels, sampleOffset, frameCount, 0, outputChannelCount, outputGain);

    const encoded =
      outputChannelCount === 1
        ? encoder.encodeBuffer(left)
        : encoder.encodeBuffer(
            left,
            createPcmBlock(sourceChannels, sampleOffset, frameCount, 1, outputChannelCount, outputGain),
          );

    if (encoded.length > 0) {
      mp3Chunks.push(encoded);
    }
  }

  const finalChunk = encoder.flush();
  if (finalChunk.length > 0) {
    mp3Chunks.push(finalChunk);
  }

  if (mp3Chunks.length === 0) {
    throw new Error('MP3 encoder produced no output.');
  }

  return new Blob(mp3Chunks, {type: 'audio/mpeg'});
}

function getSourceChannelData(buffer: AudioBuffer) {
  return Array.from({length: Math.max(1, buffer.numberOfChannels)}, (_, channel) => buffer.getChannelData(channel));
}

function createPcmBlock(
  channelData: Float32Array[],
  sampleOffset: number,
  frameCount: number,
  outputChannel: number,
  outputChannelCount: number,
  outputGain: number,
) {
  const block = new Int16Array(frameCount);

  for (let index = 0; index < frameCount; index += 1) {
    const sample = Math.max(
      -1,
      Math.min(1, readOutputSample(channelData, sampleOffset + index, outputChannel, outputChannelCount) * outputGain),
    );
    block[index] = sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff);
  }

  return block;
}

function getOutputGain(channelData: Float32Array[], options: Mp3EncodingOptions) {
  if (options.normalizeMode !== 'peak') {
    return 1;
  }

  let peak = 0;
  for (const channel of channelData) {
    for (let index = 0; index < channel.length; index += 1) {
      peak = Math.max(peak, Math.abs(channel[index] ?? 0));
    }
  }

  if (peak <= 0.000001) {
    return 1;
  }

  const targetPeak = decibelsToGain(options.normalizePeakDb ?? -1);
  return Math.min(32, targetPeak / peak);
}

function readOutputSample(channelData: Float32Array[], sampleIndex: number, outputChannel: number, outputChannelCount: number) {
  if (outputChannelCount === 1) {
    let sum = 0;
    for (const channel of channelData) {
      sum += channel[sampleIndex] ?? 0;
    }

    return sum / Math.max(1, channelData.length);
  }

  const sourceChannel = channelData[Math.min(outputChannel, channelData.length - 1)] ?? channelData[0];
  return sourceChannel?.[sampleIndex] ?? 0;
}

function decibelsToGain(decibels: number) {
  return 10 ** (decibels / 20);
}
