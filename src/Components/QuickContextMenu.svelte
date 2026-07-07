<!-- / - Arinara Network © 2026 - / -->
<!-- This source code is the exclusive property of Arinara Network. -->
<!-- Unauthorized use, reproduction, distribution, or modification of this -->
<!-- code — in whole or in part — for any purpose whatsoever is strictly -->
<!-- prohibited without prior written consent from Arinara Network as the -->
<!-- sole legal owner of this codebase. -->
<script lang="ts" context="module">
  export interface QuickContextMenuItem {
    id: string;
    label: string;
    hint: string;
    icon: 'keyframe' | 'beat' | 'cut' | 'delete' | 'export';
    disabledReason: string | null;
    danger?: boolean;
  }
</script>

<script lang="ts">
  import {onMount} from 'svelte';
  import {Diamond, Download, Flag, Scissors, Trash2} from '@lucide/svelte';

  export let x = 0;
  export let y = 0;
  export let title = 'Quick Actions';
  export let items: QuickContextMenuItem[] = [];
  export let onRun: (id: string) => void;
  export let onClose: () => void;

  const menuWidth = 260;
  const menuMaxHeight = 420;

  $: left = Math.max(8, Math.min(x, window.innerWidth - menuWidth - 8));
  $: top = Math.max(8, Math.min(y, window.innerHeight - menuMaxHeight - 8));

  function getIcon(icon: QuickContextMenuItem['icon']) {
    if (icon === 'keyframe') {
      return Diamond;
    }

    if (icon === 'beat') {
      return Flag;
    }

    if (icon === 'delete') {
      return Trash2;
    }

    if (icon === 'export') {
      return Download;
    }

    return Scissors;
  }

  function handleRun(item: QuickContextMenuItem) {
    if (item.disabledReason) {
      return;
    }

    onRun(item.id);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  }

  onMount(() => {
    const closeOnPointerDown = (event: PointerEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest('.quick-context-menu')) {
        return;
      }

      onClose();
    };
    window.addEventListener('pointerdown', closeOnPointerDown);
    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('pointerdown', closeOnPointerDown);
      window.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<div class="quick-context-menu" style={`left: ${left}px; top: ${top}px`} role="menu" aria-label={title}>
  <header>{title}</header>
  <div class="menu-list">
    {#each items as item (item.id)}
      {@const Icon = getIcon(item.icon)}
      <button
        type="button"
        class:danger={item.danger}
        class:disabled={Boolean(item.disabledReason)}
        role="menuitem"
        title={item.disabledReason ?? item.hint}
        aria-disabled={Boolean(item.disabledReason)}
        on:click={() => handleRun(item)}
      >
        <Icon class="menu-icon" />
        <span>{item.label}</span>
        <small>{item.disabledReason ?? item.hint}</small>
      </button>
    {/each}
  </div>
</div>

<style>
  .quick-context-menu {
    position: fixed;
    z-index: 150;
    width: 260px;
    max-height: 420px;
    overflow: hidden;
    border: 1px solid #2a2f39;
    border-radius: 8px;
    background: #121417;
    box-shadow: 0 22px 70px rgba(0, 0, 0, 0.62);
    color: #f4f4f5;
    padding: 5px;
  }

  header {
    border-bottom: 1px solid #222730;
    color: #a1a1aa;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.09em;
    padding: 7px 8px 8px;
    text-transform: uppercase;
  }

  .menu-list {
    display: flex;
    max-height: 360px;
    flex-direction: column;
    gap: 2px;
    overflow: auto;
    padding-top: 4px;
  }

  button {
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr);
    column-gap: 8px;
    row-gap: 1px;
    align-items: center;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: #e4e4e7;
    cursor: pointer;
    padding: 7px 8px;
    text-align: left;
  }

  button:hover:not(.disabled) {
    background: #2f3746;
    color: #ffffff;
  }

  button.danger:hover:not(.disabled) {
    background: rgba(127, 29, 29, 0.55);
    color: #fecaca;
  }

  button.disabled {
    color: #626875;
    cursor: default;
  }

  button :global(.menu-icon) {
    grid-row: span 2;
    width: 15px;
    height: 15px;
  }

  span {
    overflow: hidden;
    font-size: 12px;
    font-weight: 820;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    overflow: hidden;
    color: #8b93a3;
    font-size: 9px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
