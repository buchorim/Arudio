# Progress — Arudio
Last Updated: 2026-07-07

## Current Phase
Phase 7 — OnePointZeroQualityGate [In Progress]

## Phase Overview

| Phase | Name | Status |
|---|---|---|
| 1 | UiStackMigration | Completed |
| 2 | BrowserAudioEngine | In Progress |
| 3 | EditingAndExport | In Progress |
| 4 | AutomationCurves | In Progress |
| 5 | ReleaseExperience | In Progress |
| 6 | ProfessionalWorkflowUx | In Progress |
| 7 | OnePointZeroQualityGate | In Progress |
| 8 | ApiSupport | Pending |
| 9 | AdvancedExportWorkflow | Completed |
| 10 | PluginSystem | Pending |

## Completed Tasks
- [x] Inspected existing React prototype UI structure — Phase 1
- [x] Documented project rules and phase plan — Phase 1
- [x] Migrated active app stack from React/Tailwind scaffold to Svelte + Vite — Phase 1
- [x] Ported DAW editor shell, timeline, inspector, toolbar, transport, and meters — Phase 1
- [x] Restored demo timeline interactions and browser audio preview engine — Phase 1
- [x] Ran Svelte validation and production build successfully — Phase 1
- [x] Started local dev server at http://localhost:3000/ — Phase 1
- [x] Adjusted top-left Arudio logo alignment after visual review — Phase 1
- [x] Added serious development standard and stable speed-keyframe policy — Phase 4
- [x] Added pitch-driven timeline density behavior to editing and automation plans — Phase 3/4
- [x] Added professional workflow UX plan for compact UI, effect rack, workspaces, shortcuts, and progressive parameter control — Phase 6
- [x] Added source-overage, honest waveform coverage, playback cache generation, and movable playhead requirements — Phase 2/3/6
- [x] Implemented Project Foundation 0.2.0 Beta with local projects, settings, save, and no fake audio shell — Phase 1
- [x] Removed generated audio preview engine, fake spectrum UI, cloud/account status, and fake export surface — Phase 1
- [x] Added release banner, What's New, settings, and changelog page plan — Phase 5
- [x] Added audio source metadata and IndexedDB-backed local source blob storage — Phase 2
- [x] Added file-backed audio import, decoded waveform peak generation, and per-file track/clip creation — Phase 2
- [x] Added Web Audio preview playback with clip gain, clip pan, fades, track mute/solo/volume/pan, and master volume — Phase 2
- [x] Added OfflineAudioContext render foundation for imported source clips — Phase 2
- [x] Ran Svelte validation and production build successfully for 0.3.0 Beta — Phase 2
- [x] Added WAV export from the real OfflineAudioContext render path — Phase 3
- [x] Added Cave Reverb track effect with amount and size controls — Phase 3
- [x] Routed Cave Reverb through both preview playback and offline render — Phase 3
- [x] Ran Svelte validation and production build successfully for 0.4.0 Beta — Phase 3
- [x] Added selected-clip split, delete, trim-start, and trim-end commands — Phase 3
- [x] Added fade-in and fade-out controls for selected clips — Phase 3
- [x] Routed reversed clips through the real playback and render engine — Phase 3
- [x] Ran Svelte validation and production build successfully for 0.5.0 Beta — Phase 3
- [x] Added clip gain keyframe-only controls with add, previous, next, and delete actions — Phase 4
- [x] Added compact clip gain automation graph in the inspector — Phase 4
- [x] Routed clip gain automation through real playback and WAV export — Phase 4
- [x] Preserved timeline-locked automation timing through split and trim range cleanup — Phase 4
- [x] Ran Svelte validation and production build successfully for 0.6.0 Beta — Phase 4
- [x] Added keyframe easing presets, active keyframe editing, and eased gain curve scheduling — Phase 4
- [x] Fixed waveform rendering so source-overage regions never display fake decoded waveform — Phase 2/3
- [x] Added active-old and pending-new playback cache generation indicators — Phase 2/6
- [x] Allowed playhead seeking during active playback while preserving the active playback generation until stop/restart — Phase 2/6
- [x] Ran Svelte validation and production build successfully for 0.7.0 Beta — Phase 2/4/6
- [x] Simplified clip gain keyframes into selectable movable layer keyframes with active-parameter editing — Phase 4
- [x] Ran Svelte validation and production build successfully for layer-based keyframe editing — Phase 4
- [x] Added initial command palette for implemented editor actions with context-aware disabled reasons — Phase 6
- [x] Added keyboard shortcuts for playback, save, split, trim, delete, and gain keyframe actions — Phase 6
- [x] Ran Svelte validation and production build successfully for command palette and shortcut foundation — Phase 6
- [x] Fixed normal automated gain editing so parameter changes create or update keyframes at the playhead instead of changing whole-clip gain — Phase 4
- [x] Ran Svelte validation and production build successfully for automated gain keyframe edit behavior — Phase 4
- [x] Added pitch/speed scope clarification so non-automated controls are visibly clip-wide while only gain keyframes are implemented — Phase 4
- [x] Fixed clip-owned gain keyframes so dragging a clip/layer moves its keyframes with the audio clip — Phase 4
- [x] Added initial timeline zoom controls for 30s/60s/120s/240s viewport duration alignment — Phase 6
- [x] Ran Svelte validation and production build successfully for keyframe movement and initial timeline zoom — Phase 4/6
- [x] Fixed left timeline resize so start, source offset, duration, fades, and automation update atomically — Phase 3
- [x] Added left-side source-overage metadata, orange visual indicator, and silent playback/export handling — Phase 3
- [x] Ran Svelte validation and production build successfully for left resize and left source-overage behavior — Phase 3

