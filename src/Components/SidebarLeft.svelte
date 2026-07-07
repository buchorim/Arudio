<!-- / - Arinara Network © 2026 - / -->
<!-- This source code is the exclusive property of Arinara Network. -->
<!-- Unauthorized use, reproduction, distribution, or modification of this -->
<!-- code — in whole or in part — for any purpose whatsoever is strictly -->
<!-- prohibited without prior written consent from Arinara Network as the -->
<!-- sole legal owner of this codebase. -->
<script lang="ts">
  import {ChevronLeft, ChevronRight, Copy, FolderClosed, Plus, Trash2} from '@lucide/svelte';
  import type {ProjectRecord} from '../Types';

  export let projects: ProjectRecord[];
  export let activeProjectId: string | null;
  export let isCollapsed = false;
  export let onNewProject: () => void;
  export let onOpenProject: (id: string) => void;
  export let onDuplicateProject: (id: string) => void;
  export let onDeleteProject: (project: ProjectRecord) => void;
  export let onToggleCollapsed: () => void;

  function formatUpdatedAt(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Unknown';
    }

    return date.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function projectCountLabel(project: ProjectRecord) {
    const trackLabel = project.tracks.length === 1 ? 'track' : 'tracks';
    const clipLabel = project.clips.length === 1 ? 'clip' : 'clips';
    return `${project.tracks.length} ${trackLabel} · ${project.clips.length} ${clipLabel}`;
  }
</script>

