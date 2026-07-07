<!-- / - Arinara Network © 2026 - / -->
<!-- This source code is the exclusive property of Arinara Network. -->
<!-- Unauthorized use, reproduction, distribution, or modification of this -->
<!-- code — in whole or in part — for any purpose whatsoever is strictly -->
<!-- prohibited without prior written consent from Arinara Network as the -->
<!-- sole legal owner of this codebase. -->
<script lang="ts">
  import type {AppSettings, DensityMode} from '../Types';

  export let settings: AppSettings;
  export let currentVersion: string;
  export let latestReleaseSeen = true;
  export let onOpenWhatsNew: () => void;
  export let onOpenChangelog: () => void;
  export let onSave: (settings: AppSettings) => void;
  export let onResetData: () => void;
  export let onCancel: () => void;

  let density: DensityMode = settings.density;
  let reducedMotion = settings.reducedMotion;
  let showShortcutHints = settings.showShortcutHints;

  function submitForm() {
    onSave({
      ...settings,
      density,
      reducedMotion,
      showShortcutHints,
      theme: 'dark',
    });
  }
</script>

<div class="modal-backdrop" role="presentation">
  <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="app-settings-title">
    <header>
      <span>Application</span>
      <h2 id="app-settings-title">Settings</h2>
    </header>

    <form on:submit|preventDefault={submitForm}>
      <label>
        <span>Density</span>
        <select bind:value={density}>
          <option value="compact">Compact</option>
          <option value="comfortable">Comfortable</option>
        </select>
      </label>

      <label class="switch-row">
        <span>Reduced motion</span>
        <input bind:checked={reducedMotion} type="checkbox" />
      </label>

      <label class="switch-row">
        <span>Shortcut hints</span>
        <input bind:checked={showShortcutHints} type="checkbox" />
      </label>

      <div class="release-zone">
        <div>
          <span>Release</span>
          <strong>Arudio {currentVersion}</strong>
          <em>{latestReleaseSeen ? 'Latest notes seen' : 'New notes available'}</em>
        </div>
        <div class="release-actions">
          <button type="button" on:click={onOpenWhatsNew}>What's New</button>
          <button type="button" on:click={onOpenChangelog}>Changelog</button>
        </div>
      </div>

      <div class="danger-zone">
        <span>Local data</span>
        <button type="button" on:click={onResetData}>Reset Projects</button>
      </div>

      <footer>
        <button type="button" class="secondary" on:click={onCancel}>Cancel</button>
        <button type="submit" class="primary">Save Settings</button>
      </footer>
    </form>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 80;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.62);
    backdrop-filter: blur(12px);
  }

  .modal-panel {
    width: min(420px, calc(100vw - 32px));
    border: 1px solid #252a32;
    border-radius: 10px;
    background: #0d0f12;
    box-shadow: 0 30px 90px rgba(0, 0, 0, 0.55);
    color: #ffffff;
    padding: 18px;
  }

  header {
    margin-bottom: 18px;
  }

  header span,
  label span,
  .danger-zone span,
  .release-zone span {
    color: #71717a;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h2 {
    margin: 4px 0 0;
    font-size: 20px;
    letter-spacing: 0;
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
    gap: 6px;
  }

  select {
    width: 100%;
    border: 1px solid #252a32;
    border-radius: 8px;
    background: #121418;
    color: #ffffff;
    padding: 10px 11px;
    font-size: 13px;
  }

  .switch-row,
  .danger-zone,
  .release-zone {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 1px solid #1d2025;
    border-radius: 8px;
    background: #111317;
    padding: 10px 11px;
  }

  .release-zone {
    align-items: flex-start;
    gap: 12px;
  }

  .release-zone div:first-child {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 4px;
  }

  .release-zone strong {
    color: #ffffff;
    font-size: 13px;
    font-weight: 850;
  }

  .release-zone em {
    color: #9ca3af;
    font-size: 11px;
    font-style: normal;
    font-weight: 750;
  }

  .release-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 7px;
  }

  .release-actions button {
    border: 1px solid #303642;
    background: #171a20;
    color: #f4f4f5;
    padding: 7px 9px;
  }

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: #ffffff;
  }

  .danger-zone button {
    border: 1px solid #7f1d1d;
    background: rgba(127, 29, 29, 0.28);
    color: #fca5a5;
  }

  footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 6px;
  }

  button {
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 800;
    padding: 9px 14px;
  }

  .secondary {
    border: 1px solid #252a32;
    background: #111317;
    color: #d4d4d8;
  }

  .primary {
    background: #ffffff;
    color: #050608;
  }
</style>
