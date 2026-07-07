# Phase 6 — Professional Workflow UX

## Goal
Build a compact professional workflow layer so Arudio can grow into a serious audio editor without becoming overwhelming. This phase exists because professional DSP features can have hundreds of parameters, but users should not need to scroll a long sidebar just to change threshold, EQ frequency, reverb mix, or automation.

## Scope
- Add workspace-based editor modes for Edit, Mix, Master, and Repair or Analysis.
- Replace long parameter sidebars with a compact cockpit inspector, bottom effect rack, and focused detail drawer.
- Add a command palette and keyboard shortcut system for fast editing.
- Add Simple and Advanced views per effect.
- Add parameter search, pinned controls, preset access, and automation entry points.
- Add scalable density controls so the UI can be compact, readable, and professional at different monitor sizes.

## Features in This Phase

### Compact Scalable Editor
Arudio must support independent UI scale and timeline zoom. UI scale changes toolbar, inspector, rack, and panel density. Timeline zoom changes time resolution and clip readability. These two controls must not fight each other.

The density modes are:
- Compact: maximum information density for desktop editing.
- Balanced: default professional layout.
- Comfortable: larger hit targets for slower editing or smaller screens.

Each density mode must keep text readable, controls stable, and icons recognizable. No mode may cause overlapping labels, clipped important values, or hidden primary actions.

### App Settings Density And Motion Wiring
The visible App Settings density and reduced-motion controls must change the actual editor chrome, not just save inert preference data. The first production wiring supports the currently visible Compact and Comfortable density choices. Compact keeps the dense DAW layout as the default. Comfortable increases key bottom-toolbar, rack, and footer hit targets and spacing without moving timeline time, clip positions, keyframes, marks, or project data.

Reduced motion must disable nonessential transitions and animations across the editor shell while preserving state changes, playback controls, meters, cache labels, and timeline updates. Both settings persist in local app state and must be restored on reload through root-level attributes/classes that browser validation can inspect.

### Initial Timeline Zoom Slice
The first timeline zoom slice adds real time-scale controls for the existing timeline. Users can merenggangkan or merapatkan the visible timeline by changing the viewport duration between compact preset ranges such as 30s, 60s, 120s, and 240s. The ruler, grid, playhead, clips, and clip keyframe markers must all use the same visible duration so they do not drift apart.

Zooming in may keep the current playhead or selected clip visible by extending the viewport just enough to avoid hiding the active edit point. This is an initial viewport-duration zoom, not a full horizontal pan/scroll timeline yet. It must be represented honestly in Progress until pan/scroll and zoom-around-cursor behavior are implemented.

### Timeline Pan And Zoom Around Cursor Slice
The next timeline slice adds a real visible viewport start in addition to viewport duration. The ruler, grid, clips, marks, compound keyframes, source-overage regions, selected clip outlines, and playhead line must all render from the same `[viewportStart, viewportStart + viewportDuration]` range instead of assuming the timeline always starts at zero.

Users can pan the visible timeline left or right without moving clips, keyframes, marks, or the playhead. Panning is a view operation and must not dirty the project. The header zoom group includes compact pan controls and a viewport readout that shows both visible duration and the current viewport start. Mouse wheel or trackpad horizontal scroll over the timeline/ruler pans the viewport. Shift + wheel can pan horizontally when the device reports vertical wheel deltas.

Zooming in or out should anchor around the playhead when the playhead is visible, otherwise around the current viewport center. This gives the user a predictable "zoom around what I am editing" behavior without requiring a full cursor-position API in the first slice. Later refinements may anchor exactly under the mouse cursor, but the first slice must already keep the playhead and selected edit point visible whenever possible.

Direct mouse zoom is required for the main timeline workspace. Holding Ctrl while scrolling over the ruler or timeline zooms time in or out around the mouse cursor time. The gesture changes viewport duration and viewport start together so the time under the cursor stays visually stable. It must not move clips, keyframes, marks, source-overage regions, playback position, or project data, and it must not dirty the project. The gesture must use an input threshold so normal wheel/touchpad movement does not feel too extreme or accidentally jump multiple zoom levels.

All click, drag, resize, keyframe move, timeline mark move, keyboard arrow, and ruler actions must convert between viewport position and timeline time consistently. A click at the middle of a viewport starting at 60s with a 30s duration must seek near 75s, not 15s. Items outside the visible viewport must be clipped or hidden instead of clamped onto the edges.

### Timeline Zoom Responsiveness And Pitch Density Follow-Up
Timeline zoom controls must feel immediate and must not look like decorative buttons. Plus and minus controls must update the visible time scale, grid density, clip widths, keyframe positions, ruler labels, playhead label, marked ranges, and selected clip framing in one coherent update. If zoom computation becomes expensive, Arudio should debounce only expensive waveform redraw work while keeping ruler and playhead movement instant.

Pitch-driven timeline density remains a visual mode, but it must be visibly tied to real clip pitch state and automation where available. When enabled, pitch-up or compact pitch movement can make the clip waveform and subdivision density visually tighter within readability limits. Pitch-down or expanded pitch movement can stretch the visual mapping only within stricter limits. The mode must not fake extra audio layers, and it must not move timeline-locked keyframes.

### Bounded Timeline Ruler Labels
Timeline ruler labels and playhead time badges must stay inside the visible editor area and must not appear beyond the active timeline/project duration. Labels near the left or right edge clamp their position so the full pill remains visible. When the visible viewport extends past project duration, ruler labels beyond the playable project range are hidden or dimmed rather than shown as active time.

The playhead time badge, ruler ticks, timeline grid, clip positions, timeline marks, and the vertical playhead line must all use the same active timeline coordinate system. Horizontal chrome padding for pan buttons may exist visually, but it cannot cause the time badge to drift away from the vertical line or make ruler clicks seek to a different time than the line displays.

When the playhead is at the visible start or end of the viewport, the time badge must remain readable and inside the editor chrome. Edge clamping may offset the badge pill itself, but it must not move the pin anchor, the triangle pointer, the underlying playhead line, or the timeline time mapping.

