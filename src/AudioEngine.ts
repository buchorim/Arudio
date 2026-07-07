// / - Arinara Network © 2026 - /
// This source code is the exclusive property of Arinara Network.
// Unauthorized use, reproduction, distribution, or modification of this
// code — in whole or in part — for any purpose whatsoever is strictly
// prohibited without prior written consent from Arinara Network as the
// sole legal owner of this codebase.
import type {AudioSourceRecord, ClipRecord, EffectInstance, ProjectRecord, TrackRecord} from './Types';
import {
  CLIP_GAIN_PARAMETER_ID,
  CLIP_PITCH_PARAMETER_ID,
  evaluateAutomationValue,
  getAutomationLane,
  getSortedKeyframes,
  sampleAutomationCurve,
} from './AutomationEngine';
import {
  BITCRUSHER_PARAMETERS,
  CHORUS_PARAMETERS,
  COMPRESSOR_PARAMETERS,
  DELAY_PARAMETERS,
  FILTER_PARAMETERS,
  FLANGER_PARAMETERS,
  GATE_PARAMETERS,
  GRAPHIC_EQ_BANDS,
  GRAPHIC_EQ_DEFAULT_Q,
  LIMITER_PARAMETERS,
  OVERDRIVE_PARAMETERS,
  PHASER_PARAMETERS,
  RING_MODULATOR_PARAMETERS,
  SATURATION_PARAMETERS,
  TREMOLO_PARAMETERS,
  VIBRATO_PARAMETERS,
  getGraphicEqBandGain,
  getNumericEffectParameterValue,
  type NumericEffectParameterDefinition,
} from './EffectParameters';
import {getEffectAutomationParameterByEffectParameter} from './EffectAutomationParameterRegistry';

export interface PlaybackHandle {
  stop: () => void;
  seek: (startTime: number) => Promise<void>;
  getCurrentTime: () => number;
  updateTrackEffect: (trackId: string, effect: EffectInstance) => boolean;
  generationId: number;
  frameCount: number;
}

export interface StartProjectPlaybackInput {
  project: ProjectRecord;
  startTime: number;
  endTime?: number;
  generationId: number;
  loadSourceBlob: (sourceId: string) => Promise<Blob | null>;
  onPlayhead: (seconds: number) => void;
  onEnded: () => void;
}

export interface RenderProjectInput {
  project: ProjectRecord;
  loadSourceBlob: (sourceId: string) => Promise<Blob | null>;
  sampleRate?: number;
  startTime?: number;
  endTime?: number;
}

interface ScheduleInput {
  context: BaseAudioContext;
  project: ProjectRecord;
  startTime: number;
  endTime?: number;
  destination: AudioNode;
  loadSourceBlob: (sourceId: string) => Promise<Blob | null>;
}

interface ScheduleResult {
  sources: AudioBufferSourceNode[];
  endTime: number;
  scheduledCount: number;
  liveEffectControllers: LiveTrackEffectController[];
}

interface LiveTrackEffectController {
  trackId: string;
  effectType: EffectInstance['type'];
  update: (effect: EffectInstance) => void;
}

interface EffectStageAutomationContext {
  automation: TrackRecord['automation'];
  timelineStart: number;
  audioStart: number;
  outputDuration: number;
}

let sharedAudioContext: AudioContext | null = null;
const sourceBufferCache = new Map<string, AudioBuffer>();
const reversedSourceBufferCache = new Map<string, AudioBuffer>();
const phaserStageMultipliers = [0.62, 0.9, 1.35, 1.95];

export async function decodeAudioBlob(blob: Blob): Promise<AudioBuffer> {
  const context = getSharedAudioContext();
  const arrayBuffer = await blob.arrayBuffer();
  return context.decodeAudioData(arrayBuffer);
}

export function buildWaveformPeaks(buffer: AudioBuffer, peakCount = 240) {
  const peaks: number[] = [];
  const stepSize = Math.max(1, Math.floor(buffer.length / peakCount));

  for (let index = 0; index < peakCount; index += 1) {
    const start = index * stepSize;
    const end = Math.min(buffer.length, start + stepSize);
    let peak = 0;

    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const channelData = buffer.getChannelData(channel);
      for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
        peak = Math.max(peak, Math.abs(channelData[sampleIndex] ?? 0));
      }
    }

    peaks.push(Number(peak.toFixed(4)));
  }

  return peaks;
}

export function createAudioSourceRecord(id: string, file: File, buffer: AudioBuffer): AudioSourceRecord {
  return {
    id,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    byteSize: file.size,
    duration: buffer.duration,
    sampleRate: buffer.sampleRate,
    channelCount: buffer.numberOfChannels,
    importedAt: new Date().toISOString(),
    waveformPeaks: buildWaveformPeaks(buffer),
  };
}

export async function startProjectPlayback(input: StartProjectPlaybackInput): Promise<PlaybackHandle> {
  const context = getSharedAudioContext();
  await context.resume();
  let playbackProject = input.project;

  const masterGain = context.createGain();
  masterGain.gain.value = percentToGain(playbackProject.master.volume);
  masterGain.connect(context.destination);

  const projectDuration = calculateProjectDuration(playbackProject);
  const playbackEndTime = Math.max(0, Math.min(projectDuration, input.endTime ?? projectDuration));
  const playbackStartTime = Math.max(0, Math.min(playbackEndTime, input.startTime));
  let schedule = await scheduleProjectClips({
    context,
    project: playbackProject,
    startTime: playbackStartTime,
    endTime: playbackEndTime,
    destination: masterGain,
    loadSourceBlob: input.loadSourceBlob,
  });

  if (schedule.scheduledCount === 0) {
    masterGain.disconnect();
    throw new Error('No playable audio clips are available at or after the playhead.');
  }

  let startedAt = context.currentTime;
  let currentStartTime = playbackStartTime;
  let isStopped = false;
  const frameCount = Math.max(1, Math.ceil(projectDuration * playbackProject.settings.sampleRate));
  let endTimer = 0;

  function getCurrentPlaybackTime() {
    if (isStopped) {
      return currentStartTime;
    }

    return Math.max(0, Math.min(playbackEndTime, currentStartTime + context.currentTime - startedAt));
  }

  const progressTimer = window.setInterval(() => {
    if (isStopped) {
      return;
    }

    input.onPlayhead(getCurrentPlaybackTime());
  }, 50);

  armEndTimer();

  function stopPlayback() {
    if (isStopped) {
      return;
    }

    isStopped = true;
    window.clearInterval(progressTimer);
    window.clearTimeout(endTimer);

    stopSources(schedule.sources);

    try {
      masterGain.disconnect();
    } catch {
      return;
    }
  }

  async function seekPlayback(startTime: number) {
    if (isStopped) {
      return;
    }

    const nextStartTime = Math.max(0, Math.min(playbackEndTime, startTime));
    window.clearTimeout(endTimer);
    stopSources(schedule.sources);
    currentStartTime = nextStartTime;
    startedAt = context.currentTime;
    input.onPlayhead(nextStartTime);

    schedule = await scheduleProjectClips({
      context,
      project: playbackProject,
      startTime: nextStartTime,
      endTime: playbackEndTime,
      destination: masterGain,
      loadSourceBlob: input.loadSourceBlob,
    });

    if (schedule.scheduledCount === 0) {
      stopPlayback();
      input.onEnded();
      return;
    }

    armEndTimer();
  }

  function armEndTimer() {
    window.clearTimeout(endTimer);
    endTimer = window.setTimeout(
      () => {
        if (isStopped) {
          return;
        }

        stopPlayback();
        input.onPlayhead(playbackEndTime);
        input.onEnded();
      },
      Math.max(50, (schedule.endTime - context.currentTime) * 1000 + 80),
    );
  }

  function updateTrackEffect(trackId: string, effect: EffectInstance) {
    if (!effect.enabled) {
      return false;
    }

    const matchingControllers = schedule.liveEffectControllers.filter(
      (controller) => controller.trackId === trackId && controller.effectType === effect.type,
    );
    if (matchingControllers.length === 0) {
      return false;
    }

    playbackProject = {
      ...playbackProject,
      tracks: playbackProject.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              effects: track.effects.map((trackEffect) => (trackEffect.type === effect.type ? effect : trackEffect)),
            }
          : track,
      ),
    };

    matchingControllers.forEach((controller) => {
      controller.update(effect);
    });
    return true;
  }

  return {
    stop: stopPlayback,
    seek: seekPlayback,
    getCurrentTime: getCurrentPlaybackTime,
    updateTrackEffect,
    generationId: input.generationId,
    frameCount,
  };
}

function stopSources(sources: AudioBufferSourceNode[]) {
  sources.forEach((source) => {
    try {
      source.stop();
    } catch {
      return;
    }
  });
}

export async function renderProjectToAudioBuffer(input: RenderProjectInput): Promise<AudioBuffer> {
  const projectDuration = calculateProjectDuration(input.project);
  if (projectDuration <= 0) {
    throw new Error('The project has no timeline duration to render.');
  }

  const renderStartTime = Math.max(0, Math.min(projectDuration, input.startTime ?? 0));
  const renderEndTime = Math.max(renderStartTime, Math.min(projectDuration, input.endTime ?? projectDuration));
  const duration = renderEndTime - renderStartTime;
  if (duration <= 0) {
    throw new Error('The selected export range has no duration to render.');
  }

  const sampleRate = Math.max(8000, Math.min(192000, input.sampleRate ?? input.project.settings.sampleRate));
  const frameCount = Math.max(1, Math.ceil(duration * sampleRate));
  const offlineContext = new OfflineAudioContext(2, frameCount, sampleRate);
  const masterGain = offlineContext.createGain();
  masterGain.gain.value = percentToGain(input.project.master.volume);
  masterGain.connect(offlineContext.destination);

  const schedule = await scheduleProjectClips({
    context: offlineContext,
    project: input.project,
    startTime: renderStartTime,
    endTime: renderEndTime,
    destination: masterGain,
    loadSourceBlob: input.loadSourceBlob,
  });

  if (schedule.scheduledCount === 0) {
    throw new Error('The project has no playable audio clips to render.');
  }

  return offlineContext.startRendering();
}

export function calculateProjectDuration(project: ProjectRecord) {
  return project.clips.reduce((duration, clip) => Math.max(duration, clip.startTime + clip.duration), 0);
}

async function scheduleProjectClips(input: ScheduleInput): Promise<ScheduleResult> {
  const trackMap = new Map(input.project.tracks.map((track) => [track.id, track]));
  const soloTrackIds = new Set(input.project.tracks.filter((track) => track.isSoloed).map((track) => track.id));
  const sources: AudioBufferSourceNode[] = [];
  const liveEffectControllers: LiveTrackEffectController[] = [];
  let endTime = input.context.currentTime;
  let scheduledCount = 0;
  const scheduleEndTime = Math.min(calculateProjectDuration(input.project), input.endTime ?? Number.POSITIVE_INFINITY);

  for (const clip of input.project.clips) {
    const track = trackMap.get(clip.trackId);
    if (!track || !clip.sourceId || !isTrackAudible(track, soloTrackIds)) {
      continue;
    }

    const clipEnd = clip.startTime + clip.duration;
    if (clipEnd <= input.startTime || clip.startTime >= scheduleEndTime) {
      continue;
    }

    const blob = await input.loadSourceBlob(clip.sourceId);
    if (!blob) {
      throw new Error(`Audio source for "${clip.name}" is missing from local storage.`);
    }

    const decodedBuffer = await decodeSourceBuffer(input.context, clip.sourceId, blob);
    const buffer = clip.isReversed ? getReversedSourceBuffer(input.context, clip.sourceId, decodedBuffer) : decodedBuffer;
    const sourceTimelineOffset = getClipSourceTimelineOffset(clip);
    const audibleStartTime = clip.startTime + sourceTimelineOffset;
    const playbackStartTime = Math.max(input.startTime, audibleStartTime);
    const clipElapsed = Math.max(0, playbackStartTime - clip.startTime);
    const timelineDelay = Math.max(0, playbackStartTime - input.startTime);
    const remainingTimelineDuration = Math.max(0, Math.min(clip.startTime + clip.duration, scheduleEndTime) - playbackStartTime);
    const originalSourceOffset = Math.min(
      decodedBuffer.duration,
      clip.sourceStartTime + integrateClipSourceDuration(clip, audibleStartTime, Math.max(0, playbackStartTime - audibleStartTime)),
    );
    const playbackWindow = getClipPlaybackWindow(clip, decodedBuffer.duration, playbackStartTime, remainingTimelineDuration, originalSourceOffset);
    const sourceDuration = playbackWindow.sourceDuration;
    const outputDuration = playbackWindow.outputDuration;
    const sourceOffset = clip.isReversed
      ? Math.max(0, decodedBuffer.duration - originalSourceOffset - sourceDuration)
      : originalSourceOffset;

    if (sourceDuration <= 0 || outputDuration <= 0) {
      continue;
    }

    const source = input.context.createBufferSource();
    const clipGain = input.context.createGain();
    const clipFade = input.context.createGain();
    const clipPan = input.context.createStereoPanner();
    const trackGain = input.context.createGain();
    const trackPan = input.context.createStereoPanner();
    const when = input.context.currentTime + timelineDelay;

    source.buffer = buffer;
    configureClipPlaybackRate(source.playbackRate, clip, when, clipElapsed, outputDuration);
    configureClipGain(clipGain, clip, when, clipElapsed, outputDuration);
    configureClipFade(clipFade, clip, when, clipElapsed, outputDuration);
    clipPan.pan.value = panLabelToStereoValue(clip.pan);
    trackGain.gain.value = percentToGain(track.volume);
    trackPan.pan.value = Math.max(-1, Math.min(1, track.pan / 50));

    source.connect(clipGain);
    clipGain.connect(clipFade);
    clipFade.connect(clipPan);
    clipPan.connect(trackGain);
    trackGain.connect(trackPan);
    connectTrackEffects(
      input.context,
      track.id,
      trackPan,
      input.destination,
      track.effects,
      track.automation,
      playbackStartTime,
      when,
      outputDuration,
      liveEffectControllers,
    );
    source.start(when, sourceOffset, sourceDuration);

    sources.push(source);
    scheduledCount += 1;
    endTime = Math.max(endTime, when + outputDuration);
  }

  return {sources, endTime, scheduledCount, liveEffectControllers};
}

async function decodeSourceBuffer(context: BaseAudioContext, sourceId: string, blob: Blob): Promise<AudioBuffer> {
  const cachedBuffer = sourceBufferCache.get(sourceId);
  if (cachedBuffer) {
    return cachedBuffer;
  }

  const arrayBuffer = await blob.arrayBuffer();
  const buffer = await context.decodeAudioData(arrayBuffer);
  sourceBufferCache.set(sourceId, buffer);
  return buffer;
}

function getReversedSourceBuffer(context: BaseAudioContext, sourceId: string, buffer: AudioBuffer) {
  const cachedBuffer = reversedSourceBufferCache.get(sourceId);
  if (cachedBuffer) {
    return cachedBuffer;
  }

  const reversedBuffer = context.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const sourceData = buffer.getChannelData(channel);
    const reversedData = reversedBuffer.getChannelData(channel);
    for (let index = 0; index < buffer.length; index += 1) {
      reversedData[index] = sourceData[buffer.length - index - 1] ?? 0;
    }
  }

  reversedSourceBufferCache.set(sourceId, reversedBuffer);
  return reversedBuffer;
}