- [x] Added linked pitch keyframes with compact inspector controls, clip-layer pitch markers, and audible playback/export scheduling - Phase 4
- [x] Ran Svelte validation and production build successfully for linked pitch automation and source-overage follow-up - Phase 4

- [x] Added central automation parameter registry for playback/export-backed clip Gain and linked Pitch controls — Phase 4
- [x] Replaced separate visible parameter keyframes with one centered compound clip keyframe marker for registered parameters — Phase 4
- [x] Ran Svelte validation and production build successfully for unified compound clip keyframes — Phase 4

- [x] Added 1.0 detail closure rule and One Point Zero Quality Gate plan — Phase 7
- [x] Added owner-reported 1.0 detail backlog snapshot with trackable D-001 through D-014 items — Phase 7
- [x] Restored corrupted `src/App.svelte` after the Vite Svelte parse error and validated the editor shell renders again — Phase 7
- [x] Restarted the local Vite dev server at http://localhost:3000/ with clean startup logs — Phase 7
- [x] Ran browser smoke test on localhost and confirmed Arudio renders with no captured console errors — Phase 7
- [x] Documented the 1.0 timeline polish implementation slice covering collapse rails, compact transport, loop, marks, label bounds, toolbar honesty, and playback readiness messaging — Phase 6/7
- [x] Added persisted timeline mark records with project-state normalization and duplicate-project support — Phase 6
- [x] Added left and right sidebar collapse rails and validated collapse/expand behavior in the browser — Phase 6/7
- [x] Removed the duplicate large play button from the top header and kept the footer player as the primary play control — Phase 6/7
- [x] Added compact loop control and playback engine end-time bounds for selected-clip or whole-project loop ranges — Phase 2/6
- [x] Added subtle red ruler/timeline marks with create, select, drag-move, delete, save-state support, and browser validation — Phase 6/7
- [x] Clamped playhead badge edge behavior and dimmed or hid ruler labels beyond playable project duration — Phase 6/7
- [x] Wired bottom toolbar actions to real commands, functional modes, or explicit unavailable reasons instead of silent mock behavior — Phase 6/7
- [x] Improved playback cache labels with active-old/new generation colors plus frame and duration readouts — Phase 2/6
- [x] Disabled footer view/next-segment controls with explicit pending reasons instead of leaving them as inert buttons — Phase 6/7
- [x] Ran Svelte validation, production build, browser render smoke test, sidebar collapse test, and timeline mark create/move/delete tests for the 1.0 polish slice — Phase 7
- [x] Documented explicit source-blob playback readiness states and loop playback validation requirements — Phase 2
- [x] Added async IndexedDB source-blob availability checks for active projects so playback/export readiness can distinguish no project, no clips, missing source metadata, checking local files, missing local blobs, and ready audio — Phase 2/7
- [x] Marked newly imported source blobs available immediately after successful local blob save, and reset source readiness state when local data is cleared — Phase 2
- [x] Routed footer play and header export titles through the playback readiness reason instead of hard-coded generic import messages — Phase 2/6
- [x] Validated no-project/no-clip readiness titles in the browser and re-ran Svelte validation plus production build for source-blob readiness changes — Phase 2/7
- [x] Attempted synthetic imported-audio browser validation; current browser automation surface exposes no `File`, `Blob`, `DataTransfer`, or `setInputFiles`, so native file-picker validation remains pending — Phase 2/7
- [x] Added Playwright-based imported-audio validation harness on an isolated test server port with generated WAV fixture upload through the real file input — Phase 2/7
- [x] Fixed IndexedDB source blob readiness so imported audio enables Play immediately and remains playable after reload without getting stuck in a permanent checking state — Phase 2
- [x] Validated imported WAV readiness, source blob persistence after reload, loop toggle, playback start, active cache display, stop behavior, and cleanup with `npm run test:audio-readiness` — Phase 2/6/7
- [x] Re-ran `npm run lint`, `npm run build`, and `npm run test:audio-readiness` successfully after adding the imported-audio validation harness — Phase 7
- [x] Documented storage-loss and selected-clip loop validation requirements in the browser audio engine plan — Phase 2/7
- [x] Fixed playback readiness reactivity so missing IndexedDB source blobs update footer/export state after the async source check completes — Phase 2
- [x] Fixed stale shortcut and command-palette state by making command, toolbar, and timeline-duration reactive dependencies explicit — Phase 6/7
- [x] Preserved the active loop range during playback seek so selected-clip loop seeking keeps the active cache generation instead of restarting playback — Phase 2/6
- [x] Expanded `npm run test:audio-readiness` to validate missing local source blob downgrade, specific Space-key error messaging, and multi-clip selected-clip loop seek/cache behavior — Phase 2/6/7
- [x] Re-ran `npm run lint`, `npm run build`, and `npm run test:audio-readiness` successfully after the storage-loss and loop-seek readiness fixes — Phase 7
- [x] Documented real downloaded-WAV export validation requirements in the browser audio engine and editing/export plans — Phase 2/3/7
- [x] Expanded `npm run test:audio-readiness` to capture the Export WAV browser download and parse RIFF/WAVE header, sample rate, channels, frame count, duration, and PCM peak from real imported audio — Phase 2/3/7
- [x] Validated OfflineAudioContext WAV export from imported source clips with `npm run test:audio-readiness`, plus `npm run lint` and `npm run build` — Phase 2/3/7
- [x] Documented source-overage browser validation requirements for left/right ghost visuals and exported silence/audible PCM regions — Phase 3/7
- [x] Expanded `npm run test:audio-readiness` to validate left and right source-overage indicators after reload and prove exported WAV silence before/after the real source region — Phase 2/3/7
- [x] Re-ran `npm run lint`, `npm run test:audio-readiness`, and `npm run build` successfully after source-overage validation coverage — Phase 7
- [x] Documented active playback cache validation requirements for editing while playing, pending new cache display, non-loop seeking, and stop-time cache release — Phase 2/7
- [x] Added accessible labels to compact clip audio sliders so Gain, Pan, Pitch, Speed, Fade In, and Fade Out controls can be tested and operated more reliably — Phase 6
- [x] Expanded `npm run test:audio-readiness` to validate that changing Gain during active imported-audio playback shows Old cache/New cache, preserves the active generation during non-loop seeking, and clears cache state on stop — Phase 2/6/7
- [x] Re-ran `npm run lint`, `npm run test:audio-readiness`, and `npm run build` successfully after active cache/seek validation coverage — Phase 7
- [x] Documented timeline viewport pan/scroll and zoom-around-playhead behavior in the professional workflow UX plan — Phase 6/7
- [x] Added a real timeline viewport start shared by header ruler, track grid, clips, keyframes, marks, playhead line, and click/drag coordinate conversion — Phase 6
- [x] Added visual timeline pan controls on the ruler plus wheel/shift-wheel horizontal pan support without dirtying project state — Phase 6
- [x] Moved pan controls out of the header action row after browser validation revealed the wider header could cover Export WAV at normal desktop width — Phase 6/7
- [x] Expanded `npm run test:audio-readiness` to validate panned ruler click mapping, hidden/offscreen clips, viewport readout, and unchanged project timing — Phase 6/7
- [x] Re-ran `npm run lint`, `npm run test:audio-readiness`, and `npm run build` successfully after timeline pan/viewport work — Phase 7
- [x] Documented and fixed compact-width top header collision so save/export/actions stay inside the center pane when the right inspector is expanded — Phase 6/7
- [x] Re-ran `npm run lint`, `npm run build`, `npm run test:audio-readiness`, and browser layout measurement successfully after the header collision fix — Phase 7
- [x] Documented and validated D-012 compound keyframe behavior so one centered clip diamond carries registered Gain and linked Pitch edits at the same timeline time after save/reload — Phase 4/7
- [x] Fixed inspector compound-keyframe summary reactivity so active keyframe parameter counts update from the selected clip automation state instead of stale helper dependencies — Phase 4
- [x] Raised compound keyframe hit targets above resize handles so short selected clips keep their diamond clickable — Phase 4/6
- [x] Expanded `npm run test:audio-readiness` to cover the one-diamond Gain/Pitch compound keyframe save/reload workflow — Phase 4/7
- [x] Re-ran `npm run lint`, `npm run build`, targeted compound-keyframe Playwright validation, and the full 8-test audio readiness suite successfully — Phase 7
- [x] Documented and completed D-008 cache clarity with explicit Current, Audible now, Queued next, frame/duration, and Old releases on stop labels — Phase 2/6/7
- [x] Expanded cache browser validation so active and pending cache generations must show honest readiness labels while playback continues and clear on stop — Phase 2/7
- [x] Re-ran `npm run lint`, `npm run build`, targeted cache validation, and the full 8-test audio readiness suite successfully after cache clarity work — Phase 7
- [x] Added D-016 parameter expansion backlog item and engine-backed 100+ parameter roadmap so future controls grow through rack devices, focused drawers, search, presets, and validation — Phase 3/6/7

