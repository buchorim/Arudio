<!-- / - Arinara Network © 2026 - / -->
<!-- This source code is the exclusive property of Arinara Network. -->
<!-- Unauthorized use, reproduction, distribution, or modification of this -->
<!-- code — in whole or in part — for any purpose whatsoever is strictly -->
<!-- prohibited without prior written consent from Arinara Network as the -->
<!-- sole legal owner of this codebase. -->
<script lang="ts">
  import {onMount} from 'svelte';
  import {CornerDownLeft, Search, X} from '@lucide/svelte';
  import type {CommandPaletteCommand} from '../Types';

  export let commands: CommandPaletteCommand[] = [];
  export let showShortcutHints = true;
  export let onClose: () => void = () => undefined;
  export let onRun: (commandId: string) => void = () => undefined;

  let query = '';
  let activeIndex = 0;
  let inputRef: HTMLInputElement;

  $: filteredCommands = commands.filter((command) => commandMatches(command, query));
  $: if (activeIndex >= filteredCommands.length) {
    activeIndex = Math.max(0, filteredCommands.length - 1);
  }

  onMount(() => {
    requestAnimationFrame(() => inputRef?.focus());
  });

  function commandMatches(command: CommandPaletteCommand, value: string) {
    const searchValue = value.trim().toLowerCase();
    if (!searchValue) {
      return true;
    }

    return `${command.title} ${command.category} ${command.description} ${command.shortcut ?? ''}`
      .toLowerCase()
      .includes(searchValue);
  }

  function runCommand(command: CommandPaletteCommand) {
    onRun(command.id);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex = Math.min(filteredCommands.length - 1, activeIndex + 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = Math.max(0, activeIndex - 1);
      return;
    }

    if (event.key === 'Enter' && filteredCommands[activeIndex]) {
      event.preventDefault();
      runCommand(filteredCommands[activeIndex]);
    }
  }
</script>

<div class="command-backdrop">
  <button class="command-dismiss" type="button" aria-label="Close command palette" on:click={onClose}></button>
  <dialog class="command-panel" open aria-label="Command palette" on:keydown={handleKeydown}>
    <div class="command-search">
      <Search class="icon-sm" />
      <input
        bind:this={inputRef}
        bind:value={query}
        type="search"
        placeholder="Search commands"
        aria-label="Search commands"
        on:keydown={handleKeydown}
      />
      <button type="button" title="Close command palette" aria-label="Close command palette" on:click={onClose}>
        <X class="icon-xs" />
      </button>
    </div>

    <div class="command-list" role="listbox" aria-label="Available commands">
      {#if filteredCommands.length > 0}
        {#each filteredCommands as command, index (command.id)}
          <button
            type="button"
            class:active={index === activeIndex}
            class:disabled={command.disabled}
            role="option"
            aria-selected={index === activeIndex}
            title={command.disabledReason ?? command.description}
            on:mouseenter={() => (activeIndex = index)}
            on:click={() => runCommand(command)}
          >
            <span class="command-main">
              <strong>{command.title}</strong>
              <em>{command.disabled && command.disabledReason ? command.disabledReason : command.description}</em>
            </span>
            <span class="command-meta">
              <small>{command.category}</small>
              {#if showShortcutHints && command.shortcut}
                <kbd>{command.shortcut}</kbd>
              {/if}
              {#if index === activeIndex}
                <CornerDownLeft class="icon-xs" />
              {/if}
            </span>
          </button>
        {/each}
      {:else}
        <div class="command-empty">
          <strong>No commands found</strong>
          <span>Try a different word.</span>
        </div>
      {/if}
    </div>
  </dialog>
</div>

<style>
  .command-backdrop {
    position: fixed;
    inset: 0;
    z-index: 80;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    background: rgba(0, 0, 0, 0.45);
    padding-top: 84px;
  }

  .command-dismiss {
    position: absolute;
    inset: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    cursor: default;
  }

  .command-panel {
    position: relative;
    z-index: 1;
    width: min(620px, calc(100vw - 32px));
    overflow: hidden;
    border: 1px solid #272b35;
    border-radius: 8px;
    background: #0b0d10;
    box-shadow: 0 28px 100px rgba(0, 0, 0, 0.58);
    color: #d4d4d8;
    margin: 0;
    padding: 0;
  }

  .command-search {
    display: grid;
    grid-template-columns: 20px minmax(0, 1fr) 28px;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid #1d2027;
    background: #101216;
    color: #71717a;
    padding: 12px;
  }

  .command-search input {
    min-width: 0;
    border: 0;
    background: transparent;
    color: #f4f4f5;
    font-size: 14px;
    font-weight: 700;
    outline: none;
  }

  .command-search input::placeholder {
    color: #71717a;
  }

  .command-search button {
    display: flex;
    width: 28px;
    height: 28px;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    background: transparent;
    color: #a1a1aa;
    cursor: pointer;
  }

  .command-search button:hover {
    background: #1a1d23;
    color: #ffffff;
  }

  .command-list {
    max-height: min(430px, calc(100vh - 180px));
    overflow-y: auto;
    padding: 6px;
  }

  .command-list button {
    display: grid;
    width: 100%;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    border: 1px solid transparent;
    border-radius: 7px;
    background: transparent;
    color: #d4d4d8;
    cursor: pointer;
    padding: 9px 10px;
    text-align: left;
  }

  .command-list button.active {
    border-color: #313743;
    background: #151922;
  }

  .command-list button.disabled {
    opacity: 0.56;
  }

  .command-main {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 3px;
  }

  .command-main strong {
    overflow: hidden;
    color: #f4f4f5;
    font-size: 12px;
    font-weight: 850;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .command-main em {
    overflow: hidden;
    color: #71717a;
    font-size: 10px;
    font-style: normal;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .command-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #71717a;
  }

  .command-meta small {
    font-size: 9px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .command-meta kbd {
    min-width: 26px;
    border: 1px solid #2a2f3a;
    border-radius: 5px;
    background: #0e1014;
    color: #d4d4d8;
    font: 800 10px "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
    padding: 3px 6px;
    text-align: center;
  }

  .command-empty {
    display: flex;
    min-height: 120px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    color: #71717a;
    font-size: 11px;
  }

  .command-empty strong {
    color: #d4d4d8;
    font-size: 12px;
  }
</style>