function configureClipGain(gainNode: GainNode, clip: ClipRecord, when: number, clipElapsed: number, outputDuration: number) {
  const baseGain = decibelsToGain(clip.gain);
  const endTime = when + outputDuration;
  const gainAutomation = getAutomationLane(clip.automation, CLIP_GAIN_PARAMETER_ID);
  const keyframes = getSortedKeyframes(gainAutomation);

  if (keyframes.length === 0) {
    gainNode.gain.setValueAtTime(baseGain, when);
    return;
  }

  const timelineStart = clip.startTime + clipElapsed;
  const timelineEnd = timelineStart + outputDuration;
  const sampleCount = Math.max(24, Math.min(180, Math.ceil(outputDuration * 32)));
  const samples = sampleAutomationCurve(gainAutomation, clip.gain, timelineStart, timelineEnd, sampleCount);
  const firstSample = samples[0];
  gainNode.gain.setValueAtTime(decibelsToGain(firstSample?.value ?? clip.gain), when);

  samples.slice(1).forEach((sample) => {
    const sampleTime = when + sample.time - timelineStart;
    if (sampleTime > when && sampleTime <= endTime) {
      gainNode.gain.linearRampToValueAtTime(decibelsToGain(sample.value), sampleTime);
    }
  });
}

function configureClipPlaybackRate(
  playbackRateParam: AudioParam,
  clip: ClipRecord,
  when: number,
  clipElapsed: number,
  outputDuration: number,
) {
  const pitchAutomation = getAutomationLane(clip.automation, CLIP_PITCH_PARAMETER_ID);
  const keyframes = getSortedKeyframes(pitchAutomation);

  if (keyframes.length === 0) {
    playbackRateParam.setValueAtTime(getClipPlaybackRate(clip), when);
    return;
  }

  const endTime = when + outputDuration;
  const timelineStart = clip.startTime + clipElapsed;
  const timelineEnd = timelineStart + outputDuration;
  const sampleCount = Math.max(24, Math.min(180, Math.ceil(outputDuration * 32)));
  const samples = sampleAutomationCurve(pitchAutomation, clip.pitch, timelineStart, timelineEnd, sampleCount);
  const firstSample = samples[0];
  playbackRateParam.setValueAtTime(getClipPlaybackRate(clip, firstSample?.value ?? clip.pitch), when);

  samples.slice(1).forEach((sample) => {
    const sampleTime = when + sample.time - timelineStart;
    if (sampleTime > when && sampleTime <= endTime) {
      playbackRateParam.linearRampToValueAtTime(getClipPlaybackRate(clip, sample.value), sampleTime);
    }
  });
}

function getClipPlaybackWindow(
  clip: ClipRecord,
  sourceDuration: number,
  playbackStartTime: number,
  remainingTimelineDuration: number,
  sourceOffset: number,
) {
  const availableSourceDuration = Math.max(0, sourceDuration - sourceOffset);
  if (remainingTimelineDuration <= 0 || availableSourceDuration <= 0) {
    return {sourceDuration: 0, outputDuration: 0};
  }

  const fullSourceDuration = integrateClipSourceDuration(clip, playbackStartTime, remainingTimelineDuration);
  if (fullSourceDuration <= availableSourceDuration + 0.0001) {
    return {
      sourceDuration: fullSourceDuration,
      outputDuration: remainingTimelineDuration,
    };
  }

  let low = 0;
  let high = remainingTimelineDuration;
  for (let index = 0; index < 16; index += 1) {
    const midpoint = (low + high) / 2;
    const consumedSourceDuration = integrateClipSourceDuration(clip, playbackStartTime, midpoint);
    if (consumedSourceDuration <= availableSourceDuration) {
      low = midpoint;
    } else {
      high = midpoint;
    }
  }

  return {
    sourceDuration: Math.min(availableSourceDuration, integrateClipSourceDuration(clip, playbackStartTime, low)),
    outputDuration: low,
  };
}

function integrateClipSourceDuration(clip: ClipRecord, timelineStart: number, timelineDuration: number) {
  if (timelineDuration <= 0) {
    return 0;
  }

  const pitchAutomation = getAutomationLane(clip.automation, CLIP_PITCH_PARAMETER_ID);
  if (getSortedKeyframes(pitchAutomation).length === 0) {
    return getClipPlaybackRate(clip) * timelineDuration;
  }

  const segmentCount = Math.max(8, Math.min(240, Math.ceil(timelineDuration * 32)));
  let sourceDuration = 0;
  for (let index = 0; index < segmentCount; index += 1) {
    const segmentStartProgress = index / segmentCount;
    const segmentEndProgress = (index + 1) / segmentCount;
    const segmentStartTime = timelineStart + timelineDuration * segmentStartProgress;
    const segmentEndTime = timelineStart + timelineDuration * segmentEndProgress;
    const averagePlaybackRate =
      (getClipPlaybackRateAt(clip, pitchAutomation, segmentStartTime) +
        getClipPlaybackRateAt(clip, pitchAutomation, segmentEndTime)) /
      2;
    sourceDuration += Math.max(0.05, averagePlaybackRate) * (segmentEndTime - segmentStartTime);
  }

  return sourceDuration;
}

function getClipPlaybackRateAt(clip: ClipRecord, pitchAutomation: ReturnType<typeof getAutomationLane>, timelineTime: number) {
  const pitch = evaluateAutomationValue(pitchAutomation, clip.pitch, timelineTime);
  return getClipPlaybackRate(clip, pitch);
}

function configureClipFade(gainNode: GainNode, clip: ClipRecord, when: number, clipElapsed: number, outputDuration: number) {
  const endTime = when + outputDuration;
  gainNode.gain.setValueAtTime(1, when);

  if (clip.fadeIn > 0 && clipElapsed < clip.fadeIn) {
    const fadeProgress = Math.max(0, clipElapsed / clip.fadeIn);
    gainNode.gain.setValueAtTime(fadeProgress, when);
    gainNode.gain.linearRampToValueAtTime(1, Math.min(endTime, when + clip.fadeIn - clipElapsed));
  }

  if (clip.fadeOut > 0) {
    const fadeStart = Math.max(0, clip.duration - clip.fadeOut - clipElapsed);
    const fadeEnd = Math.max(0, clip.duration - clipElapsed);
    if (fadeEnd > 0) {
      if (fadeStart <= 0) {
        gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, fadeEnd / clip.fadeOut)), when);
      } else {
        const fadeStartTime = Math.min(endTime, when + fadeStart);
        if (fadeStartTime > when) {
          gainNode.gain.setValueAtTime(1, fadeStartTime);
        }
      }

      gainNode.gain.linearRampToValueAtTime(0, Math.min(endTime, when + fadeEnd));
    }
  }
}

function connectTrackEffects(
  context: BaseAudioContext,
  trackId: string,
  inputNode: AudioNode,
  destination: AudioNode,
  effects: EffectInstance[],
  automation: TrackRecord['automation'],
  timelineStart: number,
  audioStart: number,
  outputDuration: number,
  liveEffectControllers: LiveTrackEffectController[],
) {
  let currentNode = inputNode;
  const automationContext: EffectStageAutomationContext = {
    automation,
    timelineStart,
    audioStart,
    outputDuration,
  };

  getOrderedTrackEffects(effects)
    .filter((effect) => effect.enabled)
    .forEach((effect) => {
      if (effect.type === 'eq') {
        currentNode = createGraphicEqStage(context, trackId, currentNode, effect, automationContext, liveEffectControllers);
      }

      if (effect.type === 'filter') {
        currentNode = createFilterStage(context, trackId, currentNode, effect, automationContext, liveEffectControllers);
      }

      if (effect.type === 'compressor') {
        currentNode = createCompressorStage(context, trackId, currentNode, effect, automationContext, liveEffectControllers);
      }

      if (effect.type === 'gate') {
        currentNode = createGateStage(context, trackId, currentNode, effect, automationContext, liveEffectControllers);
      }

      if (effect.type === 'limiter') {
        currentNode = createLimiterStage(context, trackId, currentNode, effect, automationContext, liveEffectControllers);
      }

      if (effect.type === 'saturation') {
        currentNode = createSaturationStage(context, trackId, currentNode, effect, automationContext, liveEffectControllers);
      }

      if (effect.type === 'overdrive') {
        currentNode = createOverdriveStage(context, trackId, currentNode, effect, automationContext, liveEffectControllers);
      }

      if (effect.type === 'bitcrusher') {
        currentNode = createBitcrusherStage(context, trackId, currentNode, effect, automationContext, liveEffectControllers);
      }

      if (effect.type === 'chorus') {
        currentNode = createChorusStage(context, trackId, currentNode, effect, automationContext, liveEffectControllers);
      }

      if (effect.type === 'flanger') {
        currentNode = createFlangerStage(context, trackId, currentNode, effect, automationContext, liveEffectControllers);
      }

      if (effect.type === 'phaser') {
        currentNode = createPhaserStage(context, trackId, currentNode, effect, automationContext, liveEffectControllers);
      }

      if (effect.type === 'tremolo') {
        currentNode = createTremoloStage(context, trackId, currentNode, effect, automationContext, liveEffectControllers);
      }

      if (effect.type === 'vibrato') {
        currentNode = createVibratoStage(context, trackId, currentNode, effect, automationContext, liveEffectControllers);
      }

      if (effect.type === 'ring') {
        currentNode = createRingModulatorStage(context, trackId, currentNode, effect, automationContext, liveEffectControllers);
      }

      if (effect.type === 'reverb') {
        currentNode = createReverbStage(
          context,
          trackId,
          currentNode,
          effect,
          automationContext,
          liveEffectControllers,
        );
      }

      if (effect.type === 'delay') {
        currentNode = createDelayStage(context, trackId, currentNode, effect, automationContext, liveEffectControllers);
      }
    });

  currentNode.connect(destination);
}

function setLiveAudioParam(param: AudioParam, value: number, context: BaseAudioContext) {
  param.cancelScheduledValues(context.currentTime);
  param.setTargetAtTime(value, context.currentTime, 0.01);
}

function getEffectAutomationLane(
  automationContext: EffectStageAutomationContext,
  effectType: EffectInstance['type'],
  parameterKey: string,
) {
  const parameter = getEffectAutomationParameterByEffectParameter(effectType, parameterKey);
  return parameter ? getAutomationLane(automationContext.automation, parameter.id) : null;
}

function hasAutomationKeyframes(lane: ReturnType<typeof getAutomationLane>) {
  return getSortedKeyframes(lane).length > 0;
}

function getAutomatedNumericEffectParameterValue(
  effect: EffectInstance,
  definition: NumericEffectParameterDefinition,
  automationContext: EffectStageAutomationContext,
  timelineTime: number,
) {
  const fallbackValue = getNumericEffectParameterValue(effect, definition);
  const lane = getEffectAutomationLane(automationContext, effect.type, definition.key);
  return Math.max(definition.min, Math.min(definition.max, evaluateAutomationValue(lane, fallbackValue, timelineTime)));
}

function getAutomatedEffectNumber(
  effect: EffectInstance,
  key: string,
  fallbackValue: number,
  minimum: number,
  maximum: number,
  automationContext: EffectStageAutomationContext,
  timelineTime: number,
) {
  const baseValue = getEffectNumber(effect, key, fallbackValue, minimum, maximum);
  const lane = getEffectAutomationLane(automationContext, effect.type, key);
  return Math.max(minimum, Math.min(maximum, evaluateAutomationValue(lane, baseValue, timelineTime)));
}

function getTimelineTimeFromAudioTime(
  automationContext: EffectStageAutomationContext,
  audioTime: number,
  sampleOffset = 0,
  sampleRate = 44_100,
) {
  return automationContext.timelineStart + Math.max(0, audioTime - automationContext.audioStart) + sampleOffset / sampleRate;
}

function getEventTimelineTime(
  event: AudioProcessingEvent,
  automationContext: EffectStageAutomationContext,
  context: BaseAudioContext,
) {
  const eventAudioTime = typeof event.playbackTime === 'number' ? event.playbackTime : context.currentTime;
  return getTimelineTimeFromAudioTime(automationContext, eventAudioTime, 0, context.sampleRate);
}

function configureEffectAudioParamAutomation(
  context: BaseAudioContext,
  param: AudioParam,
  automationContext: EffectStageAutomationContext,
  effectType: EffectInstance['type'],
  parameterKey: string,
  fallbackValue: number,
  transformValue: (value: number) => number = (value) => value,
) {
  const lane = getEffectAutomationLane(automationContext, effectType, parameterKey);
  if (!hasAutomationKeyframes(lane) || automationContext.outputDuration <= 0) {
    return lane;
  }

  const samples = sampleAutomationCurve(
    lane,
    fallbackValue,
    automationContext.timelineStart,
    automationContext.timelineStart + automationContext.outputDuration,
    Math.max(12, Math.min(120, Math.ceil(automationContext.outputDuration * 28))),
  );

  samples.forEach((sample, index) => {
    const scheduleTime = Math.max(
      context.currentTime,
      automationContext.audioStart + sample.time - automationContext.timelineStart,
    );
    const nextValue = transformValue(sample.value);

    if (index === 0) {
      param.setValueAtTime(nextValue, scheduleTime);
      return;
    }

    param.linearRampToValueAtTime(nextValue, scheduleTime);
  });

  return lane;
}

function configureDerivedEffectAudioParamAutomation(
  context: BaseAudioContext,
  param: AudioParam,
  automationContext: EffectStageAutomationContext,
  lanes: ReturnType<typeof getAutomationLane>[],
  fallbackValue: number,
  resolveValue: (timelineTime: number) => number,
) {
  if (!lanes.some(hasAutomationKeyframes) || automationContext.outputDuration <= 0) {
    return;
  }

  const samples = sampleAutomationCurve(
    lanes.find(hasAutomationKeyframes) ?? null,
    fallbackValue,
    automationContext.timelineStart,
    automationContext.timelineStart + automationContext.outputDuration,
    Math.max(12, Math.min(120, Math.ceil(automationContext.outputDuration * 28))),
  );

  samples.forEach((sample, index) => {
    const scheduleTime = Math.max(
      context.currentTime,
      automationContext.audioStart + sample.time - automationContext.timelineStart,
    );
    const nextValue = resolveValue(sample.time);

    if (index === 0) {
      param.setValueAtTime(nextValue, scheduleTime);
      return;
    }

    param.linearRampToValueAtTime(nextValue, scheduleTime);
  });
}

function setLiveAudioParamIfBaseEditable(
  lane: ReturnType<typeof getAutomationLane>,
  param: AudioParam,
  value: number,
  context: BaseAudioContext,
) {
  if (!hasAutomationKeyframes(lane)) {
    setLiveAudioParam(param, value, context);
  }
}

