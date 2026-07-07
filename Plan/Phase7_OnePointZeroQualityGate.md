# Phase 7 — One Point Zero Quality Gate

## Goal
Bring Arudio from a promising editor into a serious 1.0 software tool by closing rough edges, validating real workflows, and refusing half-wired features. This phase exists so every small owner-reported detail has an accountable place before Arudio is considered ready for 1.0.

## Scope
- Maintain a detail backlog for every owner-reported UI, UX, timeline, playback, cache, keyframe, toolbar, shortcut, import/export, release, and polish issue.
- Convert rushed or partial features into complete, validated workflows.
- Audit all visible controls so they either work, show a clear disabled reason, or are removed until ready.
- Validate imported-audio editing, playback, automation, effect, export, save/reload, and release-note flows as end-to-end user journeys.
- Prepare 1.0 Beta only after the quality gate is satisfied; Stable remains owner-confirmed after real use.

## Features in This Phase

### Detail Backlog Discipline
Every small detail reported by the owner must be captured in `Plan/Progress.md` with an owning phase, status, and concrete expected behavior. A detail can be fixed immediately, moved into the correct phase, or explicitly marked blocked with a reason. It cannot be forgotten in chat history or treated as too small to track.

Examples of details that must be tracked include clipped text, duplicate transport controls, toolbar buttons that do not perform actions, misleading playback errors, slow zoom response, cache colors that are unclear, timeline labels outside bounds, confusing keyframe behavior, and sidebar density problems.

### Current Owner-Reported Detail Backlog Snapshot
This snapshot records the current detail work that must not be forgotten while Arudio moves toward 1.0. Individual items may still belong technically to Phase 2, 3, 4, 5, or 6, but Phase 7 owns the promise that they are not lost.

