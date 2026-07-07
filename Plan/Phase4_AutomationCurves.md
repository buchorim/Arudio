# Phase 4 — Automation Curves

## Goal
Add keyframes and an optional graph editor so users can shape audio changes over time with precise, musical control. This matters because Arudio should feel expressive: users should be able to make effects rise, fade, swell, slow down, speed up, pitch up, or open into a cave-like space without manually cutting clips into small pieces.

## Scope
- Add keyframes for clip, track, and effect parameters.
- Add a graph editor with cubic bezier easing for users who want visual control.
- Add a keyframe-only workflow for users who prefer buttons and shortcuts without opening the graph.
- Support automation for volume, pan, clip gain, clip speed, pitch, fade shape, and effect parameters.
- Keep automation non-destructive and saved inside the project file/state.

## Features in This Phase

### Keyframe System
Users can add keyframes at the playhead for the selected parameter. Each keyframe stores time, value, easing mode, and optional cubic bezier handles. Keyframes can be selected, moved, copied, pasted, deleted, nudged, and reset. Invalid keyframes outside the clip or project range are rejected.

### Graph Editor
The graph editor shows a lane for the selected parameter over time. Users can drag points, adjust cubic bezier handles, choose easing presets, and preview the curve. The graph must feel easy rather than technical: handles should snap gently, presets should be named clearly, and values should be readable without opening a manual.

### Keyframe-Only Mode
Users can automate without opening the graph. Buttons and shortcuts allow add keyframe, previous keyframe, next keyframe, delete keyframe, copy keyframe, paste keyframe, and reset parameter. This mode is required so automation still feels fast while editing clips on the timeline.

### Automation Parameter Registry
Arudio must use a central automation parameter registry before expanding keyframe support across most controls. The registry defines every automatable parameter's id, target scope, display label, value range, unit, precision, default/base property mapping, lane color, compact UI behavior, and engine support status. UI panels, timeline markers, command actions, playback, and export must read from this registry instead of hardcoding separate Gain, Pitch, Pan, Reverb, EQ, or compressor keyframe flows.

A parameter is allowed to appear as keyframe-capable only when all required pieces are wired: project-state storage, add/select/move/delete/edit behavior, compact inspector control, timeline marker rendering, save/reload persistence, and real playback/export evaluation where the parameter affects audio. Parameters that are planned but not yet engine-backed may appear only as ordinary clip-wide or effect-wide controls with honest labels.

The registry must support progressive rollout. Initial registered clip parameters include Gain and linked Pitch because both are currently playback/export-backed. Later registry entries should add clip Pan, Speed, track Volume/Pan, reverb Amount/Size, and effect parameters in small verified slices. Adding each parameter must update acceptance criteria and Progress before implementation.

### Unified Compound Clip Keyframes
The default clip-layer keyframe UX uses one visible diamond marker per keyframe time, centered vertically on the clip. That marker represents a compound keyframe point for the selected clip, not a separate visible lane for each parameter. Internally, parameter-specific automation lanes may still store values independently so playback/export can evaluate Gain, Pitch, Pan, Speed, or effect parameters correctly, but the user-facing clip marker is unified.

When a compound keyframe is selected, changing any registered automatable parameter writes that parameter's value at the selected keyframe time. If another parameter does not yet have a value at that time, Arudio creates the missing parameter keyframe at the same timeline time. This lets one diamond drive multiple changes without forcing users to manage separate visible Gain and Pitch keyframes. The inspector should show one compact keyframe panel with the active time and which registered parameters have values there.

The unified keyframe workflow must be browser-validated because it is easy for the UI and automation lanes to drift apart. The required validation creates a real imported-audio clip, adds one compound keyframe from the inspector, changes both Gain and linked Pitch from the same selected diamond, confirms only one centered diamond remains on the clip, confirms the Gain and Pitch lanes share the exact same timeline time with their edited values, reloads the app, and confirms the single compound diamond persists.

