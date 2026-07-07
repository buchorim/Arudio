<!-- / - Arinara Network © 2026 - / -->
<!-- This source code is the exclusive property of Arinara Network. -->
<!-- Unauthorized use, reproduction, distribution, or modification of this -->
<!-- code — in whole or in part — for any purpose whatsoever is strictly -->
<!-- prohibited without prior written consent from Arinara Network as the -->
<!-- sole legal owner of this codebase. -->
<script lang="ts">
  import {BookOpen, Sparkles, X} from '@lucide/svelte';
  import type {ReleaseNote, ReleaseNotesView} from '../ReleaseNotes';

  export let releaseNotes: ReleaseNote[] = [];
  export let view: ReleaseNotesView = 'latest';
  export let onClose: () => void = () => undefined;
  export let onChangeView: (view: ReleaseNotesView) => void = () => undefined;

  type ReleaseNoteSectionKey = 'whatsNew' | 'changed' | 'fixed' | 'notes';

  const releaseSections: Array<{key: ReleaseNoteSectionKey; label: string}> = [
    {key: 'whatsNew', label: "What's New"},
    {key: 'changed', label: 'Changed'},
    {key: 'fixed', label: 'Fixed'},
    {key: 'notes', label: 'Notes'},
  ];

  $: latestRelease = releaseNotes[0] ?? null;
  $: visibleReleases = view === 'latest' && latestRelease ? [latestRelease] : releaseNotes;

  function formatReleaseDate(value: string) {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
  }
</script>