function createGraphicEqStage(
  context: BaseAudioContext,
  trackId: string,
  inputNode: AudioNode,
  effect: EffectInstance,
  automationContext: EffectStageAutomationContext,
  liveEffectControllers: LiveTrackEffectController[],
) {
  let currentNode = inputNode;
  const filters = new Map<string, BiquadFilterNode>();
  const automationLanes = new Map<string, ReturnType<typeof getAutomationLane>>();

  GRAPHIC_EQ_BANDS.forEach((band) => {
    const filter = context.createBiquadFilter();
    filter.type = 'peaking';
    filter.frequency.value = clampBiquadFrequency(context, band.frequency);
    filter.Q.value = GRAPHIC_EQ_DEFAULT_Q;
    filter.gain.value = getGraphicEqBandGain(effect, band.parameterKey);
    automationLanes.set(
      band.parameterKey,
      configureEffectAudioParamAutomation(
        context,
        filter.gain,
        automationContext,
        'eq',
        band.parameterKey,
        getGraphicEqBandGain(effect, band.parameterKey),
      ),
    );
    filters.set(band.parameterKey, filter);
    currentNode.connect(filter);
    currentNode = filter;
  });

  liveEffectControllers.push({
    trackId,
    effectType: 'eq',
    update: (nextEffect) => {
      GRAPHIC_EQ_BANDS.forEach((band) => {
        const filter = filters.get(band.parameterKey);
        if (filter) {
          setLiveAudioParamIfBaseEditable(
            automationLanes.get(band.parameterKey) ?? null,
            filter.gain,
            getGraphicEqBandGain(nextEffect, band.parameterKey),
            context,
          );
        }
      });
    },
  });

  return currentNode;
}

function createFilterStage(
  context: BaseAudioContext,
  trackId: string,
  inputNode: AudioNode,
  effect: EffectInstance,
  automationContext: EffectStageAutomationContext,
  liveEffectControllers: LiveTrackEffectController[],
) {
  const highpass = context.createBiquadFilter();
  const lowpass = context.createBiquadFilter();
  const notch = context.createBiquadFilter();
  const highpassFrequencyLane = getEffectAutomationLane(automationContext, 'filter', FILTER_PARAMETERS.highpassFrequency.key);
  const highpassQLane = getEffectAutomationLane(automationContext, 'filter', FILTER_PARAMETERS.highpassQ.key);
  const lowpassFrequencyLane = getEffectAutomationLane(automationContext, 'filter', FILTER_PARAMETERS.lowpassFrequency.key);
  const lowpassQLane = getEffectAutomationLane(automationContext, 'filter', FILTER_PARAMETERS.lowpassQ.key);
  const notchFrequencyLane = getEffectAutomationLane(automationContext, 'filter', FILTER_PARAMETERS.notchFrequency.key);
  const notchQLane = getEffectAutomationLane(automationContext, 'filter', FILTER_PARAMETERS.notchQ.key);
  const notchDepthLane = getEffectAutomationLane(automationContext, 'filter', FILTER_PARAMETERS.notchDepth.key);

  highpass.type = 'highpass';
  highpass.frequency.value = clampBiquadFrequency(
    context,
    getNumericEffectParameterValue(effect, FILTER_PARAMETERS.highpassFrequency),
  );
  highpass.Q.value = getNumericEffectParameterValue(effect, FILTER_PARAMETERS.highpassQ);
  configureEffectAudioParamAutomation(
    context,
    highpass.frequency,
    automationContext,
    'filter',
    FILTER_PARAMETERS.highpassFrequency.key,
    getNumericEffectParameterValue(effect, FILTER_PARAMETERS.highpassFrequency),
    (value) => clampBiquadFrequency(context, value),
  );
  configureEffectAudioParamAutomation(
    context,
    highpass.Q,
    automationContext,
    'filter',
    FILTER_PARAMETERS.highpassQ.key,
    getNumericEffectParameterValue(effect, FILTER_PARAMETERS.highpassQ),
  );

  lowpass.type = 'lowpass';
  lowpass.frequency.value = clampBiquadFrequency(
    context,
    getNumericEffectParameterValue(effect, FILTER_PARAMETERS.lowpassFrequency),
  );
  lowpass.Q.value = getNumericEffectParameterValue(effect, FILTER_PARAMETERS.lowpassQ);
  configureEffectAudioParamAutomation(
    context,
    lowpass.frequency,
    automationContext,
    'filter',
    FILTER_PARAMETERS.lowpassFrequency.key,
    getNumericEffectParameterValue(effect, FILTER_PARAMETERS.lowpassFrequency),
    (value) => clampBiquadFrequency(context, value),
  );
  configureEffectAudioParamAutomation(
    context,
    lowpass.Q,
    automationContext,
    'filter',
    FILTER_PARAMETERS.lowpassQ.key,
    getNumericEffectParameterValue(effect, FILTER_PARAMETERS.lowpassQ),
  );

  notch.type = 'peaking';
  notch.frequency.value = clampBiquadFrequency(
    context,
    getNumericEffectParameterValue(effect, FILTER_PARAMETERS.notchFrequency),
  );
  notch.Q.value = getNumericEffectParameterValue(effect, FILTER_PARAMETERS.notchQ);
  notch.gain.value = getNumericEffectParameterValue(effect, FILTER_PARAMETERS.notchDepth);
  configureEffectAudioParamAutomation(
    context,
    notch.frequency,
    automationContext,
    'filter',
    FILTER_PARAMETERS.notchFrequency.key,
    getNumericEffectParameterValue(effect, FILTER_PARAMETERS.notchFrequency),
    (value) => clampBiquadFrequency(context, value),
  );
  configureEffectAudioParamAutomation(
    context,
    notch.Q,
    automationContext,
    'filter',
    FILTER_PARAMETERS.notchQ.key,
    getNumericEffectParameterValue(effect, FILTER_PARAMETERS.notchQ),
  );
  configureEffectAudioParamAutomation(
    context,
    notch.gain,
    automationContext,
    'filter',
    FILTER_PARAMETERS.notchDepth.key,
    getNumericEffectParameterValue(effect, FILTER_PARAMETERS.notchDepth),
  );

  inputNode.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(notch);

  liveEffectControllers.push({
    trackId,
    effectType: 'filter',
    update: (nextEffect) => {
      setLiveAudioParamIfBaseEditable(
        highpassFrequencyLane,
        highpass.frequency,
        clampBiquadFrequency(context, getNumericEffectParameterValue(nextEffect, FILTER_PARAMETERS.highpassFrequency)),
        context,
      );
      setLiveAudioParamIfBaseEditable(highpassQLane, highpass.Q, getNumericEffectParameterValue(nextEffect, FILTER_PARAMETERS.highpassQ), context);
      setLiveAudioParamIfBaseEditable(
        lowpassFrequencyLane,
        lowpass.frequency,
        clampBiquadFrequency(context, getNumericEffectParameterValue(nextEffect, FILTER_PARAMETERS.lowpassFrequency)),
        context,
      );
      setLiveAudioParamIfBaseEditable(lowpassQLane, lowpass.Q, getNumericEffectParameterValue(nextEffect, FILTER_PARAMETERS.lowpassQ), context);
      setLiveAudioParamIfBaseEditable(
        notchFrequencyLane,
        notch.frequency,
        clampBiquadFrequency(context, getNumericEffectParameterValue(nextEffect, FILTER_PARAMETERS.notchFrequency)),
        context,
      );
      setLiveAudioParamIfBaseEditable(notchQLane, notch.Q, getNumericEffectParameterValue(nextEffect, FILTER_PARAMETERS.notchQ), context);
      setLiveAudioParamIfBaseEditable(notchDepthLane, notch.gain, getNumericEffectParameterValue(nextEffect, FILTER_PARAMETERS.notchDepth), context);
    },
  });

  return notch;
}

function createCompressorStage(
  context: BaseAudioContext,
  trackId: string,
  inputNode: AudioNode,
  effect: EffectInstance,
  automationContext: EffectStageAutomationContext,
  liveEffectControllers: LiveTrackEffectController[],
) {
  const output = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const compressor = context.createDynamicsCompressor();
  const makeupGain = context.createGain();
  const mix = getNumericEffectParameterValue(effect, COMPRESSOR_PARAMETERS.mix);
  const thresholdLane = getEffectAutomationLane(automationContext, 'compressor', COMPRESSOR_PARAMETERS.threshold.key);
  const ratioLane = getEffectAutomationLane(automationContext, 'compressor', COMPRESSOR_PARAMETERS.ratio.key);
  const attackLane = getEffectAutomationLane(automationContext, 'compressor', COMPRESSOR_PARAMETERS.attack.key);
  const releaseLane = getEffectAutomationLane(automationContext, 'compressor', COMPRESSOR_PARAMETERS.release.key);
  const kneeLane = getEffectAutomationLane(automationContext, 'compressor', COMPRESSOR_PARAMETERS.knee.key);
  const makeupLane = getEffectAutomationLane(automationContext, 'compressor', COMPRESSOR_PARAMETERS.makeup.key);
  const mixLane = getEffectAutomationLane(automationContext, 'compressor', COMPRESSOR_PARAMETERS.mix.key);

  compressor.threshold.value = getNumericEffectParameterValue(effect, COMPRESSOR_PARAMETERS.threshold);
  compressor.ratio.value = getNumericEffectParameterValue(effect, COMPRESSOR_PARAMETERS.ratio);
  compressor.attack.value = getNumericEffectParameterValue(effect, COMPRESSOR_PARAMETERS.attack);
  compressor.release.value = getNumericEffectParameterValue(effect, COMPRESSOR_PARAMETERS.release);
  compressor.knee.value = getNumericEffectParameterValue(effect, COMPRESSOR_PARAMETERS.knee);
  makeupGain.gain.value = decibelsToGain(getNumericEffectParameterValue(effect, COMPRESSOR_PARAMETERS.makeup));
  dryGain.gain.value = 1 - mix;
  wetGain.gain.value = mix;
  configureEffectAudioParamAutomation(context, compressor.threshold, automationContext, 'compressor', COMPRESSOR_PARAMETERS.threshold.key, getNumericEffectParameterValue(effect, COMPRESSOR_PARAMETERS.threshold));
  configureEffectAudioParamAutomation(context, compressor.ratio, automationContext, 'compressor', COMPRESSOR_PARAMETERS.ratio.key, getNumericEffectParameterValue(effect, COMPRESSOR_PARAMETERS.ratio));
  configureEffectAudioParamAutomation(context, compressor.attack, automationContext, 'compressor', COMPRESSOR_PARAMETERS.attack.key, getNumericEffectParameterValue(effect, COMPRESSOR_PARAMETERS.attack));
  configureEffectAudioParamAutomation(context, compressor.release, automationContext, 'compressor', COMPRESSOR_PARAMETERS.release.key, getNumericEffectParameterValue(effect, COMPRESSOR_PARAMETERS.release));
  configureEffectAudioParamAutomation(context, compressor.knee, automationContext, 'compressor', COMPRESSOR_PARAMETERS.knee.key, getNumericEffectParameterValue(effect, COMPRESSOR_PARAMETERS.knee));
  configureEffectAudioParamAutomation(context, makeupGain.gain, automationContext, 'compressor', COMPRESSOR_PARAMETERS.makeup.key, getNumericEffectParameterValue(effect, COMPRESSOR_PARAMETERS.makeup), decibelsToGain);
  configureEffectAudioParamAutomation(context, dryGain.gain, automationContext, 'compressor', COMPRESSOR_PARAMETERS.mix.key, mix, (value) => 1 - value);
  configureEffectAudioParamAutomation(context, wetGain.gain, automationContext, 'compressor', COMPRESSOR_PARAMETERS.mix.key, mix);

  inputNode.connect(dryGain);
  inputNode.connect(compressor);
  compressor.connect(makeupGain);
  makeupGain.connect(wetGain);
  dryGain.connect(output);
  wetGain.connect(output);

  liveEffectControllers.push({
    trackId,
    effectType: 'compressor',
    update: (nextEffect) => {
      const nextMix = getNumericEffectParameterValue(nextEffect, COMPRESSOR_PARAMETERS.mix);
      setLiveAudioParamIfBaseEditable(
        thresholdLane,
        compressor.threshold,
        getNumericEffectParameterValue(nextEffect, COMPRESSOR_PARAMETERS.threshold),
        context,
      );
      setLiveAudioParamIfBaseEditable(ratioLane, compressor.ratio, getNumericEffectParameterValue(nextEffect, COMPRESSOR_PARAMETERS.ratio), context);
      setLiveAudioParamIfBaseEditable(attackLane, compressor.attack, getNumericEffectParameterValue(nextEffect, COMPRESSOR_PARAMETERS.attack), context);
      setLiveAudioParamIfBaseEditable(releaseLane, compressor.release, getNumericEffectParameterValue(nextEffect, COMPRESSOR_PARAMETERS.release), context);
      setLiveAudioParamIfBaseEditable(kneeLane, compressor.knee, getNumericEffectParameterValue(nextEffect, COMPRESSOR_PARAMETERS.knee), context);
      setLiveAudioParamIfBaseEditable(
        makeupLane,
        makeupGain.gain,
        decibelsToGain(getNumericEffectParameterValue(nextEffect, COMPRESSOR_PARAMETERS.makeup)),
        context,
      );
      setLiveAudioParamIfBaseEditable(mixLane, dryGain.gain, 1 - nextMix, context);
      setLiveAudioParamIfBaseEditable(mixLane, wetGain.gain, nextMix, context);
    },
  });

  return output;
}

