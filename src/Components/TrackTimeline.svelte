<!-- / - Arinara Network © 2026 - / -->
<!-- This source code is the exclusive property of Arinara Network. -->
<!-- Unauthorized use, reproduction, distribution, or modification of this -->
<!-- code — in whole or in part — for any purpose whatsoever is strictly -->
<!-- prohibited without prior written consent from Arinara Network as the -->
<!-- sole legal owner of this codebase. -->
<script lang="ts">
  import {FileAudio} from '@lucide/svelte';
  import {getAutomationLane, getSortedKeyframes} from '../AutomationEngine';
  import {CLIP_AUTOMATION_PARAMETERS, type ClipAutomationParameterId} from '../AutomationParameterRegistry';
  import {EFFECT_AUTOMATION_PARAMETERS, type EffectAutomationParameterId} from '../EffectAutomationParameterRegistry';
  import type {Clip, ProjectRecord, TimelineMarkRecord, Track} from '../Types';

  export let project: ProjectRecord | null;
  export let tracks: Track[];
  export let clips: Clip[];
  export let playhead: number;
  export let timelineDuration: number;
  export let timelineViewportStart: number;
  export let timelineLaneHeight = 120;
  export let projectDuration: number;
  export let timelineMarks: TimelineMarkRecord[] = [];
  export let selectedTimelineMarkId: string | null = null;
  export let activeBeatMarkId: string | null = null;
  export let sourceBlobAvailability: Record<string, SourceBlobAvailability> = {};
  export let onChangePlayhead: (seconds: number) => void;
  export let onPanTimeline: (deltaSeconds: number) => void;
  export let onZoomTimelineAt: (seconds: number, direction: 'in' | 'out', anchorRatio: number) => void;
  export let onSelectTimelineMark: (id: string | null) => void;
  export let selectedClipId: string | null;
  export let selectedClipAutomationTime: number | null;
  export let onSelectClip: (id: string | null) => void;
  export let onSelectClipCompoundKeyframe: (clipId: string, time: number) => void;
  export let onMoveClipCompoundKeyframe: (clipId: string, time: number, nextTime: number) => void;
  export let onMoveClip: (clipId: string, startTime: number) => void;
  export let onResizeClip: (clipId: string, edge: 'left' | 'right', startTime: number, duration: number) => void;
  export let onReorderTrack: (trackId: string, targetIndex: number) => void;
  export let onChangeTrackProperty: (id: string, property: keyof Track, value: Track[keyof Track]) => void;
  export let onOpenQuickContextMenu: (input: {x: number; y: number; time: number; clipId: string | null}) => void =
    () => undefined;

  type SourceBlobAvailability = 'checking' | 'available' | 'missing' | 'error';
  type DragType = 'move' | 'resize-left' | 'resize-right' | 'keyframe';

  interface TimelineLabelState {
    label: string;
    title: string;
    isMissing: boolean;
  }

  interface DragState {
    type: DragType;
    clipId: string;
    initialX: number;
    initialStartTime: number;
    initialDuration: number;
    initialKeyframeTime: number;
  }

  interface LayerDragState {
    trackId: string;
    initialY: number;
    initialIndex: number;
    laneHeight: number;
  }

  interface ClipSourceCoverage {
    sourceDuration: number;
    audibleSourceDuration: number;
    leftOveragePercent: number;
    audiblePercent: number;
    rightOveragePercent: number;
  }

  interface ClipCompoundKeyframe {
    time: number;
    parameterIds: CompoundAutomationParameterId[];
  }

  type CompoundAutomationParameterId = ClipAutomationParameterId | EffectAutomationParameterId;

  let containerRef: HTMLDivElement;
  let dragState: DragState | null = null;
  let layerDragState: LayerDragState | null = null;
  let wheelZoomAccumulator = 0;
  const timelineHorizontalInset = 36;
  const wheelZoomThreshold = 260;

  $: timelineViewportEnd = timelineViewportStart + timelineDuration;
  $: timelineContentHeight = `${Math.max(1, tracks.length * timelineLaneHeight)}px`;
  $: gridStep = getGridStep(timelineDuration);
  $: gridLines = createGridLines(timelineViewportStart, timelineViewportEnd, gridStep);
  $: visibleTimelineMarks = timelineMarks.filter((mark) => mark.time >= timelineViewportStart && mark.time <= timelineViewportEnd);
  $: isPlayheadVisible = playhead >= timelineViewportStart && playhead <= timelineViewportEnd;

  function secToPct(seconds: number) {
    return ((seconds - timelineViewportStart) / timelineDuration) * 100;
  }

  function durationToPct(seconds: number) {
    return (seconds / timelineDuration) * 100;
  }

  function getPointerTimelinePosition(clientX: number) {
    const rect = containerRef.getBoundingClientRect();
    const relativeX = clientX - rect.left - timelineHorizontalInset;
    const activeWidth = Math.max(1, rect.width - timelineHorizontalInset * 2);
    const anchorRatio = Math.max(0, Math.min(1, relativeX / activeWidth));
    const seconds = Math.max(timelineViewportStart, Math.min(timelineViewportEnd, timelineViewportStart + anchorRatio * timelineDuration));
    return {seconds, anchorRatio};
  }

  function xToSec(clientX: number) {
    return getPointerTimelinePosition(clientX).seconds;
  }

  function getGridStep(duration: number) {
    if (duration <= 30) {
      return 5;
    }

    if (duration <= 60) {
      return 10;
    }

    if (duration <= 120) {
      return 10;
    }

    return 20;
  }

  function createGridLines(start: number, end: number, step: number) {
    const firstLine = Math.ceil(start / step) * step;
    const count = Math.max(0, Math.floor((end - firstLine) / step));
    return Array.from({length: count + 1}, (_, index) => Number((firstLine + index * step).toFixed(2)));
  }

  function handleMouseDown(event: MouseEvent, type: DragType, clip: Clip) {
    if (!project) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    event.stopPropagation();
    onSelectClip(clip.id);
    dragState = {
      type,
      clipId: clip.id,
      initialX: event.clientX,
      initialStartTime: clip.startTime,
      initialDuration: clip.duration,
      initialKeyframeTime: 0,
    };
  }

  function handleLayerMouseDown(event: MouseEvent, track: Track, trackIndex: number) {
    if (!project) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const lane = event.currentTarget instanceof HTMLElement ? event.currentTarget.closest('.track-lane') : null;
    const laneHeight = lane instanceof HTMLElement ? lane.getBoundingClientRect().height : 120;
    dragState = null;
    layerDragState = {
      trackId: track.id,
      initialY: event.clientY,
      initialIndex: trackIndex,
      laneHeight: Math.max(1, laneHeight),
    };
  }

  function handleKeyframeMouseDown(
    event: MouseEvent,
    clip: Clip,
    keyframe: ClipCompoundKeyframe,
  ) {
    if (!project) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onSelectClipCompoundKeyframe(clip.id, keyframe.time);
    dragState = {
      type: 'keyframe',
      clipId: clip.id,
      initialX: event.clientX,
      initialStartTime: clip.startTime,
      initialDuration: clip.duration,
      initialKeyframeTime: keyframe.time,
    };
  }

  function handleMouseMove(event: MouseEvent) {
    if (layerDragState) {
      event.preventDefault();
      const deltaRows = Math.round((event.clientY - layerDragState.initialY) / layerDragState.laneHeight);
      const targetIndex = Math.max(0, Math.min(tracks.length - 1, layerDragState.initialIndex + deltaRows));
      onReorderTrack(layerDragState.trackId, targetIndex);
      return;
    }

    if (!dragState) {
      return;
    }

    event.preventDefault();
    const rect = containerRef.getBoundingClientRect();
    const activeWidth = Math.max(1, rect.width - timelineHorizontalInset * 2);
    const deltaX = event.clientX - dragState.initialX;
    const deltaSeconds = (deltaX / activeWidth) * timelineDuration;

    if (dragState.type === 'keyframe') {
      const clipEnd = dragState.initialStartTime + dragState.initialDuration;
      const nextTime = Math.max(dragState.initialStartTime, Math.min(clipEnd, dragState.initialKeyframeTime + deltaSeconds));
      onMoveClipCompoundKeyframe(dragState.clipId, dragState.initialKeyframeTime, nextTime);
      return;
    }

    if (dragState.type === 'move') {
      const dragLimit = Math.max(projectDuration, timelineViewportEnd, dragState.initialStartTime + dragState.initialDuration);
      const nextStart = Math.max(0, Math.min(Math.max(0, dragLimit - dragState.initialDuration), dragState.initialStartTime + deltaSeconds));
      onMoveClip(dragState.clipId, nextStart);
      return;
    }

    if (dragState.type === 'resize-left') {
      let nextStart = dragState.initialStartTime + deltaSeconds;
      let nextDuration = dragState.initialDuration - deltaSeconds;

      if (nextStart < 0) {
        nextStart = 0;
        nextDuration = dragState.initialStartTime + dragState.initialDuration;
      }

      if (nextDuration < 0.5) {
        nextDuration = 0.5;
        nextStart = dragState.initialStartTime + dragState.initialDuration - 0.5;
      }

      onResizeClip(dragState.clipId, 'left', nextStart, nextDuration);
      return;
    }

    const resizeLimit = Math.max(projectDuration, timelineViewportEnd, dragState.initialStartTime + dragState.initialDuration);
    const nextDuration = Math.max(0.5, Math.min(resizeLimit - dragState.initialStartTime, dragState.initialDuration + deltaSeconds));
    onResizeClip(dragState.clipId, 'right', dragState.initialStartTime, nextDuration);
  }

  function handleWheel(event: WheelEvent) {
    if (!project) {
      return;
    }

    if (event.ctrlKey) {
      event.preventDefault();
      wheelZoomAccumulator =
        Math.sign(wheelZoomAccumulator) === Math.sign(event.deltaY) || wheelZoomAccumulator === 0
          ? wheelZoomAccumulator + event.deltaY
          : event.deltaY;
      if (Math.abs(wheelZoomAccumulator) < wheelZoomThreshold) {
        return;
      }

      const position = getPointerTimelinePosition(event.clientX);
      onZoomTimelineAt(position.seconds, wheelZoomAccumulator < 0 ? 'in' : 'out', position.anchorRatio);
      wheelZoomAccumulator = 0;
      return;
    }

    const horizontalDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.shiftKey ? event.deltaY : 0;
    if (horizontalDelta === 0) {
      return;
    }

    event.preventDefault();
    onPanTimeline((horizontalDelta / 600) * timelineDuration);
  }

  function handleTimelineContextMenu(event: MouseEvent, clip: Clip | null = null) {
    if (!project) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const position = getPointerTimelinePosition(event.clientX);
    if (clip) {
      onSelectClip(clip.id);
    }

    onChangePlayhead(position.seconds);
    onSelectTimelineMark(null);
    onOpenQuickContextMenu({
      x: event.clientX,
      y: event.clientY,
      time: position.seconds,
      clipId: clip?.id ?? null,
    });
  }

  function clearDragState() {
    dragState = null;
    layerDragState = null;
  }

  function handleTimelineClick(event: MouseEvent) {
    if (!project) {
      return;
    }

    if (event.target === event.currentTarget) {
      onSelectClip(null);
    }

    onChangePlayhead(xToSec(event.clientX));
  }

  function handleTimelineKeydown(event: KeyboardEvent) {
    if (!project) {
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onChangePlayhead(Math.max(0, playhead - 1));
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      onChangePlayhead(Math.min(timelineViewportEnd, playhead + 1));
    }
  }

  function getClipSourceCoverage(clip: Clip): ClipSourceCoverage {
    const source = project?.audioSources.find((item) => item.id === clip.sourceId);
    if (!source || !clip.sourceId || clip.duration <= 0) {
      return {
        sourceDuration: 0,
        audibleSourceDuration: 0,
        leftOveragePercent: 0,
        audiblePercent: 0,
        rightOveragePercent: 100,
      };
    }

    const playbackRate = getClipPlaybackRate(clip);
    const sourceTimelineOffset = getClipSourceTimelineOffset(clip);
    const availableTimelineDuration = Math.max(0, clip.duration - sourceTimelineOffset);
    const availableSourceDuration = Math.max(0, source.duration - clip.sourceStartTime);
    const audibleTimelineDuration = Math.min(availableTimelineDuration, availableSourceDuration / playbackRate);
    const leftOveragePercent = Math.max(0, Math.min(100, (sourceTimelineOffset / clip.duration) * 100));
    const audiblePercent = Math.max(0, Math.min(100 - leftOveragePercent, (audibleTimelineDuration / clip.duration) * 100));

    return {
      sourceDuration: source.duration,
      audibleSourceDuration: audibleTimelineDuration * playbackRate,
      leftOveragePercent,
      audiblePercent,
      rightOveragePercent: Math.max(0, 100 - leftOveragePercent - audiblePercent),
    };
  }

  function getClipSourceLabel(
    clip: Clip,
    availabilityBySource: Record<string, SourceBlobAvailability>,
  ): TimelineLabelState {
    const source = project?.audioSources.find((item) => item.id === clip.sourceId);
    if (!clip.sourceId || !source) {
      return {
        label: 'Missing media',
        title: `Audio source metadata is missing for "${clip.name}"`,
        isMissing: true,
      };
    }

    const availability = availabilityBySource[clip.sourceId] ?? 'checking';
    if (availability === 'missing') {
      return {
        label: 'Missing media',
        title: `Local audio file is missing: ${source.fileName}`,
        isMissing: true,
      };
    }

    if (availability === 'error') {
      return {
        label: 'Media check failed',
        title: `Local audio file check failed: ${source.fileName}`,
        isMissing: true,
      };
    }

    return {
      label: clip.name,
      title: `Drag ${clip.name}`,
      isMissing: false,
    };
  }

  function getTrackSourceLabel(
    track: Track,
    trackClips: Clip[],
    availabilityBySource: Record<string, SourceBlobAvailability>,
  ): TimelineLabelState {
    if (trackClips.length === 0) {
      return {
        label: track.name,
        title: track.name,
        isMissing: false,
      };
    }

    const clipLabels = trackClips.map((clip) => getClipSourceLabel(clip, availabilityBySource));
    const missingCount = clipLabels.filter((label) => label.isMissing).length;
    if (missingCount === 0) {
      return {
        label: track.name,
        title: track.name,
        isMissing: false,
      };
    }

    if (missingCount === trackClips.length) {
      return {
        label: 'Missing media',
        title: clipLabels.find((label) => label.isMissing)?.title ?? 'All media on this track is missing',
        isMissing: true,
      };
    }

    return {
      label: `${missingCount}/${trackClips.length} media missing`,
      title: `${missingCount} of ${trackClips.length} clips on this track have missing media`,
      isMissing: true,
    };
  }

  function renderWaveformPath(clip: Clip, coverage: ClipSourceCoverage) {
    const peaks = clip.waveformPeaks.filter((peak) => Number.isFinite(peak));
    if (peaks.length === 0 || coverage.audiblePercent <= 0 || coverage.sourceDuration <= 0) {
      return '';
    }

    const center = 35;
    const visiblePointCount = Math.max(16, Math.min(180, Math.ceil(coverage.audiblePercent * 1.8)));
    const visiblePeaks = Array.from({length: visiblePointCount}, (_, index) => {
      const progress = index / Math.max(1, visiblePointCount - 1);
      const localSourceTime = progress * coverage.audibleSourceDuration;
      const sourceTime = clip.isReversed
        ? coverage.sourceDuration - clip.sourceStartTime - localSourceTime
        : clip.sourceStartTime + localSourceTime;
      const peakIndex = Math.max(
        0,
        Math.min(peaks.length - 1, Math.round((sourceTime / coverage.sourceDuration) * (peaks.length - 1))),
      );
      return peaks[peakIndex] ?? 0;
    });
    const maxPeak = visiblePeaks.reduce((highest, peak) => Math.max(highest, Math.abs(peak)), 0) || 1;
    let path = `M ${coverage.leftOveragePercent} ${center} `;

    visiblePeaks.forEach((peak, index) => {
      const progress = index / Math.max(1, visiblePeaks.length - 1);
      const x = coverage.leftOveragePercent + progress * coverage.audiblePercent;
      const normalizedPeak = Math.min(30, (Math.abs(peak) / maxPeak) * 30);
      path += `L ${x} ${center - normalizedPeak} L ${x} ${center + normalizedPeak} `;
    });

    return `${path}Z`;
  }

  function getClipPlaybackRate(clip: Clip) {
    return Math.max(0.05, clip.speed * Math.pow(2, clip.pitch / 12));
  }

  function getClipSourceTimelineOffset(clip: Clip) {
    return Math.max(0, Math.min(clip.duration, clip.sourceTimelineOffset ?? 0));
  }

  function getClipAutomationKeyframes(clip: Clip, parameterId: ClipAutomationParameterId) {
    return getSortedKeyframes(getAutomationLane(clip.automation, parameterId));
  }

  function getClipCompoundKeyframes(clip: Clip, track: Track): ClipCompoundKeyframe[] {
    const keyframeMap = new Map<string, ClipCompoundKeyframe>();
    CLIP_AUTOMATION_PARAMETERS.forEach((parameter) => {
      getClipAutomationKeyframes(clip, parameter.id).forEach((keyframe) => {
        const timeKey = keyframe.time.toFixed(3);
        const existing = keyframeMap.get(timeKey);
        if (existing) {
          existing.parameterIds = [...existing.parameterIds, parameter.id];
          return;
        }

        keyframeMap.set(timeKey, {
          time: keyframe.time,
          parameterIds: [parameter.id],
        });
      });
    });
    EFFECT_AUTOMATION_PARAMETERS.forEach((parameter) => {
      getSortedKeyframes(getAutomationLane(track.automation, parameter.id)).forEach((keyframe) => {
        if (keyframe.time < clip.startTime - 0.01 || keyframe.time > clip.startTime + clip.duration + 0.01) {
          return;
        }

        const timeKey = keyframe.time.toFixed(3);
        const existing = keyframeMap.get(timeKey);
        if (existing) {
          existing.parameterIds = [...existing.parameterIds, parameter.id];
          return;
        }

        keyframeMap.set(timeKey, {
          time: keyframe.time,
          parameterIds: [parameter.id],
        });
      });
    });

    return [...keyframeMap.values()].sort((first, second) => first.time - second.time);
  }

  function isCompoundKeyframeActive(keyframe: ClipCompoundKeyframe) {
    return selectedClipAutomationTime !== null && Math.abs(selectedClipAutomationTime - keyframe.time) <= 0.01;
  }

  function describeCompoundKeyframe(keyframe: ClipCompoundKeyframe) {
    const labels = keyframe.parameterIds
      .map(
        (parameterId) =>
          CLIP_AUTOMATION_PARAMETERS.find((parameter) => parameter.id === parameterId)?.label ??
          EFFECT_AUTOMATION_PARAMETERS.find((parameter) => parameter.id === parameterId)?.label,
      )
      .filter(Boolean)
      .join(', ');
    return labels ? `Keyframe: ${labels}` : 'Keyframe';
  }

  function keyframeLeft(clip: Clip, keyframeTime: number) {
    return `${Math.max(0, Math.min(100, ((keyframeTime - clip.startTime) / Math.max(0.0001, clip.duration)) * 100))}%`;
  }

  function markLeft(mark: TimelineMarkRecord) {
    return `${Math.max(0, Math.min(100, ((mark.time - timelineViewportStart) / timelineDuration) * 100))}%`;
  }

  function isOutsideProjectTime(seconds: number) {
    return Boolean(project && projectDuration >= 0 && seconds > Math.max(projectDuration, 0) + 0.001);
  }