- [x] Implemented the first D-016 Graphic EQ track effect with 9 real preview/export-backed band gain parameters — Phase 3/6/7
- [x] Added browser export validation proving Graphic EQ changes the downloaded WAV output, then re-ran lint, build, targeted EQ validation, and the full 9-test audio readiness suite successfully — Phase 7

- [x] Implemented first-pass Compressor and Limiter track effects with real preview/export-backed dynamics parameters — Phase 3/6/7
- [x] Added browser export validation proving Compressor makeup raises exported output and Limiter ceiling reduces exported peak, then re-ran lint, build, targeted dynamics validation, and the full 10-test audio readiness suite successfully — Phase 7

- [x] Fixed D-017 so selecting a compound keyframe and pressing the bottom Delete tool removes the keyframe before clip deletion — Phase 4/6/7
- [x] Added browser validation for toolbar Delete on selected compound keyframes and re-ran lint, build, targeted validation, and the full 11-test audio readiness suite successfully — Phase 7

- [x] Implemented D-013 compact Effects accordion so only one parameter-heavy device expands at a time while other implemented effects stay visible as summaries — Phase 6/7
- [x] Added browser validation for the Effects accordion and re-ran lint, build, targeted validation, and the full 12-test audio readiness suite successfully — Phase 7

- [x] Implemented D-018 live-safe effect parameter mutation so enabled EQ, compressor, limiter, and reverb amount changes update active playback without forcing stop/play — Phase 2/3/6/7
- [x] Added browser validation proving a live EQ parameter change keeps the active playback cache Current without queuing Old/New cache, then re-ran lint, build, targeted validation, and the full 13-test audio readiness suite successfully — Phase 7

