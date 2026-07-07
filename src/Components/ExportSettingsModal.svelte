<!-- / - Arinara Network © 2026 - / -->
<!-- This source code is the exclusive property of Arinara Network. -->
<!-- Unauthorized use, reproduction, distribution, or modification of this -->
<!-- code — in whole or in part — for any purpose whatsoever is strictly -->
<!-- prohibited without prior written consent from Arinara Network as the -->
<!-- sole legal owner of this codebase. -->
<script lang="ts">
  import {Download, FileAudio, X} from '@lucide/svelte';
  import type {
    ExportBitDepth,
    ExportChannelMode,
    ExportDitherMode,
    ExportFormat,
    ExportMp3Bitrate,
    ExportNormalizeMode,
    ExportRange,
    ExportRangeMode,
    ExportSampleRate,
    ExportSettings,
  } from '../ExportTypes';

  export let initialSettings: ExportSettings;
  export let projectName: string;
  export let projectDuration: number;
  export let selectedClipName: string | null = null;
  export let selectedClipRange: ExportRange | null = null;
  export let loopRange: ExportRange | null = null;
  export let isExporting = false;
  export let errorMessage: string | null = null;
  export let onCancel: () => void;
  export let onSubmit: (settings: ExportSettings) => void;

  let format: ExportFormat = initialSettings.format;
  let sampleRate: ExportSampleRate = initialSettings.sampleRate;
  let bitDepth: ExportBitDepth = initialSettings.bitDepth;
  let channelMode: ExportChannelMode = initialSettings.channelMode;
  let rangeMode: ExportRangeMode = initialSettings.rangeMode;
  let customStart = initialSettings.customStart;
  let customEnd = initialSettings.customEnd;
  let normalizeMode: ExportNormalizeMode = initialSettings.normalizeMode;
  let normalizePeakDb = initialSettings.normalizePeakDb;
  let ditherMode: ExportDitherMode = initialSettings.ditherMode;
  let mp3Bitrate: ExportMp3Bitrate = initialSettings.mp3Bitrate;
  let fileName = initialSettings.fileName;
  let validationMessage = '';

  $: selectedClipLabel = selectedClipName ? `Selected Clip: ${selectedClipName}` : 'Selected Clip unavailable';
  $: loopLabel = loopRange ? 'Loop Range' : 'Loop Range unavailable';
  $: effectiveRange = getEffectiveRange();
  $: renderDuration = Math.max(0, effectiveRange.end - effectiveRange.start);
  $: exportButtonText = isExporting ? 'Rendering...' : `Export ${format.toUpperCase()}`;
  $: exportSummary =
    format === 'mp3'
      ? `MP3 - ${mp3Bitrate} kbps - ${channelMode} - ${formatSampleRate(sampleRate)}`
      : `WAV - ${bitDepth}-bit - ${channelMode} - ${formatSampleRate(sampleRate)}`;
  $: displayError = validationMessage || errorMessage || '';
  $: if (format === 'mp3' && sampleRate === 96000) {
    sampleRate = 48000;
  }

  function getEffectiveRange(): ExportRange {
    if (rangeMode === 'selectedClip' && selectedClipRange) {
      return selectedClipRange;
    }

    if (rangeMode === 'loop' && loopRange) {
      return loopRange;
    }

    if (rangeMode === 'custom') {
      return {
        start: clampTime(customStart),
        end: clampTime(customEnd),
      };
    }

    return {start: 0, end: projectDuration};
  }

  function clampTime(seconds: number) {
    if (!Number.isFinite(seconds)) {
      return 0;
    }

    return Math.max(0, Math.min(projectDuration, seconds));
  }

  function formatDuration(seconds: number) {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const wholeSeconds = Math.floor(safeSeconds % 60);
    const cents = Math.floor((safeSeconds % 1) * 100);
    return `${minutes}:${wholeSeconds.toString().padStart(2, '0')}.${cents.toString().padStart(2, '0')}`;
  }

  function formatSampleRate(value: ExportSampleRate) {
    return value === 44100 ? '44.1 kHz' : `${Math.round(value / 1000)} kHz`;
  }

  function sanitizeSubmitSettings(): ExportSettings | null {
    validationMessage = '';
    const cleanFileName = fileName.trim();

    if (!cleanFileName) {
      validationMessage = 'Filename is required.';
      return null;
    }

    if (format === 'mp3' && sampleRate === 96000) {
      validationMessage = 'MP3 export supports 44.1 kHz or 48 kHz.';
      return null;
    }

    if (rangeMode === 'selectedClip' && !selectedClipRange) {
      validationMessage = 'Select a clip or choose Full Project.';
      return null;
    }

    if (rangeMode === 'loop' && !loopRange) {
      validationMessage = 'Enable a usable loop range or choose Full Project.';
      return null;
    }

    if (effectiveRange.end <= effectiveRange.start) {
      validationMessage = 'Export range must have duration.';
      return null;
    }

    return {
      format,
      sampleRate,
      bitDepth,
      channelMode,
      rangeMode,
      customStart: clampTime(customStart),
      customEnd: clampTime(customEnd),
      normalizeMode,
      normalizePeakDb,
      ditherMode,
      mp3Bitrate,
      fileName: cleanFileName,
    };
  }

  function submitForm() {
    const nextSettings = sanitizeSubmitSettings();
    if (!nextSettings) {
      return;
    }

    onSubmit(nextSettings);
  }
