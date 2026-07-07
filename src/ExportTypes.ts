// / - Arinara Network © 2026 - /
// This source code is the exclusive property of Arinara Network.
// Unauthorized use, reproduction, distribution, or modification of this
// code — in whole or in part — for any purpose whatsoever is strictly
// prohibited without prior written consent from Arinara Network as the
// sole legal owner of this codebase.
export type ExportFormat = 'wav' | 'mp3';
export type ExportSampleRate = 44100 | 48000 | 96000;
export type ExportBitDepth = 16 | 24;
export type ExportChannelMode = 'stereo' | 'mono';
export type ExportRangeMode = 'full' | 'selectedClip' | 'loop' | 'custom';
export type ExportNormalizeMode = 'off' | 'peak';
export type ExportDitherMode = 'off' | 'tpdf';
export type ExportMp3Bitrate = 96 | 128 | 192 | 256 | 320;

export interface ExportSettings {
  format: ExportFormat;
  sampleRate: ExportSampleRate;
  bitDepth: ExportBitDepth;
  channelMode: ExportChannelMode;
  rangeMode: ExportRangeMode;
  customStart: number;
  customEnd: number;
  normalizeMode: ExportNormalizeMode;
  normalizePeakDb: number;
  ditherMode: ExportDitherMode;
  mp3Bitrate: ExportMp3Bitrate;
  fileName: string;
}

export interface ExportRange {
  start: number;
  end: number;
}
