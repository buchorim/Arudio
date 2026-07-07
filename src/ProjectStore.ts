// / - Arinara Network © 2026 - /
// This source code is the exclusive property of Arinara Network.
// Unauthorized use, reproduction, distribution, or modification of this
// code — in whole or in part — for any purpose whatsoever is strictly
// prohibited without prior written consent from Arinara Network as the
// sole legal owner of this codebase.
import {
  APP_VERSION,
  type AppSettings,
  type AppState,
  type AudioSourceRecord,
  type ClipRecord,
  type DensityMode,
  type GridResolution,
  type NewProjectInput,
  type ProjectRecord,
  type TimelineMarkRecord,
  type TimeSignature,
  type TrackRecord,
} from './Types';

export const APP_STATE_STORAGE_KEY = 'arudio.appState.v1';
const audioLayerOverlapTolerance = 0.0001;

export function createDefaultAppSettings(): AppSettings {
  return {
    theme: 'dark',
    density: 'compact',
    reducedMotion: false,
    showShortcutHints: true,
    lastReleaseSeen: APP_VERSION,
  };
}

export function createDefaultAppState(): AppState {
  return {
    version: 1,
    activeProjectId: null,
    projects: [],
    settings: createDefaultAppSettings(),
  };
}

export function makeId(prefix: string) {
  const randomValue = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${randomValue}`;
}

export function createProjectRecord(input: NewProjectInput): ProjectRecord {
  const now = new Date().toISOString();
  const cleanName = input.name.trim();

  return {
    id: makeId('project'),
    name: cleanName.length > 0 ? cleanName : 'Untitled Project',
    bpm: clampNumber(input.bpm, 20, 300, 120),
    timeSignature: input.timeSignature,
    key: input.key,
    createdAt: now,
    updatedAt: now,
    audioSources: [],
    tracks: [],
    clips: [],
    timelineMarks: [],
    master: {
      volume: 68,
      effects: [],
    },
    settings: {
      sampleRate: 48000,
      gridResolution: '1/16',
      defaultFadeSeconds: 0.25,
      exportNamePattern: '{project}-{date}',
    },
  };
}

export function getActiveProject(state: AppState): ProjectRecord | null {
  return state.projects.find((project) => project.id === state.activeProjectId) ?? null;
}

export function loadAppState(): {state: AppState; error: string | null} {
  if (!canUseLocalStorage()) {
    return {state: createDefaultAppState(), error: 'Local project storage is not available in this browser session.'};
  }

  const rawState = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
  if (!rawState) {
    return {state: createDefaultAppState(), error: null};
  }

  try {
    const parsed = JSON.parse(rawState) as Partial<AppState>;
    const normalizedState = normalizeAppState(parsed);
    let migrationError: string | null = null;
    if (JSON.stringify(normalizedState) !== rawState) {
      try {
        saveAppState(normalizedState);
      } catch {
        migrationError = 'Saved project data was repaired for this session, but could not be rewritten to local storage.';
      }
    }
    return {state: normalizedState, error: migrationError};
  } catch {
    return {state: createDefaultAppState(), error: 'Saved project data could not be read.'};
  }
}

export function saveAppState(state: AppState) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(state));
}

export function clearAppState() {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.removeItem(APP_STATE_STORAGE_KEY);
}

export function addProject(state: AppState, project: ProjectRecord): AppState {
  const compactedProject = compactProjectAudioLayers(project);
  return {
    ...state,
    activeProjectId: compactedProject.id,
    projects: [compactedProject, ...state.projects],
  };
}

export function updateProject(state: AppState, project: ProjectRecord): AppState {
  const compactedProject = compactProjectAudioLayers(project);
  return {
    ...state,
    projects: state.projects.map((item) =>
      item.id === compactedProject.id ? {...compactedProject, updatedAt: new Date().toISOString()} : item,
    ),
  };
}

export function duplicateProject(state: AppState, projectId: string): AppState {
  const storedProject = state.projects.find((project) => project.id === projectId);
  if (!storedProject) {
    return state;
  }
  const sourceProject = compactProjectAudioLayers(storedProject);

  const now = new Date().toISOString();
  const trackIdMap = new Map<string, string>();
  const duplicatedTracks = sourceProject.tracks.map((track) => {
    const duplicatedTrack = {...track, id: makeId('track')};
    trackIdMap.set(track.id, duplicatedTrack.id);
    return duplicatedTrack;
  });

  const duplicatedProject: ProjectRecord = {
    ...sourceProject,
    id: makeId('project'),
    name: `${sourceProject.name} Copy`,
    createdAt: now,
    updatedAt: now,
    audioSources: sourceProject.audioSources.map((source) => ({...source})),
    tracks: duplicatedTracks,
    clips: sourceProject.clips.map((clip) => ({
      ...clip,
      id: makeId('clip'),
      trackId: trackIdMap.get(clip.trackId) ?? clip.trackId,
    })),
    timelineMarks: sourceProject.timelineMarks.map((mark) => ({...mark, id: makeId('mark')})),
  };

  const compactedDuplicatedProject = compactProjectAudioLayers(duplicatedProject);

  return {
    ...state,
    activeProjectId: compactedDuplicatedProject.id,
    projects: [compactedDuplicatedProject, ...state.projects],
  };
}

export function deleteProject(state: AppState, projectId: string): AppState {
  const projects = state.projects.filter((project) => project.id !== projectId);
  const activeProjectId = state.activeProjectId === projectId ? projects[0]?.id ?? null : state.activeProjectId;
  return {...state, activeProjectId, projects};
}

export function openProject(state: AppState, projectId: string): AppState {
  if (!state.projects.some((project) => project.id === projectId)) {
    return state;
  }

  return {...state, activeProjectId: projectId};
}

function canUseLocalStorage() {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function normalizeAppState(value: Partial<AppState>): AppState {
  const projects = Array.isArray(value.projects) ? value.projects.map(normalizeProjectRecord) : [];
  const activeProjectId =
    typeof value.activeProjectId === 'string' && projects.some((project) => project.id === value.activeProjectId)
      ? value.activeProjectId
      : projects[0]?.id ?? null;

  return {
    version: 1,
    activeProjectId,
    projects,
    settings: {
      ...createDefaultAppSettings(),
      ...(typeof value.settings === 'object' && value.settings ? value.settings : {}),
      density: normalizeDensityMode(value.settings?.density),
      reducedMotion: Boolean(value.settings?.reducedMotion),
      showShortcutHints: value.settings?.showShortcutHints !== false,
      theme: 'dark',
    },
  };
}

function normalizeDensityMode(value: unknown): DensityMode {
  return value === 'comfortable' ? 'comfortable' : 'compact';
}

function normalizeProjectRecord(value: Partial<ProjectRecord>): ProjectRecord {
  const fallbackProject = createProjectRecord({
    name: 'Untitled Project',
    bpm: 120,
    timeSignature: '4/4',
    key: 'C Major',
  });
  const settings: ProjectRecord['settings'] = {
    sampleRate: value.settings?.sampleRate === 44100 ? 44100 : 48000,
    gridResolution: normalizeGridResolution(value.settings?.gridResolution),
    defaultFadeSeconds: clampNumber(value.settings?.defaultFadeSeconds, 0, 10, 0.25),
    exportNamePattern: typeof value.settings?.exportNamePattern === 'string' ? value.settings.exportNamePattern : '{project}-{date}',
  };

  const project: ProjectRecord = {
    ...fallbackProject,
    ...value,
    id: typeof value.id === 'string' ? value.id : fallbackProject.id,
    name: typeof value.name === 'string' ? value.name : fallbackProject.name,
    bpm: clampNumber(value.bpm, 20, 300, 120),
    timeSignature: normalizeTimeSignature(value.timeSignature),
    key: typeof value.key === 'string' ? value.key : 'C Major',
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : fallbackProject.createdAt,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : fallbackProject.updatedAt,
    audioSources: Array.isArray(value.audioSources) ? value.audioSources.map(normalizeAudioSourceRecord) : [],
    tracks: Array.isArray(value.tracks) ? value.tracks.map(normalizeTrackRecord) : [],
    clips: Array.isArray(value.clips) ? value.clips.map(normalizeClipRecord) : [],
    timelineMarks: Array.isArray(value.timelineMarks)
      ? value.timelineMarks.map((mark) => normalizeTimelineMarkRecord(mark, settings.sampleRate))
      : [],
    master: {
      volume: clampNumber(value.master?.volume, 0, 100, 68),
      effects: Array.isArray(value.master?.effects) ? value.master.effects : [],
    },
    settings,
  };

  return compactProjectAudioLayers(project);
}

function compactProjectAudioLayers(project: ProjectRecord): ProjectRecord {
  const trackIdsWithClips = new Set(project.clips.map((clip) => clip.trackId).filter((trackId) => trackId.length > 0));
  const tracks = project.tracks.filter((track) => track.type !== 'audio' || trackIdsWithClips.has(track.id));
  const existingTrackIds = new Set(tracks.map((track) => track.id));
  const clips = project.clips.filter((clip) => existingTrackIds.has(clip.trackId));
  const usedSourceIds = new Set(
    clips
      .map((clip) => clip.sourceId)
      .filter((sourceId): sourceId is string => typeof sourceId === 'string' && sourceId.length > 0),
  );
  const audioSources = project.audioSources.filter((source) => usedSourceIds.has(source.id));

  return repairOverlappingAudioLayers({
    ...project,
    audioSources,
    tracks,
    clips,
  });
}

function repairOverlappingAudioLayers(project: ProjectRecord): ProjectRecord {
  const clipsByTrack = new Map<string, ClipRecord[]>();
  project.clips.forEach((clip) => {
    const trackClips = clipsByTrack.get(clip.trackId) ?? [];
    trackClips.push(clip);
    clipsByTrack.set(clip.trackId, trackClips);
  });

  const nextClipTrackIds = new Map<string, string>();
  const nextTracks: TrackRecord[] = [];

  project.tracks.forEach((track) => {
    const trackClips = [...(clipsByTrack.get(track.id) ?? [])].sort(
      (first, second) => first.startTime - second.startTime || first.id.localeCompare(second.id),
    );

    if (track.type !== 'audio' || trackClips.length <= 1) {
      nextTracks.push(track);
      return;
    }

    const lanes: Array<{track: TrackRecord; lastEnd: number}> = [{track, lastEnd: -Infinity}];
    trackClips.forEach((clip) => {
      const availableLane = lanes.find((lane) => clip.startTime >= lane.lastEnd - audioLayerOverlapTolerance);
      const lane =
        availableLane ??
        (() => {
          const collisionLayer = createCollisionAudioLayer(track, lanes.length + 1);
          const nextLane = {track: collisionLayer, lastEnd: -Infinity};
          lanes.push(nextLane);
          return nextLane;
        })();

      nextClipTrackIds.set(clip.id, lane.track.id);
      lane.lastEnd = Math.max(lane.lastEnd, clip.startTime + clip.duration);
    });

    nextTracks.push(...lanes.map((lane) => lane.track));
  });

  const nextTrackIds = new Set(nextTracks.map((track) => track.id));
  const nextClips = project.clips
    .filter((clip) => nextTrackIds.has(nextClipTrackIds.get(clip.id) ?? clip.trackId))
    .map((clip) => {
      const nextTrackId = nextClipTrackIds.get(clip.id);
      return nextTrackId && nextTrackId !== clip.trackId ? {...clip, trackId: nextTrackId} : clip;
    });

  return {
    ...project,
    tracks: nextTracks,
    clips: nextClips,
  };
}

function createCollisionAudioLayer(sourceTrack: TrackRecord, layerNumber: number): TrackRecord {
  return {
    ...sourceTrack,
    id: makeId('track'),
    name: `${sourceTrack.name} Layer ${layerNumber}`,
    effects: sourceTrack.effects.map((effect) => ({
      ...effect,
      id: makeId('effect'),
      parameters: {...effect.parameters},
    })),
    automation: sourceTrack.automation.map((lane) => ({
      ...lane,
      id: makeId('lane'),
      keyframes: lane.keyframes.map((keyframe) => ({...keyframe, id: makeId('keyframe')})),
    })),
  };
}

function normalizeTimelineMarkRecord(value: Partial<TimelineMarkRecord>, sampleRate: 44100 | 48000): TimelineMarkRecord {
  const time = clampNumber(value.time, 0, Number.MAX_SAFE_INTEGER, 0);
  return {
    id: typeof value.id === 'string' ? value.id : makeId('mark'),
    time,
    sampleFrame: Math.round(clampNumber(value.sampleFrame, 0, Number.MAX_SAFE_INTEGER, time * sampleRate)),
    label: typeof value.label === 'string' && value.label.trim().length > 0 ? value.label.trim() : null,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
  };
}

function normalizeAudioSourceRecord(value: Partial<AudioSourceRecord>): AudioSourceRecord {
  return {
    id: typeof value.id === 'string' ? value.id : makeId('source'),
    fileName: typeof value.fileName === 'string' ? value.fileName : 'Untitled Audio',
    mimeType: typeof value.mimeType === 'string' ? value.mimeType : 'application/octet-stream',
    byteSize: clampNumber(value.byteSize, 0, Number.MAX_SAFE_INTEGER, 0),
    duration: clampNumber(value.duration, 0, Number.MAX_SAFE_INTEGER, 0),
    sampleRate: clampNumber(value.sampleRate, 1, 384000, 48000),
    channelCount: clampNumber(value.channelCount, 1, 64, 2),
    importedAt: typeof value.importedAt === 'string' ? value.importedAt : new Date().toISOString(),
    waveformPeaks: Array.isArray(value.waveformPeaks) ? value.waveformPeaks.filter((peak) => typeof peak === 'number') : [],
  };
}

function normalizeTrackRecord(value: Partial<TrackRecord>): TrackRecord {
  return {
    id: typeof value.id === 'string' ? value.id : makeId('track'),
    name: typeof value.name === 'string' ? value.name : 'Audio Track',
    type: value.type === 'instrument' || value.type === 'bus' ? value.type : 'audio',
    color: typeof value.color === 'string' ? value.color : '#7dd3fc',
    volume: clampNumber(value.volume, 0, 100, 100),
    pan: clampNumber(value.pan, -50, 50, 0),
    isMuted: Boolean(value.isMuted),
    isSoloed: Boolean(value.isSoloed),
    effects: Array.isArray(value.effects) ? value.effects : [],
    automation: Array.isArray(value.automation) ? value.automation : [],
  };
}

function normalizeClipRecord(value: Partial<ClipRecord>): ClipRecord {
  return {
    id: typeof value.id === 'string' ? value.id : makeId('clip'),
    trackId: typeof value.trackId === 'string' ? value.trackId : '',
    sourceId: typeof value.sourceId === 'string' ? value.sourceId : null,
    name: typeof value.name === 'string' ? value.name : 'Audio Clip',
    startTime: clampNumber(value.startTime, 0, Number.MAX_SAFE_INTEGER, 0),
    sourceStartTime: clampNumber(value.sourceStartTime, 0, Number.MAX_SAFE_INTEGER, 0),
    sourceTimelineOffset: clampNumber(value.sourceTimelineOffset, 0, Number.MAX_SAFE_INTEGER, 0),
    duration: clampNumber(value.duration, 0.01, Number.MAX_SAFE_INTEGER, 1),
    gain: clampNumber(value.gain, -60, 24, 0),
    pan: typeof value.pan === 'string' ? value.pan : 'C',
    pitch: clampNumber(value.pitch, -48, 48, 0),
    speed: clampNumber(value.speed, 0.05, 8, 1),
    timeStretchMode: value.timeStretchMode === 'preserve-pitch' ? 'preserve-pitch' : 'linked-speed-pitch',
    automationAnchorMode:
      value.automationAnchorMode === 'clip-relative' || value.automationAnchorMode === 'source-locked'
        ? value.automationAnchorMode
        : 'timeline-locked',
    fadeIn: clampNumber(value.fadeIn, 0, Number.MAX_SAFE_INTEGER, 0),
    fadeOut: clampNumber(value.fadeOut, 0, Number.MAX_SAFE_INTEGER, 0),
    isReversed: Boolean(value.isReversed),
    waveformPeaks: Array.isArray(value.waveformPeaks) ? value.waveformPeaks.filter((peak) => typeof peak === 'number') : [],
    automation: Array.isArray(value.automation) ? value.automation : [],
  };
}

function normalizeTimeSignature(value: unknown): TimeSignature {
  if (value === '3/4' || value === '6/8') {
    return value;
  }

  return '4/4';
}

function normalizeGridResolution(value: unknown): GridResolution {
  if (value === '1/4' || value === '1/8' || value === '1/32') {
    return value;
  }

  return '1/16';
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}