| ID | Detail | Owning Phase | Expected 1.0 Behavior | Status |
|---|---|---:|---|---|
| D-001 | Left and right sidebars need minimize/collapse behavior. | 6 | Sidebars can collapse to compact rails without losing selection, project state, inspector tab, or timeline alignment. | Completed |
| D-002 | Top header has duplicate/confusing play control. | 6 | Header transport is compact and unambiguous; duplicate play affordances are removed or made intentionally consistent. | Completed |
| D-003 | Space can show "Import audio before playback" even when audio exists. | 2 | Playback readiness reads real project clips, source metadata, and source blob availability; errors name the true missing condition. | Completed |
| D-004 | Timeline time label/playhead badge can appear at awkward edge positions. | 6 | Time labels clamp inside the viewport and labels beyond playable duration are hidden or dimmed. | Completed |
| D-005 | Timeline zoom feels delayed or visually uncertain. | 6 | Zoom updates ruler, grid, clips, playhead, keyframes, marks, and selected framing coherently and promptly. | Completed |
| D-006 | Pitch-driven visual stretch/compression is not convincing yet. | 3/4/6 | Pitch density mode responds to real pitch state without drifting clips, ruler, playhead, keyframes, or source-overage regions. | Pending |
| D-007 | Ruler click should create subtle red timeline marks. | 6 | Users can mark timeline frames/ranges from the ruler, and marks are visible, selectable, movable, deletable, and non-destructive. | Completed |
| D-008 | Cache old/new information needs clearer progress/readiness display. | 2/6 | Active old and pending new cache states have distinct colors plus compact frame/duration/progress information. | Completed |
| D-009 | Bottom toolbar buttons do not all feel wired. | 6 | Every toolbar action performs a real action, enters a functional mode, or shows a disabled reason. | Completed |
| D-010 | Loop playback needs selected-clip and whole-project modes. | 2/6 | Loop toggle loops the selected clip if eligible and otherwise loops the project until stopped. | Completed |
| D-011 | Timeline labels should not continue as active labels past project/timeline duration. | 6 | Ruler labels past playable duration are hidden, dimmed, or clearly outside active project time. | Completed |
| D-012 | Unified keyframe UX must stay simple and not split into confusing per-parameter visible markers. | 4 | One centered compound diamond represents the clip keyframe time; changing supported parameters writes to that same time. | Completed |
| D-013 | Parameter-heavy panels must not become long scroll walls. | 6 | Advanced controls move to rack detail drawers, focused panels, search, and pinned macros instead of raw sidebar lists. | Completed |
| D-014 | Every new feature needs validation evidence before it is treated as complete. | 7 | Completed details record validation such as lint/build, browser testing, export checks, or screenshot review where relevant. | In Progress |
| D-015 | Top header actions can collide with the expanded right inspector at normal desktop widths. | 6/7 | Header controls compress or hide secondary labels before they overlap inspector tabs, collapse rails, export, or save controls. | Completed |
| D-016 | Owner feels limited by the current small parameter set and expects many more parameters. | 3/6 | Arudio starts a real engine-backed parameter expansion path toward 100+ controls through racks, focused drawers, search, presets, and automation-safe parameter metadata, not a raw sidebar dump. | In Progress |
| D-017 | Clicking a keyframe then using the bottom Delete tool should delete the keyframe, not the whole clip. | 4/6 | The toolbar Delete action prioritizes the selected compound keyframe before clip deletion and is browser-validated. | Completed |
| D-018 | Playback should react to safe parameter changes in real time without forcing stop/play. | 2/3/6 | Live-safe effect parameters update active Web Audio nodes while playback continues; structural edits still queue a pending cache/restart path. | Completed |
| D-019 | Developer launch flow should be one-click and not leave an unnecessary terminal open. | 6/7 | A Windows launcher detects an already-running local Arudio server, opens the browser to it, or installs/starts the dev server in the background, waits for readiness, opens the browser, then exits the launcher terminal. | Completed |
| D-020 | Effect editing still depends too much on the right inspector instead of a fast bottom rack. | 6 | A compact bottom effect rack appears for the selected track, shows only implemented engine-backed devices, lets users bypass and adjust key macros, and writes to the same playback/export effect state as the inspector. | Completed |
| D-021 | Command palette should expose implemented effect actions without becoming a fake future-feature menu. | 6/7 | Command palette can enable real engine-backed selected-track effects for Graphic EQ, Compressor, Limiter, Cave Reverb, and Delay/Echo, with clear disabled reasons when no clip/track is selected and no unsupported effects advertised as working. | Completed |
| D-022 | The next parameter expansion should add useful EQ/filter controls without fake slope or analyzer UI. | 3/6/7 | Add a real selected-track Filter device with high-pass, low-pass, and notch parameters routed through preview, export, rack, inspector, and command palette, while leaving unsupported slope/analyzer controls documented but hidden. | Completed |
| D-023 | Visible effect order and audio-engine effect order must not drift apart. | 6/7 | The fixed chain order shown in rack/inspector/commands matches the Web Audio and OfflineAudioContext processing order for every implemented effect, including newly added Filter. | Completed |
| D-024 | Footer should not keep visible disabled controls that only say future/pending. | 6/7 | Footer removes unfinished next-segment and alternate view buttons until those workflows have real behavior; remaining footer controls are current, useful, and validated. | Completed |
| D-025 | Bottom toolbar should not keep everyday buttons for unfinished tools. | 6/7 | Toolbar shows only current production tools: Select, Split, Move, and Delete. Cut, Fade, Volume, Slip, and Snap stay planned until each has real timeline behavior and validation. | Completed |
| D-026 | App Settings "Shortcut hints" must affect a real UI surface. | 6/7 | The setting hides or shows command-palette shortcut chips, persists through reload, and leaves actual keyboard shortcuts working. | Completed |
| D-027 | App Settings "Density" and "Reduced motion" must affect real editor behavior. | 6/7 | Density changes visible editor chrome spacing/hit targets, reduced motion disables nonessential transitions/animations, and both settings persist after reload. | Completed |
| D-028 | Red timeline marker guides should be sharper and easy to delete. | 6/7 | Timeline marks render as crisp red guide lines without blur, and selected marks delete through header trash, keyboard Delete/Backspace, command palette Delete Selection, or bottom Delete before clips are removed. | Completed |
| D-029 | Playhead time badge can drift away from the vertical playhead line. | 6/7 | Header badge, triangle, ruler ticks, click mapping, timeline grid, and vertical playhead line share the same inset active timeline coordinate system. | Completed |
| D-030 | D-016 parameter expansion needs another real color/distortion device. | 3/6/7 | Add Saturation with Drive, Tone, Mix, and Output controls routed through preview, export, rack, inspector accordion, command palette, and validation. | Completed |
| D-031 | Phase 5 release experience exists only as a plan and needs a usable in-app surface before 1.0. | 5/7 | Add bundled release notes plus What's New and Changelog views reachable from settings and command palette, with last-seen state persisted; generated public release banner assets remain required before 1.0 Beta handoff. | Completed |
| D-032 | DJ-style beat marking needs fast toggle behavior and playback-hit feedback. | 6/7 | Add exact-frame beat markers that can be added rapidly from the header or double-click upper ruler during playback without deleting nearby beats, keep normal ruler clicks as playhead seek only, persist in project state, render as red guides, do not drag-move, and accent the playhead badge/line when playback crosses a beat. | Completed |
| D-033 | Timeline zoom/renggang-rapat feels better when controlled directly on the ruler/workspace with the mouse. | 6/7 | Add thresholded Ctrl + mouse wheel zoom over the ruler and main timeline, anchored around the cursor time, without moving project timing, dirtying state, or feeling too sensitive. | Completed |
| D-034 | Playhead time badge can clip or drift away from the long playhead line at the timeline start after marker/zoom controls are visible. | 6/7 | Keep the badge readable inside the viewport at 0:00 and the right edge while the badge pointer/triangle and vertical playhead line remain exactly aligned to the timeline time at every zoom level. | Completed |
| D-035 | Beat/marker guides can look split apart across lanes at certain zoom levels. | 6/7 | Render marker guides as one continuous full-height timeline guide plus a matching ruler pin using the same time coordinate, and keep panned clip widths based on clip duration rather than viewport-start-relative position math, so the `30s @ 0:14` zoom level does not make markers or clips look disconnected. | Completed |
| D-036 | D-016 needs another real dynamics device instead of more disconnected parameter sliders. | 3/6/7 | Add Noise Gate/Expander with threshold, reduction, attack, release, hold, and mix routed through preview playback, OfflineAudioContext export, the bottom rack, Effects accordion, command palette, save/reload state, and browser validation proving quiet material is reduced while loud material remains. | Completed |
| D-037 | At `0:00`, the playhead time badge can still appear detached from the long vertical playhead line because the start-edge clamp applies across an early percentage zone. | 6/7 | Remove percentage-based early badge offset, give the active timeline enough shared inset for the badge to remain centered at the visible start, and validate that `0:00` alignment stays exact across multiple zoom durations. | Completed |
| D-038 | D-016 still lacks a real modulation device for rhythmic movement and DJ-style shaping. | 3/6/7 | Add Tremolo/Auto-Pan with rate, depth, pan, and mix routed through preview playback, OfflineAudioContext export, bottom rack, Effects accordion, command palette, save/reload state, and browser validation proving exported amplitude modulation. | Completed |
| D-039 | Deleted or missing media can leave timeline audio layer labels showing the old file name, and the layer-name label itself is not an explicit reorder handle. | 6/7 | Timeline clip/track labels switch to a clear missing-media state when source metadata or local source blobs are unavailable, and pressing/holding the layer name label reorders the audio layer vertically above or below other layers without moving audio in timeline time. | Completed |
| D-040 | Footer transport lost the right-side maximum/jump control, leaving Play visually and functionally unbalanced. | 6/7 | Restore a real right-side Jump to End transport control beside Play, wired to the project-duration seek path and browser-validated, without reintroducing mock next-segment or alternate-view buttons. | Completed |
| D-041 | Bottom effect rack tiles become cramped as new devices are added, and the settings icon does not open the detailed effect controls visibly. | 6/7 | Make the bottom rack a wider horizontally scrollable device strip, convert each settings icon into a real focus button that opens the right Effects tab, expands that specific effect, auto-scrolls it into view, never auto-enables it, and validate the behavior in the browser. | Completed |
| D-042 | Deleting audio can leave an empty imported layer behind with the old file name and lane volume/pan controls, and multi-file import needs locked validation. | 2/6/7 | Deleting the last clip on an imported audio layer removes the empty layer, stale label, lane controls, unused source metadata, and unused source blob; stored projects are normalized so legacy orphan tracks/sources disappear on load/save, lower layers move up, and new imports stack onto real layers; multi-file import creates multiple real clips/layers from one picker action and is browser-validated. | Completed |
| D-043 | At normal 100% browser zoom the full editor still feels too large and uncomfortable compared with a 75% zoomed-out view. | 6/7 | Add an internal compact scale pass or app-level UI scale setting that makes the editor materially smaller while preserving readable labels, stable timeline alignment, accessible hit targets, and no overlap across the header, sidebars, timeline, rack, toolbar, and footer. | Completed |
| D-044 | Timeline background grid and the white playhead line can stop partway down when many layers make the timeline content taller than the viewport. | 6/7 | Make grid lines, marker guides, and the playhead line span the full scrollable timeline content height so they continue through long/many-layer sessions instead of ending at the visible viewport boundary. | Completed |
| D-045 | Timeline panning has arrow and wheel controls, but there is no direct visual left-right slider when the project is wider than the visible timeline window. | 6/7 | Add a slim conditional horizontal viewport slider to the ruler that appears only when project duration exceeds visible timeline duration, moves `timelineViewportStart` without changing clip/mark/keyframe/project timing, stays aligned with ruler labels and clips, and is browser-validated. | Completed |
| D-046 | D-016 needs another real modulation device so the parameter set keeps growing toward a serious 1.0 tool instead of stopping at tremolo. | 3/6/7 | Add Chorus with rate, depth, delay, feedback, and mix routed through preview playback, OfflineAudioContext export, bottom rack, Effects accordion, command palette, save/reload state, live-safe updates, and browser validation proving exported audio changes. | Completed |
| D-047 | D-016 modulation still needs a sharper sweep effect beyond Chorus and Tremolo. | 3/6/7 | Add Flanger with rate, depth, delay, feedback, and mix routed through preview playback, OfflineAudioContext export, bottom rack, Effects accordion, command palette, save/reload state, live-safe updates, and browser validation proving exported comb-filter modulation. | Completed |
| D-048 | Split audio can leave adjacent clip pieces visually cramped or overlapping on the same lane, and same-lane audio overlap makes the timeline hard to read. | 3/6/7 | Update Split so the right-side split result is moved to a newly inserted adjacent audio layer by default, preserving source offsets, clip timing, automation, track settings, selection, playback/export behavior, and browser validation that the two split pieces render on separate lanes without timeline drift. | Completed |
| D-049 | D-016 modulation still lacks Phaser, which the owner explicitly included in the professional effects direction. | 3/6/7 | Add Phaser with rate, depth, center frequency, feedback, and mix routed through preview playback, OfflineAudioContext export, bottom rack, Effects accordion, command palette, save/reload state, live-safe updates, and browser validation proving exported all-pass sweep coloration. | Completed |
| D-050 | D-016 still lacks Ring Modulator, which the owner listed as a professional modulation-based effect. | 3/6/7 | Add Ring Modulator with carrier frequency, depth, mix, and output routed through preview playback, OfflineAudioContext export, bottom rack, Effects accordion, command palette, save/reload state, live-safe updates, and browser validation proving exported carrier modulation. | Completed |
| D-051 | D-016 still needs another real color/distortion device for lo-fi sound design instead of only clean modulation devices. | 3/6/7 | Add Bitcrusher with bits, sample-rate reduction, mix, and output routed through preview playback, OfflineAudioContext export, bottom rack, Effects accordion, command palette, save/reload state, live-safe updates, and browser validation proving exported quantization/sample-hold coloration. | Completed |
| D-052 | D-016 still lacks the explicit Hard Clipping/Overdrive effect from the owner's professional effects list. | 3/6/7 | Add Overdrive/Hard Clip with drive, clip threshold, tone, mix, and output routed through preview playback, OfflineAudioContext export, bottom rack, Effects accordion, command palette, save/reload state, live-safe updates, and browser validation proving exported aggressive clipping coloration. | Completed |
| D-053 | Audio clips can still be edited into overlapping positions on the same layer, and split behavior needs a harder guarantee that split results use separate readable layers. | 3/6/7 | Add a lane collision guard for split, move, resize, and legacy project repair so overlapping same-lane audio clips are promoted to newly inserted adjacent layers while preserving timing, source offsets, automation, playback/export behavior, and browser validation. | Completed |
| D-054 | Clicking a beat marker while trying to move the playhead can delete the marker, and beat-hit feedback can be too brief to reliably see during playback. | 6/7 | Make marker clicks and timeline marker-guide clicks seek/select without deleting, keep marker deletion on explicit delete/toggle actions, and keep the playhead badge/line visibly red when the playhead is on or crosses a beat. | Completed |
| D-055 | D-016 still lacks Vibrato, which the owner listed as a modulation-based pitch movement effect. | 3/6/7 | Add Vibrato with rate, depth, delay, mix, and output routed through preview playback, OfflineAudioContext export, bottom rack, Effects accordion, command palette, save/reload state, live-safe updates, and browser validation proving exported pitch/time modulation. | Completed |
| D-056 | Loop playback can fall back to timeline `0:00` when the playhead is already at the end of an audio layer/clip. | 2/6/7 | When loop is enabled and playback starts on a selected or under-playhead clip's end edge, playback restarts from that clip/source start; only empty timeline space falls back to whole-project loop. | Completed |
| D-057 | Export currently renders immediately, but the owner wants a real export settings menu with formats before plugin work. | 3/6/9 | Header Export opens an export menu before rendering; users choose format, sample rate, bit depth/channel/range/filename/loudness-related settings, with WAV validated first and MP3 exposed only after real encoded output exists. | Completed |
| D-058 | The full effect-keyframe phase needs a first real parameter slice without creating a second keyframe system. | 4/6/7 | Add Cave Reverb Amount automation using the existing compound diamond: selected-keyframe edits write track-owned `track.reverb.amount`, the diamond stays on the clip/layer, delete/move/easing affect the effect keyframe too, and playback/export evaluate the automated value. | Completed |
| D-059 | The owner wants all implemented effects to support the same compound keyframe workflow, not only Cave Reverb Amount. | 4/6/7 | Register every current numeric parameter on implemented engine-backed effects for the existing one-diamond keyframe system, make sliders/rack macros write active keyframes, and evaluate those lanes in preview playback and export. | Completed |
| D-060 | The owner wants a compact keyframe add/edit surface in the empty area beside the bottom toolbar. | 4/6/7 | Add a bottom quick keyframe editor with Add, Previous, Next, Delete, active time, parameter count, and easing controls, all wired to the existing compound keyframe handlers. | Completed |
| D-061 | The bottom quick keyframe editor is too small and sits awkwardly near the toolbar center instead of using the right-side space beside the inspector Signal area. | 4/6/7 | Make the bottom toolbar band use responsive flex layout: editing tools remain stable, the keyframe editor sits on the far right, grows with available width/height, wraps cleanly when narrow, and keeps controls readable without fixed tiny sizing. | Completed |
| D-062 | The latest in-app update notes do not yet announce the Export Settings workflow that replaced fixed WAV export. | 5/7/9 | Update release notes so What's New describes the export settings panel, visible audio output choices, filename control, range options, and the honest MP3-lock behavior. | Completed |
| D-063 | The owner wants a Blender-like right-click popup beside the cursor for fast timeline actions. | 3/4/6/7 | Add a compact cursor-position context menu with real quick actions: add/delete keyframe, add/delete beat/marker, split/cut middle, trim/cut front, trim/cut back, delete clip, export settings, and disabled reasons when context is missing. It must not be a decorative menu and must close predictably on outside click/Escape/action. | Completed |
| D-064 | Fatal errors currently rely on browser/dev overlays or crashes instead of an Arudio-owned popup. | 2/6/7 | Add a global fatal error surface that captures `error` and `unhandledrejection` events, displays the raw/verbatim error message and stack where available, stays above broken UI, and provides copy/dismiss controls without hiding the original error. | Completed |
| D-065 | Effect parameters can still feel fixed/global when the playhead is on a compound keyframe but the keyframe is not selected internally. | 4/6/7 | Supported effect sliders and rack macros write to the existing compound keyframe when a selected keyframe is active, when the playhead is on a compound diamond, or when that effect parameter already has automation and the playhead is inside the selected clip; otherwise they edit the base effect value. Browser validation must prove a non-reverb effect parameter becomes a track automation lane instead of only changing the whole track. | Completed |
| D-066 | The owner wants Arudio published to a new public GitHub repository with a polished README, permissive attribution license, detailed feature docs, known problems, Windows installer script, and contribution path. | 5/7 | Add public-facing repository documentation before upload: README with get started, benefits, use cases, pros/cons, feature overview, docs links, known problems, credit, and "Made with love"; detailed docs for available features and known problems; a custom permissive attribution license that allows commercial use, modification, and distribution with credit; Windows install scripts that check Node/npm, install dependencies, optionally build, and can launch after install. Initialize/push the repository without committing ignored build outputs, logs, test artifacts, node_modules, or secrets. | In Progress |

