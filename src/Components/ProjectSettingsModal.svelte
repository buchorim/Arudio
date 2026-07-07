<!-- / - Arinara Network © 2026 - / -->
<!-- This source code is the exclusive property of Arinara Network. -->
<!-- Unauthorized use, reproduction, distribution, or modification of this -->
<!-- code — in whole or in part — for any purpose whatsoever is strictly -->
<!-- prohibited without prior written consent from Arinara Network as the -->
<!-- sole legal owner of this codebase. -->
<script lang="ts">
  import type {GridResolution, ProjectRecord, SampleRate, TimeSignature} from '../Types';

  export let project: ProjectRecord;
  export let onSave: (project: ProjectRecord) => void;
  export let onCancel: () => void;

  let name = project.name;
  let bpm = project.bpm;
  let timeSignature: TimeSignature = project.timeSignature;
  let key = project.key;
  let sampleRate: SampleRate = project.settings.sampleRate;
  let gridResolution: GridResolution = project.settings.gridResolution;
  let exportNamePattern = project.settings.exportNamePattern;
  let errorMessage = '';

  const keys = ['C Major', 'G Major', 'D Major', 'A Minor', 'E Minor', 'F Major', 'Bb Major'];

  function submitForm() {
    const cleanName = name.trim();
    if (!cleanName) {
      errorMessage = 'Project name is required.';
      return;
    }

    if (bpm < 20 || bpm > 300) {
      errorMessage = 'BPM must be between 20 and 300.';
      return;
    }

    onSave({
      ...project,
      name: cleanName,
      bpm,
      timeSignature,
      key,
      settings: {
        ...project.settings,
        sampleRate,
        gridResolution,
        exportNamePattern: exportNamePattern.trim() || '{project}-{date}',
      },
    });
  }
</script>

<div class="modal-backdrop" role="presentation">
  <div class="modal-panel wide" role="dialog" aria-modal="true" aria-labelledby="project-settings-title">
    <header>
      <span>Project Settings</span>
      <h2 id="project-settings-title">{project.name}</h2>
    </header>

    <form on:submit|preventDefault={submitForm}>
      <label>
        <span>Name</span>
        <input bind:value={name} maxlength="80" autocomplete="off" />
      </label>

      <div class="field-grid">
        <label>
          <span>BPM</span>
          <input bind:value={bpm} type="number" min="20" max="300" step="1" />
        </label>

        <label>
          <span>Time</span>
          <select bind:value={timeSignature}>
            <option value="4/4">4/4</option>
            <option value="3/4">3/4</option>
            <option value="6/8">6/8</option>
          </select>
        </label>
      </div>

      <div class="field-grid">
        <label>
          <span>Key</span>
          <select bind:value={key}>
            {#each keys as keyName}
              <option value={keyName}>{keyName}</option>
            {/each}
          </select>
        </label>

        <label>
          <span>Sample Rate</span>
          <select bind:value={sampleRate}>
            <option value={44100}>44.1 kHz</option>
            <option value={48000}>48 kHz</option>
          </select>
        </label>
      </div>

      <div class="field-grid">
        <label>
          <span>Grid</span>
          <select bind:value={gridResolution}>
            <option value="1/4">1/4</option>
            <option value="1/8">1/8</option>
            <option value="1/16">1/16</option>
            <option value="1/32">1/32</option>
          </select>
        </label>

        <label>
          <span>Export Name</span>
          <input bind:value={exportNamePattern} autocomplete="off" />
        </label>
      </div>

      {#if errorMessage}
        <p class="error-text">{errorMessage}</p>
      {/if}

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
    width: min(520px, calc(100vw - 32px));
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
  label span {
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

  input,
  select {
    width: 100%;
    border: 1px solid #252a32;
    border-radius: 8px;
    background: #121418;
    color: #ffffff;
    padding: 10px 11px;
    font-size: 13px;
  }

  .field-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .error-text {
    margin: 0;
    color: #f87171;
    font-size: 12px;
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