function createLimiterStage(
  context: BaseAudioContext,
  trackId: string,
  inputNode: AudioNode,
  effect: EffectInstance,
  automationContext: EffectStageAutomationContext,
  liveEffectControllers: LiveTrackEffectController[],
) {
  const output = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const inputGain = context.createGain();
  const dynamicsStage = context.createDynamicsCompressor();
  const ceilingStage = context.createWaveShaper();
  const mix = getNumericEffectParameterValue(effect, LIMITER_PARAMETERS.mix);
  const ceiling = getNumericEffectParameterValue(effect, LIMITER_PARAMETERS.ceiling);
  const ceilingLane = getEffectAutomationLane(automationContext, 'limiter', LIMITER_PARAMETERS.ceiling.key);
  const inputLane = getEffectAutomationLane(automationContext, 'limiter', LIMITER_PARAMETERS.input.key);
  const releaseLane = getEffectAutomationLane(automationContext, 'limiter', LIMITER_PARAMETERS.release.key);
  const mixLane = getEffectAutomationLane(automationContext, 'limiter', LIMITER_PARAMETERS.mix.key);

  inputGain.gain.value = decibelsToGain(getNumericEffectParameterValue(effect, LIMITER_PARAMETERS.input));
  dynamicsStage.threshold.value = Math.max(-60, Math.min(0, ceiling - 3));
  dynamicsStage.knee.value = 0;
  dynamicsStage.ratio.value = 20;
  dynamicsStage.attack.value = 0.003;
  dynamicsStage.release.value = getNumericEffectParameterValue(effect, LIMITER_PARAMETERS.release);
  ceilingStage.curve = createLimiterCeilingCurve(ceiling);
  ceilingStage.oversample = '2x';
  dryGain.gain.value = 1 - mix;
  wetGain.gain.value = mix;
  configureEffectAudioParamAutomation(context, inputGain.gain, automationContext, 'limiter', LIMITER_PARAMETERS.input.key, getNumericEffectParameterValue(effect, LIMITER_PARAMETERS.input), decibelsToGain);
  configureEffectAudioParamAutomation(context, dynamicsStage.threshold, automationContext, 'limiter', LIMITER_PARAMETERS.ceiling.key, ceiling, (value) => Math.max(-60, Math.min(0, value - 3)));
  configureEffectAudioParamAutomation(context, dynamicsStage.release, automationContext, 'limiter', LIMITER_PARAMETERS.release.key, getNumericEffectParameterValue(effect, LIMITER_PARAMETERS.release));
  configureEffectAudioParamAutomation(context, dryGain.gain, automationContext, 'limiter', LIMITER_PARAMETERS.mix.key, mix, (value) => 1 - value);
  configureEffectAudioParamAutomation(context, wetGain.gain, automationContext, 'limiter', LIMITER_PARAMETERS.mix.key, mix);

  inputNode.connect(dryGain);
  inputNode.connect(inputGain);
  inputGain.connect(dynamicsStage);
  dynamicsStage.connect(ceilingStage);
  ceilingStage.connect(wetGain);
  dryGain.connect(output);
  wetGain.connect(output);

  liveEffectControllers.push({
    trackId,
    effectType: 'limiter',
    update: (nextEffect) => {
      const nextMix = getNumericEffectParameterValue(nextEffect, LIMITER_PARAMETERS.mix);
      const nextCeiling = getNumericEffectParameterValue(nextEffect, LIMITER_PARAMETERS.ceiling);
      setLiveAudioParamIfBaseEditable(inputLane, inputGain.gain, decibelsToGain(getNumericEffectParameterValue(nextEffect, LIMITER_PARAMETERS.input)), context);
      setLiveAudioParamIfBaseEditable(ceilingLane, dynamicsStage.threshold, Math.max(-60, Math.min(0, nextCeiling - 3)), context);
      setLiveAudioParamIfBaseEditable(releaseLane, dynamicsStage.release, getNumericEffectParameterValue(nextEffect, LIMITER_PARAMETERS.release), context);
      if (!hasAutomationKeyframes(ceilingLane)) {
        ceilingStage.curve = createLimiterCeilingCurve(nextCeiling);
      }
      setLiveAudioParamIfBaseEditable(mixLane, dryGain.gain, 1 - nextMix, context);
      setLiveAudioParamIfBaseEditable(mixLane, wetGain.gain, nextMix, context);
    },
  });

  return output;
}

interface GateProcessorConfig {
  threshold: number;
  closedGain: number;
  attackCoefficient: number;
  releaseCoefficient: number;
  holdSamples: number;
}

interface SaturationProcessorConfig {
  driveGain: number;
  outputGain: number;
}

interface OverdriveProcessorConfig {
  driveGain: number;
  clipThreshold: number;
  outputGain: number;
}

function createGateStage(
  context: BaseAudioContext,
  trackId: string,
  inputNode: AudioNode,
  effect: EffectInstance,
  automationContext: EffectStageAutomationContext,
  liveEffectControllers: LiveTrackEffectController[],
) {
  const output = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const processor = context.createScriptProcessor(1024, 2, 2);
  let config = createGateProcessorConfig(context, effect);
  let envelopeGain = 1;
  let holdRemaining = 0;
  const mix = getNumericEffectParameterValue(effect, GATE_PARAMETERS.mix);
  const thresholdLane = getEffectAutomationLane(automationContext, 'gate', GATE_PARAMETERS.threshold.key);
  const reductionLane = getEffectAutomationLane(automationContext, 'gate', GATE_PARAMETERS.reduction.key);
  const attackLane = getEffectAutomationLane(automationContext, 'gate', GATE_PARAMETERS.attack.key);
  const releaseLane = getEffectAutomationLane(automationContext, 'gate', GATE_PARAMETERS.release.key);
  const holdLane = getEffectAutomationLane(automationContext, 'gate', GATE_PARAMETERS.hold.key);
  const mixLane = getEffectAutomationLane(automationContext, 'gate', GATE_PARAMETERS.mix.key);

  dryGain.gain.value = 1 - mix;
  wetGain.gain.value = mix;
  configureEffectAudioParamAutomation(context, dryGain.gain, automationContext, 'gate', GATE_PARAMETERS.mix.key, mix, (value) => 1 - value);
  configureEffectAudioParamAutomation(context, wetGain.gain, automationContext, 'gate', GATE_PARAMETERS.mix.key, mix);

  processor.onaudioprocess = (event) => {
    if (
      hasAutomationKeyframes(thresholdLane) ||
      hasAutomationKeyframes(reductionLane) ||
      hasAutomationKeyframes(attackLane) ||
      hasAutomationKeyframes(releaseLane) ||
      hasAutomationKeyframes(holdLane)
    ) {
      config = createGateProcessorConfigAtTime(context, effect, automationContext, getEventTimelineTime(event, automationContext, context));
    }

    const inputBuffer = event.inputBuffer;
    const outputBuffer = event.outputBuffer;
    const channelCount = Math.min(inputBuffer.numberOfChannels, outputBuffer.numberOfChannels);
    const sampleCount = outputBuffer.length;

    for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
      let detector = 0;
      for (let channel = 0; channel < channelCount; channel += 1) {
        detector = Math.max(detector, Math.abs(inputBuffer.getChannelData(channel)[sampleIndex] ?? 0));
      }

      const isOpen = detector >= config.threshold;
      if (isOpen) {
        holdRemaining = config.holdSamples;
      } else if (holdRemaining > 0) {
        holdRemaining -= 1;
      }

      const targetGain = isOpen || holdRemaining > 0 ? 1 : config.closedGain;
      const coefficient = targetGain > envelopeGain ? config.attackCoefficient : config.releaseCoefficient;
      envelopeGain += (targetGain - envelopeGain) * coefficient;

      for (let channel = 0; channel < outputBuffer.numberOfChannels; channel += 1) {
        const sourceChannel = Math.min(channel, inputBuffer.numberOfChannels - 1);
        outputBuffer.getChannelData(channel)[sampleIndex] =
          (inputBuffer.getChannelData(sourceChannel)[sampleIndex] ?? 0) * envelopeGain;
      }
    }
  };

  inputNode.connect(dryGain);
  inputNode.connect(processor);
  processor.connect(wetGain);
  dryGain.connect(output);
  wetGain.connect(output);

  liveEffectControllers.push({
    trackId,
    effectType: 'gate',
    update: (nextEffect) => {
      if (
        !hasAutomationKeyframes(thresholdLane) &&
        !hasAutomationKeyframes(reductionLane) &&
        !hasAutomationKeyframes(attackLane) &&
        !hasAutomationKeyframes(releaseLane) &&
        !hasAutomationKeyframes(holdLane)
      ) {
        config = createGateProcessorConfig(context, nextEffect);
      }
      const nextMix = getNumericEffectParameterValue(nextEffect, GATE_PARAMETERS.mix);
      setLiveAudioParamIfBaseEditable(mixLane, dryGain.gain, 1 - nextMix, context);
      setLiveAudioParamIfBaseEditable(mixLane, wetGain.gain, nextMix, context);
    },
  });

  return output;
}

function createSaturationStage(
  context: BaseAudioContext,
  trackId: string,
  inputNode: AudioNode,
  effect: EffectInstance,
  automationContext: EffectStageAutomationContext,
  liveEffectControllers: LiveTrackEffectController[],
) {
  const output = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const processor = context.createScriptProcessor(1024, 2, 2);
  const toneFilter = context.createBiquadFilter();
  const mix = getNumericEffectParameterValue(effect, SATURATION_PARAMETERS.mix);
  const driveLane = getEffectAutomationLane(automationContext, 'saturation', SATURATION_PARAMETERS.drive.key);
  const toneLane = getEffectAutomationLane(automationContext, 'saturation', SATURATION_PARAMETERS.tone.key);
  const mixLane = getEffectAutomationLane(automationContext, 'saturation', SATURATION_PARAMETERS.mix.key);
  const outputLane = getEffectAutomationLane(automationContext, 'saturation', SATURATION_PARAMETERS.output.key);
  let config = createSaturationProcessorConfig(effect);

  processor.onaudioprocess = (event) => {
    if (hasAutomationKeyframes(driveLane) || hasAutomationKeyframes(outputLane)) {
      config = createSaturationProcessorConfigAtTime(effect, automationContext, getEventTimelineTime(event, automationContext, context));
    }

    const inputBuffer = event.inputBuffer;
    const outputBuffer = event.outputBuffer;
    const sampleCount = outputBuffer.length;
    const sourceChannelCount = Math.max(1, inputBuffer.numberOfChannels);
    const normalization = Math.max(0.0001, Math.tanh(config.driveGain));

    for (let channel = 0; channel < outputBuffer.numberOfChannels; channel += 1) {
      const sourceChannel = Math.min(channel, sourceChannelCount - 1);
      const input = inputBuffer.getChannelData(sourceChannel);
      const outputChannel = outputBuffer.getChannelData(channel);

      for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
        outputChannel[sampleIndex] =
          (Math.tanh((input[sampleIndex] ?? 0) * config.driveGain) / normalization) * config.outputGain;
      }
    }
  };

  toneFilter.type = 'lowpass';
  toneFilter.frequency.value = clampBiquadFrequency(context, getNumericEffectParameterValue(effect, SATURATION_PARAMETERS.tone));
  toneFilter.Q.value = 0.7;
  dryGain.gain.value = 1 - mix * 0.72;
  wetGain.gain.value = mix;
  configureEffectAudioParamAutomation(
    context,
    toneFilter.frequency,
    automationContext,
    'saturation',
    SATURATION_PARAMETERS.tone.key,
    getNumericEffectParameterValue(effect, SATURATION_PARAMETERS.tone),
    (value) => clampBiquadFrequency(context, value),
  );
  configureEffectAudioParamAutomation(context, dryGain.gain, automationContext, 'saturation', SATURATION_PARAMETERS.mix.key, mix, (value) => 1 - value * 0.72);
  configureEffectAudioParamAutomation(context, wetGain.gain, automationContext, 'saturation', SATURATION_PARAMETERS.mix.key, mix);

  inputNode.connect(dryGain);
  inputNode.connect(processor);
  processor.connect(toneFilter);
  toneFilter.connect(wetGain);
  dryGain.connect(output);
  wetGain.connect(output);

  liveEffectControllers.push({
    trackId,
    effectType: 'saturation',
    update: (nextEffect) => {
      const nextMix = getNumericEffectParameterValue(nextEffect, SATURATION_PARAMETERS.mix);
      if (!hasAutomationKeyframes(driveLane) && !hasAutomationKeyframes(outputLane)) {
        config = createSaturationProcessorConfig(nextEffect);
      }
      setLiveAudioParamIfBaseEditable(
        toneLane,
        toneFilter.frequency,
        clampBiquadFrequency(context, getNumericEffectParameterValue(nextEffect, SATURATION_PARAMETERS.tone)),
        context,
      );
      setLiveAudioParamIfBaseEditable(mixLane, dryGain.gain, 1 - nextMix * 0.72, context);
      setLiveAudioParamIfBaseEditable(mixLane, wetGain.gain, nextMix, context);
    },
  });

  return output;
}

function createOverdriveStage(
  context: BaseAudioContext,
  trackId: string,
  inputNode: AudioNode,
  effect: EffectInstance,
  automationContext: EffectStageAutomationContext,
  liveEffectControllers: LiveTrackEffectController[],
) {
  const output = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const processor = context.createScriptProcessor(1024, 2, 2);
  const toneFilter = context.createBiquadFilter();
  const mix = getNumericEffectParameterValue(effect, OVERDRIVE_PARAMETERS.mix);
  const driveLane = getEffectAutomationLane(automationContext, 'overdrive', OVERDRIVE_PARAMETERS.drive.key);
  const clipLane = getEffectAutomationLane(automationContext, 'overdrive', OVERDRIVE_PARAMETERS.clip.key);
  const toneLane = getEffectAutomationLane(automationContext, 'overdrive', OVERDRIVE_PARAMETERS.tone.key);
  const mixLane = getEffectAutomationLane(automationContext, 'overdrive', OVERDRIVE_PARAMETERS.mix.key);
  const outputLane = getEffectAutomationLane(automationContext, 'overdrive', OVERDRIVE_PARAMETERS.output.key);
  let config = createOverdriveProcessorConfig(effect);

  processor.onaudioprocess = (event) => {
    if (hasAutomationKeyframes(driveLane) || hasAutomationKeyframes(clipLane) || hasAutomationKeyframes(outputLane)) {
      config = createOverdriveProcessorConfigAtTime(effect, automationContext, getEventTimelineTime(event, automationContext, context));
    }

    const inputBuffer = event.inputBuffer;
    const outputBuffer = event.outputBuffer;
    const sampleCount = outputBuffer.length;
    const sourceChannelCount = Math.max(1, inputBuffer.numberOfChannels);
    const threshold = Math.max(0.08, Math.min(1, config.clipThreshold));

    for (let channel = 0; channel < outputBuffer.numberOfChannels; channel += 1) {
      const sourceChannel = Math.min(channel, sourceChannelCount - 1);
      const input = inputBuffer.getChannelData(sourceChannel);
      const outputChannel = outputBuffer.getChannelData(channel);

      for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
        const driven = (input[sampleIndex] ?? 0) * config.driveGain;
        const clipped = Math.max(-threshold, Math.min(threshold, driven)) / threshold;
        outputChannel[sampleIndex] = clipped * config.outputGain;
      }
    }
  };

  toneFilter.type = 'lowpass';
  toneFilter.frequency.value = clampBiquadFrequency(context, getNumericEffectParameterValue(effect, OVERDRIVE_PARAMETERS.tone));
  toneFilter.Q.value = 0.85;
  dryGain.gain.value = 1 - mix;
  wetGain.gain.value = mix;
  configureEffectAudioParamAutomation(
    context,
    toneFilter.frequency,
    automationContext,
    'overdrive',
    OVERDRIVE_PARAMETERS.tone.key,
    getNumericEffectParameterValue(effect, OVERDRIVE_PARAMETERS.tone),
    (value) => clampBiquadFrequency(context, value),
  );
  configureEffectAudioParamAutomation(context, dryGain.gain, automationContext, 'overdrive', OVERDRIVE_PARAMETERS.mix.key, mix, (value) => 1 - value);
  configureEffectAudioParamAutomation(context, wetGain.gain, automationContext, 'overdrive', OVERDRIVE_PARAMETERS.mix.key, mix);

  inputNode.connect(dryGain);
  inputNode.connect(processor);
  processor.connect(toneFilter);
  toneFilter.connect(wetGain);
  dryGain.connect(output);
  wetGain.connect(output);

  liveEffectControllers.push({
    trackId,
    effectType: 'overdrive',
    update: (nextEffect) => {
      const nextMix = getNumericEffectParameterValue(nextEffect, OVERDRIVE_PARAMETERS.mix);
      if (!hasAutomationKeyframes(driveLane) && !hasAutomationKeyframes(clipLane) && !hasAutomationKeyframes(outputLane)) {
        config = createOverdriveProcessorConfig(nextEffect);
      }
      setLiveAudioParamIfBaseEditable(
        toneLane,
        toneFilter.frequency,
        clampBiquadFrequency(context, getNumericEffectParameterValue(nextEffect, OVERDRIVE_PARAMETERS.tone)),
        context,
      );
      setLiveAudioParamIfBaseEditable(mixLane, dryGain.gain, 1 - nextMix, context);
      setLiveAudioParamIfBaseEditable(mixLane, wetGain.gain, nextMix, context);
    },
  });

  return output;
}