After owner testing, the start-edge playhead badge needs a stricter rule: the early timeline region must not apply a percentage-based badge offset that makes `0:00` through the first visible seconds look detached from the long vertical playhead line. The active timeline inset must be large enough for the badge to remain centered over the line at `0:00`, while the header ruler, main grid, clips, marker guides, and pointer hit math continue using the exact same inset.

### Timeline Frame Marks
Users can click the upper ruler area to add a lightweight timeline mark at that frame/time. A mark creates a subtle red range or vertical band that is visible enough to guide editing but not loud enough to compete with clips, selected outlines, keyframes, cache colors, or playhead glow.

Marks are timeline annotations, not audio edits. They do not dirty audio source data and do not change playback or export. Users must be able to select, move, and delete marks later. The first slice may support creating and clearing marks locally inside the project state before adding labels, colors, or marker groups.

Timeline marks must render as crisp editor guides. The red marker line should be sharp and readable without glow blur, soft gradients, or fuzzy bands. A selected marker may receive a slightly stronger line and subtle outline, but it must still look like a precise timeline guide. The same selected marker must be deletable from the header trash action, global Delete/Backspace shortcut, command palette delete command, and bottom Delete tool before any clip deletion is attempted.

At high zoom/renggang levels, marker visuals must not appear split apart across tracks, ruler, or lanes. The full timeline guide should read as one continuous vertical beat/marker guide through the main timeline, while the ruler may show a compact pin at the same time coordinate. If a separate ruler affordance exists, it must share the same time-to-position math as the full-height guide.

### Frame-Locked Beat Markers
Beat markers build on the same red timeline guide surface, but they are optimized for DJ-style tapping while audio plays. A beat marker stores the nearest project audio sample frame in addition to its timeline time so the marker remains locked to the session/audio-frame grid instead of a loose pixel coordinate.

Users can toggle a beat at the current playhead from the header beat button while playback continues. If no beat exists at the exact current audio sample frame, Arudio adds one. If a beat already exists at that exact frame, the same action removes it. A normal ruler click only seeks the playhead. Double-clicking the upper ruler toggles a beat at the clicked exact frame. Clicking an existing marker removes that exact marker. Clicking or tapping at another frame adds a separate beat, even if it is close to an existing beat, which keeps rapid DJ tapping from deleting earlier beats by accident. Beat markers are not drag-moved in this slice; if a beat is wrong, the fast DJ workflow is delete/tap again so frame-locked timing stays intentional.

When playback reaches a beat marker, the playhead time badge receives a crisp red ring/stroke and the playhead line becomes beat-accented for a very short visible pulse. This is visual feedback only; it must not alter playback, export, clip timing, timeline zoom, selected clips, keyframes, or cache state. Stored beat timing and delete behavior are exact-frame based; the visual pulse may hold briefly because browser playhead UI updates happen in intervals rather than every audio sample.

### 1.0 Timeline Polish Slice
This implementation slice closes the most visible owner-reported editor rough edges before deeper DSP work continues. It must include real behavior, not decorative controls:

- Left and right sidebars collapse into compact rails while preserving project selection, selected clip state, inspector context, playback state, and timeline alignment.
- Header transport removes the duplicate large play button and keeps only compact transport/loop controls, while the bottom player remains the primary play/pause affordance.
- Loop mode works through playback: if a selected clip is active and the playhead is inside that clip or sitting on its end edge, playback loops the selected clip; if the playhead is on another clip's body or end edge, playback loops that clip; otherwise playback loops the whole project duration until stopped.
- Ruler frame marks are stored in project state, rendered on both ruler and timeline, added from the ruler, selectable, moved by dragging, and deleted through a visible mark action.
- Ruler labels and playhead badges clamp inside the visible viewport; labels beyond playable project duration render inactive instead of looking like active time.
- Bottom toolbar actions either run an implemented editor command, enter a functional tool mode, or show a clear disabled reason. No toolbar button may silently pretend to work.
- Playback readiness messages use the real missing condition: no project, no clips, no audio source metadata, or missing source blobs must not collapse into the misleading "import audio" message when audio already exists.

### Timeline Layer Labels And Drag Handles
Clip and track labels must not keep pretending that missing media is still available. When a clip's source metadata is missing, or the local source blob check proves the media is missing or errored, visible timeline labels should switch to a compact missing-media state instead of continuing to show the stale imported file name as if it were playable. Playback/export readiness can still name the missing file in tooltips or errors where that detail helps the user recover, but the visible layer label must make the missing state obvious at a glance.

The layer name label on the left side of each audio lane is also a direct layer-order handle. Pressing and holding that label must let the user reorder the layer vertically above or below other audio layers without changing the clip's timeline start, source offsets, fades, automation, or media mapping. Horizontal audio repositioning remains the existing clip-body drag behavior; the layer-name handle is for up/down layer order only and must not conflict with resize handles, keyframe diamonds, track volume/pan controls, or ruler seeking.

### Workspace Modes
The editor supports workspace modes so users see the right tools at the right time instead of every tool at once.

Edit workspace focuses on timeline, clip editing, trim, split, fades, pitch, speed, and automation.

Mix workspace focuses on track controls, mixer view, effect rack, sends, buses, dynamics, EQ, and sidechain routing.

Master workspace focuses on master chain, limiter, LUFS, true peak, export readiness, loudness targets, and final render settings.

Repair or Analysis workspace focuses on spectrogram, noise reduction, click repair, hum removal, spectral tools, and metering.

Switching workspaces must not stop playback, lose selection, or reset open project state.

### Cockpit Inspector
The right sidebar becomes a cockpit, not a dumping ground. It shows selected clip, track, effect, or project summaries and only the most important quick actions. A selected effect may show bypass, preset, 2–4 macro knobs, input/output meter, automation status, and an expand action.

The cockpit must not contain long raw parameter lists. If more than roughly 8 controls are needed, the effect opens in the focused detail drawer or a workspace panel. Users can pin favorite parameters into the cockpit, but pinned controls must remain compact and user-chosen.