</script>

<div
  bind:this={containerRef}
  class:inactive={!project}
  class="timeline-root"
  style={`--timeline-active-inset: ${timelineHorizontalInset}px; --timeline-content-height: ${timelineContentHeight}; --timeline-lane-height: ${timelineLaneHeight}px`}
  role="slider"
  aria-label="Multitrack timeline"
  aria-valuemin={timelineViewportStart}
  aria-valuemax={timelineViewportEnd}
  aria-valuenow={Math.round(playhead)}
  tabindex={project ? 0 : -1}
  on:mousemove={handleMouseMove}
  on:mouseup={clearDragState}
  on:mouseleave={clearDragState}
  on:click={handleTimelineClick}
  on:keydown={handleTimelineKeydown}
  on:wheel={handleWheel}
  on:contextmenu={handleTimelineContextMenu}
>
  <div class="timeline-grid" aria-hidden="true">
    {#each gridLines as seconds (seconds)}
      <i class="grid-line" style={`left: ${secToPct(seconds)}%`}></i>
    {/each}
  </div>

  <div class="timeline-mark-layer">
    {#each visibleTimelineMarks as mark (mark.id)}
      <button
        type="button"
        class:selected={selectedTimelineMarkId === mark.id}
        class:active-beat={activeBeatMarkId === mark.id}
        class:outside-project={isOutsideProjectTime(mark.time)}
        class="timeline-mark-band"
        style={`left: ${markLeft(mark)}`}
        tabindex="-1"
        title={`Beat marker ${mark.time.toFixed(2)}s`}
        aria-label={`Beat marker at ${mark.time.toFixed(2)} seconds`}
        on:click|stopPropagation={() => onSelectTimelineMark(mark.id)}
      ></button>
    {/each}
  </div>

  {#if !project}
    <div class="timeline-empty">
      <FileAudio class="empty-icon" />
      <strong>No project loaded.</strong>
      <span>The timeline is empty.</span>
    </div>
  {:else if tracks.length === 0 && clips.length === 0}
    <div class="timeline-empty">
      <FileAudio class="empty-icon" />
      <strong>No audio in this project.</strong>
      <span>This session has no tracks or clips yet.</span>
    </div>
  {:else}
    <div class="track-lanes">
      {#each tracks as track (track.id)}
        {@const trackIndex = tracks.findIndex((item) => item.id === track.id)}
        {@const allTrackClips = clips.filter((clip) => clip.trackId === track.id)}
        {@const trackClips = allTrackClips.filter((clip) => clip.startTime + clip.duration >= timelineViewportStart && clip.startTime <= timelineViewportEnd)}
        {@const trackLabel = getTrackSourceLabel(track, allTrackClips, sourceBlobAvailability)}
        <div class:layer-dragging={layerDragState?.trackId === track.id} class="track-lane">
          <button
            type="button"
            class:missing-source={trackLabel.isMissing}
            class="lane-tag"
            title={`${trackLabel.title} - drag to reorder layer`}
            aria-label={`Reorder layer ${trackLabel.label}`}
            on:mousedown={(event) => handleLayerMouseDown(event, track, trackIndex)}
            on:click|stopPropagation
          >
            <span class:muted={track.isMuted} class:missing-source={trackLabel.isMissing}></span>
            <strong>{trackLabel.label}</strong>
          </button>

          <div class="lane-controls">
            <button
              type="button"
              class:enabled={track.isMuted}
              class="lane-toggle mute"
              title="Mute"
              aria-pressed={track.isMuted}
              on:click|stopPropagation={() => onChangeTrackProperty(track.id, 'isMuted', !track.isMuted)}
              on:mousedown|stopPropagation
            >
              M
            </button>
            <button
              type="button"
              class:enabled={track.isSoloed}
              class="lane-toggle solo"
              title="Solo"
              aria-pressed={track.isSoloed}
              on:click|stopPropagation={() => onChangeTrackProperty(track.id, 'isSoloed', !track.isSoloed)}
              on:mousedown|stopPropagation
            >
              S
            </button>
            <label title="Track volume">
              <span>VOL</span>
              <input
                class="lane-range"
                type="range"
                min="0"
                max="100"
                value={track.volume}
                aria-label={`${track.name} volume`}
                on:click|stopPropagation
                on:mousedown|stopPropagation
                on:input={(event) => onChangeTrackProperty(track.id, 'volume', Number(event.currentTarget.value))}
              />
            </label>
            <label title="Track pan">
              <span>PAN</span>
              <input
                class="lane-range"
                type="range"
                min="-50"
                max="50"
                value={track.pan}
                aria-label={`${track.name} pan`}
                on:click|stopPropagation
                on:mousedown|stopPropagation
                on:input={(event) => onChangeTrackProperty(track.id, 'pan', Number(event.currentTarget.value))}
              />
            </label>
          </div>

          <div class="clip-slot">
            <div class="clip-layer">
              {#each trackClips as clip (clip.id)}
                {@const isSelected = selectedClipId === clip.id}
                {@const leftPosition = secToPct(clip.startTime)}
                {@const widthPercent = durationToPct(clip.duration)}
                {@const sourceCoverage = getClipSourceCoverage(clip)}
                {@const clipLabel = getClipSourceLabel(clip, sourceBlobAvailability)}
                {@const waveformPath = renderWaveformPath(clip, sourceCoverage)}
                {@const compoundKeyframes = getClipCompoundKeyframes(clip, track)}
                <div
                  class:selected={isSelected}
                  class="clip-block"
                  style={`left: ${leftPosition}%; width: ${widthPercent}%`}
                  role="button"
                  tabindex="0"
                  aria-pressed={isSelected}
                  on:mousedown={(event) => handleMouseDown(event, 'move', clip)}
                  on:contextmenu={(event) => handleTimelineContextMenu(event, clip)}
                  on:keydown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectClip(clip.id);
                    }
                  }}
                >
                  {#if waveformPath || sourceCoverage.leftOveragePercent > 0 || sourceCoverage.rightOveragePercent > 0}
                    <div class="waveform-shell" aria-hidden="true">
                      {#if sourceCoverage.leftOveragePercent > 0}
                        <span
                          class="source-overage left"
                          style={`left: 0%; width: ${sourceCoverage.leftOveragePercent}%`}
                        ></span>
                        <span class="source-overage-boundary left" style={`left: ${sourceCoverage.leftOveragePercent}%`}></span>
                      {/if}
                      {#if sourceCoverage.rightOveragePercent > 0}
                        <span
                          class="source-overage right"
                          style={`left: ${sourceCoverage.leftOveragePercent + sourceCoverage.audiblePercent}%; width: ${sourceCoverage.rightOveragePercent}%`}
                        ></span>
                        <span class="source-overage-boundary right" style={`left: ${sourceCoverage.leftOveragePercent + sourceCoverage.audiblePercent}%`}></span>
                      {/if}
                      {#if waveformPath}
                      <svg class="waveform-svg" viewBox="0 0 100 70" preserveAspectRatio="none" aria-hidden="true">
                        <path d={waveformPath} />
                      </svg>
                      {/if}
                    </div>
                  {/if}

                  {#if isSelected && compoundKeyframes.length > 0}
                    <div class="clip-keyframe-lane compound" aria-label="Clip keyframes">
                      {#each compoundKeyframes as keyframe (`${keyframe.time.toFixed(3)}-${keyframe.parameterIds.join('-')}`)}
                        <button
                          type="button"
                          class:active={isCompoundKeyframeActive(keyframe)}
                          class="clip-keyframe compound"
                          style={`left: ${keyframeLeft(clip, keyframe.time)}`}
                          title={describeCompoundKeyframe(keyframe)}
                          aria-label={`Keyframe at ${keyframe.time.toFixed(2)} seconds`}
                          on:mousedown={(event) => handleKeyframeMouseDown(event, clip, keyframe)}
                          on:click|stopPropagation={() => onSelectClipCompoundKeyframe(clip.id, keyframe.time)}
                        ></button>
                      {/each}
                    </div>
                  {/if}

                  {#if isSelected}
                    <button
                      type="button"
                      class="resize-handle left"
                      title="Resize Start"
                      aria-label="Resize clip start"
                      on:mousedown={(event) => handleMouseDown(event, 'resize-left', clip)}
                    >
                      <span></span>
                    </button>
                    <button
                      type="button"
                      class="resize-handle right"
                      title="Resize End"
                      aria-label="Resize clip end"
                      on:mousedown={(event) => handleMouseDown(event, 'resize-right', clip)}
                    >
                      <span></span>
                    </button>
                  {/if}

                  <span class:missing-source={clipLabel.isMissing} class="clip-title" title={clipLabel.title}>{clipLabel.label}</span>
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if isPlayheadVisible}
    <div class="playhead-line-wrap" aria-hidden="true">
      <i class:beat-hit={Boolean(activeBeatMarkId)} class="playhead-line" style={`left: ${secToPct(playhead)}%`}></i>
    </div>
  {/if}
</div>

<style>
  .timeline-root {
    --timeline-active-inset: 36px;
    --timeline-content-height: 1px;
    position: relative;
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    overflow-y: auto;
    user-select: none;
    background: #090a0c;
  }

  .timeline-root.inactive {
    cursor: default;
  }

  .timeline-grid,
  .timeline-mark-layer,
  .playhead-line-wrap {
    position: absolute;
    top: 0;
    right: var(--timeline-active-inset);
    left: var(--timeline-active-inset);
    height: max(100%, var(--timeline-content-height));
    min-height: 100%;
    z-index: 0;
    pointer-events: none;
  }

  .grid-line {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    transform: translateX(-50%);
    background: #14171a;
  }

  .timeline-mark-layer {
    z-index: 7;
    pointer-events: none;
    overflow: visible;
  }

  .timeline-mark-band {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 7px;
    transform: translateX(-50%);
    border: 0;
    background: linear-gradient(90deg, transparent 0 3px, rgba(239, 68, 68, 0.78) 3px 4px, transparent 4px 7px);
    pointer-events: none;
  }

  .timeline-mark-band.selected,
  .timeline-mark-band.active-beat {
    background: linear-gradient(90deg, transparent 0 2px, rgba(248, 113, 113, 0.96) 2px 5px, transparent 5px 7px);
  }

  .timeline-mark-band.active-beat {
    outline: 1px solid rgba(239, 68, 68, 0.68);
    outline-offset: 0;
  }

  .timeline-mark-band.outside-project {
    opacity: 0.42;
  }

  .timeline-empty {
    position: relative;
    z-index: 2;
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #71717a;
    text-align: center;
  }

  .timeline-empty :global(.empty-icon) {
    width: 34px;
    height: 34px;
    margin-bottom: 12px;
  }

  .timeline-empty strong {
    color: #d4d4d8;
    font-size: 15px;
    font-weight: 800;
  }

  .timeline-empty span {
    max-width: 280px;
    margin-top: 6px;
    font-size: 12px;
    line-height: 1.45;
  }

  .track-lanes {
    position: relative;
    z-index: 2;
    display: flex;
    min-height: min-content;
    flex: 1;
    flex-direction: column;
  }

  .track-lane {
    position: relative;
    display: flex;
    height: var(--timeline-lane-height, 120px);
    flex-shrink: 0;
    flex-direction: column;
    justify-content: space-between;
    border-bottom: 1px solid #13161a;
    transition: background-color 140ms ease;
  }

  .track-lane:hover {
    background: #0d0f12;
  }

  .track-lane.layer-dragging {
    background: #101216;
  }

  .lane-tag {
    position: absolute;
    top: 12px;
    left: var(--timeline-active-inset);
    z-index: 5;
    display: flex;
    max-width: 172px;
    align-items: center;
    gap: 6px;
    border: 1px solid #20242b;
    border-radius: 6px;
    background: rgba(20, 22, 26, 0.85);
    color: #d4d4d8;
    cursor: grab;
    font: inherit;
    padding: 4px 10px;
    text-align: left;
    backdrop-filter: blur(8px);
  }

  .lane-tag:hover {
    border-color: #343a44;
    background: rgba(28, 32, 38, 0.92);
  }

  .lane-tag:active {
    cursor: grabbing;
  }

  .lane-tag.missing-source {
    border-color: rgba(248, 113, 113, 0.46);
    background: rgba(127, 29, 29, 0.44);
  }

  .lane-tag span {
    width: 8px;
    height: 8px;
    flex-shrink: 0;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 1px 2px rgba(255, 255, 255, 0.1);
  }

  .lane-tag span.muted {
    background: #52525b;
  }

  .lane-tag span.missing-source {
    background: #f87171;
    box-shadow: 0 0 8px rgba(248, 113, 113, 0.48);
  }

  .lane-tag strong {
    overflow: hidden;
    color: #d4d4d8;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .lane-controls {
    position: absolute;
    top: 12px;
    right: var(--timeline-active-inset);
    z-index: 5;
    display: flex;
    align-items: center;
    gap: 6px;
    border-radius: 6px;
    border: 1px solid #20242b;
    background: rgba(20, 22, 26, 0.88);
    color: #71717a;
    opacity: 0.64;
    padding: 5px 6px;
    backdrop-filter: blur(8px);
    transition: opacity 140ms ease, border-color 140ms ease;
  }

  .track-lane:hover .lane-controls {
    opacity: 1;
  }

  .lane-controls:hover {
    border-color: #2a313b;
  }

  .lane-toggle {
    display: flex;
    width: 22px;
    height: 22px;
    align-items: center;
    justify-content: center;
    border-radius: 5px;
    background: #1d2025;
    color: #a1a1aa;
    cursor: pointer;
    font-size: 10px;
    font-weight: 900;
  }

  .lane-toggle.mute.enabled {
    border: 1px solid #ef4444;
    background: rgba(127, 29, 29, 0.35);
    color: #f87171;
  }

  .lane-toggle.solo.enabled {
    border: 1px solid #eab308;
    background: rgba(234, 179, 8, 0.25);
    color: #facc15;
  }

  .lane-controls label {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #71717a;
    font-size: 8px;
    font-weight: 900;
  }

  .lane-range {
    width: 54px;
    accent-color: #ffffff;
  }

  .clip-slot {
    position: absolute;
    inset: 0 var(--timeline-active-inset);
    display: flex;
    align-items: center;
    pointer-events: none;
  }

  .clip-layer {
    position: relative;
    overflow: hidden;
    width: 100%;
    height: 74px;
    pointer-events: auto;
  }

  .clip-block {
    position: absolute;
    z-index: 2;
    display: flex;
    height: 100%;
    min-width: 24px;
    cursor: grab;
    flex-direction: column;
    justify-content: center;
    overflow: hidden;
    border: 1px solid #1e232b;
    border-radius: 8px;
    background: rgba(18, 20, 24, 0.85);
    transition: background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
  }

  .clip-block:hover {
    border-color: #2d3340;
    background: #14171e;
  }

  .clip-block:active {
    cursor: grabbing;
  }

  .clip-block.selected {
    z-index: 6;
    border: 2px solid #ffffff;
    background: rgba(24, 28, 34, 0.9);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
  }

  .waveform-shell {
    position: absolute;
    inset: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .source-overage {
    position: absolute;
    top: 0;
    bottom: 0;
    background:
      repeating-linear-gradient(
        -45deg,
        rgba(250, 204, 21, 0.13) 0,
        rgba(250, 204, 21, 0.13) 5px,
        rgba(250, 204, 21, 0.04) 5px,
        rgba(250, 204, 21, 0.04) 10px
      ),
      rgba(12, 14, 18, 0.72);
    opacity: 0.9;
    pointer-events: none;
  }

  .source-overage.left {
    border-right: 1px solid rgba(255, 255, 255, 0.2);
  }

  .source-overage.right {
    border-left: 1px solid rgba(255, 255, 255, 0.2);
  }

  .source-overage-boundary {
    position: absolute;
    top: -2px;
    bottom: -2px;
    width: 1px;
    background: rgba(250, 204, 21, 0.9);
    box-shadow: 0 0 8px rgba(250, 204, 21, 0.45);
    pointer-events: none;
  }

  .waveform-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0.65;
    pointer-events: none;
  }

  .waveform-svg path {
    fill: #4e5565;
    transition: fill 180ms ease;
  }

  .clip-keyframe-lane {
    position: absolute;
    right: 12px;
    left: 12px;
    z-index: 9;
    height: 0;
    pointer-events: none;
  }

  .clip-keyframe-lane.compound {
    top: 50%;
  }

  .clip-keyframe {
    position: absolute;
    top: 50%;
    z-index: 10;
    width: 10px;
    height: 10px;
    border: 1px solid #0a0b0d;
    border-radius: 2px;
    background: #ffffff;
    cursor: grab;
    pointer-events: auto;
    transform: translate(-50%, -50%) rotate(45deg);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.38), 0 0 10px rgba(255, 255, 255, 0.16);
  }

  .clip-keyframe.compound {
    width: 12px;
    height: 12px;
    background: #ffffff;
  }

  .clip-keyframe:active {
    cursor: grabbing;
  }

  .clip-keyframe.active {
    background: #facc15;
    box-shadow: 0 0 0 1px rgba(250, 204, 21, 0.65), 0 0 12px rgba(250, 204, 21, 0.5);
  }

  .resize-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    z-index: 7;
    display: flex;
    width: 10px;
    align-items: center;
    justify-content: center;
    cursor: col-resize;
    border: 0;
    background: rgba(255, 255, 255, 0.3);
    transition: width 140ms ease;
  }

  .resize-handle:hover {
    width: 14px;
  }

  .resize-handle.left {
    left: 0;
  }

  .resize-handle.right {
    right: 0;
  }

  .resize-handle span {
    width: 2px;
    height: 16px;
    background: rgba(255, 255, 255, 0.75);
  }

  .clip-title {
    position: absolute;
    bottom: 6px;
    left: 10px;
    overflow: hidden;
    max-width: calc(100% - 20px);
    border-radius: 4px;
    background: rgba(9, 10, 12, 0.75);
    color: #a1a1aa;
    font-size: 9px;
    font-weight: 800;
    border: 1px solid transparent;
    padding: 2px 6px;
    text-overflow: ellipsis;
    white-space: nowrap;
    backdrop-filter: blur(8px);
  }

  .clip-title.missing-source {
    border-color: rgba(248, 113, 113, 0.42);
    background: rgba(127, 29, 29, 0.68);
    color: #fecaca;
  }

  .playhead-line-wrap {
    z-index: 8;
  }

  .playhead-line {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    transform: translateX(-50%);
    background: #ffffff;
    box-shadow: 0 0 8px #ffffff;
  }

  .playhead-line.beat-hit {
    background: #ef4444;
    box-shadow: 0 0 0 1px rgba(127, 29, 29, 0.85), 0 0 10px rgba(239, 68, 68, 0.58);
  }
</style>
