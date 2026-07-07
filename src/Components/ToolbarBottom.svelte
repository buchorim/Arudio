<!-- / - Arinara Network © 2026 - / -->
<!-- This source code is the exclusive property of Arinara Network. -->
<!-- Unauthorized use, reproduction, distribution, or modification of this -->
<!-- code — in whole or in part — for any purpose whatsoever is strictly -->
<!-- prohibited without prior written consent from Arinara Network as the -->
<!-- sole legal owner of this codebase. -->
<script lang="ts">
  import {Diamond, Maximize2, Plus, Pointer, SkipBack, SkipForward, Split, Trash2} from '@lucide/svelte';
  import type {AutomationKeyframe, DawTool} from '../Types';

  export let activeTool: DawTool;
  export let disabled = false;
  export let toolDisabledReasons: Record<DawTool, string | null>;
  export let onSelectTool: (tool: DawTool) => void;
  export let selectedClipName: string | null = null;
  export let selectedClipAutomationTime: number | null = null;
  export let compoundKeyframeCount = 0;
  export let activeCompoundParameterCount = 0;
  export let activeCompoundEasing: AutomationKeyframe['easing'] = 'linear';
  export let playheadInsideSelectedClip = false;
  export let onAddClipCompoundKeyframe: () => void = () => undefined;
  export let onDeleteClipCompoundKeyframe: () => void = () => undefined;
  export let onGoToPreviousClipCompoundKeyframe: () => void = () => undefined;
  export let onGoToNextClipCompoundKeyframe: () => void = () => undefined;
  export let onUpdateClipCompoundKeyframeTime: (time: number) => void = () => undefined;
  export let onUpdateClipCompoundKeyframeEasing: (easing: AutomationKeyframe['easing']) => void = () => undefined;

  const tools = [
    {id: 'select' as DawTool, label: 'Select', icon: Pointer},
    {id: 'split' as DawTool, label: 'Split', icon: Split},
    {id: 'move' as DawTool, label: 'Move', icon: Maximize2},
    {id: 'delete' as DawTool, label: 'Delete', icon: Trash2},
  ];

  $: hasSelectedClip = Boolean(selectedClipName);
  $: hasActiveKeyframe = selectedClipAutomationTime !== null;
  $: canAddKeyframe = hasSelectedClip && playheadInsideSelectedClip;
  $: activeEasingValue = activeCompoundEasing === 'custom-bezier' ? 'ease-in-out' : activeCompoundEasing;

  function handleTimeChange(value: string) {
    const nextTime = Number(value);
    if (Number.isFinite(nextTime)) {
      onUpdateClipCompoundKeyframeTime(nextTime);
    }
  }
</script>