### Dual Sidebar Discipline
The left sidebar remains for project, track, browser, source, and navigation surfaces. The right sidebar remains for selected object control. Dual sidebars may be used, but they must not both become long parameter scroll panels. Heavy parameter editing belongs in the rack detail drawer, workspace panel, or command palette.

### Collapsible Sidebars
Both sidebars must be collapsible so the timeline can take more horizontal space. Collapsing a sidebar keeps a thin rail or icon affordance visible and must not lose project selection, selected clip state, inspector tab state, or unsaved edits. The left sidebar collapse is especially important because project navigation can be hidden during focused timeline editing.

Collapsed sidebars must animate or snap without shifting the playhead, ruler, clips, or bottom transport out of alignment. The collapse affordance must be small and icon-led, matching the current dense editor style.

### Bottom Effect Rack
Tracks and the master bus use a horizontal bottom effect rack. Each effect module appears as a compact device tile with:
- Bypass state.
- Effect name.
- Preset selector.
- 2–4 macro controls.
- Small input/output or gain-reduction meter where relevant.
- Drag handle for chain order.
- Expand action for full parameters.

Effect chain order is non-destructive and reorderable. Dragging an effect changes the processing order for both playback and export. Disabling an effect removes it from the audio path without deleting its settings.

### Initial Cave Reverb Rack Slice
The first implementation slice for the effect rack must only expose effects that already affect real playback and export. At this stage, that means Cave Reverb on the selected clip's track. The rack appears as a compact horizontal strip near the timeline/toolbar area and shows the selected track name, chain count, Cave Reverb tile, bypass state, amount macro, size macro, and a compact add/enable action.

If no clip or track is selected, the rack stays honest and shows a compact empty state instead of fake devices. If the selected track has no implemented effect instance yet, the rack can add real track effects using the same project state and audio path as the inspector. The rack must not show Delay or other future effects until those effects are backed by the real engine. EQ, Compressor, and Limiter may only appear after their preview/export paths and validation are implemented.

Rack controls are macro controls over the actual effect parameters. Changing Amount or Size from the rack must update the same `track.effects` state used by preview playback, offline WAV export, and the existing inspector. Bypassing from the rack must remove the effect from the audio path without deleting its settings.

### Initial Implemented Effects Rack Slice
After Graphic EQ, Filter, Compressor, Noise Gate, Limiter, Saturation, Overdrive, Bitcrusher, Chorus, Flanger, Phaser, Tremolo/Auto-Pan, Vibrato, Ring Modulator, Cave Reverb, and Delay/Echo are validated through playback/export, the bottom rack can show those implemented devices as compact horizontal tiles. This rack is not a second long parameter panel; it is a fast macro surface for selected-track mixing.

Each rack tile must show bypass state, device name, a short saved-value summary, and one real macro control that writes to the same `track.effects` state used by the right inspector, preview playback, live-safe parameter mutation, and OfflineAudioContext export. The first macros are intentionally narrow and engine-backed:
- Graphic EQ: Mid gain around 1 kHz.
- Filter: High-pass cutoff.
- Compressor: Makeup gain.
- Noise Gate: Reduction/cut.
- Limiter: Ceiling.
- Saturation: Drive.
- Overdrive: Clip threshold.
- Bitcrusher: Bits.
- Chorus: Mix.
- Flanger: Feedback.
- Phaser: Depth.
- Tremolo/Auto-Pan: Depth.
- Vibrato: Depth.
- Ring Modulator: Depth.
- Cave Reverb: Amount.
- Delay/Echo: Mix.

The rack must stay honest when no clip or track is selected by showing a compact empty state instead of fake devices. It must not show unsupported future effects as active controls. Browser validation must prove a rack macro updates the same inspector/device state and that the rack remains a one-row compact workflow surface.

As the rack grows beyond a few devices, the bottom rack becomes a horizontally scrollable strip instead of squeezing every effect tile into the available width. Device tiles should stay thin, dense, and readable, but wide enough that names, macro labels, and values do not feel cramped: power/bypass, short effect name, one macro value, one macro slider, and one settings button. The settings button opens the right Effects cockpit, switches to the selected effect, expands that effect's parameter group, and scrolls the panel enough that the opened effect is visible without enabling the effect by itself. Effects only turn on through the power button, command palette enable action, or direct parameter changes that intentionally apply that effect.

Audio layers created from imported files must not remain visible after their final clip is deleted. Deleting the last clip on an imported audio track also removes that empty audio layer, its lane label, lane volume/pan controls, and any now-unused local source metadata/blob. Stored projects from older builds must be normalized on load/save so orphan audio tracks and unused source metadata disappear completely, lower layers move up, and newly imported files occupy the next real layer instead of leaving or reusing a ghost lane. Multi-file import remains supported from one picker action and must create one usable audio layer per accepted file.

Arudio should eventually support a real internal UI scale pass so the editor feels closer to a browser zoomed to roughly 75-85% while still rendering at normal browser zoom. This is not just shrinking text: header controls, sidebars, lane heights, inspector cards, bottom rack, toolbar, footer transport, hit targets, and timeline labels all need proportionate compact sizing without overlap. The setting should be product-level and validated across desktop widths, rather than asking users to rely on Chrome zoom.

The first D-043 implementation pass uses the existing App Settings Density choice as the product-level scale switch. Compact mode becomes materially denser by shrinking the main shell dimensions, sidebar widths, header height, ruler height, track lane height, clip height, bottom rack, toolbar, and footer transport without using page zoom or transform scaling. Comfortable mode remains the larger mode for users who prefer bigger hit targets. Timeline math must remain driven by project seconds, so changing density cannot move clips, marks, keyframes, ruler labels, the playhead, or waveform coverage.

When the project timeline is wider than the current visible viewport, the ruler must expose a slim horizontal viewport slider. The slider moves the timeline viewport left and right using the same `timelineViewportStart` model as arrow pan, wheel pan, ruler labels, clips, markers, and playhead drawing. It must stay hidden when the whole project fits in the viewport, because a disabled decorative slider would add clutter. Moving the slider must not move clip start times, timeline marks, keyframes, or project timing; it only changes what range of time is visible.

