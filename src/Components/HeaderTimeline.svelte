<!-- / - Arinara Network © 2026 - / -->
<!-- This source code is the exclusive property of Arinara Network. -->
<!-- Unauthorized use, reproduction, distribution, or modification of this -->
<!-- code — in whole or in part — for any purpose whatsoever is strictly -->
<!-- prohibited without prior written consent from Arinara Network as the -->
<!-- sole legal owner of this codebase. -->
<script lang="ts">
  import {ChevronDown, ChevronLeft, ChevronRight, Command, Download, Flag, Repeat2, Save, Settings, SkipBack, SlidersHorizontal, Square, Trash2, Upload, ZoomIn, ZoomOut} from '@lucide/svelte';
  import type {ProjectRecord, TimelineMarkRecord} from '../Types';

  export let project: ProjectRecord | null;
  export let playhead: number;
  export let hasPlayableAudio: boolean;
  export let playbackUnavailableReason: string | null = null;
  export let hasUnsavedChanges: boolean;
  export let isImportingAudio: boolean;
  export let isExportingAudio: boolean;
  export let timelineDuration: number;
  export let timelineViewportStart: number;
  export let timelineZoomLabel: string;
  export let projectDuration: number;
  export let timelineMarks: TimelineMarkRecord[] = [];
  export let selectedTimelineMarkId: string | null = null;
  export let activeBeatMarkId: string | null = null;
  export let isLoopEnabled: boolean;
  export let onChangePlayhead: (seconds: number) => void;
  export let onAddTimelineMark: (seconds: number, useLivePlaybackTime?: boolean) => void;
  export let onSelectTimelineMark: (id: string | null) => void;
  export let onDeleteSelectedTimelineMark: () => void;
  export let onZoomTimelineIn: () => void;
  export let onZoomTimelineOut: () => void;
  export let onZoomTimelineAt: (seconds: number, direction: 'in' | 'out', anchorRatio: number) => void;
  export let onPanTimeline: (deltaSeconds: number) => void;
  export let onPanTimelineLeft: () => void;
  export let onPanTimelineRight: () => void;
  export let onToggleLoop: () => void;
  export let onImportAudio: () => void;
  export let onExportProject: () => void;
  export let onStopPlayback: () => void;
  export let onSave: () => void;
  export let onOpenCommandPalette: () => void;
  export let onOpenAppSettings: () => void;
  export let onOpenProjectSettings: () => void;

  const timelineHorizontalInset = 36;
  const wheelZoomThreshold = 260;

  let rulerRef: HTMLDivElement;
  let wheelZoomAccumulator = 0;

  $: timelineViewportEnd = timelineViewportStart + timelineDuration;
  $: majorTickStep = getMajorTickStep(timelineDuration);
  $: minorTickStep = majorTickStep / 5;
  $: primaryTicks = createTicks(timelineViewportStart, timelineViewportEnd, majorTickStep);
  $: secondaryTicks = createTicks(timelineViewportStart, timelineViewportEnd, minorTickStep).filter((seconds) => seconds % majorTickStep !== 0);
  $: playheadPercentage = Math.max(0, Math.min(100, ((playhead - timelineViewportStart) / timelineDuration) * 100));
  $: isPlayheadVisible = playhead >= timelineViewportStart && playhead <= timelineViewportEnd;
  $: visibleTimelineMarks = timelineMarks.filter((mark) => mark.time >= timelineViewportStart && mark.time <= timelineViewportEnd);
  $: timelineViewportMaxStart = Math.max(0, Number((projectDuration - timelineDuration).toFixed(3)));
  $: canPanWithSlider = Boolean(project && timelineViewportMaxStart > 0.001);

  function formatTimeRuler(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  function formatPrecisionTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const cents = Math.floor((seconds % 1) * 100);
    return `${minutes}:${secs.toString().padStart(2, '0')}.${cents.toString().padStart(2, '0')}`;
  }

  function getMajorTickStep(duration: number) {
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

  function createTicks(start: number, end: number, step: number) {
    const firstTick = Math.ceil(start / step) * step;
    const count = Math.max(0, Math.floor((end - firstTick) / step));
    return Array.from({length: count + 1}, (_, index) => Number((firstTick + index * step).toFixed(2)));
  }

  function getPointerTimelinePosition(clientX: number) {
    const rect = rulerRef.getBoundingClientRect();
    const clickX = clientX - rect.left - timelineHorizontalInset;
    const activeWidth = Math.max(1, rect.width - timelineHorizontalInset * 2);
    const anchorRatio = Math.max(0, Math.min(1, clickX / activeWidth));
    const seconds = Math.max(timelineViewportStart, Math.min(timelineViewportEnd, timelineViewportStart + anchorRatio * timelineDuration));
    return {seconds, anchorRatio};
  }

  function positionToSeconds(clientX: number) {
    return getPointerTimelinePosition(clientX).seconds;
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

  function handleViewportSliderInput(event: Event) {
    const nextStart = Number((event.currentTarget as HTMLInputElement).value);
    if (!Number.isFinite(nextStart)) {
      return;
    }

    onPanTimeline(nextStart - timelineViewportStart);
  }

  function handleRulerClick(event: MouseEvent) {
    if (!project) {
      return;
    }

    const clickedElement = event.target instanceof HTMLElement ? event.target : null;
    if (clickedElement?.closest('.timeline-mark-button, .mark-action-button')) {
      return;
    }

    const seconds = positionToSeconds(event.clientX);
    onChangePlayhead(seconds);
    onSelectTimelineMark(null);
  }

  function handleRulerDoubleClick(event: MouseEvent) {
    if (!project) {
      return;
    }

    const clickedElement = event.target instanceof HTMLElement ? event.target : null;
    if (clickedElement?.closest('.timeline-mark-button, .mark-action-button')) {
      return;
    }

    const rect = rulerRef.getBoundingClientRect();
    const isUpperRulerClick = event.clientY - rect.top <= 22;
    if (!isUpperRulerClick) {
      return;
    }

    event.preventDefault();
    onAddTimelineMark(positionToSeconds(event.clientX));
  }

  function isOutsideProjectTime(seconds: number) {
    return Boolean(project && projectDuration >= 0 && seconds > Math.max(projectDuration, 0) + 0.001);
  }

  function markLeft(mark: TimelineMarkRecord) {
    return `${Math.max(0, Math.min(100, ((mark.time - timelineViewportStart) / timelineDuration) * 100))}%`;
  }

  function handleRulerKeydown(event: KeyboardEvent) {
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
</script>

<header class="timeline-header">
  <div class="top-bar">
    <div class="project-picker">
      <span>Project</span>
      <button
        type="button"
        class="project-button"
        disabled={!project}
        title={project ? 'Project settings' : 'Create a project first'}
        on:click={onOpenProjectSettings}
      >
        <strong>{project?.name ?? 'No Project'}</strong>
        <ChevronDown class="icon-xs" />
      </button>
    </div>

    <div class="transport-controls" aria-label="Timeline transport">
      <button
        type="button"
        class="round-icon subtle"
        title="Jump to Start"
        disabled={!project}
        on:click={() => onChangePlayhead(0)}
      >
        <SkipBack class="icon-sm fill-icon" />
      </button>
      <button type="button" class="round-icon subtle" title="Stop" disabled={!hasPlayableAudio} on:click={onStopPlayback}>
        <Square class="icon-xs fill-icon" />
      </button>
      <button
        type="button"
        class:enabled={isLoopEnabled}
        class="round-icon outline loop-button"
        title={isLoopEnabled ? 'Loop on' : 'Loop off'}
        disabled={!project}
        aria-pressed={isLoopEnabled}
        on:click={onToggleLoop}
      >
        <Repeat2 class="icon-xs" />
      </button>
    </div>

    <div class="project-stats">
      <div>
        <strong>{project?.bpm ?? '--'}</strong>
        <span>BPM</span>
      </div>
      <div>
        <strong>{project?.timeSignature ?? '--'}</strong>
        <span>TIME</span>
      </div>
      <div>
        <strong>{project?.key ?? '--'}</strong>
        <span>KEY</span>
      </div>
    </div>

    <div class="header-actions">
      <div class="zoom-controls" aria-label="Timeline zoom">
        <button type="button" class="icon-square" title="Merapatkan timeline" disabled={!project} on:click={onZoomTimelineOut}>
          <ZoomOut class="icon-xs" />
        </button>
        <span class="zoom-readout">{timelineZoomLabel}</span>
        <button type="button" class="icon-square" title="Merenggangkan timeline" disabled={!project} on:click={onZoomTimelineIn}>
          <ZoomIn class="icon-xs" />
        </button>
      </div>

      <div class="mark-controls" aria-label="Timeline marks">
        <button
          type="button"
          class="icon-square mark-action-button"
          class:beat-active={Boolean(activeBeatMarkId)}
          title="Tap beat at playhead"
          disabled={!project}
          on:click={() => onAddTimelineMark(playhead, true)}
        >
          <Flag class="icon-xs" />
        </button>
        <button
          type="button"
          class="icon-square mark-action-button"
          title="Delete selected timeline mark"
          disabled={!selectedTimelineMarkId}
          on:click={onDeleteSelectedTimelineMark}
        >
          <Trash2 class="icon-xs" />
        </button>
      </div>

      <button
        type="button"
        class="icon-square"
        title={isImportingAudio ? 'Importing audio' : 'Import audio'}
        disabled={!project || isImportingAudio}
        on:click={onImportAudio}
      >
        <Upload class="icon-sm" />
      </button>

      <button
        type="button"
        class="icon-square"
        title={isExportingAudio ? 'Exporting audio' : hasPlayableAudio ? 'Export Audio' : playbackUnavailableReason ?? 'Audio is not ready for export'}
        disabled={!hasPlayableAudio || isExportingAudio}
        on:click={onExportProject}
      >
        <Download class="icon-sm" />
      </button>

      <button type="button" class:dirty={hasUnsavedChanges} class="save-button" disabled={!project} on:click={onSave}>
        <Save class="icon-xs" strokeWidth={2.5} />
        <span>{hasUnsavedChanges ? 'Save*' : 'Save'}</span>
      </button>

      <button type="button" class="icon-square" title="Project settings" disabled={!project} on:click={onOpenProjectSettings}>
        <SlidersHorizontal class="icon-sm" />
      </button>

      <button type="button" class="icon-square" title="Command palette" on:click={onOpenCommandPalette}>
        <Command class="icon-sm" />
      </button>

      <button type="button" class="icon-square" title="App settings" on:click={onOpenAppSettings}>
        <Settings class="icon-sm" />
      </button>
    </div>
  </div>

  <div
    bind:this={rulerRef}
    class:disabled={!project}
    class="ruler-bar"
    style={`--timeline-active-inset: ${timelineHorizontalInset}px`}
    role="slider"
    tabindex={project ? 0 : -1}
    aria-label="Timeline playhead"
    aria-valuemin={timelineViewportStart}
    aria-valuemax={timelineViewportEnd}
    aria-valuenow={Math.round(playhead)}
    on:click={handleRulerClick}
    on:dblclick={handleRulerDoubleClick}
    on:keydown={handleRulerKeydown}
    on:wheel={handleWheel}
  >
    <button
      type="button"
      class="timeline-pan-button left"
      title="Pan timeline left"
      disabled={!project}
      on:click|stopPropagation={onPanTimelineLeft}
    >
      <ChevronLeft class="icon-xs" />
    </button>
    <button
      type="button"
      class="timeline-pan-button right"
      title="Pan timeline right"
      disabled={!project}
      on:click|stopPropagation={onPanTimelineRight}
    >
      <ChevronRight class="icon-xs" />
    </button>

    <div class="primary-ticks">
      {#each primaryTicks as seconds (seconds)}
        {@const percentage = ((seconds - timelineViewportStart) / timelineDuration) * 100}
        <div class:outside-project={isOutsideProjectTime(seconds)} class="tick" style={`left: ${percentage}%`}>
          <span>{formatTimeRuler(seconds)}</span>
          <i></i>
        </div>
      {/each}
    </div>

    <div class="secondary-ticks">
      {#each secondaryTicks as seconds (seconds)}
        {@const percentage = ((seconds - timelineViewportStart) / timelineDuration) * 100}
        <i style={`left: ${percentage}%`}></i>
      {/each}
    </div>

    <div class="ruler-marks" aria-label="Timeline marks">
      {#each visibleTimelineMarks as mark (mark.id)}
        <button
          type="button"
          class:selected={selectedTimelineMarkId === mark.id}
          class:active-beat={activeBeatMarkId === mark.id}
          class:outside-project={isOutsideProjectTime(mark.time)}
          class="timeline-mark-button"
          style={`left: ${markLeft(mark)}`}
          title={`Beat marker ${formatPrecisionTime(mark.time)}`}
          aria-label={`Beat marker at ${formatPrecisionTime(mark.time)}`}
          on:click|stopPropagation={() => onSelectTimelineMark(mark.id)}
        ></button>
      {/each}
    </div>

    {#if isPlayheadVisible}
      <div class="playhead-pin-layer">
        <div class:beat-hit={Boolean(activeBeatMarkId)} class="playhead-pin" style={`left: ${playheadPercentage}%`}>
          <div class="playhead-badge">{formatPrecisionTime(playhead)}</div>
          <div class="playhead-triangle"></div>
        </div>
      </div>
    {/if}
  </div>

  {#if canPanWithSlider}
    <div class="timeline-viewport-slider-row">
      <input
        type="range"
        class="timeline-viewport-slider"
        min="0"
        max={timelineViewportMaxStart}
        step="0.01"
        value={timelineViewportStart}
        aria-label="Timeline horizontal viewport"
        aria-valuetext={`${formatPrecisionTime(timelineViewportStart)} to ${formatPrecisionTime(timelineViewportEnd)}`}
        on:click|stopPropagation
        on:dblclick|stopPropagation
        on:input={handleViewportSliderInput}
      />
    </div>
  {/if}
</header>

<style>
  .timeline-header {
    container-type: inline-size;
    display: flex;
    flex-direction: column;
    user-select: none;
    border-bottom: 1px solid #1d2025;
    background: #0f1012;
  }

  .top-bar {
    display: flex;
    height: 64px;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    overflow: hidden;
    border-bottom: 1px solid #141619;
    padding: 0 12px;
  }

  .project-picker,
  .transport-controls,
  .project-stats,
  .header-actions {
    display: flex;
    align-items: center;
  }

  .project-picker {
    gap: 8px;
    min-width: 122px;
    flex: 0 1 172px;
  }

  .project-picker > span {
    color: #a1a1aa;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  .project-button {
    display: flex;
    min-width: 0;
    max-width: 118px;
    align-items: center;
    gap: 6px;
    border-radius: 6px;
    background: transparent;
    color: #ffffff;
    cursor: pointer;
    padding: 4px 10px;
    transition: background-color 140ms ease;
  }

  .project-button:hover:not(:disabled) {
    background: #1a1d22;
  }

  .project-button:disabled {
    color: #71717a;
    cursor: default;
  }

  .project-button strong {
    overflow: hidden;
    font-size: 14px;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .transport-controls {
    gap: 8px;
    flex: 0 0 auto;
  }

  .round-icon,
  .icon-square,
  .save-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 140ms ease, color 140ms ease, transform 140ms ease;
  }

  .round-icon {
    width: 28px;
    height: 28px;
    border-radius: 999px;
    background: transparent;
    color: #a1a1aa;
  }

  .round-icon.subtle:hover:not(:disabled),
  .icon-square:hover:not(:disabled) {
    background: #1d2025;
    color: #ffffff;
  }

  .round-icon.outline {
    border: 1px solid #3f3f46;
  }

  .round-icon.outline:hover:not(:disabled) {
    color: #ffffff;
  }

  .loop-button.enabled {
    border-color: rgba(248, 113, 113, 0.55);
    background: rgba(127, 29, 29, 0.26);
    color: #fca5a5;
  }

  button:disabled {
    cursor: default;
    opacity: 0.45;
  }

  .project-stats {
    gap: 12px;
    min-width: 126px;
    flex: 0 0 auto;
    justify-content: center;
  }

  .project-stats div {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .project-stats strong {
    color: #ffffff;
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 0;
  }

  .project-stats span {
    color: #71717a;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.08em;
  }

  .header-actions {
    min-width: 0;
    gap: 6px;
    flex: 1 1 auto;
    justify-content: flex-end;
  }

  .mark-controls,
  .zoom-controls {
    display: flex;
    height: 32px;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
    border: 1px solid #1e232b;
    border-radius: 8px;
    background: #101216;
    padding: 0 3px;
  }

  .mark-controls {
    border-color: rgba(127, 29, 29, 0.42);
  }

  .mark-action-button.beat-active {
    background: rgba(127, 29, 29, 0.34);
    color: #fca5a5;
  }

  .zoom-readout {
    min-width: 74px;
    color: #a1a1aa;
    font: 800 10px "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
    text-align: center;
  }

  .icon-square {
    border-radius: 8px;
    background: transparent;
    color: #a1a1aa;
    padding: 6px;
  }

  .save-button {
    gap: 6px;
    border-radius: 8px;
    background: #ffffff;
    color: #000000;
    padding: 8px 11px;
    font-size: 12px;
    font-weight: 800;
    box-shadow: 0 1px 2px rgba(255, 255, 255, 0.12);
  }

  .save-button:hover:not(:disabled) {
    background: #e5e5e5;
  }

  .save-button.dirty {
    background: #f8fafc;
  }

  @container (max-width: 860px) {
    .top-bar {
      gap: 8px;
      padding: 0 10px;
    }

    .project-picker {
      min-width: 108px;
      flex-basis: 128px;
      gap: 6px;
    }

    .project-picker > span,
    .project-stats {
      display: none;
    }

    .project-button {
      max-width: 108px;
      padding: 4px 6px;
    }

    .transport-controls,
    .header-actions {
      gap: 4px;
    }

    .zoom-readout {
      min-width: 68px;
    }

    .icon-square {
      padding: 5px;
    }

    .save-button {
      width: 32px;
      height: 32px;
      padding: 0;
    }

    .save-button span {
      display: none;
    }
  }

  @container (max-width: 680px) {
    .project-picker {
      min-width: 88px;
      flex-basis: 104px;
    }

    .project-button {
      max-width: 92px;
    }

    .zoom-readout {
      min-width: 58px;
      font-size: 9px;
    }
  }

  .ruler-bar {
    --timeline-active-inset: 36px;
    position: relative;
    height: 44px;
    overflow: hidden;
    border-bottom: 1px solid #1d2025;
    background: #0a0b0d;
    cursor: pointer;
  }

  .ruler-bar.disabled {
    cursor: default;
  }

  .timeline-pan-button {
    position: absolute;
    top: 12px;
    z-index: 5;
    display: flex;
    width: 22px;
    height: 22px;
    align-items: center;
    justify-content: center;
    border: 1px solid #20242b;
    border-radius: 6px;
    background: rgba(16, 18, 22, 0.92);
    color: #a1a1aa;
    cursor: pointer;
  }

  .timeline-pan-button:hover:not(:disabled) {
    border-color: #343a44;
    color: #ffffff;
  }

  .timeline-pan-button.left {
    left: 2px;
  }

  .timeline-pan-button.right {
    right: 2px;
  }

  .primary-ticks,
  .secondary-ticks {
    position: absolute;
    inset: 0 var(--timeline-active-inset);
    pointer-events: none;
  }

  .tick {
    position: absolute;
    top: 0;
    display: flex;
    height: 100%;
    flex-direction: column;
    justify-content: space-between;
    transform: translateX(-50%);
  }

  .tick span {
    margin-top: 4px;
    color: #71717a;
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
    font-size: 10px;
    font-weight: 700;
  }

  .tick.outside-project span {
    opacity: 0;
  }

  .tick.outside-project i {
    opacity: 0.35;
  }

  .tick i {
    width: 1px;
    height: 8px;
    align-self: center;
    background: #1e2228;
    margin-bottom: 4px;
  }

  .secondary-ticks {
    opacity: 0.45;
  }

  .secondary-ticks i {
    position: absolute;
    bottom: 0;
    width: 1px;
    height: 4px;
    transform: translateX(-50%);
    background: #1a1e24;
  }

  .ruler-marks {
    position: absolute;
    inset: 0 var(--timeline-active-inset);
    z-index: 3;
    pointer-events: none;
  }

  .timeline-mark-button {
    position: absolute;
    top: 14px;
    bottom: 0;
    width: 6px;
    cursor: pointer;
    transform: translateX(-50%);
    border: 0;
    border-radius: 0;
    background: linear-gradient(90deg, transparent 0 2px, #ef4444 2px 4px, transparent 4px 6px);
    box-shadow: none;
    pointer-events: auto;
  }

  .timeline-mark-button:hover,
    .timeline-mark-button.selected,
  .timeline-mark-button.active-beat {
    background: linear-gradient(90deg, transparent 0 1px, #f87171 1px 5px, transparent 5px 6px);
    outline: 1px solid rgba(248, 113, 113, 0.62);
    outline-offset: 1px;
  }

  .timeline-mark-button.active-beat {
    outline-color: #ef4444;
  }

  .timeline-mark-button.outside-project {
    opacity: 0.45;
  }

  .playhead-pin-layer {
    position: absolute;
    inset: 0 var(--timeline-active-inset);
    z-index: 4;
    pointer-events: none;
  }

  .playhead-pin {
    position: absolute;
    top: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    transform: translateX(-50%);
    pointer-events: none;
  }

  .playhead-badge {
    position: relative;
    z-index: 2;
    border: 1px solid #cccccc;
    border-radius: 999px;
    background: #ffffff;
    color: #0a0b0d;
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
    font-size: 10px;
    font-weight: 800;
    padding: 2px 8px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
  }

  .playhead-pin.beat-hit .playhead-badge {
    border-color: #ef4444;
    color: #111111;
    outline: 2px solid rgba(239, 68, 68, 0.92);
    outline-offset: 2px;
    box-shadow: 0 0 0 1px rgba(127, 29, 29, 0.85), 0 10px 22px rgba(0, 0, 0, 0.4);
  }

  .playhead-triangle {
    width: 0;
    height: 0;
    border-right: 4px solid transparent;
    border-left: 4px solid transparent;
    border-top: 4px solid #ffffff;
  }

  .playhead-pin.beat-hit .playhead-triangle {
    border-top-color: #ef4444;
  }

  .timeline-viewport-slider-row {
    display: flex;
    height: 14px;
    align-items: center;
    border-bottom: 1px solid #1d2025;
    background: #08090b;
    padding: 0 var(--timeline-active-inset, 36px);
  }

  .timeline-viewport-slider {
    width: 100%;
    height: 10px;
    margin: 0;
    accent-color: #e5e7eb;
    appearance: none;
    background: transparent;
    cursor: ew-resize;
  }

  .timeline-viewport-slider::-webkit-slider-runnable-track {
    height: 3px;
    border-radius: 999px;
    background: #20242b;
  }

  .timeline-viewport-slider::-webkit-slider-thumb {
    width: 34px;
    height: 8px;
    margin-top: -2.5px;
    border: 1px solid #d4d4d8;
    border-radius: 999px;
    background: #f4f4f5;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
    -webkit-appearance: none;
    appearance: none;
  }

  .timeline-viewport-slider::-moz-range-track {
    height: 3px;
    border-radius: 999px;
    background: #20242b;
  }

  .timeline-viewport-slider::-moz-range-thumb {
    width: 34px;
    height: 8px;
    border: 1px solid #d4d4d8;
    border-radius: 999px;
    background: #f4f4f5;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
  }
</style>