- [x] Documented the D-016 Delay/Echo parameter slice with engine-backed playback/export, compact accordion UI, and tail-audio validation requirements — Phase 3/6/7
- [x] Implemented the D-016 Delay/Echo track effect with real delay time, feedback, mix, and tone parameters routed through preview playback, export, and live-safe parameter mutation — Phase 3/6/7
- [x] Added browser export validation proving Delay/Echo creates measurable exported tail audio, then re-ran lint, build, targeted validation, and the full 14-test audio readiness suite successfully — Phase 7

- [x] Documented and implemented D-019 one-click Windows launcher with setup detection, hidden dev-server start, readiness wait, browser open, and launcher-terminal exit behavior — Phase 6/7
- [x] Validated the launcher dry-run against the active local server and fixed Windows localhost readiness by using the reliable loopback URL for health checks — Phase 7

- [x] Documented and implemented D-020 initial bottom effect rack for selected-track EQ, Compressor, Limiter, Reverb, and Delay/Echo macros backed by the same effect state as inspector/playback/export — Phase 6/7
- [x] Added browser validation proving a rack macro updates active UI state and saved project effect metadata, then re-ran lint, build, targeted validation, and the full 15-test audio readiness suite successfully — Phase 7

- [x] Documented and implemented D-021 command palette effect actions for real selected-track Graphic EQ, Compressor, Limiter, Cave Reverb, and Delay/Echo only - Phase 6/7
- [x] Added browser validation proving unsupported future effect commands are absent, selected-track Delay/Reverb commands enable real effect state without duplicates, then re-ran lint, build, targeted validation, and the full 16-test audio readiness suite successfully - Phase 7