### Initial Clip Gain Automation Slice
The first implementation slice adds clip gain keyframes because gain automation is immediately audible and export-verifiable. Users can add a keyframe at the playhead for the selected clip, navigate previous/next keyframes, delete a keyframe at the current playhead, and view a compact gain automation graph in the inspector. Keyframes are stored in timeline time by default and must not move when clip speed changes. Preview playback and offline WAV export must evaluate the same keyframe data.

### Cubic Bezier Easing
Each keyframe segment can use linear, hold, ease in, ease out, ease in-out, or custom cubic bezier easing. Custom easing stores control points in project state. Presets must be editable after creation and must not shift keyframe timing.

### Initial Easing And Keyframe Edit Slice
After clip gain keyframes exist, the next slice adds practical graph editing without opening a full detached graph editor. The selected/nearest gain keyframe can be edited for time, value, and easing preset from the inspector. The compact graph must render the eased curve instead of only straight line segments. Playback and WAV export must schedule the same shaped automation curve by sampling deterministic values from project state.

### Layer-Based Simple Keyframe Editing
The default keyframe workflow should feel like a normal timeline editor, not a technical graph panel. Keyframes appear directly on the selected clip/layer as small diamond handles. Users can click a keyframe to select it, drag it horizontally to move its timeline time, and delete or navigate it from compact controls. The inspector should show only lightweight information for the active keyframe instead of a full graph-first editor.

When a keyframe is active, changing the related parameter updates that active keyframe value. For example, if a clip gain keyframe is selected and the user moves the Gain slider, Arudio changes that keyframe's gain value instead of changing the whole clip base gain. If no keyframe is active, the same slider changes the normal clip parameter. This mirrors familiar editor behavior such as After Effects: select keyframe, adjust parameter, and the selected keyframe receives the value.

When a parameter already has keyframes, the parameter control enters normal automation edit behavior. If the playhead is on an existing keyframe, changing the parameter updates that keyframe. If the playhead is between keyframes, changing the parameter creates a new keyframe at the playhead using the new value. It must not silently edit the whole clip base value while the automated lane is active, because that makes A/B keyframes feel broken and causes the audible value to be overridden by automation.

Clip-owned keyframes move with their parent clip when the user drags the whole clip/layer to a new timeline position. Internally the keyframes are still stored as timeline-time values, but a clip move applies the same time delta to the clip start and every keyframe in that clip. Speed or pitch value edits are different: they may alter source mapping or playback behavior, but they must not silently move keyframe times.

The graph view remains an optional advanced mode for later precision work. It must not be the default experience for basic keyframe editing.

The bottom toolbar Delete tool must respect the active automation selection. If a compound keyframe diamond is selected, pressing the Delete tool deletes that keyframe time across registered clip automation parameters before it considers deleting the selected clip. This mirrors the keyboard Delete behavior and prevents accidental clip deletion when the visible active target is the keyframe.

### Effect Parameter Automation
Effects expose automatable parameters. The cave/reverb effect supports automation for wet/dry, room size, decay, pre-delay, low cut, and high cut. Delay supports wet/dry, feedback, time, and filter controls. EQ supports band gain/frequency/Q where implemented. Compressor and limiter expose threshold, ratio, attack, release, makeup, and ceiling where supported.

### Full Effect Parameter Automation Expansion
The next major phase after the current effect-device expansion is to make every implemented effect parameter keyframe-capable through the existing unified compound keyframe workflow. This must not introduce a second keyframe type, a separate visible marker style, or per-effect marker clutter. The same centered diamond marker represents the timeline keyframe moment, while registered effect-parameter lanes store their own values internally.

The rollout order should follow the real engine-backed effect set already visible in Arudio: Graphic EQ, Filter, Compressor, Noise Gate/Expander, Limiter, Saturation, Overdrive, Bitcrusher, Chorus, Flanger, Phaser, Tremolo/Auto-Pan, Vibrato, Ring Modulator, Cave Reverb, and Delay/Echo. Each parameter becomes automatable only after UI state, project persistence, preview playback, offline export, and validation all agree. Unsupported or not-yet-export-backed parameters must remain ordinary effect controls and must not show automation affordances.