When any item is implemented, `Plan/Progress.md` must be updated with the completed task and any validation evidence. If a new owner interruption identifies a small issue, it gets a new `D-###` entry or an existing entry is expanded before implementation continues.

### No Half-Wired Feature Gate
Before 1.0, every visible feature must pass one of three states:
- Complete and validated in the editor.
- Clearly disabled with a useful reason.
- Removed or hidden until its real implementation exists.

Controls must not pretend to work. A feature is not complete because it has a button, a mock panel, or a saved value. It is complete only when project state, UI state, playback/export behavior where relevant, persistence, error handling, and validation all agree.

### Professional UX Polish Pass
Arudio needs a final dense-editor polish pass before 1.0. This pass checks spacing, clipping, scaling, collapsed panels, timeline ruler labels, playhead badges, selected clip outlines, waveform overage indicators, cache display, keyframe diamonds, transport controls, bottom toolbar behavior, settings surfaces, and empty states.

The editor must feel compact without feeling cramped. Text cannot be cut off in normal desktop widths. Important controls cannot require long scrolling through unrelated parameters. Visual indicators must communicate state without cluttering the timeline.

### End-To-End Audio Workflow Validation
The 1.0 gate validates real imported audio, not demo data. Required journeys include:
- Create or open a project.
- Import one or more audio files.
- Move, trim, split, extend, reverse, fade, gain, pan, pitch, and speed clips where implemented.
- Add and edit clip keyframes.
- Enable real effects that are implemented.
- Play, seek, loop, stop, and restart playback.
- Save and reload the project.
- Export WAV and confirm the output audibly reflects the edited project.