<div class:disabled class="toolbar-band">
  <div class="tool-pill" role="toolbar" aria-label="Editing tools">
    {#each tools as tool (tool.id)}
      {@const unavailableReason = toolDisabledReasons[tool.id]}
      <button
        type="button"
        class:active={activeTool === tool.id}
        class:unavailable={Boolean(unavailableReason)}
        class="tool-button"
        title={unavailableReason ?? tool.label}
        aria-pressed={activeTool === tool.id}
        aria-disabled={disabled || Boolean(unavailableReason)}
        disabled={disabled}
        on:click={() => onSelectTool(tool.id)}
      >
        <svelte:component this={tool.icon} class="icon-sm" />
        <span>{tool.label}</span>
        {#if activeTool === tool.id}
          <i></i>
        {/if}
      </button>
    {/each}
  </div>

  <div class:empty={!hasSelectedClip} class="quick-keyframe-editor" aria-label="Quick keyframe editor">
    <div class="quick-kf-title">
      <Diamond class="icon-xs" />
      <span>KF</span>
      <strong>{hasActiveKeyframe ? `${activeCompoundParameterCount} param` : `${compoundKeyframeCount} total`}</strong>
    </div>

    <div class="quick-kf-actions">
      <button
        type="button"
        title={canAddKeyframe ? 'Add keyframe at playhead' : hasSelectedClip ? 'Move playhead inside the clip' : 'Select a clip first'}
        disabled={disabled || !canAddKeyframe}
        on:click={onAddClipCompoundKeyframe}
      >
        <Plus class="icon-xs" />
      </button>
      <button
        type="button"
        title="Previous keyframe"
        disabled={disabled || compoundKeyframeCount === 0}
        on:click={onGoToPreviousClipCompoundKeyframe}
      >
        <SkipBack class="icon-xs" />
      </button>
      <button
        type="button"
        title="Next keyframe"
        disabled={disabled || compoundKeyframeCount === 0}
        on:click={onGoToNextClipCompoundKeyframe}
      >
        <SkipForward class="icon-xs" />
      </button>
      <button
        type="button"
        title="Delete active keyframe"
        disabled={disabled || compoundKeyframeCount === 0}
        on:click={onDeleteClipCompoundKeyframe}
      >
        <Trash2 class="icon-xs" />
      </button>
    </div>

    <label class="quick-kf-field" title="Active keyframe time">
      <span>Time</span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={hasActiveKeyframe ? selectedClipAutomationTime?.toFixed(2) : ''}
        placeholder="--"
        disabled={disabled || !hasActiveKeyframe}
        aria-label="Active keyframe time"
        on:change={(event) => handleTimeChange(event.currentTarget.value)}
      />
    </label>

    <label class="quick-kf-field easing" title="Active keyframe easing">
      <span>Ease</span>
      <select
        value={activeEasingValue}
        disabled={disabled || !hasActiveKeyframe}
        aria-label="Active keyframe easing"
        on:change={(event) => onUpdateClipCompoundKeyframeEasing(event.currentTarget.value as AutomationKeyframe['easing'])}
      >
        <option value="linear">Linear</option>
        <option value="hold">Hold</option>
        <option value="ease-in">In</option>
        <option value="ease-out">Out</option>
        <option value="ease-in-out">In/Out</option>
      </select>
    </label>
  </div>
</div>

<style>
  .toolbar-band {
    display: flex;
    align-items: stretch;
    justify-content: flex-start;
    gap: 14px;
    border-top: 1px solid #1d2025;
    background: #0a0b0d;
    padding: 9px 12px 10px;
  }

  .toolbar-band.disabled {
    opacity: 0.52;
  }

  .tool-pill {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    align-self: center;
    gap: 6px;
    border: 1px solid #1e2127;
    border-radius: 12px;
    background: #121418;
    padding: 6px;
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.32);
  }

  .tool-button {
    position: relative;
    display: flex;
    width: 60px;
    height: 52px;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 4px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: #71717a;
    cursor: pointer;
    transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;
  }

  .tool-button:hover:not(:disabled) {
    background: #15171c;
    color: #e4e4e7;
  }

  .tool-button.unavailable {
    color: #52525b;
  }

  .tool-button.unavailable:hover:not(:disabled) {
    border-color: rgba(248, 113, 113, 0.28);
    background: rgba(127, 29, 29, 0.12);
    color: #fca5a5;
  }

  .tool-button:disabled {
    cursor: default;
  }

  .tool-button.active {
    border-color: #2d323b;
    background: #1d2025;
    color: #ffffff;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.35);
  }

  .tool-button span {
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .tool-button i {
    position: absolute;
    bottom: 2px;
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: #ffffff;
  }

  .quick-keyframe-editor {
    flex: 1 1 540px;
    align-self: stretch;
    margin-left: auto;
    display: grid;
    grid-template-columns: minmax(112px, 0.8fr) auto minmax(112px, 0.58fr) minmax(132px, 0.72fr);
    align-items: center;
    gap: 10px;
    min-width: min(100%, 430px);
    max-width: min(100%, 700px);
    border: 1px solid #20242b;
    border-radius: 11px;
    background: #111318;
    padding: 8px 10px;
    color: #d4d4d8;
    box-shadow: 0 14px 36px rgba(0, 0, 0, 0.28);
  }

  .quick-keyframe-editor.empty {
    opacity: 0.5;
  }

  .quick-kf-title,
  .quick-kf-actions,
  .quick-kf-field {
    display: flex;
    align-items: center;
  }

  .quick-kf-title {
    gap: 7px;
    min-width: 0;
  }

  .quick-kf-title span {
    color: #a1a1aa;
    font-size: 9px;
    font-weight: 850;
    letter-spacing: 0.08em;
  }

  .quick-kf-title strong {
    max-width: 116px;
    overflow: hidden;
    color: #f4f4f5;
    font-size: 11px;
    font-weight: 850;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .quick-kf-actions {
    gap: 5px;
  }

  .quick-kf-actions button {
    display: grid;
    width: 28px;
    height: 28px;
    place-items: center;
    border: 1px solid #242832;
    border-radius: 7px;
    background: #15181f;
    color: #d4d4d8;
    cursor: pointer;
  }

  .quick-kf-actions button:hover:not(:disabled) {
    border-color: #3b4250;
    background: #1d2028;
    color: #ffffff;
  }

  .quick-kf-actions button:disabled {
    cursor: default;
    opacity: 0.42;
  }

  .quick-kf-field {
    gap: 6px;
  }

  .quick-kf-field span {
    color: #8b93a3;
    font-size: 8px;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .quick-kf-field input,
  .quick-kf-field select {
    min-width: 0;
    width: 100%;
    height: 28px;
    border: 1px solid #252a33;
    border-radius: 7px;
    background: #0b0d11;
    color: #ffffff;
    font-size: 11px;
    font-weight: 800;
    outline: none;
    padding: 0 8px;
  }

  .quick-kf-field select {
    cursor: pointer;
  }

  .quick-kf-field input:disabled,
  .quick-kf-field select:disabled {
    color: #71717a;
    cursor: default;
    opacity: 0.6;
  }

  @media (max-width: 1180px) {
    .toolbar-band {
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px;
    }

    .quick-keyframe-editor {
      flex-basis: 100%;
      max-width: 720px;
      margin-left: 0;
    }
  }

  @media (max-width: 720px) {
    .quick-keyframe-editor {
      grid-template-columns: 1fr auto;
    }

    .quick-kf-field {
      grid-column: span 1;
    }
  }
</style>