Timeline guide layers must cover the full scrollable timeline content, not only the visible viewport height. Grid lines, red beat/marker guides, and the white playhead line should continue through every audio layer even when the project has many tracks or the layer stack becomes taller than the visible timeline area. The background must not look cut off or finite just because more layers were imported.

### Effect Chain Order Parity
The order shown in the bottom rack, right inspector, command palette effect list, playback graph, and OfflineAudioContext export must remain consistent. A user should not see one order but hear another. Until full drag-drop chain reordering is implemented, the fixed order is Graphic EQ, Filter, Compressor, Noise Gate, Limiter, Saturation, Overdrive, Bitcrusher, Chorus, Flanger, Phaser, Tremolo/Auto-Pan, Vibrato, Ring Modulator, Cave Reverb, then Delay/Echo.

When a new engine-backed device is added, it must be added to every visible surface and to the audio engine's ordered chain list in the same pass. Missing an effect from the engine order is treated as a 1.0 detail bug because it can silently change processing order as the chain grows.

### Focused Detail Drawer
Expanded effects open in a focused detail drawer or floating panel instead of extending the sidebar vertically. The drawer can show full parameter groups, graphs, meters, and routing options without forcing users to scroll through unrelated inspector sections.

The drawer must support:
- Simple view with macro controls.
- Advanced view with raw parameters.
- Parameter search.
- Pin to cockpit.
- Add automation.
- Reset parameter.
- Preset save and load.

Closing the drawer must preserve edits immediately because effects are non-destructive project state.

### Simple And Advanced Effect Views
Every complex effect has two views.

Simple view exposes musical controls that are easy to understand. Example compressor controls: Amount, Punch, Release, Makeup. Example reverb controls: Space, Distance, Mix. Example EQ controls: Low, Mid, High, Air.

Advanced view exposes technical controls such as threshold, ratio, attack, release, knee, sidechain source, filter frequency, Q, slope, phase mode, oversampling, and latency where relevant.

Simple controls are real macro mappings over advanced parameters. They must not be fake controls or disconnected UI.

### Engine-Backed Parameter Expansion Roadmap
Arudio is expected to grow into a parameter-rich editor with 100+ real controls, but those parameters must be exposed through effect racks, focused drawers, search, presets, and automation entry points rather than a long right-sidebar scroll wall. The right sidebar remains a cockpit for selected-object summary, pinned macros, and quick actions.

The parameter rollout is grouped by engine-backed device families:
- EQ and filtering: graphic EQ bands, parametric EQ bands, high-pass, low-pass, band-pass, notch, slope, Q, gain, and analyzer-linked frequency selection.
- Dynamics: compressor, limiter, gate/expander, de-esser, multiband compressor, sidechain source, threshold, ratio, attack, release, knee, ceiling, makeup, and mix.
- Time and spatial: delay, echo, convolution or algorithmic reverb controls, pre-delay, decay, damping, width, mid-side balance, and wet/dry mix.
- Modulation and color: chorus, flanger, phaser, tremolo, vibrato, auto-pan, ring modulation, saturation, overdrive, bitcrusher, and custom waveshaper controls.
- Pitch, speed, and utility: linked pitch, future independent time-stretch, formant controls where implemented, normalize, fades, reverse, crossfade, silence trim, sample-rate/bit-depth conversion, and dither.
- Metering and analysis: LUFS, true peak, spectrum analyzer, spectrogram, phase correlation, peak/RMS, and export readiness meters.

Each parameter must declare its scope, units, range, default, automation eligibility, preset participation, save/reload behavior, preview/export behavior, and validation status. Parameters that are not wired into the real engine may appear in planning docs only, or as disabled future commands with clear reasons. The first practical expansion target is an EQ/filter rack slice because it gives the owner many immediately useful controls without requiring native DSP or WASM.

### Initial Graphic EQ Parameter Slice
The first D-016 UI slice exposes a real Graphic EQ device, not disconnected controls. It adds nine band gain parameters as a single compact effects device on the selected track:
- `eq.band.62.gain`
- `eq.band.125.gain`
- `eq.band.250.gain`
- `eq.band.500.gain`
- `eq.band.1000.gain`
- `eq.band.2000.gain`
- `eq.band.4000.gain`
- `eq.band.8000.gain`
- `eq.band.16000.gain`

The sidebar may show the compact 9-band device because it is one coherent device and not a mixed scroll wall of unrelated controls. The row must remain small, scannable, and clearly bypassable. Later advanced EQ controls such as per-band Q, frequency, shelves, high-pass, low-pass, and analyzer interaction should move into the rack detail drawer or focused panel.

Each slider must map to real saved project state and real audio output. The UI should label the band frequencies directly, keep values readable in dB, and avoid adding inactive compressor, limiter, analyzer, or mastering controls until those are implemented in the engine.

### Initial Filter Parameter Slice
The next D-016 EQ/filter slice adds a real browser-backed Filter device as a compact coherent effect, not loose utility sliders. The first parameters are:
- `filter.highpass.frequency`
- `filter.highpass.q`
- `filter.lowpass.frequency`
- `filter.lowpass.q`
- `filter.notch.frequency`
- `filter.notch.q`
- `filter.notch.depth`

The device uses Web Audio biquad filter stages for high-pass, low-pass, and a peaking-cut notch. The first slice intentionally does not expose 6/12/24/48 dB/oct slope controls until Arudio has a clearly designed cascaded-filter model, because a visible slope control must map to honest preview and export behavior. The Filter card must stay inside the one-expanded-device Effects accordion, appear in the bottom rack as a compact macro tile, and be available through command palette only after playback/export validation proves the device changes real audio.

### Initial Dynamics Parameter Slice
The next D-016 UI slice adds real dynamics devices as compact grouped cards, not as loose sidebar sliders. The compressor parameters are:
- `compressor.threshold`
- `compressor.ratio`
- `compressor.attack`
- `compressor.release`
- `compressor.knee`
- `compressor.makeup`
- `compressor.mix`

The limiter parameters are:
- `limiter.ceiling`
- `limiter.input`
- `limiter.release`
- `limiter.mix`

