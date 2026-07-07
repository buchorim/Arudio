# Phase 1 — Ui Stack Migration

## Goal
Migrate the existing DAW-style prototype from the inefficient scaffold stack to a lighter browser app stack while preserving the current UI closely enough for owner visual approval.

## Scope
- Replace the React AI Studio scaffold with a Svelte + Vite TypeScript app.
- Preserve the existing left sidebar, center timeline, right inspector, bottom toolbar, bottom transport, dark palette, spacing, and typography.
- Add a local project foundation with project creation, project opening, save, duplicate, delete, app settings, and project settings.
- Keep the timeline honest when no audio exists: no generated tones, no fake waveform clips, no fake spectrum, and no fake export success.
- Remove unused AI Studio, Gemini, Express, Motion, and Tailwind dependencies from the active app stack.

## Features in This Phase

### Migrated Editor Shell
The editor opens directly to the DAW interface with no landing page. It keeps the same primary regions: left project library, timeline header and ruler, multitrack timeline area, floating editing toolbar, right clip/effects/project inspector, signal status panel, and bottom transport/status bar. Empty states remain compact and editor-focused.

### Local Project Foundation
Users can create named projects with BPM, time signature, and key. Projects are stored locally in the browser, can be opened from the left library, saved, duplicated, deleted after confirmation, and configured through project settings. App settings control local editor preferences such as density and reduced motion. Resetting local data requires confirmation and clears only browser-local project state.

### Timeline Interaction Replica
The timeline supports moving the playhead after a project exists. If the project has no tracks or clips, it shows a clean no-audio state instead of fake clips. Future real clips must preserve stable selected borders, resize handles, clip labels, and the vertical playhead line during interaction.

### Inspector Replica
The inspector supports Edit, Effects, and Inspector tabs. The selected clip drives the visible clip name, start/end/length fields, gain, pan, pitch, speed, and reverse toggle. If no clip is selected, the empty state remains compact. The project inspector displays real project settings and counts only.

### Honest Transport And Signal State
Transport controls remain visible for UI parity, but playback is disabled until a real audio source exists. The bottom status bar shows project timing, sample rate, grid, BPM, meter, key, local project state, and whether the project currently has audio. The signal panel must not animate or show frequency data without a real audio analysis source.

## UI Mockup
Desktop layout:

```txt
+------------------+--------------------------------------+--------------------+
| Brand / Projects | Project Bar / Transport / BPM        | Edit Effects Insp. |
| New Project      | Timeline Ruler                       | Clip Controls      |
| Project Library  |                                      | Gain Pan Pitch     |
| Saved Projects   | Empty or real track lanes            | Project Metadata   |
| Local Status     | Empty or real track lanes            | Signal State       |
+------------------+--------------------------------------+--------------------+
| Time / Transport / Master Volume / Session Status                            |
+----------------------------------------------------------------------------+
```

Mobile layout is not optimized in this phase because the current prototype is a desktop editor surface. Narrow viewports may scroll horizontally or compress panels, but text and controls must not overlap incoherently.

Empty state: the timeline shows that a project has no tracks or clips. The right inspector shows a compact no-selection state when timeline selection is cleared.

Loading state: no loading screen is required for Phase 1 because all project state is local.

Main interactions: create a project, open a project, save a project, duplicate/delete a project, adjust project settings, switch inspector tabs, adjust master volume, and click timeline/ruler to move playhead.

## Behavior & Logic Notes
The migrated app should use typed local state and browser APIs only. Local storage failures must be surfaced without crashing the editor. UI state changes should update the visible editor immediately. Any future audio work must add real file-backed import, decoding, playback, analysis, and rendering instead of layering fake production behavior on top.

## Dependencies
- Existing prototype files inspected.
- Svelte + Vite TypeScript app setup.
- Lucide icon package compatible with Svelte.

## Acceptance Criteria
- The app launches locally with the migrated Svelte stack.
- The first viewport visually matches the existing prototype layout and density.
- Users can create, open, save, duplicate, delete, and configure local projects.
- Empty projects show no fake audio, no fake waveform clips, no fake spectrum, and no fake export.
- The app builds successfully with `npm run build`.
- `npm run lint` reports no errors or warnings.
- React, React DOM, Tailwind, Gemini, Express, and Motion are not required by the active app.
- `/Plan/Progress.md` records Phase 1 status and completed tasks.