When a compound keyframe is selected, changing any supported effect parameter writes that parameter's value to the selected keyframe time. If the parameter has automation but no selected keyframe, changing it at the playhead creates or updates a keyframe at that time. If no automation exists for that parameter, the control remains a normal effect-wide setting until the user explicitly adds automation. This keeps the behavior familiar and prevents the "one keyframe changes the whole audio" confusion from returning.

The inspector and effect rack must expose automation status compactly: a tiny automation indicator, add-keyframe action, previous/next navigation, and reset/remove automation where relevant. Full graph editing remains optional; the normal workflow stays on the layer with the same diamond marker.

### Initial Reverb Amount Effect Automation Slice
The first full effect-parameter automation slice adds Cave Reverb Amount to the existing compound keyframe workflow. This is deliberately narrow but must be complete: selecting a clip/layer keyframe and moving the Cave Reverb Amount control writes a `track.reverb.amount` value at that same timeline time. The visible marker remains the same centered compound diamond on the selected clip; no separate effect-keyframe marker type is added.

The automation data belongs to the selected track because Cave Reverb is a track effect. The timeline may show the track-owned effect keyframe diamond on the selected clip when the keyframe time falls inside that clip's visible range. Moving, deleting, and changing easing for the compound diamond must update the Reverb Amount keyframe together with Gain and Pitch keyframes at the same time. Preview playback and OfflineAudioContext export must evaluate the automated amount from track automation so the exported WAV proves the keyframe is not UI-only.

Browser validation must import real audio, enable Cave Reverb, add/select a compound keyframe, change Reverb Amount at that keyframe, save/reload, confirm the same diamond and keyframe summary include Reverb Amount, export the WAV, and confirm the rendered audio differs from the non-automated/base render in the expected wet/dry direction.

### Full Implemented Effect Automation Coverage
The next implementation slice expands the effect automation registry from a single Cave Reverb Amount lane to every current numeric parameter on implemented engine-backed track effects. The supported effect set is Graphic EQ, Filter, Compressor, Noise Gate/Expander, Limiter, Saturation, Overdrive, Bitcrusher, Chorus, Flanger, Phaser, Tremolo/Auto-Pan, Vibrato, Ring Modulator, Cave Reverb, and Delay/Echo. The user-facing behavior remains one centered compound diamond on the selected clip/layer; there must not be separate visible effect keyframe markers.

When a compound diamond is selected, moving any supported effect slider writes that parameter into a track-owned automation lane at the selected diamond time. If the user edits an already automated effect parameter while the playhead is inside the selected clip and no diamond is selected, Arudio may create or update a keyframe at the playhead. If a parameter has no automation yet and no selected compound time, the slider stays an effect-wide base control.

The right-side Effects accordion and bottom rack must read the active automation value when a compound diamond is selected, so the visible slider position matches the keyframe value instead of the base effect value. The existing diamond delete, move, easing, save/reload, and clip-move behavior must apply to these effect automation lanes without adding new keyframe concepts.

Preview playback and OfflineAudioContext export must evaluate effect automation through the same engine path. Parameters backed by native AudioParams should be scheduled from sampled automation curves. Processor-backed devices should read automation values during processing so Gate, Tremolo, Bitcrusher, Ring, and distortion-style controls are not UI-only.

Browser validation must prove that multiple unrelated effect parameters can be written into the same compound diamond, persist through save/reload, appear in the compact keyframe summary, and change exported audio compared with the base render.

### Bottom Quick Keyframe Editor
The empty area beside the bottom editing toolbar should contain a compact keyframe editor for the selected clip. It shows the active compound time, parameter count, total keyframes, and the familiar Add, Previous, Next, Delete, time, and easing actions. This editor is a quick workflow surface; it uses the same handlers as the right inspector and must not create a second keyframe model.