Any workflow that fails must be fixed or moved out of the 1.0 surface.

### Timeline And Transport Audit
The timeline must behave like a serious editor. Ruler labels, playhead badge, grid lines, clips, keyframes, marks, zoom, overage regions, loop ranges, and cache overlays must stay aligned. Timeline zoom must be real and responsive. The user must be able to seek during playback without the playhead fighting them. Loop playback must be predictable for selected-clip loops and full-project loops.

The top header, center transport, and bottom player must not duplicate confusing controls. If a control appears in more than one place, each copy must have a clear reason and identical behavior.

### Automation And Keyframe Audit
The 1.0 automation surface must be understandable without opening a graph. The default visible model is one compound diamond per clip keyframe time. Selecting the diamond and changing a registered parameter writes that parameter to that same time. Keyframes must move with their clips when the clip is moved, stay timeline-locked when parameter values change, and remain stable after save/reload.

Graph editing, cubic bezier handles, copy/paste, broad parameter support, and speed/time-warp automation must only be exposed when the UI and engine are ready enough to avoid misleading users.

### Playback Cache And Error Honesty Audit
Playback cache state must be visible and honest. Users need to understand when they are hearing an active old generation and when a pending new generation will become audible. Cache indicators must show old/new state clearly without becoming a debug wall.