function createChorusStage(
  context: BaseAudioContext,
  trackId: string,
  inputNode: AudioNode,
  effect: EffectInstance,
  automationContext: EffectStageAutomationContext,
  liveEffectControllers: LiveTrackEffectController[],
) {
  const output = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const wetMerger = context.createChannelMerger(2);
  const maxDelayTime = CHORUS_PARAMETERS.delay.max + CHORUS_PARAMETERS.depth.max + 0.02;
  const leftDelay = context.createDelay(maxDelayTime);
  const rightDelay = context.createDelay(maxDelayTime);
  const leftFeedback = context.createGain();
  const rightFeedback = context.createGain();
  const lfo = context.createOscillator();
  const leftDepth = context.createGain();
  const rightDepth = context.createGain();
  const mix = getNumericEffectParameterValue(effect, CHORUS_PARAMETERS.mix);
  const feedback = getNumericEffectParameterValue(effect, CHORUS_PARAMETERS.feedback);
  const depth = getNumericEffectParameterValue(effect, CHORUS_PARAMETERS.depth);
  const delayCenter = getChorusDelayCenter(effect);
  const rateLane = getEffectAutomationLane(automationContext, 'chorus', CHORUS_PARAMETERS.rate.key);
  const depthLane = getEffectAutomationLane(automationContext, 'chorus', CHORUS_PARAMETERS.depth.key);
  const delayLane = getEffectAutomationLane(automationContext, 'chorus', CHORUS_PARAMETERS.delay.key);
  const feedbackLane = getEffectAutomationLane(automationContext, 'chorus', CHORUS_PARAMETERS.feedback.key);
  const mixLane = getEffectAutomationLane(automationContext, 'chorus', CHORUS_PARAMETERS.mix.key);
  const resolveDelayCenter = (timelineTime: number) =>
    Math.min(
      CHORUS_PARAMETERS.delay.max + CHORUS_PARAMETERS.depth.max,
      getAutomatedNumericEffectParameterValue(effect, CHORUS_PARAMETERS.delay, automationContext, timelineTime) +
        getAutomatedNumericEffectParameterValue(effect, CHORUS_PARAMETERS.depth, automationContext, timelineTime) / 2,
    );

  leftDelay.delayTime.value = delayCenter;
  rightDelay.delayTime.value = delayCenter;
  leftFeedback.gain.value = feedback;
  rightFeedback.gain.value = feedback;
  lfo.frequency.value = getNumericEffectParameterValue(effect, CHORUS_PARAMETERS.rate);
  leftDepth.gain.value = depth / 2;
  rightDepth.gain.value = -depth / 2;
  dryGain.gain.value = 1 - mix * 0.55;
  wetGain.gain.value = mix;
  configureEffectAudioParamAutomation(context, lfo.frequency, automationContext, 'chorus', CHORUS_PARAMETERS.rate.key, getNumericEffectParameterValue(effect, CHORUS_PARAMETERS.rate));
  configureDerivedEffectAudioParamAutomation(context, leftDelay.delayTime, automationContext, [delayLane, depthLane], delayCenter, resolveDelayCenter);
  configureDerivedEffectAudioParamAutomation(context, rightDelay.delayTime, automationContext, [delayLane, depthLane], delayCenter, resolveDelayCenter);
  configureEffectAudioParamAutomation(context, leftDepth.gain, automationContext, 'chorus', CHORUS_PARAMETERS.depth.key, depth, (value) => value / 2);
  configureEffectAudioParamAutomation(context, rightDepth.gain, automationContext, 'chorus', CHORUS_PARAMETERS.depth.key, depth, (value) => -value / 2);
  configureEffectAudioParamAutomation(context, leftFeedback.gain, automationContext, 'chorus', CHORUS_PARAMETERS.feedback.key, feedback);
  configureEffectAudioParamAutomation(context, rightFeedback.gain, automationContext, 'chorus', CHORUS_PARAMETERS.feedback.key, feedback);
  configureEffectAudioParamAutomation(context, dryGain.gain, automationContext, 'chorus', CHORUS_PARAMETERS.mix.key, mix, (value) => 1 - value * 0.55);
  configureEffectAudioParamAutomation(context, wetGain.gain, automationContext, 'chorus', CHORUS_PARAMETERS.mix.key, mix);

  inputNode.connect(dryGain);
  inputNode.connect(leftDelay);
  inputNode.connect(rightDelay);
  leftDelay.connect(leftFeedback);
  leftFeedback.connect(leftDelay);
  rightDelay.connect(rightFeedback);
  rightFeedback.connect(rightDelay);
  leftDelay.connect(wetMerger, 0, 0);
  rightDelay.connect(wetMerger, 0, 1);
  wetMerger.connect(wetGain);
  dryGain.connect(output);
  wetGain.connect(output);
  lfo.connect(leftDepth);
  lfo.connect(rightDepth);
  leftDepth.connect(leftDelay.delayTime);
  rightDepth.connect(rightDelay.delayTime);
  lfo.start(context.currentTime);

  liveEffectControllers.push({
    trackId,
    effectType: 'chorus',
    update: (nextEffect) => {
      const nextMix = getNumericEffectParameterValue(nextEffect, CHORUS_PARAMETERS.mix);
      const nextFeedback = getNumericEffectParameterValue(nextEffect, CHORUS_PARAMETERS.feedback);
      const nextDepth = getNumericEffectParameterValue(nextEffect, CHORUS_PARAMETERS.depth);
      const nextDelayCenter = getChorusDelayCenter(nextEffect);
      setLiveAudioParamIfBaseEditable(rateLane, lfo.frequency, getNumericEffectParameterValue(nextEffect, CHORUS_PARAMETERS.rate), context);
      if (!hasAutomationKeyframes(delayLane) && !hasAutomationKeyframes(depthLane)) {
        setLiveAudioParam(leftDelay.delayTime, nextDelayCenter, context);
        setLiveAudioParam(rightDelay.delayTime, nextDelayCenter, context);
      }
      setLiveAudioParamIfBaseEditable(depthLane, leftDepth.gain, nextDepth / 2, context);
      setLiveAudioParamIfBaseEditable(depthLane, rightDepth.gain, -nextDepth / 2, context);
      setLiveAudioParamIfBaseEditable(feedbackLane, leftFeedback.gain, nextFeedback, context);
      setLiveAudioParamIfBaseEditable(feedbackLane, rightFeedback.gain, nextFeedback, context);
      setLiveAudioParamIfBaseEditable(mixLane, dryGain.gain, 1 - nextMix * 0.55, context);
      setLiveAudioParamIfBaseEditable(mixLane, wetGain.gain, nextMix, context);
    },
  });

  return output;
}

function createFlangerStage(
  context: BaseAudioContext,
  trackId: string,
  inputNode: AudioNode,
  effect: EffectInstance,
  automationContext: EffectStageAutomationContext,
  liveEffectControllers: LiveTrackEffectController[],
) {
  const output = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const maxDelayTime = FLANGER_PARAMETERS.delay.max + FLANGER_PARAMETERS.depth.max + 0.01;
  const delayNode = context.createDelay(maxDelayTime);
  const feedbackGain = context.createGain();
  const lfo = context.createOscillator();
  const depthGain = context.createGain();
  const mix = getNumericEffectParameterValue(effect, FLANGER_PARAMETERS.mix);
  const depth = getNumericEffectParameterValue(effect, FLANGER_PARAMETERS.depth);
  const rateLane = getEffectAutomationLane(automationContext, 'flanger', FLANGER_PARAMETERS.rate.key);
  const depthLane = getEffectAutomationLane(automationContext, 'flanger', FLANGER_PARAMETERS.depth.key);
  const delayLane = getEffectAutomationLane(automationContext, 'flanger', FLANGER_PARAMETERS.delay.key);
  const feedbackLane = getEffectAutomationLane(automationContext, 'flanger', FLANGER_PARAMETERS.feedback.key);
  const mixLane = getEffectAutomationLane(automationContext, 'flanger', FLANGER_PARAMETERS.mix.key);
  const resolveDelayCenter = (timelineTime: number) =>
    Math.min(
      FLANGER_PARAMETERS.delay.max + FLANGER_PARAMETERS.depth.max,
      getAutomatedNumericEffectParameterValue(effect, FLANGER_PARAMETERS.delay, automationContext, timelineTime) +
        getAutomatedNumericEffectParameterValue(effect, FLANGER_PARAMETERS.depth, automationContext, timelineTime) / 2,
    );

  delayNode.delayTime.value = getFlangerDelayCenter(effect);
  feedbackGain.gain.value = getNumericEffectParameterValue(effect, FLANGER_PARAMETERS.feedback);
  lfo.frequency.value = getNumericEffectParameterValue(effect, FLANGER_PARAMETERS.rate);
  depthGain.gain.value = depth / 2;
  dryGain.gain.value = 1 - mix * 0.5;
  wetGain.gain.value = mix;
  configureEffectAudioParamAutomation(context, lfo.frequency, automationContext, 'flanger', FLANGER_PARAMETERS.rate.key, getNumericEffectParameterValue(effect, FLANGER_PARAMETERS.rate));
  configureDerivedEffectAudioParamAutomation(context, delayNode.delayTime, automationContext, [delayLane, depthLane], getFlangerDelayCenter(effect), resolveDelayCenter);
  configureEffectAudioParamAutomation(context, depthGain.gain, automationContext, 'flanger', FLANGER_PARAMETERS.depth.key, depth, (value) => value / 2);
  configureEffectAudioParamAutomation(context, feedbackGain.gain, automationContext, 'flanger', FLANGER_PARAMETERS.feedback.key, getNumericEffectParameterValue(effect, FLANGER_PARAMETERS.feedback));
  configureEffectAudioParamAutomation(context, dryGain.gain, automationContext, 'flanger', FLANGER_PARAMETERS.mix.key, mix, (value) => 1 - value * 0.5);
  configureEffectAudioParamAutomation(context, wetGain.gain, automationContext, 'flanger', FLANGER_PARAMETERS.mix.key, mix);

  inputNode.connect(dryGain);
  inputNode.connect(delayNode);
  delayNode.connect(feedbackGain);
  feedbackGain.connect(delayNode);
  delayNode.connect(wetGain);
  dryGain.connect(output);
  wetGain.connect(output);
  lfo.connect(depthGain);
  depthGain.connect(delayNode.delayTime);
  lfo.start(context.currentTime);

  liveEffectControllers.push({
    trackId,
    effectType: 'flanger',
    update: (nextEffect) => {
      const nextMix = getNumericEffectParameterValue(nextEffect, FLANGER_PARAMETERS.mix);
      const nextDepth = getNumericEffectParameterValue(nextEffect, FLANGER_PARAMETERS.depth);
      setLiveAudioParamIfBaseEditable(rateLane, lfo.frequency, getNumericEffectParameterValue(nextEffect, FLANGER_PARAMETERS.rate), context);
      if (!hasAutomationKeyframes(delayLane) && !hasAutomationKeyframes(depthLane)) {
        setLiveAudioParam(delayNode.delayTime, getFlangerDelayCenter(nextEffect), context);
      }
      setLiveAudioParamIfBaseEditable(depthLane, depthGain.gain, nextDepth / 2, context);
      setLiveAudioParamIfBaseEditable(feedbackLane, feedbackGain.gain, getNumericEffectParameterValue(nextEffect, FLANGER_PARAMETERS.feedback), context);
      setLiveAudioParamIfBaseEditable(mixLane, dryGain.gain, 1 - nextMix * 0.5, context);
      setLiveAudioParamIfBaseEditable(mixLane, wetGain.gain, nextMix, context);
    },
  });

  return output;
}