</script>

<div class="modal-backdrop" role="presentation">
  <div class="modal-panel wide" data-testid="export-settings-modal" role="dialog" aria-modal="true" aria-labelledby="export-settings-title">
    <header>
      <div>
        <span>Export</span>
        <h2 id="export-settings-title">{projectName}</h2>
      </div>
      <button type="button" class="icon-button" title="Close export settings" disabled={isExporting} on:click={onCancel}>
        <X class="icon-xs" />
      </button>
    </header>

    <form on:submit|preventDefault={submitForm}>
      <div class="summary-strip">
        <FileAudio class="icon-sm" />
        <div>
          <strong>{exportSummary}</strong>
          <span>{formatDuration(renderDuration)} from {formatDuration(effectiveRange.start)} to {formatDuration(effectiveRange.end)}</span>
        </div>
      </div>

      <div class="field-grid">
        <label>
          <span>Format</span>
          <select bind:value={format} disabled={isExporting}>
            <option value="wav">WAV PCM</option>
            <option value="mp3">MP3 MPEG</option>
          </select>
        </label>

        <label>
          <span>Range</span>
          <select bind:value={rangeMode} disabled={isExporting}>
            <option value="full">Full Project</option>
            <option value="selectedClip" disabled={!selectedClipRange}>{selectedClipLabel}</option>
            <option value="loop" disabled={!loopRange}>{loopLabel}</option>
            <option value="custom">Custom</option>
          </select>
        </label>
      </div>

      {#if rangeMode === 'custom'}
        <div class="field-grid">
          <label>
            <span>Start</span>
            <input bind:value={customStart} type="number" min="0" max={projectDuration} step="0.01" disabled={isExporting} />
          </label>

          <label>
            <span>End</span>
            <input bind:value={customEnd} type="number" min="0" max={projectDuration} step="0.01" disabled={isExporting} />
          </label>
        </div>
      {/if}

      <div class="field-grid three">
        <label>
          <span>Sample Rate</span>
          <select bind:value={sampleRate} disabled={isExporting}>
            <option value={44100}>44.1 kHz</option>
            <option value={48000}>48 kHz</option>
            {#if format === 'wav'}
              <option value={96000}>96 kHz</option>
            {/if}
          </select>
        </label>

        {#if format === 'mp3'}
          <label>
            <span>MP3 Bitrate</span>
            <select bind:value={mp3Bitrate} disabled={isExporting}>
              <option value={96}>96 kbps</option>
              <option value={128}>128 kbps</option>
              <option value={192}>192 kbps</option>
              <option value={256}>256 kbps</option>
              <option value={320}>320 kbps</option>
            </select>
          </label>
        {:else}
          <label>
            <span>Bit Depth</span>
            <select bind:value={bitDepth} disabled={isExporting}>
              <option value={16}>16-bit PCM</option>
              <option value={24}>24-bit PCM</option>
            </select>
          </label>
        {/if}

        <label>
          <span>Channels</span>
          <select bind:value={channelMode} disabled={isExporting}>
            <option value="stereo">Stereo</option>
            <option value="mono">Mono</option>
          </select>
        </label>
      </div>

      <div class="field-grid three">
        <label>
          <span>Normalize</span>
          <select bind:value={normalizeMode} disabled={isExporting}>
            <option value="off">Off</option>
            <option value="peak">Peak</option>
          </select>
        </label>

        <label>
          <span>Peak Target</span>
          <select bind:value={normalizePeakDb} disabled={isExporting || normalizeMode === 'off'}>
            <option value={-1}>-1 dBFS</option>
            <option value={-0.3}>-0.3 dBFS</option>
            <option value={0}>0 dBFS</option>
          </select>
        </label>

        {#if format === 'wav'}
          <label>
            <span>Dither</span>
            <select bind:value={ditherMode} disabled={isExporting}>
              <option value="off">Off</option>
              <option value="tpdf">TPDF</option>
            </select>
          </label>
        {:else}
          <div class="readout-field">
            <span>Encoder</span>
            <strong>LAME MP3</strong>
          </div>
        {/if}
      </div>

      <label>
        <span>Output Name</span>
        <input bind:value={fileName} maxlength="120" autocomplete="off" disabled={isExporting} />
      </label>

      {#if format === 'mp3'}
        <div class="format-note">
          <FileAudio class="icon-xs" />
          <span>MP3 uses the real browser encoder path after offline rendering. Bit depth and dither are WAV-only controls.</span>
        </div>
      {/if}

      {#if displayError}
        <p class="error-text">{displayError}</p>
      {/if}

      <footer>
        <button type="button" class="secondary" disabled={isExporting} on:click={onCancel}>Cancel</button>
        <button type="submit" class="primary" disabled={isExporting}>
          <Download class="icon-xs" />
          <span>{exportButtonText}</span>
        </button>
      </footer>
    </form>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.62);
    backdrop-filter: blur(12px);
  }

  .modal-panel {
    width: min(660px, calc(100vw - 32px));
    max-height: calc(100vh - 34px);
    overflow: auto;
    border: 1px solid #252a32;
    border-radius: 10px;
    background: #0d0f12;
    box-shadow: 0 30px 90px rgba(0, 0, 0, 0.55);
    color: #ffffff;
    padding: 18px;
  }

  header,
  .summary-strip,
  footer,
  .format-note,
  .primary {
    display: flex;
    align-items: center;
  }

  header {
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }

  header span,
  label span {
    color: #71717a;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h2 {
    max-width: 440px;
    overflow: hidden;
    margin: 4px 0 0;
    font-size: 20px;
    letter-spacing: 0;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  form,
  label {
    display: flex;
    flex-direction: column;
  }

  form {
    gap: 12px;
  }

  label {
    min-width: 0;
    gap: 6px;
  }

  input,
  select {
    width: 100%;
    border: 1px solid #252a32;
    border-radius: 8px;
    background: #121418;
    color: #ffffff;
    padding: 9px 10px;
    font-size: 12px;
    font-weight: 750;
  }

  select:disabled,
  input:disabled {
    color: #71717a;
    opacity: 0.8;
  }

  .field-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .field-grid.three {
    grid-template-columns: repeat(3, 1fr);
  }

  .summary-strip,
  .format-note,
  .readout-field {
    border: 1px solid #1d2025;
    border-radius: 8px;
    background: #111317;
  }

  .summary-strip {
    gap: 10px;
    padding: 10px 11px;
  }

  .summary-strip div {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 3px;
  }

  .summary-strip strong {
    color: #f4f4f5;
    font-size: 12px;
    font-weight: 850;
  }

  .summary-strip span,
  .format-note span {
    color: #9ca3af;
    font-size: 11px;
    font-weight: 700;
  }

  .format-note {
    gap: 8px;
    padding: 8px 10px;
  }

  .readout-field {
    display: flex;
    min-width: 0;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
    padding: 9px 10px;
  }

  .readout-field span {
    color: #71717a;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .readout-field strong {
    color: #f4f4f5;
    font-size: 12px;
    font-weight: 850;
  }

  .error-text {
    margin: 0;
    color: #f87171;
    font-size: 12px;
    font-weight: 750;
  }

  footer {
    justify-content: flex-end;
    gap: 10px;
    margin-top: 4px;
  }

  button {
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 800;
    padding: 9px 14px;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.58;
  }

  .icon-button {
    width: 32px;
    height: 32px;
    border: 1px solid #252a32;
    background: #111317;
    color: #d4d4d8;
    padding: 0;
  }

  .secondary {
    border: 1px solid #252a32;
    background: #111317;
    color: #d4d4d8;
  }

  .primary {
    gap: 7px;
    border: 0;
    background: #ffffff;
    color: #050608;
  }

  .modal-panel :global(.icon-xs) {
    width: 14px;
    height: 14px;
  }

  .modal-panel :global(.icon-sm) {
    width: 17px;
    height: 17px;
  }

  @media (max-width: 720px) {
    .field-grid,
    .field-grid.three {
      grid-template-columns: 1fr;
    }

    h2 {
      max-width: 280px;
    }
  }
</style>
