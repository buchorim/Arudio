// / - Arinara Network © 2026 - /
// This source code is the exclusive property of Arinara Network.
// Unauthorized use, reproduction, distribution, or modification of this
// code — in whole or in part — for any purpose whatsoever is strictly
// prohibited without prior written consent from Arinara Network as the
// sole legal owner of this codebase.
import type {ExportBitDepth, ExportChannelMode, ExportDitherMode, ExportNormalizeMode} from './ExportTypes';

export interface WavEncodingOptions {
  bitDepth?: ExportBitDepth;
  channelMode?: ExportChannelMode;
  normalizeMode?: ExportNormalizeMode;
  normalizePeakDb?: number;
  ditherMode?: ExportDitherMode;
}

export function encodeAudioBufferToWav(buffer: AudioBuffer, options: WavEncodingOptions = {}) {
  const bitDepth = options.bitDepth ?? 16;
  const channelCount = options.channelMode === 'mono' ? 1 : Math.min(2, Math.max(1, buffer.numberOfChannels));
  const bytesPerSample = bitDepth / 8;
  const blockAlign = channelCount * bytesPerSample;
  const byteRate = buffer.sampleRate * blockAlign;
  const dataByteLength = buffer.length * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(arrayBuffer);
  const sourceChannels = getSourceChannelData(buffer);
  const outputGain = getOutputGain(sourceChannels, options);
  let ditherSeed = 0x51f15e;

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataByteLength, true);

  let offset = 44;

  for (let sampleIndex = 0; sampleIndex < buffer.length; sampleIndex += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      const rawSample = readOutputSample(sourceChannels, sampleIndex, channel, channelCount) * outputGain;
      const dither = options.ditherMode === 'tpdf' ? getTriangularDither(bitDepth, () => (ditherSeed = nextDitherSeed(ditherSeed))) : 0;
      const sample = Math.max(-1, Math.min(1, rawSample + dither));
      if (bitDepth === 24) {
        writeInt24(view, offset, sample < 0 ? sample * 0x800000 : sample * 0x7fffff);
      } else {
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      }
      offset += bytesPerSample;
    }
  }

  return new Blob([arrayBuffer], {type: 'audio/wav'});
}

function getSourceChannelData(buffer: AudioBuffer) {
  return Array.from({length: Math.max(1, buffer.numberOfChannels)}, (_, channel) => buffer.getChannelData(channel));
}

function getOutputGain(channelData: Float32Array[], options: WavEncodingOptions) {
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

function writeInt24(view: DataView, offset: number, value: number) {
  const integer = Math.max(-0x800000, Math.min(0x7fffff, Math.round(value)));
  const unsigned = integer < 0 ? integer + 0x1000000 : integer;
  view.setUint8(offset, unsigned & 0xff);
  view.setUint8(offset + 1, (unsigned >> 8) & 0xff);
  view.setUint8(offset + 2, (unsigned >> 16) & 0xff);
}

function getTriangularDither(bitDepth: ExportBitDepth, nextSeed: () => number) {
  const first = seedToUnitNoise(nextSeed());
  const second = seedToUnitNoise(nextSeed());
  const leastSignificantBit = 1 / 2 ** (bitDepth - 1);
  return (first - second) * leastSignificantBit;
}

function nextDitherSeed(seed: number) {
  return (seed * 1664525 + 1013904223) >>> 0;
}

function seedToUnitNoise(seed: number) {
  return seed / 0xffffffff;
}

function decibelsToGain(decibels: number) {
  return 10 ** (decibels / 20);
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}