<aside id="sidebar-left" class:collapsed={isCollapsed} class="sidebar-left">
  <div class="brand-bar">
    <div class="brand-text" title="Arudio">{isCollapsed ? 'A' : 'Arudio'}</div>
    <button
      type="button"
      class="icon-button"
      aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      on:click={onToggleCollapsed}
    >
      {#if isCollapsed}
        <ChevronRight class="icon-sm" />
      {:else}
        <ChevronLeft class="icon-sm" />
      {/if}
    </button>
  </div>

  <div class="primary-action">
    <button type="button" class="new-project-button" on:click={onNewProject}>
      <Plus class="icon-sm" strokeWidth={3} />
      {#if !isCollapsed}
        <span>New Project</span>
      {/if}
    </button>
  </div>

  {#if !isCollapsed}
    <div class="library-header">
      <span class="panel-label">Projects</span>
      <span class="project-count">{projects.length}</span>
    </div>
  {/if}

  <div class="project-list" aria-label="Local projects">
    {#if projects.length === 0}
      <div class="empty-library">
        <FolderClosed class="empty-icon" />
        <strong>No projects yet</strong>
        <span>The local project library is empty.</span>
      </div>
    {:else}
      {#each projects as project (project.id)}
        {@const isActive = activeProjectId === project.id}
        <div
          class:active={isActive}
          class="project-row"
          role="button"
          tabindex="0"
          title={project.name}
          on:click={() => onOpenProject(project.id)}
          on:keydown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onOpenProject(project.id);
            }
          }}
        >
          <span class="project-glyph">
            <FolderClosed class="icon-sm" />
          </span>
          {#if !isCollapsed}
            <span class="project-copy">
              <strong>{project.name}</strong>
              <em>{projectCountLabel(project)}</em>
              <small>Updated {formatUpdatedAt(project.updatedAt)}</small>
            </span>
            <span class="project-actions">
              <button
                type="button"
                class="icon-button tight"
                title="Duplicate project"
                aria-label={`Duplicate ${project.name}`}
                on:click|stopPropagation={() => onDuplicateProject(project.id)}
              >
                <Copy class="icon-xs" />
              </button>
              <button
                type="button"
                class="icon-button tight danger"
                title="Delete project"
                aria-label={`Delete ${project.name}`}
                on:click|stopPropagation={() => onDeleteProject(project)}
              >
                <Trash2 class="icon-xs" />
              </button>
            </span>
          {/if}
        </div>
      {/each}
    {/if}
  </div>

  <div class="local-footer">
    {#if isCollapsed}
      <strong title="Local projects">{projects.length}</strong>
    {:else}
      <span>Local Library</span>
      <strong>{projects.length === 1 ? '1 project' : `${projects.length} projects`}</strong>
    {/if}
  </div>
</aside>

<style>
  .sidebar-left {
    display: flex;
    width: 260px;
    height: 100%;
    flex-direction: column;
    flex-shrink: 0;
    user-select: none;
    border-right: 1px solid #1d2025;
    background: #0a0b0d;
    color: #ffffff;
    transition: width 160ms ease;
  }

  .sidebar-left.collapsed {
    width: 58px;
  }

  .brand-bar {
    display: flex;
    height: 64px;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #1d2025;
    padding: 0 24px;
  }

  .sidebar-left.collapsed .brand-bar {
    justify-content: center;
    gap: 6px;
    padding: 0 8px;
  }

  .brand-text {
    color: #ffffff;
    font-size: 24px;
    font-weight: 800;
    letter-spacing: 0;
    line-height: 1;
    transform: translateY(4px);
  }

  .sidebar-left.collapsed .brand-text {
    font-size: 20px;
    transform: translateY(1px);
  }

  .icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    background: transparent;
    color: #a1a1aa;
    cursor: pointer;
    padding: 4px;
    transition: background-color 140ms ease, color 140ms ease;
  }

  .icon-button:hover {
    background: #1a1d22;
    color: #ffffff;
  }

  .icon-button.tight {
    padding: 5px;
  }

  .icon-button.danger:hover {
    background: rgba(127, 29, 29, 0.35);
    color: #f87171;
  }

  .primary-action {
    padding: 16px;
  }

  .sidebar-left.collapsed .primary-action {
    padding: 12px 8px;
  }

  .new-project-button {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 8px;
    background: #ffffff;
    color: #000000;
    cursor: pointer;
    padding: 10px 16px;
    font-size: 14px;
    font-weight: 700;
    box-shadow: 0 1px 2px rgba(255, 255, 255, 0.16);
    transition: background-color 140ms ease, transform 140ms ease;
  }

  .sidebar-left.collapsed .new-project-button {
    width: 42px;
    height: 42px;
    padding: 0;
  }

  .new-project-button:hover {
    background: #f4f4f5;
  }

  .new-project-button:active {
    transform: scale(0.98);
  }

  .library-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid #1d2025;
    border-bottom: 1px solid #1d2025;
    padding: 12px 16px;
  }

  .project-count {
    display: inline-flex;
    min-width: 24px;
    height: 20px;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: #171a1f;
    color: #a1a1aa;
    font-size: 11px;
    font-weight: 800;
  }

  .project-list {
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
    padding: 12px;
  }

  .sidebar-left.collapsed .project-list {
    align-items: center;
    padding: 8px;
  }

  .empty-library {
    display: flex;
    min-height: 220px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 1px dashed #252a33;
    border-radius: 8px;
    color: #71717a;
    padding: 18px;
    text-align: center;
  }

  .sidebar-left.collapsed .empty-library {
    min-height: 42px;
    width: 42px;
    border-radius: 8px;
    padding: 6px;
  }

  .sidebar-left.collapsed .empty-library strong,
  .sidebar-left.collapsed .empty-library span {
    display: none;
  }

  .empty-library :global(.empty-icon) {
    width: 28px;
    height: 28px;
    margin-bottom: 10px;
  }

  .empty-library strong {
    color: #d4d4d8;
    font-size: 12px;
    font-weight: 800;
  }

  .empty-library span {
    max-width: 172px;
    margin-top: 6px;
    font-size: 11px;
    line-height: 1.45;
  }

  .project-row {
    display: grid;
    width: 100%;
    grid-template-columns: 32px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    border: 1px solid #1e2127;
    border-radius: 8px;
    background: #111317;
    color: #ffffff;
    cursor: pointer;
    padding: 10px;
    text-align: left;
    transition: background-color 140ms ease, border-color 140ms ease;
  }

  .sidebar-left.collapsed .project-row {
    width: 42px;
    grid-template-columns: 32px;
    justify-content: center;
    padding: 5px;
  }

  .project-row:hover,
  .project-row.active {
    border-color: #303744;
    background: #16191f;
  }

  .project-row.active .project-glyph {
    background: #ffffff;
    color: #0a0b0d;
  }

  .project-glyph {
    display: flex;
    width: 32px;
    height: 32px;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: #20242b;
    color: #d4d4d8;
  }

  .project-copy {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 3px;
  }

  .project-copy strong,
  .project-copy em,
  .project-copy small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .project-copy strong {
    color: #f4f4f5;
    font-size: 12px;
    font-weight: 800;
  }

  .project-copy em {
    color: #a1a1aa;
    font-size: 10px;
    font-style: normal;
    font-weight: 700;
  }

  .project-copy small {
    color: #71717a;
    font-size: 10px;
    font-weight: 600;
  }

  .project-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    opacity: 0;
    transition: opacity 140ms ease;
  }

  .project-row:hover .project-actions,
  .project-row:focus-visible .project-actions {
    opacity: 1;
  }

  .local-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid #1d2025;
    background: #08090b;
    color: #71717a;
    padding: 14px 16px;
  }

  .sidebar-left.collapsed .local-footer {
    justify-content: center;
    padding: 12px 8px;
  }

  .local-footer span {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .local-footer strong {
    color: #d4d4d8;
    font-size: 12px;
    font-weight: 800;
  }
</style>