<div class="release-backdrop" role="presentation">
  <button class="release-dismiss" type="button" aria-label="Close release notes" on:click={onClose}></button>
  <dialog
    class="release-panel"
    class:changelog={view === 'changelog'}
    open
    aria-modal="true"
    aria-labelledby="release-notes-title"
  >
    <header>
      <div>
        <span>{view === 'latest' ? 'Latest Update' : 'Release History'}</span>
        <h2 id="release-notes-title">{view === 'latest' ? "What's New" : 'Changelog'}</h2>
      </div>
      <button type="button" title="Close release notes" aria-label="Close release notes" on:click={onClose}>
        <X class="icon-xs" />
      </button>
    </header>

    {#if latestRelease}
      <div class="release-hero">
        <div class="release-hero-main">
          <span class="version-chip">Arudio {latestRelease.version}</span>
          <h3>{latestRelease.title}</h3>
          <p>{latestRelease.summary}</p>
        </div>
        <div class="release-actions">
          <button type="button" class:active={view === 'latest'} on:click={() => onChangeView('latest')}>
            <Sparkles class="icon-xs" />
            Latest
          </button>
          <button type="button" class:active={view === 'changelog'} on:click={() => onChangeView('changelog')}>
            <BookOpen class="icon-xs" />
            Changelog
          </button>
        </div>
      </div>
    {/if}

    <div class="release-scroll">
      {#if visibleReleases.length > 0}
        {#each visibleReleases as release (release.version)}
          <article class="release-entry">
            <div class="entry-heading">
              <div>
                <strong>Arudio {release.version}</strong>
                <span>{release.title}</span>
              </div>
              <time datetime={release.releasedAt}>{formatReleaseDate(release.releasedAt)}</time>
            </div>

            {#each releaseSections as section (section.key)}
              {@const items = release[section.key]}
              {#if Array.isArray(items) && items.length > 0}
                <section class="note-section">
                  <h4>{section.label}</h4>
                  <ul>
                    {#each items as item}
                      <li>{item}</li>
                    {/each}
                  </ul>
                </section>
              {/if}
            {/each}
          </article>
        {/each}
      {:else}
        <div class="release-empty">
          <strong>No release notes yet</strong>
          <span>Public changelog entries will appear here when a release is prepared.</span>
        </div>
      {/if}
    </div>

    <footer>
      <button type="button" class="primary" on:click={onClose}>Close</button>
    </footer>
  </dialog>
</div>

<style>
  .release-backdrop {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.64);
    backdrop-filter: blur(12px);
    padding: 20px;
  }

  .release-dismiss {
    position: absolute;
    inset: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    cursor: default;
  }

  .release-panel {
    position: relative;
    z-index: 1;
    display: grid;
    width: min(680px, calc(100vw - 32px));
    max-height: min(760px, calc(100vh - 32px));
    grid-template-rows: auto auto minmax(0, 1fr) auto;
    overflow: hidden;
    border: 1px solid #2a2f39;
    border-radius: 10px;
    background: #0b0d10;
    box-shadow: 0 30px 100px rgba(0, 0, 0, 0.62);
    color: #f4f4f5;
    margin: 0;
    padding: 0;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #1e2229;
    padding: 14px 16px;
  }

  header span,
  .note-section h4 {
    color: #7f8795;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h2,
  h3,
  h4,
  p {
    margin: 0;
    letter-spacing: 0;
  }

  h2 {
    margin-top: 3px;
    font-size: 20px;
  }

  header button,
  .release-actions button,
  footer button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 7px;
    cursor: pointer;
    font-weight: 850;
  }

  header button {
    width: 30px;
    height: 30px;
    border: 1px solid transparent;
    background: transparent;
    color: #a1a1aa;
  }

  header button:hover {
    border-color: #2d333d;
    background: #151922;
    color: #ffffff;
  }

  .release-hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 16px;
    align-items: center;
    border-bottom: 1px solid #1b1f26;
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.08), transparent 42%),
      linear-gradient(90deg, rgba(31, 41, 55, 0.85), rgba(10, 12, 16, 0.96));
    padding: 16px;
  }

  .release-hero-main {
    min-width: 0;
  }

  .version-chip {
    display: inline-flex;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    color: #e5e7eb;
    font-size: 10px;
    font-weight: 900;
    padding: 4px 8px;
  }

  h3 {
    margin-top: 10px;
    font-size: 19px;
  }

  .release-hero p {
    max-width: 56ch;
    margin-top: 7px;
    color: #9ca3af;
    font-size: 12px;
    font-weight: 650;
    line-height: 1.5;
  }

  .release-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .release-actions button {
    gap: 7px;
    border: 1px solid #2b303a;
    background: #101319;
    color: #cdd3dc;
    font-size: 11px;
    padding: 8px 10px;
  }

  .release-actions button.active {
    border-color: #f4f4f5;
    background: #f4f4f5;
    color: #07080b;
  }

  .release-scroll {
    overflow-y: auto;
    padding: 12px;
  }

  .release-entry {
    border: 1px solid #20252d;
    border-radius: 8px;
    background: #101318;
    padding: 13px;
  }

  .release-entry + .release-entry {
    margin-top: 10px;
  }

  .entry-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid #20252d;
    padding-bottom: 10px;
  }

  .entry-heading div {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 3px;
  }

  .entry-heading strong {
    font-size: 12px;
  }

  .entry-heading span,
  .entry-heading time {
    color: #8c94a3;
    font-size: 10px;
    font-weight: 800;
  }

  .note-section {
    margin-top: 12px;
  }

  .note-section ul {
    display: grid;
    gap: 7px;
    margin: 7px 0 0;
    padding: 0;
    list-style: none;
  }

  .note-section li {
    position: relative;
    color: #d4d4d8;
    font-size: 12px;
    font-weight: 650;
    line-height: 1.45;
    padding-left: 14px;
  }

  .note-section li::before {
    position: absolute;
    top: 8px;
    left: 0;
    width: 5px;
    height: 5px;
    border-radius: 999px;
    background: #f4f4f5;
    content: '';
  }

  .release-empty {
    display: flex;
    min-height: 180px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    border: 1px dashed #2a303a;
    border-radius: 8px;
    color: #7f8795;
    font-size: 12px;
  }

  .release-empty strong {
    color: #f4f4f5;
    font-size: 13px;
  }

  footer {
    display: flex;
    justify-content: flex-end;
    border-top: 1px solid #1e2229;
    padding: 12px 16px;
  }

  footer button {
    border: 0;
    background: #ffffff;
    color: #06070a;
    font-size: 12px;
    padding: 9px 16px;
  }

  @media (max-width: 620px) {
    .release-hero {
      grid-template-columns: 1fr;
    }

    .release-actions {
      flex-direction: row;
    }
  }
</style>