function createPhaserStage(
  context: BaseAudioContext,
  trackId: string,
  inputNode: AudioNode,
  effect: EffectInstance,
  automationContext: EffectStageAutomationContext,
  liveEffectControllers: LiveTrackEffectController[],
) {
  const output = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const wetInput = context.createGain();
  const feedbackDelay = context.createDelay(0.02);
  const feedbackGain = context.createGain();
  const lfo = context.createOscillator();
  const rateLane = getEffectAutomationLane(automationContext, 'phaser', PHASER_PARAMETERS.rate.key);
  const depthLane = getEffectAutomationLane(automationContext, 'phaser', PHASER_PARAMETERS.depth.key);
  const centerLane = getEffectAutomationLane(automationContext, 'phaser', PHASER_PARAMETERS.center.key);
  const feedbackLane = getEffectAutomationLane(automationContext, 'phaser', PHASER_PARAMETERS.feedback.key);
  const mixLane = getEffectAutomationLane(automationContext, 'phaser', PHASER_PARAMETERS.mix.key);
  const getCenterAt = (timelineTime: number) =>
    getAutomatedNumericEffectParameterValue(effect, PHASER_PARAMETERS.center, automationContext, timelineTime);
  const getDepthAt = (timelineTime: number) =>
    getAutomatedNumericEffectParameterValue(effect, PHASER_PARAMETERS.depth, automationContext, timelineTime);
  const getFeedbackAt = (timelineTime: number) =>
    getAutomatedNumericEffectParameterValue(effect, PHASER_PARAMETERS.feedback, automationContext, timelineTime);
  const getStageBaseFrequencyAt = (timelineTime: number, multiplier: number) =>
    clampBiquadFrequency(context, getCenterAt(timelineTime) * multiplier);
  const getStageSweepDepthAt = (timelineTime: number, multiplier: number) => {
    const center = getCenterAt(timelineTime);
    const depth = getDepthAt(timelineTime);
    const baseFrequency = getStageBaseFrequencyAt(timelineTime, multiplier);
    const nyquistLimit = Math.max(20, context.sampleRate / 2 - 1);
    const downwardRoom = Math.max(0, baseFrequency - 40);
    const upwardRoom = Math.max(0, nyquistLimit - baseFrequency - 40);
    return Math.min(center * depth * 0.78, downwardRoom, upwardRoom);
  };
  const filters = phaserStageMultipliers.map((multiplier) => {
    const filter = context.createBiquadFilter();
    const depth = context.createGain();
    filter.type = 'allpass';
    filter.frequency.value = getPhaserStageBaseFrequency(context, effect, multiplier);
    filter.Q.value = getPhaserStageQ(effect);
    depth.gain.value = getPhaserStageSweepDepth(context, effect, multiplier);
    lfo.connect(depth);
    depth.connect(filter.frequency);
    return {filter, depth, multiplier};
  });

  const mix = getNumericEffectParameterValue(effect, PHASER_PARAMETERS.mix);
  lfo.frequency.value = getNumericEffectParameterValue(effect, PHASER_PARAMETERS.rate);
  feedbackDelay.delayTime.value = 0.0015;
  feedbackGain.gain.value = getNumericEffectParameterValue(effect, PHASER_PARAMETERS.feedback) * 0.72;
  dryGain.gain.value = 1 - mix * 0.5;
  wetGain.gain.value = mix;
  configureEffectAudioParamAutomation(context, lfo.frequency, automationContext, 'phaser', PHASER_PARAMETERS.rate.key, getNumericEffectParameterValue(effect, PHASER_PARAMETERS.rate));
  configureEffectAudioParamAutomation(context, feedbackGain.gain, automationContext, 'phaser', PHASER_PARAMETERS.feedback.key, getNumericEffectParameterValue(effect, PHASER_PARAMETERS.feedback), (value) => value * 0.72);
  configureEffectAudioParamAutomation(context, dryGain.gain, automationContext, 'phaser', PHASER_PARAMETERS.mix.key, mix, (value) => 1 - value * 0.5);
  configureEffectAudioParamAutomation(context, wetGain.gain, automationContext, 'phaser', PHASER_PARAMETERS.mix.key, mix);
  filters.forEach((stage) => {
    configureDerivedEffectAudioParamAutomation(
      context,
      stage.filter.frequency,
      automationContext,
      [centerLane],
      getPhaserStageBaseFrequency(context, effect, stage.multiplier),
      (timelineTime) => getStageBaseFrequencyAt(timelineTime, stage.multiplier),
    );
    configureDerivedEffectAudioParamAutomation(
      context,
      stage.filter.Q,
      automationContext,
      [feedbackLane],
      getPhaserStageQ(effect),
      (timelineTime) => 0.65 + getFeedbackAt(timelineTime) * 6.5,
    );
    configureDerivedEffectAudioParamAutomation(
      context,
      stage.depth.gain,
      automationContext,
      [centerLane, depthLane],
      getPhaserStageSweepDepth(context, effect, stage.multiplier),
      (timelineTime) => getStageSweepDepthAt(timelineTime, stage.multiplier),
    );
  });

  inputNode.connect(dryGain);
  inputNode.connect(wetInput);
  wetInput.connect(filters[0]!.filter);
  filters.forEach((stage, index) => {
    const nextStage = filters[index + 1];
    if (nextStage) {
      stage.filter.connect(nextStage.filter);
    }
  });
  filters[filters.length - 1]!.filter.connect(wetGain);
  filters[filters.length - 1]!.filter.connect(feedbackDelay);
  feedbackDelay.connect(feedbackGain);
  feedbackGain.connect(filters[0]!.filter);
  dryGain.connect(output);
  wetGain.connect(output);
  lfo.start(context.currentTime);

  liveEffectControllers.push({
    trackId,
    effectType: 'phaser',
    update: (nextEffect) => {
      const nextMix = getNumericEffectParameterValue(nextEffect, PHASER_PARAMETERS.mix);
      setLiveAudioParamIfBaseEditable(rateLane, lfo.frequency, getNumericEffectParameterValue(nextEffect, PHASER_PARAMETERS.rate), context);
      setLiveAudioParamIfBaseEditable(feedbackLane, feedbackGain.gain, getNumericEffectParameterValue(nextEffect, PHASER_PARAMETERS.feedback) * 0.72, context);
      setLiveAudioParamIfBaseEditable(mixLane, dryGain.gain, 1 - nextMix * 0.5, context);
      setLiveAudioParamIfBaseEditable(mixLane, wetGain.gain, nextMix, context);
      filters.forEach((stage) => {
        setLiveAudioParamIfBaseEditable(centerLane, stage.filter.frequency, getPhaserStageBaseFrequency(context, nextEffect, stage.multiplier), context);
        setLiveAudioParamIfBaseEditable(feedbackLane, stage.filter.Q, getPhaserStageQ(nextEffect), context);
        if (!hasAutomationKeyframes(centerLane) && !hasAutomationKeyframes(depthLane)) {
          setLiveAudioParam(stage.depth.gain, getPhaserStageSweepDepth(context, nextEffect, stage.multiplier), context);
        }
      });
    },
  });

  return output;
}

interface TremoloProcessorConfig {
  rate: number;
  depth: number;
  pan: number;
}

interface RingModulatorProcessorConfig {
  frequency: number;
  depth: number;
  outputGain: number;
}

interface BitcrusherProcessorConfig {
  bits: number;
  holdSamples: number;
  outputGain: number;
}

function createTremoloStage(
  context: BaseAudioContext,
  trackId: string,
  inputNode: AudioNode,
  effect: EffectInstance,
  automationContext: EffectStageAutomationContext,
  liveEffectControllers: LiveTrackEffectController[],
) {
  const output = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const processor = context.createScriptProcessor(1024, 2, 2);
  let config = createTremoloProcessorConfig(effect);
  let phase = 0;
  const mix = getNumericEffectParameterValue(effect, TREMOLO_PARAMETERS.mix);
  const rateLane = getEffectAutomationLane(automationContext, 'tremolo', TREMOLO_PARAMETERS.rate.key);
  const depthLane = getEffectAutomationLane(automationContext, 'tremolo', TREMOLO_PARAMETERS.depth.key);
  const panLane = getEffectAutomationLane(automationContext, 'tremolo', TREMOLO_PARAMETERS.pan.key);
  const mixLane = getEffectAutomationLane(automationContext, 'tremolo', TREMOLO_PARAMETERS.mix.key);

  dryGain.gain.value = 1 - mix;
  wetGain.gain.value = mix;
  configureEffectAudioParamAutomation(context, dryGain.gain, automationContext, 'tremolo', TREMOLO_PARAMETERS.mix.key, mix, (value) => 1 - value);
  configureEffectAudioParamAutomation(context, wetGain.gain, automationContext, 'tremolo', TREMOLO_PARAMETERS.mix.key, mix);

  processor.onaudioprocess = (event) => {
    if (hasAutomationKeyframes(rateLane) || hasAutomationKeyframes(depthLane) || hasAutomationKeyframes(panLane)) {
      config = createTremoloProcessorConfigAtTime(effect, automationContext, getEventTimelineTime(event, automationContext, context));
    }

    const inputBuffer = event.inputBuffer;
    const outputBuffer = event.outputBuffer;
    const sampleCount = outputBuffer.length;
    const sourceChannelCount = Math.max(1, inputBuffer.numberOfChannels);
    const leftInput = inputBuffer.getChannelData(0);
    const rightInput = inputBuffer.getChannelData(Math.min(1, sourceChannelCount - 1));
    const leftOutput = outputBuffer.getChannelData(0);
    const rightOutput = outputBuffer.getChannelData(Math.min(1, outputBuffer.numberOfChannels - 1));
    const phaseStep = (Math.PI * 2 * config.rate) / context.sampleRate;

    for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
      const lfo = Math.sin(phase);
      const tremoloGain = 1 - config.depth * ((lfo + 1) / 2);
      const panPosition = lfo * config.pan;
      const leftPanGain = panPosition <= 0 ? 1 : 1 - panPosition;
      const rightPanGain = panPosition >= 0 ? 1 : 1 + panPosition;

      leftOutput[sampleIndex] = (leftInput[sampleIndex] ?? 0) * tremoloGain * leftPanGain;
      rightOutput[sampleIndex] = (rightInput[sampleIndex] ?? 0) * tremoloGain * rightPanGain;

      phase += phaseStep;
      if (phase >= Math.PI * 2) {
        phase -= Math.PI * 2;
      }
    }
  };

  inputNode.connect(dryGain);
  inputNode.connect(processor);
  processor.connect(wetGain);
  dryGain.connect(output);
  wetGain.connect(output);

  liveEffectControllers.push({
    trackId,
    effectType: 'tremolo',
    update: (nextEffect) => {
      if (!hasAutomationKeyframes(rateLane) && !hasAutomationKeyframes(depthLane) && !hasAutomationKeyframes(panLane)) {
        config = createTremoloProcessorConfig(nextEffect);
      }
      const nextMix = getNumericEffectParameterValue(nextEffect, TREMOLO_PARAMETERS.mix);
      setLiveAudioParamIfBaseEditable(mixLane, dryGain.gain, 1 - nextMix, context);
      setLiveAudioParamIfBaseEditable(mixLane, wetGain.gain, nextMix, context);
    },
  });

  return output;
}

function createVibratoStage(
  context: BaseAudioContext,
  trackId: string,
  inputNode: AudioNode,
  effect: EffectInstance,
  automationContext: EffectStageAutomationContext,
  liveEffectControllers: LiveTrackEffectController[],
) {
  const output = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const outputGain = context.createGain();
  const delayNode = context.createDelay(VIBRATO_PARAMETERS.delay.max + VIBRATO_PARAMETERS.depth.max);
  const lfo = context.createOscillator();
  const depthGain = context.createGain();
  const mix = getNumericEffectParameterValue(effect, VIBRATO_PARAMETERS.mix);
  const depth = getNumericEffectParameterValue(effect, VIBRATO_PARAMETERS.depth);
  const rateLane = getEffectAutomationLane(automationContext, 'vibrato', VIBRATO_PARAMETERS.rate.key);
  const depthLane = getEffectAutomationLane(automationContext, 'vibrato', VIBRATO_PARAMETERS.depth.key);
  const delayLane = getEffectAutomationLane(automationContext, 'vibrato', VIBRATO_PARAMETERS.delay.key);
  const mixLane = getEffectAutomationLane(automationContext, 'vibrato', VIBRATO_PARAMETERS.mix.key);
  const outputLane = getEffectAutomationLane(automationContext, 'vibrato', VIBRATO_PARAMETERS.output.key);
  const resolveDelayCenter = (timelineTime: number) =>
    Math.min(
      VIBRATO_PARAMETERS.delay.max + VIBRATO_PARAMETERS.depth.max,
      getAutomatedNumericEffectParameterValue(effect, VIBRATO_PARAMETERS.delay, automationContext, timelineTime) +
        getAutomatedNumericEffectParameterValue(effect, VIBRATO_PARAMETERS.depth, automationContext, timelineTime) / 2,
    );

  lfo.frequency.value = getNumericEffectParameterValue(effect, VIBRATO_PARAMETERS.rate);
  delayNode.delayTime.value = getVibratoDelayCenter(effect);
  depthGain.gain.value = depth / 2;
  dryGain.gain.value = 1 - mix;
  wetGain.gain.value = mix;
  outputGain.gain.value = decibelsToGain(getNumericEffectParameterValue(effect, VIBRATO_PARAMETERS.output));
  configureEffectAudioParamAutomation(context, lfo.frequency, automationContext, 'vibrato', VIBRATO_PARAMETERS.rate.key, getNumericEffectParameterValue(effect, VIBRATO_PARAMETERS.rate));
  configureDerivedEffectAudioParamAutomation(context, delayNode.delayTime, automationContext, [delayLane, depthLane], getVibratoDelayCenter(effect), resolveDelayCenter);
  configureEffectAudioParamAutomation(context, depthGain.gain, automationContext, 'vibrato', VIBRATO_PARAMETERS.depth.key, depth, (value) => value / 2);
  configureEffectAudioParamAutomation(context, dryGain.gain, automationContext, 'vibrato', VIBRATO_PARAMETERS.mix.key, mix, (value) => 1 - value);
  configureEffectAudioParamAutomation(context, wetGain.gain, automationContext, 'vibrato', VIBRATO_PARAMETERS.mix.key, mix);
  configureEffectAudioParamAutomation(context, outputGain.gain, automationContext, 'vibrato', VIBRATO_PARAMETERS.output.key, getNumericEffectParameterValue(effect, VIBRATO_PARAMETERS.output), decibelsToGain);

  inputNode.connect(dryGain);
  inputNode.connect(delayNode);
  delayNode.connect(wetGain);
  wetGain.connect(outputGain);
  dryGain.connect(output);
  outputGain.connect(output);
  lfo.connect(depthGain);
  depthGain.connect(delayNode.delayTime);
  lfo.start(context.currentTime);

  liveEffectControllers.push({
    trackId,
    effectType: 'vibrato',
    update: (nextEffect) => {
      const nextMix = getNumericEffectParameterValue(nextEffect, VIBRATO_PARAMETERS.mix);
      const nextDepth = getNumericEffectParameterValue(nextEffect, VIBRATO_PARAMETERS.depth);
      setLiveAudioParamIfBaseEditable(rateLane, lfo.frequency, getNumericEffectParameterValue(nextEffect, VIBRATO_PARAMETERS.rate), context);
      if (!hasAutomationKeyframes(delayLane) && !hasAutomationKeyframes(depthLane)) {
        setLiveAudioParam(delayNode.delayTime, getVibratoDelayCenter(nextEffect), context);
      }
      setLiveAudioParamIfBaseEditable(depthLane, depthGain.gain, nextDepth / 2, context);
      setLiveAudioParamIfBaseEditable(mixLane, dryGain.gain, 1 - nextMix, context);
      setLiveAudioParamIfBaseEditable(mixLane, wetGain.gain, nextMix, context);
      setLiveAudioParamIfBaseEditable(
        outputLane,
        outputGain.gain,
        decibelsToGain(getNumericEffectParameterValue(nextEffect, VIBRATO_PARAMETERS.output)),
        context,
      );
    },
  });

  return output;
}

