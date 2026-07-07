<!-- / - Arinara Network © 2026 - / -->
<!-- This source code is the exclusive property of Arinara Network. -->
<!-- Unauthorized use, reproduction, distribution, or modification of this -->
<!-- code — in whole or in part — for any purpose whatsoever is strictly -->
<!-- prohibited without prior written consent from Arinara Network as the -->
<!-- sole legal owner of this codebase. -->
<script lang="ts">
  import {Pause, Play, Repeat2, SkipBack, SkipForward, Volume2} from '@lucide/svelte';
  import type {PlaybackCacheStatus, ProjectRecord} from '../Types';

  export let project: ProjectRecord | null;
  export let playhead: number;
  export let hasPlayableAudio: boolean;
  export let playbackUnavailableReason: string | null = null;
  export let isPlaying: boolean;
  export let isLoopEnabled: boolean;
  export let playbackCacheStatus: PlaybackCacheStatus;
  export let masterVolume: number;
  export let onTogglePlayback: () => void;
  export let onStopPlayback: () => void;
  export let onJumpToEnd: () => void;
  export let onChangeMasterVolume: (volume: number) => void;

  $: totalDuration = project ? calculateProjectDuration(project) : 0;

  function calculateProjectDuration(projectRecord: ProjectRecord) {
    return projectRecord.clips.reduce((duration, clip) => Math.max(duration, clip.startTime + clip.duration), 0);
  }

  function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const cents = Math.floor((seconds % 1) * 100);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${cents.toString().padStart(2, '0')}`;
  }

  function dbLabel(volume: number) {
    return volume > 0 ? `-${(10 - volume / 10).toFixed(1)} dB` : '-INF';
  }

  function sampleRateLabel() {
    if (!project) {
      return '--';
    }

    return project.settings.sampleRate === 44100 ? '44.1kHz' : '48kHz';
  }

  function formatFrameCount(frames: number) {
    if (frames >= 1_000_000) {
      return `${(frames / 1_000_000).toFixed(1)}M fr`;
    }

    if (frames >= 1_000) {
      return `${Math.round(frames / 1_000)}k fr`;
    }

    return `${frames} fr`;
  }

  function formatFrameDuration(frames: number) {
    if (!project || frames <= 0) {
      return '0.00s';
    }

    return `${(frames / project.settings.sampleRate).toFixed(2)}s`;
  }

</script>

<footer class="player-bottom">
  <div class="transport-row">
    <div class="time-badge">
      <strong class="mono">{formatTime(playhead)}</strong>
      <span>/</span>
      <em class="mono">{formatTime(totalDuration)}</em>
    </div>

    <div class="bottom-buttons" aria-label="Playback controls">
      <button type="button" class="footer-icon" title="Reset/Stop" disabled={!project} on:click={onStopPlayback}>
        <SkipBack class="icon-sm" />
      </button>
      <button
        type="button"
        class:playing={isPlaying}
        class="footer-play"
        title={hasPlayableAudio ? (isPlaying ? 'Pause' : 'Play') : playbackUnavailableReason ?? 'Audio is not ready for playback'}
        disabled={!hasPlayableAudio}
        on:click={onTogglePlayback}
      >
        {#if isPlaying}
          <Pause class="icon-sm fill-icon" />
        {:else}
          <Play class="icon-sm fill-icon play-offset" />
        {/if}
      </button>
      <button type="button" class="footer-icon" title="Jump to End" disabled={!project || totalDuration <= 0} on:click={onJumpToEnd}>
        <SkipForward class="icon-sm" />
      </button>
    </div>

    <div class="master-volume">
      <Volume2 class="icon-sm" />
      <input
        class="range-compact"
        type="range"
        min="0"
        max="100"
        value={masterVolume}
        disabled={!project}
        aria-label="Master output volume"
        on:input={(event) => onChangeMasterVolume(Number(event.currentTarget.value))}
      />
      <span class="mono">{dbLabel(masterVolume)}</span>
    </div>
  </div>

  <div class="state-row">
    <div class="session-specs">
      <span>{sampleRateLabel()}</span>
      <span>{project?.settings.gridResolution ?? '--'}</span>
      <span>{project ? `${project.bpm} BPM` : '-- BPM'}</span>
      <span>{project?.timeSignature ?? '--'}</span>
      <span>{project?.key ?? '--'}</span>
    </div>

    {#if playbackCacheStatus.state !== 'idle'}
      <div class="cache-status" aria-label="Playback cache generations">
        <span class="cache-pill active">
          <i></i>
          <em>{playbackCacheStatus.pendingGenerationId ? 'Old cache' : 'Active cache'}</em>
          <strong>G{playbackCacheStatus.activeGenerationId}</strong>
          <b>{playbackCacheStatus.pendingGenerationId ? 'Audible now' : 'Current'}</b>
          <small>{formatFrameCount(playbackCacheStatus.activeFrameCount)} · {formatFrameDuration(playbackCacheStatus.activeFrameCount)}</small>
        </span>
        {#if playbackCacheStatus.pendingGenerationId}
          <span class="cache-pill pending">
            <i></i>
            <em>New cache</em>
            <strong>G{playbackCacheStatus.pendingGenerationId}</strong>
            <b>Queued next</b>
            <small>{formatFrameCount(playbackCacheStatus.pendingFrameCount)} · {formatFrameDuration(playbackCacheStatus.pendingFrameCount)}</small>
          </span>
          <span class="cache-release-note">Old releases on stop</span>
        {/if}
      </div>
    {/if}

    <div class="session-state">
      <span class="state-chip">{project ? 'Local Project' : 'No Project'}</span>
      {#if isLoopEnabled}
        <span class="state-chip loop-chip">
          <Repeat2 class="icon-xs" />
          Loop
        </span>
      {/if}
      <span class="state-chip">{isPlaying ? 'Playing' : hasPlayableAudio ? 'Audio Source' : 'No Audio'}</span>
    </div>
  </div>
</footer>

<style>
  .player-bottom {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex-shrink: 0;
    user-select: none;
    border-top: 1px solid #1d2025;
    background: #07080a;
    padding: 12px;
  }

  .transport-row,
  .state-row,
  .bottom-buttons,
  .master-volume,
  .session-specs,
  .session-state,
  .state-chip,
  .loop-chip {
    display: flex;
    align-items: center;
  }

  .transport-row,
  .state-row {
    justify-content: space-between;
    padding: 0 16px;
  }

  .time-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 1px solid #1e2127;
    border-radius: 12px;
    background: #121418;
    padding: 8px 16px;
  }

  .time-badge strong {
    color: #ffffff;
    font-size: 16px;
    font-weight: 800;
  }

  .time-badge span {
    color: #71717a;
    font-size: 12px;
    font-weight: 700;
  }

  .time-badge em {
    color: #a1a1aa;
    font-size: 12px;
    font-style: normal;
    font-weight: 800;
  }

  .bottom-buttons {
    gap: 16px;
  }

  .footer-icon {
    border-radius: 999px;
    background: transparent;
    color: #a1a1aa;
    cursor: pointer;
    padding: 6px;
    transition: background-color 140ms ease, color 140ms ease;
  }

  .footer-icon:hover:not(:disabled) {
    background: #121418;
    color: #ffffff;
  }

  .footer-play {
    display: flex;
    width: 48px;
    height: 48px;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: #ffffff;
    color: #000000;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(255, 255, 255, 0.12);
    transition: transform 140ms ease;
  }

  .footer-play:hover:not(:disabled) {
    transform: scale(1.05);
  }

  .footer-play:active:not(:disabled) {
    transform: scale(0.95);
  }

  .footer-play.playing {
    background: #27272a;
    color: #ffffff;
  }

  button:disabled {
    cursor: default;
    opacity: 0.45;
  }

  .master-volume {
    width: 260px;
    justify-content: flex-end;
    gap: 12px;
    color: #a1a1aa;
  }

  .master-volume input {
    width: 120px;
  }

  .master-volume span {
    min-width: 50px;
    color: #d4d4d8;
    font-size: 12px;
    font-weight: 700;
    text-align: right;
  }

  .state-row {
    border-top: 1px solid #121418;
    color: #71717a;
    font-size: 11px;
    font-weight: 700;
    padding-top: 8px;
  }

  .session-specs {
    gap: 16px;
  }

  .session-state {
    gap: 16px;
  }

  .cache-status {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 6px;
  }

  .cache-pill {
    display: inline-flex;
    min-width: 0;
    align-items: center;
    gap: 5px;
    border: 1px solid #1e2127;
    border-radius: 999px;
    background: #0f1115;
    color: #a1a1aa;
    font-size: 9px;
    font-weight: 900;
    line-height: 1;
    padding: 5px 7px;
    text-transform: uppercase;
  }

  .cache-pill small {
    text-transform: none;
  }

  .cache-pill i {
    width: 6px;
    height: 6px;
    flex: 0 0 auto;
    border-radius: 999px;
  }

  .cache-pill em {
    color: #d4d4d8;
    font-style: normal;
  }

  .cache-pill strong,
  .cache-pill small,
  .cache-pill b {
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
    font-size: 9px;
  }

  .cache-pill small {
    color: #71717a;
  }

  .cache-pill b {
    border-left: 1px solid #262a31;
    color: #d4d4d8;
    font-weight: 900;
    padding-left: 5px;
    text-transform: none;
    white-space: nowrap;
  }

  .cache-pill.active {
    border-color: rgba(56, 189, 248, 0.25);
  }

  .cache-pill.active i {
    background: #38bdf8;
    box-shadow: 0 0 8px rgba(56, 189, 248, 0.5);
  }

  .cache-pill.pending {
    border-color: rgba(250, 204, 21, 0.28);
  }

  .cache-pill.pending i {
    background: #facc15;
    box-shadow: 0 0 8px rgba(250, 204, 21, 0.45);
  }

  .cache-release-note {
    color: #a1a1aa;
    font: 800 9px "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .state-chip {
    gap: 6px;
    color: #a1a1aa;
  }

  .loop-chip {
    color: #fca5a5;
  }

</style>
