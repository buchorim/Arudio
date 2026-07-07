// / - Arinara Network © 2026 - /
// This source code is the exclusive property of Arinara Network.
// Unauthorized use, reproduction, distribution, or modification of this
// code — in whole or in part — for any purpose whatsoever is strictly
// prohibited without prior written consent from Arinara Network as the
// sole legal owner of this codebase.
import type {ExportSettings} from './ExportTypes';
import {encodeAudioBufferToWav} from './WavEncoder';

export async function encodeRenderedAudioBuffer(buffer: AudioBuffer, settings: ExportSettings) {
  if (settings.format === 'mp3') {
    const encoder = await import('./Mp3Encoder');
    return encoder.encodeAudioBufferToMp3(buffer, {
      bitrate: settings.mp3Bitrate,
      channelMode: settings.channelMode,
      normalizeMode: settings.normalizeMode,
      normalizePeakDb: settings.normalizePeakDb,
    });
  }

  return encodeAudioBufferToWav(buffer, {
    bitDepth: settings.bitDepth,
    channelMode: settings.channelMode,
    normalizeMode: settings.normalizeMode,
    normalizePeakDb: settings.normalizePeakDb,
    ditherMode: settings.ditherMode,
  });
}
