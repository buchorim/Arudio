# Rules — Arudio

Last Updated: 2026-07-05

---

## Engineering Rules

### R-001 — UI Parity Before Audio Depth
The current DAW-style prototype UI is the visual contract for Phase 1. Stack migration work must preserve the same primary layout, dark palette, panel proportions, timeline density, transport controls, inspector placement, track list, toolbar, meters, and waveform presentation before adding deeper audio features. Violations include redesigning the shell, replacing dense editor controls with a landing page, or adding real audio features while the migrated UI visibly diverges from the prototype.

### R-002 — Browser-First Audio Architecture
Audio editing features must be designed for browser execution first using Web Audio API, AudioWorklet, OfflineAudioContext, and WebAssembly only when needed for heavier DSP. Deploy-specific values must stay in configuration. Violations include depending on a native-only audio backend for the core browser experience, hardcoding export settings that should be project settings, or hiding audio processing errors.

### R-003 — Keep Demo Behavior Honest
Prototype audio, waveform, and export behavior must be visibly treated as demo behavior until real file-backed editing is implemented. No shipped feature may claim professional export, mastering, or destructive editing unless it processes real imported audio and validates the result. Violations include fake export success messages for production builds, silently using generated tones as imported audio, or naming unfinished behavior as final.

### R-007 — Serious Development Standard
Arudio must be developed as a real premium software tool, not a rushed prototype. Each implemented feature must be complete enough to use, validated, and documented in the matching phase file before being treated as done. Violations include half-wired UI controls, fake success states, unvalidated workflows, unfinished settings panels, or shipping visible rough edges that could be resolved in the same implementation pass.

### R-008 — Timeline Time Is Stable
Timeline automation, keyframes, markers, and graph points must be stored in timeline time by default, not derived output duration. Speed, pitch, and time-stretch edits may change source-audio mapping or clip render length, but they must not silently move timeline-locked keyframes. Violations include keyframes drifting when a speed value changes, cubic-bezier graph points being stretched without explicit user action, or playback/export evaluating automation from a different time model than the UI.

### R-011 — Honest Source Coverage And Playback Cache
Clip waveforms must represent decoded source audio coverage only. If a clip is extended beyond available source audio, the extra region must render as a distinct source-overage or ghost area, not as repeated or stretched waveform unless an explicit loop, stretch, or freeze feature is enabled and backed by real playback/export behavior. Playback caches must expose their generation state honestly: an active old cache may keep playing while a new parameter state is pending, but the UI must show old/new cache status and must release obsolete cache data when playback stops. Violations include drawing fake waveform in overage regions, hiding stale playback cache state, or making the playhead snap back because the engine clock ignores a user seek.

### R-012 — 1.0 Detail Closure Standard
Arudio must not reach 1.0 with known rough edges that make the product feel rushed, half-wired, misleading, or careless. Every owner-reported UI, UX, playback, timeline, cache, keyframe, toolbar, shortcut, import/export, and release-detail issue must be either fixed in the relevant implementation pass or recorded in `Plan/Progress.md` with an owning phase before work moves on. Violations include dismissing small visual defects as "minor", leaving duplicate controls that confuse the workflow, keeping toolbar buttons that do not do anything, shipping misleading error messages, accepting clipped labels or bad spacing, or calling a feature complete when it has not been validated in the real editor.

---

## Design Rules

### R-004 — Dense Editor UI
Arudio uses a dense, professional editor interface. Controls should be compact, scannable, icon-led where appropriate, and optimized for repeated editing work. Violations include oversized marketing sections, decorative cards around core editor surfaces, large hero copy, or visible labels that advertise implementation quality instead of helping the user act.

### R-005 — Timeline Stability
Timeline, toolbar, transport, meter, and inspector elements must have stable dimensions so hover states, selected clips, labels, and dynamic values do not shift the editor layout. Violations include controls resizing when active, waveform clips changing lane height on selection, or time labels overlapping adjacent controls.

### R-009 — No Parameter Scroll Walls
Professional effects with many controls must not be exposed as long raw parameter lists inside the right sidebar. The right sidebar is a compact cockpit for selected-object summaries, macro controls, pinned parameters, meters, and focused actions. Full effect editing must use an effect rack detail drawer, focused workspace panel, command palette action, or parameter search. Violations include requiring users to scroll through unrelated inspector sections to change compressor threshold, EQ frequency, reverb mix, limiter ceiling, or automation settings.

### R-010 — Progressive Complexity UI
Arudio must reveal complexity progressively. Default surfaces show the controls needed for common work, while advanced controls remain reachable through Simple/Advanced effect views, search, shortcuts, rack expansion, and workspace modes. Macro controls must map to real parameters and cannot be fake UI. Violations include showing every advanced DSP parameter at once by default, hiding important professional controls with no discoverable path, or adding a simple knob that does not affect real playback/export behavior.

---

## Release Rules

### R-006 — Local Validation Before Handoff
Every UI or audio-engine change must run the relevant local validation command before completion. For Phase 1, this means `npm run build` at minimum and a local dev server for visual review. Violations include claiming completion without a successful build or leaving the app unable to launch locally.