function createBitcrusherStage(
  context: BaseAudioContext,
  trackId: string,
  inputNode: AudioNode,
  effect: EffectInstance,
  automationContext: EffectStageAutomationContext,
  liveEffectControllers: LiveTrackEffectController[],
) {
  const output = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const processor = context.createScriptProcessor(1024, 2, 2);
  let config = createBitcrusherProcessorConfig(effect);
  let holdCountdown = 0;
  let heldLeft = 0;
  let heldRight = 0;
  const mix = getNumericEffectParameterValue(effect, BITCRUSHER_PARAMETERS.mix);
  const bitsLane = getEffectAutomationLane(automationContext, 'bitcrusher', BITCRUSHER_PARAMETERS.bits.key);
  const rateReductionLane = getEffectAutomationLane(automationContext, 'bitcrusher', BITCRUSHER_PARAMETERS.rateReduction.key);
  const mixLane = getEffectAutomationLane(automationContext, 'bitcrusher', BITCRUSHER_PARAMETERS.mix.key);
  const outputLane = getEffectAutomationLane(automationContext, 'bitcrusher', BITCRUSHER_PARAMETERS.output.key);

  dryGain.gain.value = 1 - mix;
  wetGain.gain.value = mix;
  configureEffectAudioParamAutomation(context, dryGain.gain, automationContext, 'bitcrusher', BITCRUSHER_PARAMETERS.mix.key, mix, (value) => 1 - value);
  configureEffectAudioParamAutomation(context, wetGain.gain, automationContext, 'bitcrusher', BITCRUSHER_PARAMETERS.mix.key, mix);

  processor.onaudioprocess = (event) => {
    if (hasAutomationKeyframes(bitsLane) || hasAutomationKeyframes(rateReductionLane) || hasAutomationKeyframes(outputLane)) {
      config = createBitcrusherProcessorConfigAtTime(effect, automationContext, getEventTimelineTime(event, automationContext, context));
    }

    const inputBuffer = event.inputBuffer;
    const outputBuffer = event.outputBuffer;
    const sampleCount = outputBuffer.length;
    const sourceChannelCount = Math.max(1, inputBuffer.numberOfChannels);
    const leftInput = inputBuffer.getChannelData(0);
    const rightInput = inputBuffer.getChannelData(Math.min(1, sourceChannelCount - 1));
    const leftOutput = outputBuffer.getChannelData(0);
    const rightOutput = outputBuffer.getChannelData(Math.min(1, outputBuffer.numberOfChannels - 1));

    for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
      if (holdCountdown <= 0) {
        heldLeft = quantizeBitcrusherSample(leftInput[sampleIndex] ?? 0, config.bits);
        heldRight = quantizeBitcrusherSample(rightInput[sampleIndex] ?? 0, config.bits);
        holdCountdown = config.holdSamples;
      }

      leftOutput[sampleIndex] = heldLeft * config.outputGain;
      rightOutput[sampleIndex] = heldRight * config.outputGain;
      holdCountdown -= 1;
    }
  };

  inputNode.connect(dryGain);
  inputNode.connect(processor);
  processor.connect(wetGain);
  dryGain.connect(output);
  wetGain.connect(output);

  liveEffectControllers.push({
    trackId,
    effectType: 'bitcrusher',
    update: (nextEffect) => {
      if (!hasAutomationKeyframes(bitsLane) && !hasAutomationKeyframes(rateReductionLane) && !hasAutomationKeyframes(outputLane)) {
        config = createBitcrusherProcessorConfig(nextEffect);
      }
      const nextMix = getNumericEffectParameterValue(nextEffect, BITCRUSHER_PARAMETERS.mix);
      setLiveAudioParamIfBaseEditable(mixLane, dryGain.gain, 1 - nextMix, context);
      setLiveAudioParamIfBaseEditable(mixLane, wetGain.gain, nextMix, context);
    },
  });

  return output;
}

function createRingModulatorStage(
  context: BaseAudioContext,
  trackId: string,
  inputNode: AudioNode,
  effect: EffectInstance,
  automationContext: EffectStageAutomationContext,
  liveEffectControllers: LiveTrackEffectController[],
) {
  const output = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const processor = context.createScriptProcessor(1024, 2, 2);
  let config = createRingModulatorProcessorConfig(effect);
  let phase = 0;
  const mix = getNumericEffectParameterValue(effect, RING_MODULATOR_PARAMETERS.mix);
  const frequencyLane = getEffectAutomationLane(automationContext, 'ring', RING_MODULATOR_PARAMETERS.frequency.key);
  const depthLane = getEffectAutomationLane(automationContext, 'ring', RING_MODULATOR_PARAMETERS.depth.key);
  const mixLane = getEffectAutomationLane(automationContext, 'ring', RING_MODULATOR_PARAMETERS.mix.key);
  const outputLane = getEffectAutomationLane(automationContext, 'ring', RING_MODULATOR_PARAMETERS.output.key);

  dryGain.gain.value = 1 - mix;
  wetGain.gain.value = mix;
  configureEffectAudioParamAutomation(context, dryGain.gain, automationContext, 'ring', RING_MODULATOR_PARAMETERS.mix.key, mix, (value) => 1 - value);
  configureEffectAudioParamAutomation(context, wetGain.gain, automationContext, 'ring', RING_MODULATOR_PARAMETERS.mix.key, mix);

  processor.onaudioprocess = (event) => {
    if (hasAutomationKeyframes(frequencyLane) || hasAutomationKeyframes(depthLane) || hasAutomationKeyframes(outputLane)) {
      config = createRingModulatorProcessorConfigAtTime(effect, automationContext, getEventTimelineTime(event, automationContext, context));
    }

    const inputBuffer = event.inputBuffer;
    const outputBuffer = event.outputBuffer;
    const sampleCount = outputBuffer.length;
    const sourceChannelCount = Math.max(1, inputBuffer.numberOfChannels);
    const leftInput = inputBuffer.getChannelData(0);
    const rightInput = inputBuffer.getChannelData(Math.min(1, sourceChannelCount - 1));
    const leftOutput = outputBuffer.getChannelData(0);
    const rightOutput = outputBuffer.getChannelData(Math.min(1, outputBuffer.numberOfChannels - 1));
    const phaseStep = (Math.PI * 2 * config.frequency) / context.sampleRate;

    for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
      const carrier = Math.sin(phase);
      const modulator = (1 - config.depth) + config.depth * carrier;
      leftOutput[sampleIndex] = (leftInput[sampleIndex] ?? 0) * modulator * config.outputGain;
      rightOutput[sampleIndex] = (rightInput[sampleIndex] ?? 0) * modulator * config.outputGain;

      phase += phaseStep;
      if (phase >= Math.PI * 2) {
        phase -= Math.PI * 2;
      }
    }
  };

  inputNode.connect(dryGain);
  inputNode.connect(processor);
  processor.connect(wetGain);
  dryGain.connect(output);
  wetGain.connect(output);

  liveEffectControllers.push({
    trackId,
    effectType: 'ring',
    update: (nextEffect) => {
      if (!hasAutomationKeyframes(frequencyLane) && !hasAutomationKeyframes(depthLane) && !hasAutomationKeyframes(outputLane)) {
        config = createRingModulatorProcessorConfig(nextEffect);
      }
      const nextMix = getNumericEffectParameterValue(nextEffect, RING_MODULATOR_PARAMETERS.mix);
      setLiveAudioParamIfBaseEditable(mixLane, dryGain.gain, 1 - nextMix, context);
      setLiveAudioParamIfBaseEditable(mixLane, wetGain.gain, nextMix, context);
    },
  });

  return output;
}

function createReverbStage(
  context: BaseAudioContext,
  trackId: string,
  inputNode: AudioNode,
  effect: EffectInstance,
  automationContext: EffectStageAutomationContext,
  liveEffectControllers: LiveTrackEffectController[],
) {
  const output = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const convolver = context.createConvolver();
  const amount = getEffectNumber(effect, 'amount', 0.35, 0, 1);
  const amountLane = getEffectAutomationLane(automationContext, 'reverb', 'amount');
  const sizeLane = getEffectAutomationLane(automationContext, 'reverb', 'size');
  const size = getAutomatedEffectNumber(
    effect,
    'size',
    2.8,
    0.3,
    8,
    automationContext,
    automationContext.timelineStart,
  );

  dryGain.gain.value = 1 - amount * 0.72;
  wetGain.gain.value = amount;
  configureEffectAudioParamAutomation(
    context,
    dryGain.gain,
    automationContext,
    'reverb',
    'amount',
    amount,
    (value) => 1 - Math.max(0, Math.min(1, value)) * 0.72,
  );

  inputNode.connect(dryGain);
  dryGain.connect(output);

  if (hasAutomationKeyframes(sizeLane)) {
    connectAutomatedReverbSizeWetPath(context, inputNode, output, effect, automationContext, amountLane, sizeLane, amount, size);
  } else {
    convolver.normalize = true;
    convolver.buffer = createCaveImpulse(context, size);
    configureEffectAudioParamAutomation(
      context,
      wetGain.gain,
      automationContext,
      'reverb',
      'amount',
      amount,
      (value) => Math.max(0, Math.min(1, value)),
    );
    inputNode.connect(convolver);
    convolver.connect(wetGain);
    wetGain.connect(output);
  }

  liveEffectControllers.push({
    trackId,
    effectType: 'reverb',
    update: (nextEffect) => {
      if (!hasAutomationKeyframes(amountLane)) {
        const nextAmount = getEffectNumber(nextEffect, 'amount', 0.35, 0, 1);
        setLiveAudioParam(dryGain.gain, 1 - nextAmount * 0.72, context);
        setLiveAudioParam(wetGain.gain, nextAmount, context);
      }
      if (!hasAutomationKeyframes(sizeLane)) {
        convolver.buffer = createCaveImpulse(context, getEffectNumber(nextEffect, 'size', 2.8, 0.3, 8));
      }
    },
  });

  return output;
}

function connectAutomatedReverbSizeWetPath(
  context: BaseAudioContext,
  inputNode: AudioNode,
  output: AudioNode,
  effect: EffectInstance,
  automationContext: EffectStageAutomationContext,
  amountLane: ReturnType<typeof getAutomationLane>,
  sizeLane: ReturnType<typeof getAutomationLane>,
  fallbackAmount: number,
  fallbackSize: number,
) {
  const sizeSamples = sampleAutomationCurve(
    sizeLane,
    fallbackSize,
    automationContext.timelineStart,
    automationContext.timelineStart + automationContext.outputDuration,
    Math.max(4, Math.min(18, Math.ceil(automationContext.outputDuration * 1.5))),
  );
  const segmentPoints = sizeSamples.length >= 2 ? sizeSamples : [
    {time: automationContext.timelineStart, value: fallbackSize},
    {time: automationContext.timelineStart + automationContext.outputDuration, value: fallbackSize},
  ];

  for (let index = 0; index < segmentPoints.length - 1; index += 1) {
    const start = segmentPoints[index]!.time;
    const end = segmentPoints[index + 1]!.time;
    if (end <= start) {
      continue;
    }

    const segmentSize = Math.max(0.3, Math.min(8, segmentPoints[index]!.value));
    const convolver = context.createConvolver();
    const wetGain = context.createGain();
    convolver.normalize = true;
    convolver.buffer = createCaveImpulse(context, segmentSize);
    scheduleSegmentedReverbWetGain(context, wetGain.gain, automationContext, amountLane, fallbackAmount, start, end);
    inputNode.connect(convolver);
    convolver.connect(wetGain);
    wetGain.connect(output);
  }
}

function scheduleSegmentedReverbWetGain(
  context: BaseAudioContext,
  wetGain: AudioParam,
  automationContext: EffectStageAutomationContext,
  amountLane: ReturnType<typeof getAutomationLane>,
  fallbackAmount: number,
  segmentStart: number,
  segmentEnd: number,
) {
  const segmentDuration = Math.max(0.0001, segmentEnd - segmentStart);
  const fadeDuration = Math.min(0.025, Math.max(0.003, segmentDuration / 4));
  const audioStart = Math.max(
    context.currentTime,
    automationContext.audioStart + segmentStart - automationContext.timelineStart,
  );
  const audioEnd = Math.max(audioStart, automationContext.audioStart + segmentEnd - automationContext.timelineStart);
  const amountSamples = sampleAutomationCurve(
    amountLane,
    fallbackAmount,
    segmentStart,
    segmentEnd,
    Math.max(3, Math.min(18, Math.ceil(segmentDuration * 12))),
  );

  wetGain.setValueAtTime(0, context.currentTime);
  wetGain.setValueAtTime(0, audioStart);
  const firstAmount = Math.max(0, Math.min(1, amountSamples[0]?.value ?? fallbackAmount));
  wetGain.linearRampToValueAtTime(firstAmount, Math.min(audioEnd, audioStart + fadeDuration));

  amountSamples.slice(1).forEach((sample) => {
    const sampleTime = Math.max(audioStart, automationContext.audioStart + sample.time - automationContext.timelineStart);
    if (sampleTime > audioStart + fadeDuration && sampleTime < audioEnd - fadeDuration) {
      wetGain.linearRampToValueAtTime(Math.max(0, Math.min(1, sample.value)), sampleTime);
    }
  });

  if (audioEnd > audioStart) {
    wetGain.linearRampToValueAtTime(0, audioEnd);
  }
}

function createDelayStage(
  context: BaseAudioContext,
  trackId: string,
  inputNode: AudioNode,
  effect: EffectInstance,
  automationContext: EffectStageAutomationContext,
  liveEffectControllers: LiveTrackEffectController[],
) {
  const output = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const delayNode = context.createDelay(DELAY_PARAMETERS.time.max);
  const feedbackGain = context.createGain();
  const toneFilter = context.createBiquadFilter();
  const mix = getNumericEffectParameterValue(effect, DELAY_PARAMETERS.mix);
  const timeLane = getEffectAutomationLane(automationContext, 'delay', DELAY_PARAMETERS.time.key);
  const feedbackLane = getEffectAutomationLane(automationContext, 'delay', DELAY_PARAMETERS.feedback.key);
  const mixLane = getEffectAutomationLane(automationContext, 'delay', DELAY_PARAMETERS.mix.key);
  const toneLane = getEffectAutomationLane(automationContext, 'delay', DELAY_PARAMETERS.tone.key);

  delayNode.delayTime.value = getNumericEffectParameterValue(effect, DELAY_PARAMETERS.time);
  feedbackGain.gain.value = getNumericEffectParameterValue(effect, DELAY_PARAMETERS.feedback);
  toneFilter.type = 'lowpass';
  toneFilter.frequency.value = clampBiquadFrequency(context, getNumericEffectParameterValue(effect, DELAY_PARAMETERS.tone));
  toneFilter.Q.value = 0.7;
  dryGain.gain.value = 1 - mix * 0.65;
  wetGain.gain.value = mix;
  configureEffectAudioParamAutomation(context, delayNode.delayTime, automationContext, 'delay', DELAY_PARAMETERS.time.key, getNumericEffectParameterValue(effect, DELAY_PARAMETERS.time));
  configureEffectAudioParamAutomation(context, feedbackGain.gain, automationContext, 'delay', DELAY_PARAMETERS.feedback.key, getNumericEffectParameterValue(effect, DELAY_PARAMETERS.feedback));
  configureEffectAudioParamAutomation(context, toneFilter.frequency, automationContext, 'delay', DELAY_PARAMETERS.tone.key, getNumericEffectParameterValue(effect, DELAY_PARAMETERS.tone), (value) => clampBiquadFrequency(context, value));
  configureEffectAudioParamAutomation(context, dryGain.gain, automationContext, 'delay', DELAY_PARAMETERS.mix.key, mix, (value) => 1 - value * 0.65);
  configureEffectAudioParamAutomation(context, wetGain.gain, automationContext, 'delay', DELAY_PARAMETERS.mix.key, mix);

  inputNode.connect(dryGain);
  inputNode.connect(delayNode);
  delayNode.connect(toneFilter);
  toneFilter.connect(feedbackGain);
  feedbackGain.connect(delayNode);
  toneFilter.connect(wetGain);
  dryGain.connect(output);
  wetGain.connect(output);

  liveEffectControllers.push({
    trackId,
    effectType: 'delay',
    update: (nextEffect) => {
      const nextMix = getNumericEffectParameterValue(nextEffect, DELAY_PARAMETERS.mix);
      setLiveAudioParamIfBaseEditable(timeLane, delayNode.delayTime, getNumericEffectParameterValue(nextEffect, DELAY_PARAMETERS.time), context);
      setLiveAudioParamIfBaseEditable(feedbackLane, feedbackGain.gain, getNumericEffectParameterValue(nextEffect, DELAY_PARAMETERS.feedback), context);
      setLiveAudioParamIfBaseEditable(
        toneLane,
        toneFilter.frequency,
        clampBiquadFrequency(context, getNumericEffectParameterValue(nextEffect, DELAY_PARAMETERS.tone)),
        context,
      );
      setLiveAudioParamIfBaseEditable(mixLane, dryGain.gain, 1 - nextMix * 0.65, context);
      setLiveAudioParamIfBaseEditable(mixLane, wetGain.gain, nextMix, context);
    },
  });

  return output;
}