When no clip is selected, the editor should stay quiet and compact. When a clip is selected but the playhead is outside the clip, Add is unavailable with a clear title. When a compound diamond is active, the time field moves that diamond and the easing selector updates all parameter lanes stored at that compound time.

### Speed And Pitch Automation
Clip speed and pitch can be keyframed. Speed automation must clearly show whether pitch is linked or preserved. Pitch automation supports semitone and fine cent values. Pitch-preserving or speed-preserving rendering must use the real DSP path defined by the audio engine; fake visual curves without audible result are not acceptable.

Until pitch and speed automation are implemented in the real audio engine, the UI must mark Pitch and Speed controls as clip-wide controls. Selecting a gain keyframe must not imply that Pitch or Speed edits will affect that keyframe. This distinction is required because keyframes are parameter-specific: a Gain keyframe only automates Gain, while Pitch remains a whole-clip parameter until a real Pitch keyframe lane exists.

### Initial Linked Pitch Automation Slice
The first pitch automation slice supports clip pitch keyframes in linked-speed-pitch mode. Pitch keyframes are stored in the same timeline-locked automation model as clip gain and can be added, selected, moved, deleted, and edited from the compact keyframe workflow. The selected clip can show either Gain or Pitch keyframe markers so users understand which parameter they are editing.

Playback and offline WAV export must evaluate pitch automation from the same project state. In this initial slice, pitch automation schedules the source playback rate over time using `clip.speed * 2^(pitchSemitones / 12)`, so pitch movement is audible and exportable but not yet formant-preserving or duration-preserving. The UI must label this honestly as linked pitch until the Phase Vocoder or other independent pitch/time-stretch path exists.

Pitch automation can drive timeline visual density when the user enables visual mapping. Upward or compact pitch motion may compress clip visuals more freely within readability limits. Downward or expanded pitch motion may stretch clip visuals, but with tighter bounds to keep the layout stable. These visual changes must not move timeline-locked keyframes and must remain derived from automation state, not separate decorative layers.

Pitch-driven density should make complex edits easier to showcase without lying about the project. The timeline can render denser waveform subdivisions, compressed ruler ticks, pitch contour shading, and compact layer separators when pitch rises or mapping compacts. When pitch drops or mapping expands, the visual expansion must be capped more aggressively than compression so the lane stays stable and does not hide nearby edits. Both directions need hard minimum and maximum density limits, and users must be able to disable the visual mapping if they want a neutral timeline.

### Dynamic Speed Keyframe Anchoring
Speed automation uses timeline-locked keyframes by default. Changing a speed keyframe value must not move that keyframe, nearby keyframes, graph points, markers, or clip-relative automation points unless the user explicitly chooses a different anchor mode. The engine must maintain a time-warp map from timeline time to source audio time, so speed curves affect which source audio is heard, not where timeline keyframes live.

Three anchor modes are required:
- Timeline Locked: keyframes stay at exact timeline times when speed values change. This is the default.
- Clip Relative: keyframes stretch or compress only when the user resizes or retimes the clip intentionally.
- Source Locked: keyframes follow a chosen source-audio event such as a transient, beat, or word when source mapping changes.

If a speed curve makes the rendered audio longer or shorter, Arudio must handle clip end behavior explicitly. It may extend the clip end, reveal silence/tail, or ask the user to choose a retime policy, but it must never silently shift keyframe positions as a side effect.

## UI Mockup
Desktop layout extends the existing DAW shell:

```txt
+------------------+--------------------------------------+--------------------+
| Projects         | Timeline + automation lane selector  | Parameter Inspector|
| Tracks           | Clip lane                            | Value / easing     |
| Parameters       | Automation graph lane                | Keyframe list      |
|                  | o----curve----o-----curve-----o      | Bezier presets     |
+------------------+--------------------------------------+--------------------+
| Transport        | Add KF | Prev KF | Next KF | Graph | Snap | Value readout   |
+----------------------------------------------------------------------------+
```