Errors must name the real problem. If audio exists but a source blob is missing, Arudio must not say "Import audio before playback". If export fails, it must say why. If a command cannot run, it must show the missing condition.

### Release Readiness Checklist
1.0 Beta cannot be prepared until the planned 1.0 scope is documented, all visible 1.0 controls are complete or removed, validation passes, and user-facing changelog notes exist. The release must follow Arinara release rules: Beta first, Stable only after owner confirmation, no "Stable" word in release title, and user-facing changelog entries only.

## UI Mockup
The quality gate is not a new marketing screen. It is a project discipline and may later appear as an internal release checklist:

```txt
+----------------------- Arudio 1.0 Gate ------------------------+
| Detail Backlog        | Open: 12 | Fixed: 41 | Blocked: 1      |
| Visible Controls      | Working | Disabled With Reason | Hidden |
| Timeline Audit        | Ruler | Zoom | Marks | Loop | Cache     |
| Audio Workflow        | Import | Edit | Automate | Play | Export |
| Release Readiness     | Banner | What's New | Changelog | Beta   |
+----------------------------------------------------------------+
```

Desktop editor UI remains the main surface. Any internal checklist must stay out of the normal editing workflow unless it helps release preparation.

## Behavior & Logic Notes
Phase 7 is a gate over earlier phases, not a replacement for them. Bugs still belong to their technical phase, but Phase 7 owns the final decision that the product feels serious enough for 1.0.