- [x] Documented and implemented D-022 real Filter device with preview/export-backed high-pass, low-pass, notch, rack macro, inspector accordion, and command palette support - Phase 3/6/7
- [x] Added browser export validation proving Filter high-pass attenuates low-frequency audio, then re-ran lint, build, targeted Filter/accordion validation, and the full 17-test audio readiness suite successfully - Phase 7

- [x] Documented and fixed D-023 effect chain order parity so visible rack/inspector order matches Web Audio and OfflineAudioContext processing order - Phase 6/7
- [x] Added command palette validation for real Filter enablement and re-ran lint, build, targeted command validation, and the full 17-test audio readiness suite successfully - Phase 7

- [x] Documented and completed D-024 footer pending-control cleanup by removing unfinished next-segment and alternate view buttons from the everyday footer - Phase 6/7
- [x] Added browser validation proving footer pending controls stay hidden, then re-ran lint, build, targeted readiness validation, and the full 17-test audio readiness suite successfully - Phase 7

- [x] Documented and completed D-025 toolbar visible-tool cleanup so only Select, Split, Move, and Delete remain in the everyday bottom toolbar - Phase 6/7
- [x] Added browser validation proving unfinished Cut/Fade/Volume/Slip/Snap buttons stay hidden, then re-ran lint, build, targeted readiness validation, and the full 17-test audio readiness suite successfully - Phase 7

