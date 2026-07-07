# Phase 8 — Api Support

## Goal
Add a controlled local/project API layer so Arudio can be extended, automated, and integrated without exposing unstable internal state. This matters because future plugin and external workflow support should build on a deliberate contract instead of reaching directly into Svelte component state.

## Scope
- Define stable project, clip, track, effect, automation, transport, export, and settings APIs.
- Add internal service boundaries for commands that are currently component-driven.
- Add validation for API-driven edits matching normal UI behavior.
- Keep browser-first storage and audio rules intact.

## Features in This Phase

### Internal Command API
Arudio exposes a typed internal command layer for actions such as import, save, split, delete, move, keyframe edit, effect parameter edit, playback, stop, loop, and export-menu open. UI controls call this command layer instead of duplicating behavior.

Commands must return explicit success or failure results. A failed command should explain the reason in a user-facing or developer-facing form without silently swallowing errors.

### Project State API
Project reads and writes use a stable API surface that validates project records, normalizes legacy data, prevents invalid clips/layers/effects, and keeps undo/redo compatibility open for future work.

### Audio Engine API
Preview playback, live-safe parameter mutation, offline render, cache generation state, and export preparation expose typed methods that can later be called by plugins without bypassing safety checks.

### Automation API
The automation API allows registered parameters to add, select, move, delete, copy, paste, and evaluate keyframes through the same model used by the UI. It must not create a second keyframe system.

### Export API Boundary
The export API prepares render settings, validates format support, starts render jobs, reports progress/readiness, and returns downloadable encoded output. The advanced export menu consumes this API before plugin work begins.

## UI Mockup
This phase is mostly architectural. User-facing changes are limited to more consistent command errors and any small status surfaces needed to expose API-backed export or automation states.

```txt
+-------------------+       +---------------------+
| UI Controls       | ----> | Arudio Command API  |
+-------------------+       +---------------------+
                              | Project API
                              | Audio Engine API
                              | Automation API
                              | Export API
```

## Behavior & Logic Notes
The API is local to the app unless a later release explicitly exposes remote or public endpoints. It must not imply cloud accounts, shared projects, or network services. Commands should be deterministic, testable, and usable by the future plugin system.

## Dependencies
- Phase 4 full effect-parameter automation expansion completed.
- Phase 7 active quality-gate issues for current editor behavior are either completed or recorded.

## Acceptance Criteria
- Core editor commands are available through a typed internal API layer.
- UI command behavior and API command behavior match for covered actions.
- API-driven project edits pass the same validation as UI edits.
- Automation API uses the existing compound keyframe model.
- Export API can open and drive the future advanced export workflow.
- No plugin implementation starts in this phase.