The right sidebar can expose these parameters in compact two-column groups because each group is a coherent device. This is still a temporary cockpit view; future advanced dynamics editing should move into a focused rack drawer with metering, gain reduction display, presets, sidechain routing, and automation entry points. Controls must use real saved project state and real preview/export behavior before they are visible as enabled devices.

### Initial Delay And Echo Parameter Slice
The next D-016 time-based slice adds a real Delay/Echo device as a compact grouped card. The parameters are:
- `delay.time`
- `delay.feedback`
- `delay.mix`
- `delay.tone`

The card remains part of the one-expanded-device Effects accordion so adding time-based controls does not create a sidebar scroll wall. The summary must show useful musical state such as delay time, feedback, and mix. The first implementation uses real saved project state and real preview/export behavior; future expansion can add tempo sync, ping-pong stereo, ducking, modulation, multi-tap patterns, and automation entry points through the focused rack drawer.

### Initial Saturation Parameter Slice
The next D-016 color slice adds a real Saturation device as a compact grouped card, not a decorative "pro" knob. The parameters are:
- `saturation.drive`
- `saturation.tone`
- `saturation.mix`
- `saturation.output`

The device belongs to the Modulation and color family. It must appear as one coherent device in the right Effects accordion, one macro tile in the bottom rack, and one command palette action only after preview/export behavior is wired. The sidebar summary should show drive and mix, while the rack macro should expose Drive for quick shaping. Future color devices such as overdrive, bitcrusher, ring modulation, and custom waveshaper must follow the same pattern instead of adding loose sliders.

### Initial Tremolo And Auto-Pan Parameter Slice
The next D-016 modulation slice adds a real Tremolo/Auto-Pan device as a compact grouped card, not decorative motion. The parameters are:
- `tremolo.rate`
- `tremolo.depth`
- `tremolo.pan`
- `tremolo.mix`

The device belongs to the Modulation and color family. It must appear as one coherent device in the right Effects accordion, one macro tile in the bottom rack, and one command palette action only after preview/export behavior is wired. The sidebar summary should show rate, depth, and auto-pan amount, while the rack macro should expose Depth for fast rhythmic shaping. Future chorus, flanger, phaser, vibrato, and ring modulation devices must follow the same real-engine pattern instead of adding loose sliders.

### Initial Chorus Parameter Slice
The next D-016 modulation slice adds a real Chorus device as a compact grouped card, not a decorative widen button. The parameters are:
- `chorus.rate`
- `chorus.depth`
- `chorus.delay`
- `chorus.feedback`
- `chorus.mix`

The device belongs to the Modulation and color family. It must appear as one coherent device in the right Effects accordion, one macro tile in the bottom rack, and one command palette action only after preview/export behavior is wired. The sidebar summary should show rate, depth, and mix, while the rack macro should expose Mix for fast thickening. Feedback must remain capped, delay/depth must remain inside safe browser `DelayNode` limits, and the device should be live-safe for active playback parameter changes.

### Initial Flanger Parameter Slice
The next D-016 modulation slice adds a real Flanger device as a compact grouped card, not a generic "motion" macro. The parameters are:
- `flanger.rate`
- `flanger.depth`
- `flanger.delay`
- `flanger.feedback`
- `flanger.mix`

The device belongs to the Modulation and color family. It must appear as one coherent device in the right Effects accordion, one macro tile in the bottom rack, and one command palette action only after preview/export behavior is wired. The sidebar summary should show rate, depth, and feedback, while the rack macro should expose Feedback for fast metallic sweep shaping. Flanger uses much shorter safe delay ranges than Chorus so the user can hear a clear comb-filter sweep instead of broad stereo thickening.

### Initial Phaser Parameter Slice
The next D-016 modulation slice adds a real Phaser device as a compact grouped card, not a decorative sweep label. The parameters are:
- `phaser.rate`
- `phaser.depth`
- `phaser.center`
- `phaser.feedback`
- `phaser.mix`

The device belongs to the Modulation and color family. It must appear as one coherent device in the right Effects accordion, one macro tile in the bottom rack, and one command palette action only after preview/export behavior is wired. The sidebar summary should show rate, depth, and feedback, while the rack macro should expose Depth for quick sweep intensity control. Phaser uses all-pass phase movement rather than a short delay line, so it must stay distinct from Flanger in the implementation and in validation.

### Initial Vibrato Parameter Slice
The next D-016 modulation slice adds a real Vibrato device as a compact grouped card, not a fake pitch label. The parameters are:
- `vibrato.rate`
- `vibrato.depth`
- `vibrato.delay`
- `vibrato.mix`
- `vibrato.output`

The device belongs to the Modulation and color family. It must appear as one coherent device in the right Effects accordion, one macro tile in the bottom rack, and one command palette action only after preview/export behavior is wired. The sidebar summary should show rate, depth, and mix, while the rack macro should expose Depth for fast pitch-wobble intensity control. Vibrato must use a real modulated delay line in preview and export, remain live-safe for active playback parameter changes, and stay distinct from Tremolo by modulating time/pitch instead of amplitude.

### Initial Ring Modulator Parameter Slice
The next D-016 modulation/color slice adds a real Ring Modulator device as a compact grouped card, not a decorative "robot" preset. The parameters are:
- `ring.frequency`
- `ring.depth`
- `ring.mix`
- `ring.output`

The device belongs to the Modulation and color family. It must appear as one coherent device in the right Effects accordion, one macro tile in the bottom rack, and one command palette action only after preview/export behavior is wired. The sidebar summary should show carrier frequency, depth, and output, while the rack macro should expose Depth for fast metallic modulation intensity. Ring Modulator must use a real carrier multiplication processor in preview and export, keep phase continuous during playback, and remain live-safe for active playback parameter changes.

### Initial Bitcrusher Parameter Slice
The next D-016 color/distortion slice adds a real Bitcrusher device as a compact grouped card, not a fake lo-fi preset. The parameters are:
- `bitcrusher.bits`
- `bitcrusher.rateReduction`
- `bitcrusher.mix`
- `bitcrusher.output`

