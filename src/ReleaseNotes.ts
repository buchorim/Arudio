// / - Arinara Network © 2026 - /
// This source code is the exclusive property of Arinara Network.
// Unauthorized use, reproduction, distribution, or modification of this
// code — in whole or in part — for any purpose whatsoever is strictly
// prohibited without prior written consent from Arinara Network as the
// sole legal owner of this codebase.
import {APP_VERSION} from './Types';

export type ReleaseNotesView = 'latest' | 'changelog';

export interface ReleaseNote {
  version: string;
  title: string;
  releasedAt: string;
  summary: string;
  whatsNew: string[];
  changed: string[];
  fixed: string[];
  notes: string[];
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: APP_VERSION,
    title: 'Workflow Polish And Real Effect Tools',
    releasedAt: '2026-07-07',
    summary:
      'Arudio now has a tighter editor shell, clearer timeline feedback, live-safe effect updates, and a broader set of real preview/export-backed audio tools.',
    whatsNew: [
      'Export now opens a dedicated Export Settings panel instead of immediately rendering a fixed WAV, with WAV and real MP3 output, sample rate, bitrate or bit depth, channel mode, range, filename, normalize, and dither controls where relevant.',
      'Graphic EQ, Filter, Compressor, Noise Gate, Limiter, Saturation, Overdrive, Bitcrusher, Chorus, Flanger, Phaser, Tremolo/Auto-Pan, Vibrato, Ring Modulator, Delay/Echo, and Cave Reverb are available from the rack, inspector, and command palette.',
      'Timeline marks, loop mode, cache status, and sidebar collapse controls make longer editing sessions easier to manage.',
      'App Settings now includes release notes access, changelog access, density, reduced motion, and shortcut hint preferences.',
    ],
    changed: [
      'The bottom toolbar now shows only production-ready tools so the everyday editor feels cleaner and more honest.',
      'Safe effect parameter changes can update active playback without forcing a stop and play cycle.',
      'The playhead badge, ruler, grid, markers, clips, and timeline clicks share the same aligned coordinate system.',
      'MP3 export now uses a real browser encoder path after the offline render, while WAV-only bit depth and dither controls stay scoped to WAV output.',
    ],
    fixed: [
      'Playback readiness now reports missing local source files accurately instead of saying to import audio when clips already exist.',
      'Compound keyframe deletion now prioritizes the selected keyframe before deleting the selected clip.',
      'Source overage, cache old/new labels, marker deletion, and compact header collisions have been cleaned up.',
    ],
    notes: [
      'Public 1.0 Beta release artwork and the once-per-version update banner are still part of the final release gate.',
    ],
  },
];

export function getLatestReleaseNote() {
  return RELEASE_NOTES[0] ?? null;
}

export function isLatestReleaseSeen(lastReleaseSeen: string | null) {
  const latestRelease = getLatestReleaseNote();
  return latestRelease ? lastReleaseSeen === latestRelease.version : true;
}