function createCaveImpulse(context: BaseAudioContext, seconds: number) {
  const length = Math.max(1, Math.floor(context.sampleRate * seconds));
  const buffer = context.createBuffer(2, length, context.sampleRate);
  let seed = 0xdecafbad;

  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const noise = (seed / 0xffffffff) * 2 - 1;
      const progress = index / length;
      const earlyReflection = Math.sin(index * 0.021 + channel * 0.7) * 0.22;
      const decay = Math.pow(1 - progress, 2.2);
      data[index] = (noise * 0.82 + earlyReflection) * decay;
    }
  }

  return buffer;
}

function createSaturationCurve(driveDb: number) {
  const sampleCount = 4096;
  const curve = new Float32Array(sampleCount);
  const amount = Math.max(1, decibelsToGain(driveDb));
  const normalization = Math.tanh(amount);

  for (let index = 0; index < sampleCount; index += 1) {
    const inputSample = (index / (sampleCount - 1)) * 2 - 1;
    curve[index] = Math.tanh(inputSample * amount) / normalization;
  }

  return curve;
}

function createOverdriveCurve(clipThreshold: number) {
  const sampleCount = 4096;
  const curve = new Float32Array(sampleCount);
  const threshold = Math.max(0.08, Math.min(1, clipThreshold));

  for (let index = 0; index < sampleCount; index += 1) {
    const inputSample = (index / (sampleCount - 1)) * 2 - 1;
    const clippedSample = Math.max(-threshold, Math.min(threshold, inputSample));
    curve[index] = clippedSample / threshold;
  }

  return curve;
}

function createLimiterCeilingCurve(ceilingDb: number) {
  const sampleCount = 4096;
  const ceiling = decibelsToGain(Math.min(0, ceilingDb));
  const curve = new Float32Array(sampleCount);

  for (let index = 0; index < sampleCount; index += 1) {
    const inputSample = (index / (sampleCount - 1)) * 2 - 1;
    curve[index] = Math.max(-ceiling, Math.min(ceiling, inputSample));
  }

  return curve;
}

function createGateProcessorConfig(context: BaseAudioContext, effect: EffectInstance): GateProcessorConfig {
  const attack = getNumericEffectParameterValue(effect, GATE_PARAMETERS.attack);
  const release = getNumericEffectParameterValue(effect, GATE_PARAMETERS.release);
  return {
    threshold: decibelsToGain(getNumericEffectParameterValue(effect, GATE_PARAMETERS.threshold)),
    closedGain: decibelsToGain(getNumericEffectParameterValue(effect, GATE_PARAMETERS.reduction)),
    attackCoefficient: getEnvelopeCoefficient(context.sampleRate, attack),
    releaseCoefficient: getEnvelopeCoefficient(context.sampleRate, release),
    holdSamples: Math.round(context.sampleRate * getNumericEffectParameterValue(effect, GATE_PARAMETERS.hold)),
  };
}

function createGateProcessorConfigAtTime(
  context: BaseAudioContext,
  effect: EffectInstance,
  automationContext: EffectStageAutomationContext,
  timelineTime: number,
): GateProcessorConfig {
  const attack = getAutomatedNumericEffectParameterValue(effect, GATE_PARAMETERS.attack, automationContext, timelineTime);
  const release = getAutomatedNumericEffectParameterValue(effect, GATE_PARAMETERS.release, automationContext, timelineTime);
  return {
    threshold: decibelsToGain(
      getAutomatedNumericEffectParameterValue(effect, GATE_PARAMETERS.threshold, automationContext, timelineTime),
    ),
    closedGain: decibelsToGain(
      getAutomatedNumericEffectParameterValue(effect, GATE_PARAMETERS.reduction, automationContext, timelineTime),
    ),
    attackCoefficient: getEnvelopeCoefficient(context.sampleRate, attack),
    releaseCoefficient: getEnvelopeCoefficient(context.sampleRate, release),
    holdSamples: Math.round(
      context.sampleRate * getAutomatedNumericEffectParameterValue(effect, GATE_PARAMETERS.hold, automationContext, timelineTime),
    ),
  };
}

function createSaturationProcessorConfig(effect: EffectInstance): SaturationProcessorConfig {
  return {
    driveGain: Math.max(1, decibelsToGain(getNumericEffectParameterValue(effect, SATURATION_PARAMETERS.drive))),
    outputGain: decibelsToGain(getNumericEffectParameterValue(effect, SATURATION_PARAMETERS.output)),
  };
}

function createSaturationProcessorConfigAtTime(
  effect: EffectInstance,
  automationContext: EffectStageAutomationContext,
  timelineTime: number,
): SaturationProcessorConfig {
  return {
    driveGain: Math.max(
      1,
      decibelsToGain(getAutomatedNumericEffectParameterValue(effect, SATURATION_PARAMETERS.drive, automationContext, timelineTime)),
    ),
    outputGain: decibelsToGain(
      getAutomatedNumericEffectParameterValue(effect, SATURATION_PARAMETERS.output, automationContext, timelineTime),
    ),
  };
}

function createOverdriveProcessorConfig(effect: EffectInstance): OverdriveProcessorConfig {
  return {
    driveGain: Math.max(1, decibelsToGain(getNumericEffectParameterValue(effect, OVERDRIVE_PARAMETERS.drive))),
    clipThreshold: getNumericEffectParameterValue(effect, OVERDRIVE_PARAMETERS.clip),
    outputGain: decibelsToGain(getNumericEffectParameterValue(effect, OVERDRIVE_PARAMETERS.output)),
  };
}

function createOverdriveProcessorConfigAtTime(
  effect: EffectInstance,
  automationContext: EffectStageAutomationContext,
  timelineTime: number,
): OverdriveProcessorConfig {
  return {
    driveGain: Math.max(
      1,
      decibelsToGain(getAutomatedNumericEffectParameterValue(effect, OVERDRIVE_PARAMETERS.drive, automationContext, timelineTime)),
    ),
    clipThreshold: getAutomatedNumericEffectParameterValue(effect, OVERDRIVE_PARAMETERS.clip, automationContext, timelineTime),
    outputGain: decibelsToGain(
      getAutomatedNumericEffectParameterValue(effect, OVERDRIVE_PARAMETERS.output, automationContext, timelineTime),
    ),
  };
}

function createTremoloProcessorConfig(effect: EffectInstance): TremoloProcessorConfig {
  return {
    rate: getNumericEffectParameterValue(effect, TREMOLO_PARAMETERS.rate),
    depth: getNumericEffectParameterValue(effect, TREMOLO_PARAMETERS.depth),
    pan: getNumericEffectParameterValue(effect, TREMOLO_PARAMETERS.pan),
  };
}

function createTremoloProcessorConfigAtTime(
  effect: EffectInstance,
  automationContext: EffectStageAutomationContext,
  timelineTime: number,
): TremoloProcessorConfig {
  return {
    rate: getAutomatedNumericEffectParameterValue(effect, TREMOLO_PARAMETERS.rate, automationContext, timelineTime),
    depth: getAutomatedNumericEffectParameterValue(effect, TREMOLO_PARAMETERS.depth, automationContext, timelineTime),
    pan: getAutomatedNumericEffectParameterValue(effect, TREMOLO_PARAMETERS.pan, automationContext, timelineTime),
  };
}

function createRingModulatorProcessorConfig(effect: EffectInstance): RingModulatorProcessorConfig {
  return {
    frequency: getNumericEffectParameterValue(effect, RING_MODULATOR_PARAMETERS.frequency),
    depth: getNumericEffectParameterValue(effect, RING_MODULATOR_PARAMETERS.depth),
    outputGain: decibelsToGain(getNumericEffectParameterValue(effect, RING_MODULATOR_PARAMETERS.output)),
  };
}

function createRingModulatorProcessorConfigAtTime(
  effect: EffectInstance,
  automationContext: EffectStageAutomationContext,
  timelineTime: number,
): RingModulatorProcessorConfig {
  return {
    frequency: getAutomatedNumericEffectParameterValue(effect, RING_MODULATOR_PARAMETERS.frequency, automationContext, timelineTime),
    depth: getAutomatedNumericEffectParameterValue(effect, RING_MODULATOR_PARAMETERS.depth, automationContext, timelineTime),
    outputGain: decibelsToGain(
      getAutomatedNumericEffectParameterValue(effect, RING_MODULATOR_PARAMETERS.output, automationContext, timelineTime),
    ),
  };
}

function createBitcrusherProcessorConfig(effect: EffectInstance): BitcrusherProcessorConfig {
  return {
    bits: Math.round(getNumericEffectParameterValue(effect, BITCRUSHER_PARAMETERS.bits)),
    holdSamples: Math.max(1, Math.round(getNumericEffectParameterValue(effect, BITCRUSHER_PARAMETERS.rateReduction))),
    outputGain: decibelsToGain(getNumericEffectParameterValue(effect, BITCRUSHER_PARAMETERS.output)),
  };
}

function createBitcrusherProcessorConfigAtTime(
  effect: EffectInstance,
  automationContext: EffectStageAutomationContext,
  timelineTime: number,
): BitcrusherProcessorConfig {
  return {
    bits: Math.round(getAutomatedNumericEffectParameterValue(effect, BITCRUSHER_PARAMETERS.bits, automationContext, timelineTime)),
    holdSamples: Math.max(
      1,
      Math.round(getAutomatedNumericEffectParameterValue(effect, BITCRUSHER_PARAMETERS.rateReduction, automationContext, timelineTime)),
    ),
    outputGain: decibelsToGain(
      getAutomatedNumericEffectParameterValue(effect, BITCRUSHER_PARAMETERS.output, automationContext, timelineTime),
    ),
  };
}

function quantizeBitcrusherSample(sample: number, bits: number) {
  const safeBits = Math.max(2, Math.min(16, Math.round(bits)));
  const levelCount = 2 ** safeBits;
  const clampedSample = Math.max(-1, Math.min(1, sample));
  return (Math.round(((clampedSample + 1) / 2) * (levelCount - 1)) / (levelCount - 1)) * 2 - 1;
}

function getChorusDelayCenter(effect: EffectInstance) {
  const delay = getNumericEffectParameterValue(effect, CHORUS_PARAMETERS.delay);
  const depth = getNumericEffectParameterValue(effect, CHORUS_PARAMETERS.depth);
  return Math.min(CHORUS_PARAMETERS.delay.max + CHORUS_PARAMETERS.depth.max, delay + depth / 2);
}

function getFlangerDelayCenter(effect: EffectInstance) {
  const delay = getNumericEffectParameterValue(effect, FLANGER_PARAMETERS.delay);
  const depth = getNumericEffectParameterValue(effect, FLANGER_PARAMETERS.depth);
  return Math.min(FLANGER_PARAMETERS.delay.max + FLANGER_PARAMETERS.depth.max, delay + depth / 2);
}

function getVibratoDelayCenter(effect: EffectInstance) {
  const delay = getNumericEffectParameterValue(effect, VIBRATO_PARAMETERS.delay);
  const depth = getNumericEffectParameterValue(effect, VIBRATO_PARAMETERS.depth);
  return Math.min(VIBRATO_PARAMETERS.delay.max + VIBRATO_PARAMETERS.depth.max, delay + depth / 2);
}

function getPhaserStageBaseFrequency(context: BaseAudioContext, effect: EffectInstance, multiplier: number) {
  return clampBiquadFrequency(
    context,
    getNumericEffectParameterValue(effect, PHASER_PARAMETERS.center) * multiplier,
  );
}

function getPhaserStageSweepDepth(context: BaseAudioContext, effect: EffectInstance, multiplier: number) {
  const center = getNumericEffectParameterValue(effect, PHASER_PARAMETERS.center);
  const depth = getNumericEffectParameterValue(effect, PHASER_PARAMETERS.depth);
  const baseFrequency = getPhaserStageBaseFrequency(context, effect, multiplier);
  const nyquistLimit = Math.max(20, context.sampleRate / 2 - 1);
  const downwardRoom = Math.max(0, baseFrequency - 40);
  const upwardRoom = Math.max(0, nyquistLimit - baseFrequency - 40);
  return Math.min(center * depth * 0.78, downwardRoom, upwardRoom);
}

function getPhaserStageQ(effect: EffectInstance) {
  return 0.65 + getNumericEffectParameterValue(effect, PHASER_PARAMETERS.feedback) * 6.5;
}

function getEnvelopeCoefficient(sampleRate: number, seconds: number) {
  return 1 - Math.exp(-1 / Math.max(1, sampleRate * Math.max(0.0001, seconds)));
}

function getOrderedTrackEffects(effects: EffectInstance[]) {
  const effectOrder: EffectInstance['type'][] = [
    'eq',
    'filter',
    'compressor',
    'gate',
    'limiter',
    'saturation',
    'overdrive',
    'bitcrusher',
    'chorus',
    'flanger',
    'phaser',
    'tremolo',
    'vibrato',
    'ring',
    'reverb',
    'delay',
  ];
  const orderOf = (effect: EffectInstance) => {
    const index = effectOrder.indexOf(effect.type);
    return index < 0 ? effectOrder.length : index;
  };
  return [...effects].sort((first, second) => orderOf(first) - orderOf(second));
}

function clampBiquadFrequency(context: BaseAudioContext, frequency: number) {
  const nyquistLimit = Math.max(20, context.sampleRate / 2 - 1);
  return Math.max(20, Math.min(nyquistLimit, frequency));
}

function getEffectNumber(effect: EffectInstance, key: string, fallback: number, min: number, max: number) {
  const value = effect.parameters[key];
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, value));
}

function getSharedAudioContext() {
  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContext();
  }

  return sharedAudioContext;
}

function isTrackAudible(track: TrackRecord, soloTrackIds: Set<string>) {
  if (track.isMuted) {
    return false;
  }

  if (soloTrackIds.size > 0 && !soloTrackIds.has(track.id)) {
    return false;
  }

  return true;
}

function percentToGain(value: number) {
  return Math.max(0, Math.min(1, value / 100));
}

function getClipSourceTimelineOffset(clip: ClipRecord) {
  return Math.max(0, Math.min(clip.duration, clip.sourceTimelineOffset ?? 0));
}

function getClipPlaybackRate(clip: ClipRecord, pitchSemitones = clip.pitch) {
  return Math.max(0.05, clip.speed * Math.pow(2, pitchSemitones / 12));
}

function decibelsToGain(value: number) {
  return Math.pow(10, value / 20);
}

function panLabelToStereoValue(value: string) {
  if (value === 'C') {
    return 0;
  }

  if (value.startsWith('L')) {
    return -Math.min(1, Number(value.slice(1)) / 50);
  }

  if (value.startsWith('R')) {
    return Math.min(1, Number(value.slice(1)) / 50);
  }

  return 0;
}