The device belongs to the color and distortion family. It must appear as one coherent device in the right Effects accordion, one macro tile in the bottom rack, and one command palette action only after preview/export behavior is wired. The sidebar summary should show bit depth, rate reduction, mix, and output, while the rack macro should expose Bits for fast lo-fi intensity control. Bitcrusher must use real sample quantization plus sample-hold reduction in preview and export, remain live-safe for active playback parameter changes, and avoid adding unrelated advanced controls before the focused detail drawer exists.

### Initial Overdrive Parameter Slice
The next D-016 color/distortion slice adds a real Overdrive/Hard Clip device as a compact grouped card, not another soft saturation duplicate. The parameters are:
- `overdrive.drive`
- `overdrive.clip`
- `overdrive.tone`
- `overdrive.mix`
- `overdrive.output`

The device belongs to the color and distortion family. It must appear as one coherent device in the right Effects accordion, one macro tile in the bottom rack, and one command palette action only after preview/export behavior is wired. The sidebar summary should show drive, clip threshold, mix, and output, while the rack macro should expose Clip for fast hard-clipping intensity control. Overdrive must use a real hard clipping curve with tone filtering in preview and export, remain live-safe for active playback parameter changes, and stay visually grouped so it does not expand the sidebar into a scroll wall.

### Compact Effects Cockpit Accordion
As the number of real effect parameters grows, the right Effects tab must not display every device's full controls at the same time. The initial D-013 implementation uses a one-expanded-device accordion inside the Effects tab. Each implemented device remains visible as a compact card with bypass state and a short parameter summary. Only the expanded device shows its full controls.

Expanding EQ, Compressor, Limiter, or Reverb collapses the previously expanded device. Collapsing the active device leaves all devices in summary mode. Summaries must stay honest and reflect current saved values. Device toggles must remain available while collapsed so users can bypass effects without opening advanced controls. This is a transitional cockpit pattern until the full rack drawer/focused panel is implemented.

### Real-Time Parameter Feedback
When a parameter can be safely applied to the active audio graph, Arudio should make the change audible immediately while playback continues. The UI should not force the user to stop and restart just to hear EQ, compressor, limiter, gain, pan, or similar live-safe changes. When a change is not live-safe, the cache UI must continue to show that the current playback is still using the old generation and that the new state is queued for restart.

Live-safe controls should feel direct and responsive, but the product must stay honest: no control may appear live if its active node update is not implemented. The first UX slice can keep the existing old/new cache indicators for structural edits while live-safe parameter changes also update the active Web Audio nodes.

### Command Palette
Arudio includes a command palette for actions that should be fast without hunting through panels. The palette opens with a shortcut and supports fuzzy search.

Commands include:
- Add Compressor.
- Add Parametric EQ.
- Add Limiter.
- Add Cave Reverb.
- Show Effect Rack.
- Show Mixer.
- Add Keyframe.
- Show Automation Lane.
- Normalize.
- Export WAV.
- Open Project Settings.
- Open Keyboard Shortcuts.

Commands must be disabled or hidden when unavailable. A command cannot claim to add an effect that is not implemented in the real audio engine.

### Initial Command Palette And Shortcut Slice
The first implementation slice adds a command palette for actions that already exist in the product. It must not advertise unavailable effects, future workspaces, or unimplemented processing. Supported initial commands include play/pause, stop, import audio, export WAV, save project, project settings, app settings, split selected clip, trim selected clip start/end, delete selection, add gain keyframe, delete gain keyframe, and navigate previous/next gain keyframe.

The palette opens with Ctrl+K and shows command names, categories, shortcut hints, and disabled reasons. Disabled commands remain visible when useful so the user understands what context is missing, such as needing a selected clip or imported audio. Running a disabled command must show a concise reason instead of silently failing.

Initial keyboard shortcuts are limited to implemented actions: Space for play/pause, Ctrl+K for command palette, Ctrl+S for save, S for split, Delete for delete selection, K for add clip keyframe, Shift+K for delete clip keyframe, and bracket keys for trim start/end. Shortcuts must not fire while the user is typing in inputs, textareas, selects, or editable fields.

### Implemented Effect Command Palette Slice
After Graphic EQ, Filter, Compressor, Noise Gate/Expander, Limiter, Saturation, Overdrive, Bitcrusher, Chorus, Flanger, Phaser, Tremolo/Auto-Pan, Vibrato, Ring Modulator, Cave Reverb, and Delay/Echo are validated through playback/export, the command palette can expose those effect actions as real selected-track commands. These commands enable or focus existing engine-backed track effects only; they must not advertise unsupported future devices such as parametric EQ, sidechain ducking, spectral repair, mastering analysis, or unimplemented modulation devices until those paths are implemented.

The first implemented effect commands are:
- Enable Graphic EQ.
- Enable Filter.
- Enable Compressor.
- Enable Noise Gate.
- Enable Limiter.
- Enable Saturation.
- Enable Overdrive.
- Enable Bitcrusher.
- Enable Chorus.
- Enable Flanger.
- Enable Phaser.
- Enable Tremolo/Auto-Pan.
- Enable Vibrato.
- Enable Ring Modulator.
- Enable Cave Reverb.
- Enable Delay/Echo.

Each command requires a selected clip so Arudio can resolve the owning track. If no clip or track is selected, the command remains visible with a disabled reason such as "Select a clip first". Running an enabled command updates the same `track.effects` state used by the right inspector, bottom effect rack, live-safe playback mutation, saved project state, and OfflineAudioContext export. Re-running an already enabled effect command is idempotent and should report that the effect is already on instead of creating duplicate devices.

### Keyboard Shortcut System
Common editing actions need keyboard shortcuts and a shortcut settings page. Shortcuts must be discoverable from settings and command palette results.

Required default shortcuts:
- Space: play or pause.
- S: split selected clip at playhead.
- Delete: delete selected keyframe when a compound keyframe is active; otherwise delete the selected clip.
- K: add keyframe for the active parameter.
- Shift+K: delete keyframe at playhead.
- [ and ]: trim selected clip start or end to playhead.
- Ctrl+K: open command palette.
- A: toggle automation lane.
- E: toggle effect rack.
- I: toggle inspector.
- M: open Mix workspace.
- Ctrl+Z and Ctrl+Y: undo and redo.