- [x] Documented and completed D-026 App Settings shortcut hints behavior so command palette shortcut chips hide/show from a real persisted preference - Phase 6/7
- [x] Added browser validation proving shortcut hints show by default, hide after saving the setting, persist hidden after reload, then re-ran lint, build, targeted validation, and the full 18-test audio readiness suite successfully - Phase 7
- [x] Documented and completed D-027 App Settings Density and Reduced motion behavior so density changes editor chrome spacing and reduced motion disables nonessential transitions after reload - Phase 6/7
- [x] Documented and completed D-028 sharp red timeline marker guides with selected-marker deletion through bottom Delete and keyboard Delete before clip deletion - Phase 6/7
- [x] Documented and completed D-029 playhead badge alignment so the header badge/triangle, ruler click mapping, grid, and vertical timeline line share the same active timeline inset - Phase 6/7
- [x] Re-ran `npm run lint`, `npm run build`, targeted D-027/D-028/D-029 browser validations, and the full 21-test audio readiness suite successfully - Phase 7
- [x] Documented and completed D-030 Saturation with real Drive, Tone, Mix, and Output controls routed through preview playback, OfflineAudioContext export, the bottom rack, Effects accordion, and command palette - Phase 3/6/7
- [x] Added browser export validation proving Saturation waveshapes downloaded WAV output, then re-ran lint, build, targeted Saturation/rack/accordion validation, and the full 22-test audio readiness suite successfully - Phase 7
- [x] Documented and completed D-031 initial in-app release notes with bundled What's New and Changelog views, App Settings access, command palette access, 0.8.0 Beta version metadata, and persisted last-seen state - Phase 5/7
- [x] Added browser validation proving release notes open from settings and command palette and persist the latest seen version, then re-ran lint, build, targeted release validation, and the full 23-test audio readiness suite successfully - Phase 7
- [x] Documented and completed D-032 frame-locked DJ beat markers with exact-frame add/remove behavior, no drag-move, double-click ruler creation, header tap creation, close-beat coexistence, and playback-hit red playhead feedback - Phase 6/7
- [x] Documented and completed D-033 direct Ctrl-wheel timeline zoom on the ruler and main timeline with cursor anchoring and reduced sensitivity - Phase 6/7
- [x] Documented and completed D-034 playhead time badge edge alignment so the 0:00 badge stays readable while the triangle/pointer remains locked to the long playhead line at every zoom level - Phase 6/7
- [x] Documented and completed D-035 zoomed marker guide alignment so `30s @ 0:14` renders continuous red marker guides and panned clip widths from duration math instead of viewport-start-relative position math - Phase 6/7
- [x] Re-ran `npm run lint`, `npm run build`, targeted timeline validations, and the full 25-test audio readiness suite successfully after beat marker, direct zoom, start-edge playhead, and marker-guide alignment work - Phase 7
- [x] Documented and completed D-036 Noise Gate/Expander with real threshold, reduction, attack, release, hold, and mix parameters routed through preview/export, the Effects accordion, bottom rack, command palette, and saved track effect state - Phase 3/6/7
- [x] Added browser export validation proving Noise Gate reduces quiet material while preserving loud audio, then re-ran lint, build, targeted Gate/rack/command/accordion tests, and the full 26-test audio readiness suite successfully - Phase 7
- [x] Documented and completed D-037 start-edge playhead badge alignment so `0:00` stays centered on the long vertical playhead line across zoom levels - Phase 6/7
- [x] Re-ran `npm run lint`, `npm run build`, targeted playhead alignment validation, and the full 26-test audio readiness suite successfully after the D-037 timeline inset fix - Phase 7
- [x] Documented and completed D-040 footer Jump to End restoration with a real right-side transport control wired to project-duration seeking - Phase 6/7
- [x] Re-ran `npm run lint`, `npm run build`, targeted imported-audio readiness validation, and the full 26-test audio readiness suite successfully after the D-040 footer transport fix - Phase 7
- [x] Documented and completed D-039 missing-media timeline labels plus vertical layer-name drag reorder without moving clip timeline timing - Phase 6/7
- [x] Re-ran `npm run lint`, `npm run build`, targeted missing-media/layer-reorder validation, and the full 27-test audio readiness suite successfully after the D-039 timeline layer fix - Phase 7
- [x] Documented and completed D-038 Tremolo/Auto-Pan with real rate, depth, pan, and mix parameters routed through preview playback, OfflineAudioContext export, bottom rack, Effects accordion, command palette, and saved track effect state - Phase 3/6/7
- [x] Documented and completed D-041 scrollable wider bottom effect rack tiles with settings buttons that open the matching right-side effect panel, auto-scroll it into view, and do not auto-enable the effect - Phase 6/7
- [x] Documented and completed D-042 empty audio-layer cleanup so deleting final clips removes stale layers/labels/controls/source metadata, stored legacy orphan layers compact on reload/save, lower layers move up, new imports stack onto real lanes, and multi-file import stays validated - Phase 2/6/7
- [x] Documented and completed D-044 full-height timeline guide rendering so grid lines, marker guides, and the white playhead line span tall imported layer stacks - Phase 6/7
- [x] Re-ran `npm run lint`, `npm run build`, targeted D-038/D-041/D-042/D-044 browser validations, and the full 31-test audio readiness suite successfully after the rack, modulation, deleted-layer, and tall-timeline fixes - Phase 7
- [x] Documented and completed D-045 conditional horizontal timeline viewport slider so wide timelines can be panned directly without moving clip timing, markers, keyframes, or project data - Phase 6/7
- [x] Re-ran `npm run lint`, `npm run build`, targeted timeline slider/ruler validations, and the full 31-test audio readiness suite successfully after the D-045 slider work - Phase 7
- [x] Documented and completed D-043 internal compact UI scale pass so Compact mode materially shrinks the editor shell, sidebars, header, ruler, track lanes, clips, rack, toolbar, and footer without timeline drift - Phase 6/7
- [x] Re-ran `npm run lint`, `npm run build`, targeted density/timeline validations, and the full 31-test audio readiness suite successfully after the D-043 scale pass - Phase 7
- [x] Documented and completed D-046 Chorus with real rate, depth, delay, feedback, and mix parameters routed through preview playback, OfflineAudioContext export, the bottom rack, Effects accordion, command palette, save/reload state, and live-safe active-playback updates - Phase 3/6/7
- [x] Added browser validation proving Chorus changes exported WAV output, keeps active playback cache Current during live-safe parameter changes, and stays integrated with the rack, command palette, and Effects accordion; re-ran lint, build, targeted validations, and the full 32-test audio readiness suite successfully - Phase 7
- [x] Documented and completed D-047 Flanger with real rate, depth, delay, feedback, and mix parameters routed through preview playback, OfflineAudioContext export, the bottom rack, Effects accordion, command palette, save/reload state, and live-safe active-playback updates - Phase 3/6/7
- [x] Added browser validation proving Flanger changes exported WAV output and remains integrated with live-safe cache updates, rack, command palette, and Effects accordion; re-ran lint, build, targeted validations, and the full 33-test audio readiness suite successfully - Phase 7
- [x] Documented and completed D-048 split-to-new-audio-layer behavior so the right-side split segment moves to a new adjacent layer below the source clip instead of visually overlapping on the same lane - Phase 3/6/7
- [x] Added browser validation proving split clips render on separate layers, persist with preserved timing/source offsets after Save, and export audible audio from both split segments; re-ran lint, build, targeted validation, and the full 34-test audio readiness suite successfully - Phase 7
- [x] Documented and completed D-049 Phaser with real rate, depth, center frequency, feedback, and mix controls routed through preview playback, OfflineAudioContext export, the bottom rack, Effects accordion, command palette, save/reload state, and live-safe active-playback updates - Phase 3/6/7
- [x] Added browser validation proving Phaser changes exported WAV output and remains integrated with live-safe cache updates, rack, command palette, and Effects accordion; re-ran lint, build, targeted validations, and the full 35-test audio readiness suite successfully - Phase 7
- [x] Documented and completed D-050 Ring Modulator with real carrier frequency, depth, mix, and output controls routed through preview playback, OfflineAudioContext export, the bottom rack, Effects accordion, command palette, save/reload state, and live-safe active-playback updates - Phase 3/6/7
- [x] Added browser validation proving Ring Modulator changes exported WAV output and remains integrated with live-safe cache updates, rack, command palette, and Effects accordion; re-ran lint, build, targeted validations, and the full 36-test audio readiness suite successfully - Phase 7
- [x] Documented and completed D-051 Bitcrusher with real bits, sample-rate reduction, mix, and output controls routed through preview playback, OfflineAudioContext export, the bottom rack, Effects accordion, command palette, save/reload state, and live-safe active-playback updates - Phase 3/6/7
- [x] Added browser validation proving Bitcrusher quantization/sample-hold changes exported WAV output and remains integrated with live-safe cache updates, rack, command palette, and Effects accordion; re-ran lint, build, targeted validations, and the full 37-test audio readiness suite successfully - Phase 7
- [x] Documented and completed D-052 Overdrive/Hard Clip with real drive, clip threshold, tone, mix, and output controls routed through preview playback, OfflineAudioContext export, the bottom rack, Effects accordion, command palette, save/reload state, and live-safe active-playback updates - Phase 3/6/7
- [x] Added browser validation proving Overdrive hard clipping changes exported WAV output and remains integrated with live-safe cache updates, rack, command palette, and Effects accordion; re-ran lint, build, targeted validations, and the full 38-test audio readiness suite successfully - Phase 7
- [x] Documented and completed D-053 same-lane audio collision guard so split/move/resize edits and legacy overlap repairs promote overlapping clips to adjacent readable layers without changing timing, source offsets, automation, playback, or export behavior - Phase 3/6/7
- [x] Documented and completed D-054 beat-marker seek UX so clicking an existing beat marker or timeline marker guide selects/seeks without deleting it, while explicit delete/toggle actions remain available and hit feedback stays visibly red during playback - Phase 6/7
- [x] Re-ran `npm run lint`, `npm run build`, targeted beat/overlap Playwright validations, and the full 40-test audio readiness suite successfully after D-053/D-054 - Phase 7
- [x] Documented and completed D-055 Vibrato with real rate, depth, delay, mix, and output controls routed through preview playback, OfflineAudioContext export, bottom rack, Effects accordion, command palette, save/reload state, and live-safe active-playback updates - Phase 3/6/7
- [x] Documented and completed D-056 loop-at-clip-end playback so loop mode restarts from the selected or under-playhead clip/source start instead of falling back to timeline 0:00 - Phase 2/6/7
- [x] Documented the next roadmap order: full effect-parameter automation with existing compound keyframes, API support, advanced export menu before plugin, and a stop-and-notify gate before plugin implementation - Phase 4/8/9/10
- [x] Re-ran `npm run lint`, `npm run build`, targeted Vibrato/effect/loop Playwright validations, and the full 41-test audio readiness suite successfully after D-055/D-056 - Phase 7
- [x] Documented and completed D-058 first effect-parameter automation slice so Cave Reverb Amount writes to the existing compound diamond as track-owned `track.reverb.amount`, survives save/reload, moves/deletes/eases with the diamond, and affects real playback/export - Phase 4/6/7
- [x] Re-ran `npm run lint`, `npm run build`, targeted D-058/keyframe/rack/export validations, and the full 42-test audio readiness suite successfully after D-058 - Phase 7
- [x] Documented and completed D-059 full implemented effect-parameter automation coverage so every current numeric parameter on engine-backed effects uses the existing compound diamond keyframe workflow and evaluates in playback/export - Phase 4/6/7
- [x] Documented and completed D-060 bottom quick keyframe editor beside the toolbar with Add, Previous, Next, Delete, active time, parameter count, and easing controls wired to the existing compound keyframe handlers - Phase 4/6/7
- [x] Re-ran `npm run lint`, `npm run build`, targeted multi-effect automation/export validations, and the full 43-test audio readiness suite successfully after D-059/D-060 - Phase 7
- [x] Documented and completed D-057 advanced export popup so Header Export opens settings before rendering, WAV supports sample rate, bit depth, mono/stereo, full/selected/loop/custom ranges, filename, peak normalization, and dither, while MP3 remains locked until a real encoder exists - Phase 3/6/9
- [x] Re-ran `npm run lint`, `npm run build`, targeted export popup validations, and the full 44-test audio readiness suite successfully after D-057 - Phase 7
- [x] Documented and completed D-061 responsive right-side quick keyframe editor layout so the keyframe controls grow, stay readable, align near the Signal side of the editor, and wrap only when narrow - Phase 4/6/7
- [x] Re-ran `npm run lint`, targeted quick-keyframe layout Playwright validation, and `npm run build` successfully after D-061 - Phase 7
- [x] Documented and completed D-062 in-app update notes for the Export Settings workflow, including output controls and honest MP3-lock behavior - Phase 5/7/9
- [x] Documented and completed D-063 Blender-like right-click quick action menu beside the cursor with real keyframe, beat, cut/trim, delete, and export actions - Phase 3/4/6/7
- [x] Documented and completed D-064 fatal error popup with verbatim message, source, stack, copy, and dismiss behavior above the app shell - Phase 2/6/7
- [x] Re-ran `npm run lint`, targeted release/right-click/fatal-error Playwright validation, and `npm run build` successfully after D-062/D-063/D-064 - Phase 7
- [x] Documented and completed real browser MP3 encoder support in Export Settings with MP3 bitrate, mono/stereo, filename/range/normalize support, lazy-loaded encoder chunking, and honest WAV-only bit-depth/dither scoping - Phase 9/7
- [x] Re-ran `npm run lint`, targeted WAV/MP3 export Playwright validation, and `npm run build` successfully after MP3 encoder support - Phase 7
- [x] Documented and completed D-065 effect-parameter keyframe targeting so supported effect sliders and rack macros write to the active/nearby compound diamond or existing automated effect lane instead of falling back to fixed/global effect values - Phase 4/6/7
- [x] Re-ran `npm run lint`, targeted multi-effect and unselected-compound effect automation Playwright validations, and `npm run build` successfully after D-065 - Phase 7