No item can be counted as complete without evidence. Evidence may include code inspection, passing validation commands, browser/manual testing notes, exported audio verification, screenshot review, save/reload confirmation, or owner confirmation where visual taste is involved.

The goal is not speed. The goal is a polished, reliable, honest editor that can survive detailed use. If the owner interrupts with small fixes, those fixes are part of the process and must be handled with care instead of treated as distractions.

## Dependencies
- Phase 2 browser audio engine features must be reliable enough for real imported audio playback.
- Phase 3 editing/export features must be non-destructive and exportable where claimed.
- Phase 4 automation features must be stable and understandable.
- Phase 5 release experience must exist for 1.0 Beta notes.
- Phase 6 professional workflow UX must be compact, scalable, and validated.

## Acceptance Criteria
- Every owner-reported detail is fixed, explicitly pending with an owning phase, or blocked with a concrete reason.
- No visible control is left disconnected, fake, or misleading.
- All implemented editor controls have stable dimensions and avoid clipped text at supported desktop widths.
- Timeline ruler labels, playhead badge, grid, clips, source-overage indicators, marks, keyframes, cache overlays, and loop regions stay aligned.
- Playback readiness uses real project/audio-source state and reports accurate errors.
- Loop playback works for selected clips and whole projects when enabled.
- Active old cache and pending new cache states are visually distinct and understandable.
- Imported audio workflows can be completed from project creation through export.
- Save and reload preserve clips, automation, settings, effects, marks, and relevant playback UI state where expected.
- WAV export audibly reflects the current supported project state.
- Unsupported professional features are not exposed as working features.
- Changelog, What's New, and release banner entries exist for any public 1.0 Beta user-facing changes.
- `npm run lint` and `npm run build` pass before any 1.0 Beta handoff.
- A 1.0 Beta is not declared ready until the quality gate evidence proves completion.
