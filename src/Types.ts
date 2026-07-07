// / - Arinara Network © 2026 - /
// This source code is the exclusive property of Arinara Network.
// Unauthorized use, reproduction, distribution, or modification of this
// code — in whole or in part — for any purpose whatsoever is strictly
// prohibited without prior written consent from Arinara Network as the
// sole legal owner of this codebase.
export const APP_VERSION = '0.8.0 Beta';

export type TimeSignature = '4/4' | '3/4' | '6/8';
export type SampleRate = 44100 | 48000;
export type GridResolution = '1/4' | '1/8' | '1/16' | '1/32';
export type DensityMode = 'compact' | 'comfortable';
export type ClipTimeStretchMode = 'linked-speed-pitch' | 'preserve-pitch';
export type AutomationAnchorMode = 'timeline-locked' | 'clip-relative' | 'source-locked';

export interface AppSettings {
  theme: 'dark';
  density: DensityMode;
  reducedMotion: boolean;
  showShortcutHints: boolean;
  lastReleaseSeen: string | null;
}

export interface ProjectSettings {
  sampleRate: SampleRate;
  gridResolution: GridResolution;
  defaultFadeSeconds: number;
  exportNamePattern: string;
}

export interface MasterRecord {
  volume: number;
  effects: EffectInstance[];
}

export interface TimelineMarkRecord {
  id: string;
  time: number;
  sampleFrame: number;
  label: string | null;
  createdAt: string;
}

export interface AudioSourceRecord {
  id: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  duration: number;
  sampleRate: number;
  channelCount: number;
  importedAt: string;
  waveformPeaks: number[];
}

export interface TrackRecord {
  id: string;
  name: string;
  type: 'audio' | 'instrument' | 'bus';
  color: string;
  volume: number;
  pan: number;
  isMuted: boolean;
  isSoloed: boolean;
  effects: EffectInstance[];
  automation: AutomationLane[];
}

export interface ClipRecord {
  id: string;
  trackId: string;
  sourceId: string | null;
  name: string;
  startTime: number;
  sourceStartTime: number;
  sourceTimelineOffset: number;
  duration: number;
  gain: number;
  pan: string;
  pitch: number;
  speed: number;
  timeStretchMode: ClipTimeStretchMode;
  automationAnchorMode: AutomationAnchorMode;
  fadeIn: number;
  fadeOut: number;
  isReversed: boolean;
  waveformPeaks: number[];
  automation: AutomationLane[];
}

export interface ProjectRecord {
  id: string;
  name: string;
  bpm: number;
  timeSignature: TimeSignature;
  key: string;
  createdAt: string;
  updatedAt: string;
  audioSources: AudioSourceRecord[];
  tracks: TrackRecord[];
  clips: ClipRecord[];
  timelineMarks: TimelineMarkRecord[];
  master: MasterRecord;
  settings: ProjectSettings;
}

export interface AppState {
  version: 1;
  activeProjectId: string | null;
  projects: ProjectRecord[];
  settings: AppSettings;
}

export type PlaybackCacheState = 'idle' | 'active' | 'pending';

export interface PlaybackCacheStatus {
  state: PlaybackCacheState;
  activeGenerationId: number | null;
  pendingGenerationId: number | null;
  activeFrameCount: number;
  pendingFrameCount: number;
}

export interface CommandPaletteCommand {
  id: string;
  title: string;
  category: string;
  description: string;
  shortcut: string | null;
  disabled: boolean;
  disabledReason: string | null;
}

export interface EffectInstance {
  id: string;
  type: 'eq' | 'filter' | 'compressor' | 'gate' | 'limiter' | 'saturation' | 'overdrive' | 'bitcrusher' | 'chorus' | 'flanger' | 'phaser' | 'tremolo' | 'vibrato' | 'ring' | 'reverb' | 'delay';
  enabled: boolean;
  parameters: Record<string, number | string | boolean>;
}

export interface AutomationKeyframe {
  id: string;
  time: number;
  value: number;
  easing: 'linear' | 'hold' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'custom-bezier';
  bezier: [number, number, number, number] | null;
}

export interface AutomationLane {
  id: string;
  parameterId: string;
  anchorMode: AutomationAnchorMode;
  keyframes: AutomationKeyframe[];
}

export type DawTool = 'select' | 'cut' | 'split' | 'move' | 'delete' | 'fade' | 'volume' | 'slip' | 'snap';

export interface NewProjectInput {
  name: string;
  bpm: number;
  timeSignature: TimeSignature;
  key: string;
}

export type Track = TrackRecord;
export type Clip = ClipRecord;
export type Project = ProjectRecord;

export interface EffectSettings {
  eq: boolean;
  filter: boolean;
  compressor: boolean;
  gate: boolean;
  limiter: boolean;
  saturation: boolean;
  overdrive: boolean;
  bitcrusher: boolean;
  chorus: boolean;
  flanger: boolean;
  phaser: boolean;
  tremolo: boolean;
  vibrato: boolean;
  ring: boolean;
  reverb: boolean;
  delay: boolean;
}