When graph mode is off, the timeline stays compact and shows only keyframe markers on clips or parameter lanes. When graph mode is on, the selected automation lane expands with cubic bezier curve controls. Empty state: if no parameter is selected, the panel asks the user to choose a clip, track, or effect parameter. Loading state is not required because automation data is local metadata.

## Behavior & Logic Notes
 Automation evaluation must be deterministic for playback and export. The same project state must produce the same parameter values in preview and offline render. Keyframes are sorted by time. Two keyframes for the same parameter cannot occupy the exact same time unless the model explicitly supports a hold/step transition. Cubic bezier handles affect value interpolation only, not keyframe time placement.

Dynamic speed evaluation must use two separate clocks: timeline time and source audio time. Timeline time owns UI placement for keyframes and graph points. Source audio time is computed from the speed curve through the time-warp map. This separation is required so adjusting speed feels stable and professional instead of making automation drift.

Automation must be parameter-driven, not UI-driven. Timeline visuals read from project state, and audio playback/export read from the same project state. If a parameter is not supported by the real audio engine yet, the UI must not present it as working automation.

## Dependencies
- Phase 1 completed.
- Phase 2 completed.
- Phase 3 completed.
- Real effect parameters available for any automated effects.

## Acceptance Criteria
- Users can add, move, delete, copy, paste, and navigate keyframes.
- Automatable parameters are defined through a central registry instead of separate one-off UI/keyframe implementations.
- Registry-backed parameters cannot be shown as keyframe-capable unless they have matching playback/export behavior or are explicitly marked as not yet automatable.
- Clip-layer keyframes appear as one centered diamond marker per keyframe time, even when multiple registered parameters have values at that time.
- Selecting a compound keyframe lets registered parameter controls write values into that same keyframe time.
- Users can add, delete, and navigate clip gain keyframes through keyframe-only controls.
- Clip gain keyframes appear directly on the clip/layer and can be selected and moved from the timeline.
- Dragging a clip/layer moves its clip-owned gain keyframes by the same timeline delta so keyframes stay fixed to the audio clip.
- Changing clip gain while a gain keyframe is active updates that keyframe value instead of the whole clip base gain.
- Changing clip gain while the clip already has gain keyframes creates or updates a gain keyframe at the playhead instead of changing the whole clip base gain.
- Users can edit clip gain keyframe time, value, and easing preset.
- The compact gain graph shows eased curve shape for supported easing modes.
- Clip gain automation affects real playback and WAV export.
- Users can automate at least volume, pan, clip gain, clip speed, pitch, and reverb wet/dry.
- Users can automate every implemented engine-backed effect parameter through the existing compound keyframe system without adding a second keyframe marker type.
- Effect parameter automation evaluates identically in UI preview playback and exported output.
- Unsupported effect parameters do not show automation controls.
- Cave Reverb Amount can be written to the selected compound diamond, saved, reloaded, previewed, and exported from real track automation.
- Every current numeric parameter on implemented engine-backed effects can be written to the existing compound diamond workflow without adding a second marker type.
- Effect sliders and rack macros show the active automation value when a compound diamond is selected.
- The bottom toolbar area includes a compact keyframe editor wired to the same add, navigate, delete, time, and easing commands as the inspector.
- Clip pitch keyframes can be added, selected, moved, deleted, edited, previewed, and exported in linked-speed-pitch mode.
- Until pitch/speed automation is implemented, Pitch and Speed controls clearly show that they affect the whole clip rather than the selected Gain keyframe.
- Users can enable pitch-driven visual density without changing keyframe placement.
- Pitch-driven density can visually compress more freely than it stretches, and both directions remain bounded by readable min/max limits.
- Users can use automation through buttons/shortcuts without opening the graph.
- Users can open the graph and edit cubic bezier easing visually.
- Speed keyframes remain stable when speed values are edited in Timeline Locked mode.
- Clip Relative and Source Locked modes are explicit user choices, not hidden defaults.
- Automation affects real playback and exported output.
- Automation data is saved, reloaded, and remains stable after refresh.
- Unsupported parameters are not shown as automatable.