Shortcut editing must detect conflicts and show which command already owns a key combination.

### Shortcut Hint Visibility Setting
The App Settings "Shortcut hints" preference must control a real visible behavior. When it is enabled, command palette results may show compact shortcut chips such as Space, Ctrl+S, or K. When it is disabled, those shortcut chips are hidden from the command palette while the shortcuts themselves continue to work.

This setting is an app-level preference and must persist through local storage reloads. It must not become a decorative checkbox. Browser validation should prove the default state shows hints, saving the setting hides them, and a reload preserves the hidden state.

### Parameter Search And Favorites
Effects with many parameters include parameter search. Search results show parameter name, current value, unit, automation status, and whether the parameter is pinned. Pinned parameters appear in the cockpit inspector for fast reuse.

Favorites are stored per project or app setting depending on the parameter type. Project-specific favorites should travel with the project. App-level favorites should affect default UI preference only.

### Playback Cache Information
Arudio shows compact playback cache information without turning the inspector into a debug wall. The status area, transport, or timeline overlay can show:
- Active audible cache generation.
- Pending new cache generation.
- Cached frame count, duration, or readiness.
- Whether the running playback is hearing old state while new parameters are queued.
- When old cache will be released.

Old and new cache generations use two distinct, readable colors. The colors should work on the dark editor background and remain subtle enough not to compete with clips, selected outlines, keyframes, or meters. Example meaning: active old cache means the sound currently playing; pending new cache means the project state that will be heard after stop/restart.

Cache information must be actionable but compact. Users should be able to understand "what I hear now" versus "what my latest edit will produce" without scrolling, opening a long panel, or reading internal engine logs.

The visible cache UI must include clear old/new color coding and a small progress/readiness readout. Active old cache should show the frame count or duration currently safe for playback. Pending new cache should show its frame count, build state, or waiting state. When playback stops and obsolete cache is released, the UI should visibly return to an idle or current-only state so the user can trust what they are hearing.

For the first 1.0-ready cache information slice, readiness text is preferred over fake percentage progress. The footer cache display must expose "Audible now" for the generation the listener is hearing, "Queued next" for the edited generation that will become active on stop/restart, and "Old releases on stop" when a stale generation is still audible. This keeps the status compact while explaining exactly why parameter edits are not heard until playback restarts.

### Lean Header Transport
The top header should avoid duplicated transport controls. If the main transport and bottom player already provide play/pause affordances, the top header can remove the extra play button and keep only the controls that are needed there, such as stop, loop, timeline zoom, import/export, save, command palette, and settings. This keeps the header compact and reduces confusion about which transport control is active.

### Bottom Toolbar Command Wiring
The bottom edit toolbar must trigger real implemented editor actions. Select, cut, split, move, delete, fade, volume, slip, and snap buttons must either perform the action immediately, switch to a functional tool mode, or show a clear disabled reason. No toolbar button may appear active while disconnected from timeline behavior.

### Production Toolbar Surface
The everyday bottom toolbar should only show tools that are useful in the current editor. During the 1.0 quality pass, visible toolbar tools are limited to:
- Select: normal selection/editing mode.
- Split: immediate split at playhead when a selected clip and valid playhead position exist.
- Move: selection-preserving move mode for clip dragging.
- Delete: deletes the selected compound keyframe first, otherwise the selected clip.

Cut blade, fade handles, volume lane, slip editing, and snap mode remain planned workflows but should be hidden from the everyday toolbar until each has real timeline behavior, persistence rules, playback/export impact where relevant, and browser validation. Future tools may still be reachable as documented backlog items or disabled command-palette entries with clear reasons, but they must not make the main toolbar feel half-finished.

The Split tool should produce a readable layer result. When splitting one selected audio clip, the right-side split segment moves onto a newly inserted adjacent layer by default, directly below the original layer. This avoids the visual feeling that two audio blocks are stacked or cramped on one lane after a split. The new layer must inherit practical track settings from the original track, keep source audio and automation timing non-destructive, and keep the split boundary exactly at the playhead.

Audio clip layers should feel like visible lanes, not piles. If an edit would make two clips occupy overlapping timeline time on the same lane, Arudio should automatically create or insert a nearby layer for the edited clip. The user should see the clip stay at the intended time, but on a clean lane where it is not hidden under another waveform. This applies to split, move, resize, and repaired legacy state. The behavior must not move keyframes, timeline marks, source offsets, or playback/export timing.

Beat hit feedback must be readable during live playback, not just technically toggled for a single frame. When playback crosses a beat marker, the playhead badge and timeline line should stay in the hit state long enough for a DJ/editor to notice while tapping or checking alignment, then clear automatically before it feels stuck. Clicking an existing beat marker or its vertical guide is a seek/select action: the beat stays in place, the playhead moves to that frame-locked time, and the hit state turns red because the playhead is on the beat. Deleting a beat marker must remain explicit through the Delete tool, keyboard Delete, or a dedicated toggle action such as the header Tap Beat button.

### Footer Pending-Control Cleanup
The footer must stay focused on controls that work in the current editor. Next-segment navigation and alternate view/layout toggles should not remain visible as disabled "pending" buttons because they make the product feel unfinished without helping the user act.

Until those workflows are implemented, the footer should show only proven transport and status surfaces: stop/reset, play/pause, jump-to-end, master output, cache state, loop state, local project state, and audio readiness. Jump-to-end is allowed because it is a concrete timeline transport command, not future segment navigation. It moves the playhead to the current playable project end through the same seek path as ruler clicks and must remain disabled when no project duration exists. When segment navigation is implemented later, it must jump to real clip boundaries, timeline marks, or loop edges while respecting playback/cache rules. When alternate views are implemented later, the buttons must switch real workspaces or panels without resetting playback, timeline state, or selection.