## In Progress
- [ ] Maintain the 1.0 detail backlog so owner-reported rough edges are fixed, owned by a phase, or explicitly blocked before release — Phase 7
- [ ] Continue D-016 parameter expansion toward the next real engine-backed device family instead of adding disconnected sidebar sliders — Phase 3/6/7
- [ ] Continue compact professional workflow implementation with effect rack, focused parameter panels, and shortcut customization — Phase 6

- [ ] D-066 prepare and publish the public GitHub repository with polished README, permissive attribution license, detailed feature docs, known problems, and safe ignored-file boundaries — Phase 5/7

## Pending
- [ ] Run the full 1.0 quality gate audit before preparing any Arudio 1.0 Beta handoff — Phase 7
- [ ] Add true cache rebuild percentage only after Arudio has a measurable background cache renderer; until then use honest readiness labels — Phase 2/6
- [ ] Make pitch-driven visual density update live from real pitch state without drifting ruler, clips, playhead, or keyframes — Phase 3/4/6
- [ ] Add non-destructive editing and export workflow — Phase 3
- [ ] Add full keyframe movement/copy/paste, cubic bezier graph editing, speed/pitch keyframes, and broader parameter automation — Phase 4
- [ ] Implement real speed keyframe lanes and broader parameter automation with playback/export support before allowing unsupported parameters to behave like selected keyframed controls — Phase 4
- [ ] Complete the next major full effect-parameter automation phase using the existing compound keyframe diamond for all implemented engine-backed effect parameters — Phase 4
- [ ] Add API support after full effect automation and before plugin implementation — Phase 8
- [ ] Stop and notify the owner before starting Phase 10 plugin implementation — Phase 10
- [ ] Add generated public release banner assets and once-per-version update banner before 1.0 Beta handoff — Phase 5
- [ ] Implement compact scalable workflow UI with workspaces, horizontal effect rack, shortcut customization, Simple/Advanced effect views, pinned parameters, and no parameter scroll walls — Phase 6

## Blocked
- None