### Loop Playback Control
Arudio needs a top-level loop toggle in the header or transport. When loop is enabled and a clip is selected while the playhead is inside that clip or on its end boundary, playback loops the selected clip range forever until stopped. When loop is enabled and no selected clip is eligible but the playhead is over another clip body or end edge, playback loops that clip range. When no clip-local loop is eligible, playback loops the entire playable project range. Looping must work with imported audio, active playback cache state, and user playhead seeking.

Loop state is app or project playback UI state and should be visible but compact. It must not alter clip metadata or exported audio unless a future explicit loop-render feature is added.

### Automation Entry Points
Every automatable parameter exposes the same entry points:
- Add keyframe at playhead.
- Show automation lane.
- Pin parameter to cockpit.
- Reset automation.
- Copy and paste automation where supported.

Unsupported parameters must not show automation controls. Supported parameters must evaluate from the same automation state in UI, preview playback, and export.

### Preset And Chain Workflow
Each effect supports presets. The entire effect rack chain also supports chain presets. Presets store real parameter values and chain order. Loading a preset updates project state and can be undone.

Preset UI must be compact. Users should be able to change a preset from a device tile without opening the full drawer.

### Roadmap Order Gate
After the current effect-device and quality-gate work, the next major workflow phase is full effect-parameter automation using the existing compound keyframe marker. API support follows after that. The advanced export menu with output settings and formats must be completed before plugin implementation begins. Plugin work must not start silently; when Arudio reaches the plugin phase, development pauses and the owner is told before coding begins.

### Undo And Non-Destructive Edit History
The workflow layer includes undo and redo for project edits, clip edits, automation edits, effect additions, effect deletions, rack reorder, preset load, and parameter changes. Undo history must be non-destructive and must not delete original source audio blobs unless the user explicitly removes unused media through a future media-management feature.

## UI Mockup
Desktop layout:

```txt
+----------------+------------------------------------------+--------------------+
| Project/Tracks | Workspace Tabs: Edit Mix Master Repair   | Cockpit Inspector  |
| Browser        | Timeline / Mixer / Master / Spectrogram  | Quick selected     |
| Sources        | Active workspace content                 | controls only      |
+----------------+------------------------------------------+--------------------+
| Transport      | Horizontal Effect Rack: Comp | EQ | Rev | Limiter | Macros |
+----------------------------------------------------------------------------+
| Cache: Active old generation | Pending new generation | frame/duration info     |
+----------------------------------------------------------------------------+
| Command Palette overlay: search actions, effects, shortcuts, settings       |
+----------------------------------------------------------------------------+
```

Compact mode keeps the same structure with smaller control spacing and fewer text labels. Comfortable mode keeps the same structure with larger controls and may hide nonessential meters.

Empty state: if no effect is selected, the cockpit shows selected track or clip summary and the rack shows an add-effect action only when a real audio track exists.

Loading state: if an effect module requires WASM or worker setup, the device tile shows a compact loading state and bypasses safely until ready.

Main interactions: switch workspace, open command palette, add effect, reorder rack, expand effect drawer, search parameter, pin parameter, add automation, save preset, load preset, edit shortcut, undo, and redo.

## Behavior & Logic Notes
Professional UX must be progressive. Default screens show macro controls and fast actions. Advanced controls are available without hiding them behind confusing navigation, but they do not live in a long sidebar scroll.

Effect rack state must be the source of truth for order, bypass, preset, and parameters. The cockpit, drawer, automation lanes, and mixer all read and write the same project state.

Workspace switches are view changes, not project mutations. They must not dirty the project unless the user changes an actual setting.

Shortcut handling must avoid typing conflicts. Text fields, number fields, search boxes, and modal inputs keep normal typing behavior.

Playback cache indicators are UI state, not project state. Showing old/new cache colors must not dirty the project. Moving the playhead during playback must update the visible playhead immediately and must not be overridden by a stale transport timer.

UI density must be tested at common desktop widths and at the smallest supported app width. Text inside controls must not overflow. Important parameters must remain reachable without long vertical scrolling.

## Dependencies
- Phase 1 completed.
- Phase 3 editing commands available.
- Phase 4 automation model available.
- Effect rack data model for track and master processing.
- Undo/redo state transaction model.

## Acceptance Criteria
- Users can switch between Edit, Mix, Master, and Repair or Analysis workspaces without losing selection or playback state.
- The right sidebar never becomes the primary place for long raw effect parameter lists.
- Tracks and master bus can show compact horizontal effect rack modules.
- The initial rack slice shows only the implemented Cave Reverb track effect and never advertises unimplemented effects.
- Rack controls write to the same effect state used by playback, export, and inspector controls.
- Newly implemented devices such as Noise Gate/Expander appear as compact rack modules with one macro, while full controls stay grouped in the Effects accordion.
- A selected effect can open a focused detail drawer with Simple and Advanced views.
- Users can use a command palette to find supported actions and implemented effects.
- The initial command palette exposes only implemented editor actions and shows disabled reasons for missing context.
- Initial shortcuts trigger only implemented actions and do not interfere with text input.
- Users can view and customize keyboard shortcuts with conflict detection.
- Users can pin favorite parameters to the cockpit inspector.
- Users can change the initial timeline zoom/viewport duration, and ruler, grid, clips, playhead, and clip keyframes stay aligned.
- Users can zoom the visible timeline directly with Ctrl + mouse wheel over the ruler or timeline, anchored around the cursor time.
- Users can see active old cache and pending new cache states with distinct colors while playback continues.
- Users can move the playhead during playback without the UI forcing it back to the previous position.
- Users can add or remove frame-locked beat markers from the ruler or header while playback continues, and the playhead badge visibly accents when the playhead reaches a beat.
- A normal ruler click moves the playhead only; beat creation from the ruler requires a double-click or the dedicated header beat button.
- Marker guides remain visually unified and aligned at zoomed/renggang timeline levels instead of appearing as separated lane fragments.
- Automatable parameters expose consistent automation entry points only when backed by the real engine.
- Effect and chain presets store real values and can be undone.
- UI scale and timeline zoom are independent.
- Compact mode remains readable and avoids clipped or overlapping text.
- Parameter-heavy workflows require focused panels, search, shortcuts, or rack controls rather than long sidebar scrolling.
