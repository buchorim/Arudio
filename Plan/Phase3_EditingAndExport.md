# Phase 3 — Editing And Export

## Goal
Add practical editing and export workflows so Arudio can produce useful audio output from real browser-based projects.

## Scope
- Implement non-destructive trim, split, move, gain, fade, pan, speed, pitch, time-stretch metadata, and reverse controls.
- Add export to at least one validated user-facing format.
- Add a real first-pass track effect that can produce a cave-like reverb using browser DSP.
- Add an engine-backed first graphic EQ/filter slice for real parameter expansion.
- Add first-pass engine-backed dynamics effects for compression and limiting.
- Add a first-pass engine-backed Delay/Echo effect for time-based editing.
- Add a first-pass engine-backed Chorus modulation effect for stereo thickening and movement.
- Add a first-pass engine-backed Flanger modulation effect for comb-filter movement and sharper sweep effects.
- Add a first-pass engine-backed Phaser modulation effect for all-pass sweep movement and vocal/instrument motion.
- Add a first-pass engine-backed Vibrato effect for real pitch wobble through modulated delay.
- Add a first-pass engine-backed Ring Modulator effect for metallic carrier modulation and experimental DJ sound design.
- Add a first-pass engine-backed Bitcrusher effect for lo-fi bit-depth and sample-rate reduction.
- Add a first-pass engine-backed Overdrive/Hard Clip effect for aggressive clipping and edge.
- Add project persistence for local editing sessions.

## Features in This Phase

### Non-Destructive Clip Editing
Clip edits update project metadata without permanently altering original imported audio. Split and trim actions preserve timing boundaries and prevent negative duration. Invalid edits are rejected with clear UI feedback.

The first editing command slice includes immediate split at playhead, delete selected clip, trim start to playhead, trim end to playhead, reverse selected clip, and fade-in/fade-out duration controls. Split creates two clip records that reference the same source id and preserve source offsets. Trim changes clip start, source start, and duration without changing the stored source audio. Delete removes only the selected clip metadata and must not delete source blobs that are still referenced by other clips.

When the Split tool cuts an audio clip, the newly created right-side segment should move to a new adjacent audio layer by default instead of sitting on top of or directly colliding with the original lane. The original left segment remains on the source layer, while the right segment gets its own track/layer inserted directly below the source layer. This keeps split editing visually clear and prevents same-lane split results from looking like overlapping audio blocks. Future options may allow "split in place" or "split to layer above", but the default 1.0 behavior should favor readable layer separation.

Audio lanes must also reject same-lane overlap during normal editing. If a move, resize, split, or stored legacy project state would place two audio clips on the same layer with intersecting timeline ranges, Arudio should move the edited clip or repaired legacy clip onto a newly inserted adjacent audio layer instead of allowing the clip blocks to sit on top of each other. The timing, source offset, fades, automation, and playback/export behavior must remain unchanged; only the owning audio layer changes. This keeps the timeline readable while preserving the user's musical timing.

Dragging clip resize handles must work from both sides. Resizing the left edge is a single atomic metadata edit that updates clip start time, source start time, duration, fades, and contained automation in one project-state commit. It must not send separate intermediate updates for start, source offset, and duration because that can make the left handle feel stuck while the right handle works. Resizing the right edge updates duration and fade bounds without changing source start. Both handles must preserve non-destructive source data and keep clip-owned keyframes inside the visible clip range.

### Source Overage Editing
When a clip is dragged or resized beyond the available source audio length, Arudio keeps the edit non-destructive and shows a source-overage region by default. The visible clip outline can extend beyond the source end, but the waveform must stop where real decoded audio stops. The overage side is drawn as a distinct ghost/empty region inside the clip boundary, including a subtle boundary mark near the selected white stroke so users can see exactly where the audible source ends.

Source-overage can happen on either side of a clip. Extending the right edge beyond the available source end creates a right-side overage region after the waveform. Extending the left edge before source time `0` creates a left-side overage region before the waveform. In left-overage, the real audio must stay anchored after the silent/ghost area instead of being pulled earlier or trimmed. Playback and export must treat both overage sides as silence unless a future explicit loop/stretch/freeze mode is implemented.

Default source-overage playback is silence because no source audio exists there. Future modes such as loop, freeze tail, time-stretch, generated room tail, or source repeat must be explicit user choices and must update preview playback and export before their UI appears as active.

Source-overage regions must survive save/reload because they are part of clip timing metadata, but they must never be mistaken for real waveform data. Split, trim, reverse, and speed edits must recalculate source coverage so the overage indicator remains correct.

Before 1.0, source-overage needs browser-level proof. A validation scenario must import a real short WAV, create both left and right source-overage in project metadata, reload the editor, verify the left and right overage visuals are present, export WAV, and parse the downloaded PCM to confirm the left overage, audible source region, and right overage line up in time. The silent regions must be near zero while the middle source region must contain audible samples. This protects against fake waveform rendering, accidental source trimming, and export/playback disagreement.

### Speed And Pitch Editing
Users can slow down or speed up a clip with two explicit modes: linked speed and pitch, or time-stretch with pitch preserved. Users can also raise or lower pitch without changing duration using semitone and fine cent controls. The UI must label these modes clearly so users understand whether pitch will change.

Speed edits must preserve stable timeline intent. Clip speed values affect source-audio mapping and clip render behavior, not the absolute placement of timeline-locked markers or automation keyframes. If a speed edit changes apparent clip length, the UI must expose the retime result clearly instead of moving existing keyframes silently.

### Pitch Timeline Visual Density
Pitch edits can optionally show visual stretch/compression on the timeline to make complex layered edits easier to read during showcases and real editing. Pitch-up or compacted mappings may visually compress more freely within readable limits. Pitch-down or stretched mappings may visually expand, but expansion must be more constrained so clips do not overpower the timeline or cause layout instability. The visual mapping should bias toward a dense, multi-layer professional look: compressed regions may show tighter waveform/ruler density and more visible edit subdivisions, while expanded regions should grow only within capped bounds.

This visual density mode must remain grounded in project state. It may show timeline stretch/compression overlays, denser waveform sampling, pitch contour hints, and compact layer-like separators, but it must not create fake audio clips, fake automation lanes, or decorative complexity that does not map to a real clip, pitch value, or automation curve. Real playback and export must still follow the actual DSP result.

The visual density mode must have a clear enable/disable state and must respond to real pitch controls without requiring a reload. If the user changes pitch or pitch automation, the visible waveform density should update promptly while preserving clip start/end, playhead position, source-overage indicators, and timeline-locked keyframes. If the visual mapping is expensive, the UI may update coarse density immediately and refine waveform detail after a short render delay, but it must never leave ruler, clip width, and playhead out of sync.

### Export Workflow
Users can export a rendered project after validation. The exported file must reflect track mute, solo, gain, pan, fades, master volume, and supported clip edits. Export errors must be explicit and should not create corrupted downloads.

Export validation must inspect the downloaded WAV, not only the UI toast. The browser validation harness must capture the real download from the Export WAV action, parse the file header, confirm the project sample rate and stereo format, verify that the frame count matches the timeline duration, and measure PCM samples so silent or corrupt exports fail the test. Future export tests should add edited-state assertions for trim, fade, gain, pan, mute, solo, reverse, reverb, and automation as those workflows are promoted toward 1.0.

### Advanced Export Menu
Before plugin work begins, the header Export action must stop acting as an immediate one-click download. It should open an export menu or modal where the user reviews output settings, chooses the format, confirms the render range, then starts export intentionally.

The first advanced export menu should support at least WAV and a planned MP3 path. WAV remains the lossless validation baseline. MP3 may use a browser-supported encoder, WebAssembly encoder, or a documented fallback only when the encoded output is real and browser-validated. The UI must not show MP3 as complete until an actual MP3 download is produced and inspected by validation.

Export settings should include format, sample rate, bit depth where applicable, channel mode, render range, filename, normalization mode, optional loudness target, dithering for bit-depth reduction, and a clear estimate/progress state. Defaults must be conservative and professional: no clipping, no hidden loudness changes, and no destructive alteration of project state.

The export menu belongs before the plugin phase because plugin support should extend a trustworthy core export flow instead of replacing or compensating for it.

### Cave Reverb Effect
Users can enable a cave-style reverb on a selected track. The effect must run through real Web Audio nodes and must affect both preview playback and offline render. The first version exposes simple amount and size controls. Disabled effects must not alter the signal. Effect settings are stored in project metadata.

### Graphic EQ Track Effect
Users can enable a real graphic EQ on a selected track as the first D-016 parameter expansion slice. The initial device exposes nine fixed ISO-style bands at 62 Hz, 125 Hz, 250 Hz, 500 Hz, 1 kHz, 2 kHz, 4 kHz, 8 kHz, and 16 kHz. Each band supports -12 dB to +12 dB gain and is stored as track effect metadata.

The EQ must run through real Web Audio biquad peaking filters in both preview playback and OfflineAudioContext WAV export. Disabled EQ instances must not affect the signal. The EQ UI may be compact in the right effects inspector for the first slice, but it must remain grouped as one device instead of becoming a long unrelated parameter list. Future EQ expansion can add parametric frequency, Q, filter types, and analyzer-linked controls through the effect rack/detail drawer model.

Browser validation must prove the exported WAV changes when EQ is applied. A test should import a real generated tone, export the baseline render, enable or edit a matching EQ band, export again, parse both WAV files, and confirm the processed peak changes in the expected direction.

### Compressor And Limiter Track Effects
Users can enable first-pass dynamics effects on a selected track. The compressor exposes threshold, ratio, attack, release, knee, makeup gain, and mix parameters. The limiter exposes ceiling, input drive, release, and mix parameters. These controls must be stored as track effect metadata and must route through the same preview and OfflineAudioContext export graph as EQ and reverb.

The compressor may use the browser `DynamicsCompressorNode` for the first engine-backed version, with a makeup gain stage and wet/dry mix stage around it. The limiter may combine a high-ratio dynamics stage with a sample ceiling stage so the ceiling parameter has a measurable effect in exported PCM. The UI must describe this as a practical first-pass browser limiter, not a final true-peak oversampling limiter. Future mastering work can add oversampling, true peak detection, LUFS targets, lookahead, and release shaping in a later phase.

Browser validation must prove dynamics change exported audio. A test should import a real loud generated WAV, export the baseline render, enable dynamics settings, export again, parse both WAV files, and compare a measured PCM range so the dynamics path is not just UI state.

### Delay And Echo Track Effect
Users can enable a first-pass Delay/Echo device on a selected track. The device exposes delay time, feedback, wet/dry mix, and tone damping parameters:
- `delay.time`
- `delay.feedback`
- `delay.mix`
- `delay.tone`

The delay must run through real Web Audio nodes in both preview playback and OfflineAudioContext WAV export. Disabled delay instances must not alter the signal. Feedback must be capped to avoid unstable runaway loops, and delay time must stay within browser-supported bounds. The first version may use a single delay line with feedback gain and low-pass damping; later versions can add synced tempo divisions, ping-pong stereo, ducking, modulation, and multi-tap controls.

Browser validation must prove the exported WAV changes when delay is applied. A test should import a short generated audio file, export the baseline render, enable Delay/Echo with audible feedback and mix, export again, parse the WAV files, and confirm the rendered tail contains measurable energy beyond the dry source area.

### Saturation Track Effect
Users can enable a first-pass Saturation color device on a selected track. The device exposes real browser-backed parameters:
- `saturation.drive`
- `saturation.tone`
- `saturation.mix`
- `saturation.output`

The first implementation uses Web Audio gain, waveshaper, tone filter, wet/dry mix, and output trim stages in both preview playback and OfflineAudioContext WAV export. Disabled saturation must bypass the signal. Drive must increase harmonic color without creating uncontrolled output, mix must blend dry and shaped signal, tone must soften or brighten the shaped path with a real filter, and output must trim or boost the final device level.

Browser validation must prove Saturation changes exported audio. A test should import a generated WAV, export the baseline render, enable Saturation with audible drive and mix, export again, parse both WAV files, and confirm the processed file has measurable sample-shape change while keeping the frame count and format stable.

### Noise Gate And Expander Track Effect
Users can enable a first-pass Noise Gate/Expander device on a selected track. The device exposes real browser-backed parameters:
- `gate.threshold`
- `gate.reduction`
- `gate.attack`
- `gate.release`
- `gate.hold`
- `gate.mix`

The first implementation uses a browser DSP gain-envelope stage in both preview playback and OfflineAudioContext WAV export. Disabled gate instances must bypass the signal. Threshold determines when low-level material is attenuated, reduction sets how far the closed gate pulls quiet material down, attack controls how quickly the gate opens, release controls how smoothly it closes, hold keeps the gate open briefly after a detected signal, and mix blends dry and gated audio. This is a practical first-pass browser gate/expander, not a final restoration suite with spectral noise profiling.

Browser validation must prove Noise Gate changes exported audio. A test should import a generated WAV with quiet noise plus a louder tone section, export the baseline render, enable Gate with audible threshold/reduction settings, export again, parse both WAV files, and confirm the quiet section is reduced while the loud section remains measurable.

### Tremolo And Auto-Pan Track Effect
Users can enable a first-pass Tremolo/Auto-Pan modulation device on a selected track. The device exposes real browser-backed parameters:
- `tremolo.rate`
- `tremolo.depth`
- `tremolo.pan`
- `tremolo.mix`

The first implementation uses a browser DSP low-frequency oscillator stage in both preview playback and OfflineAudioContext WAV export. Disabled tremolo instances must bypass the signal. Rate controls modulation speed in hertz, depth controls amplitude modulation intensity, pan controls stereo auto-pan amount, and mix blends dry with modulated audio. The processor must keep LFO phase continuous during playback blocks and must not fake modulation with only UI animation.

Browser validation must prove Tremolo/Auto-Pan changes exported audio. A test should import a steady generated tone, export the baseline render, enable Tremolo/Auto-Pan with audible depth and mix, export again, parse both WAV files, and confirm the processed output has significantly stronger windowed amplitude variation while preserving format and frame count.

### Chorus Track Effect
Users can enable a first-pass Chorus modulation device on a selected track. The device exposes real browser-backed parameters:
- `chorus.rate`
- `chorus.depth`
- `chorus.delay`
- `chorus.feedback`
- `chorus.mix`

The first implementation uses a short modulated delay line with a real low-frequency oscillator, feedback gain, and wet/dry mix in both preview playback and OfflineAudioContext WAV export. Disabled chorus instances must bypass the signal. Rate controls modulation speed, depth controls delay-time movement, delay controls the base voice offset, feedback thickens the repeated voice without runaway loops, and mix blends the chorus path with the dry track. The modulation must be audible in exported audio and must not be represented as UI-only animation.

Browser validation must prove Chorus changes exported audio. A test should import a steady generated tone, export the baseline render, enable Chorus with audible depth, feedback, and mix, export again, parse both WAV files, and confirm the processed output differs from the baseline while preserving WAV format, duration, and usable peak level.

### Flanger Track Effect
Users can enable a first-pass Flanger modulation device on a selected track. The device exposes real browser-backed parameters:
- `flanger.rate`
- `flanger.depth`
- `flanger.delay`
- `flanger.feedback`
- `flanger.mix`

The first implementation uses a very short modulated delay line with feedback and wet/dry mix in both preview playback and OfflineAudioContext WAV export. Disabled flanger instances must bypass the signal. Rate controls sweep speed, depth controls delay-time sweep width, delay controls the base comb-filter offset, feedback increases the metallic sweep while staying capped to prevent runaway loops, and mix blends the processed path with the dry track. The flanger must be distinct from Chorus by using shorter delay ranges and a stronger comb-filter character rather than broad stereo thickening.

Browser validation must prove Flanger changes exported audio. A test should import a generated tone, export the baseline render, enable Flanger with audible feedback and mix, export again, parse both WAV files, and confirm a measurable waveform change while preserving WAV format and frame count.

### Phaser Track Effect
Users can enable a first-pass Phaser modulation device on a selected track. The device exposes real browser-backed parameters:
- `phaser.rate`
- `phaser.depth`
- `phaser.center`
- `phaser.feedback`
- `phaser.mix`

The first implementation uses a chain of modulated all-pass filter stages with feedback and wet/dry mix in both preview playback and OfflineAudioContext WAV export. Disabled phaser instances must bypass the signal. Rate controls LFO sweep speed, depth controls how far the all-pass center frequency sweeps, center sets the sweep midpoint, feedback increases the notched movement while staying capped to avoid runaway resonance, and mix blends the processed path with the dry track. Phaser must sound and measure differently from Flanger: it should create phase-notch motion without relying on short delay-line comb filtering.

Browser validation must prove Phaser changes exported audio. A test should import a generated tone, export the baseline render, enable Phaser with audible depth, feedback, and mix, export again, parse both WAV files, and confirm measurable waveform change while preserving WAV format, frame count, and usable output level.

### Vibrato Track Effect
Users can enable a first-pass Vibrato modulation device on a selected track. The device exposes real browser-backed parameters:
- `vibrato.rate`
- `vibrato.depth`
- `vibrato.delay`
- `vibrato.mix`
- `vibrato.output`

The first implementation uses a short delay line whose delay time is modulated by an LFO, creating true time-domain pitch wobble in both preview playback and OfflineAudioContext WAV export. Disabled Vibrato instances must bypass the signal. Rate controls wobble speed, depth controls delay-time modulation width, delay controls the center delay, mix blends dry and vibrato paths, and output trims or boosts the effect result. Vibrato must remain distinct from Tremolo by modulating pitch/time instead of amplitude, and distinct from Chorus/Flanger by avoiding feedback and focusing on audible pitch movement.

Browser validation must prove Vibrato changes exported audio. A test should import a generated tone, export the baseline render, enable Vibrato with audible rate, depth, mix, and output settings, export again, parse both WAV files, and confirm measurable waveform change while preserving WAV format, frame count, and usable output level. A live-safe validation must also prove changing Vibrato parameters during playback keeps the active cache current instead of queuing old/new cache generations.

### Ring Modulator Track Effect
Users can enable a first-pass Ring Modulator device on a selected track. The device exposes real browser-backed parameters:
- `ring.frequency`
- `ring.depth`
- `ring.mix`
- `ring.output`

The first implementation uses a browser DSP carrier oscillator that multiplies the incoming signal by a sine carrier, then blends that modulated signal with the dry track in both preview playback and OfflineAudioContext WAV export. Disabled ring modulation must bypass the signal. Frequency controls the carrier tone, depth controls how strongly the carrier replaces the original amplitude, mix blends dry and modulated paths, and output trims or boosts the effect result. The processor must keep carrier phase continuous across playback blocks and must not be represented as UI-only animation.

Browser validation must prove Ring Modulator changes exported audio. A test should import a generated tone, export the baseline render, enable Ring Modulator with audible carrier frequency, depth, mix, and output settings, export again, parse both WAV files, and confirm measurable waveform change while preserving WAV format, frame count, and usable output level.

### Bitcrusher Track Effect
Users can enable a first-pass Bitcrusher device on a selected track. The device exposes real browser-backed parameters:
- `bitcrusher.bits`
- `bitcrusher.rateReduction`
- `bitcrusher.mix`
- `bitcrusher.output`

The first implementation uses a browser DSP quantization and sample-hold processor in both preview playback and OfflineAudioContext WAV export. Disabled Bitcrusher instances must bypass the signal. Bits controls the effective output resolution, rate reduction controls how many source samples are held before recalculation, mix blends dry and crushed signal, and output trims or boosts the final result. The processor must create audible stepped/lo-fi output from real samples and must not be represented by UI-only labels.

Browser validation must prove Bitcrusher changes exported audio. A test should import a generated tone, export the baseline render, enable Bitcrusher with low bit depth, high rate reduction, full mix, and output trim, export again, parse both WAV files, and confirm measurable waveform change while preserving WAV format, frame count, and usable output level.

### Overdrive And Hard Clip Track Effect
Users can enable a first-pass Overdrive/Hard Clip device on a selected track. The device exposes real browser-backed parameters:
- `overdrive.drive`
- `overdrive.clip`
- `overdrive.tone`
- `overdrive.mix`
- `overdrive.output`

The first implementation uses Web Audio gain/waveshaper-style hard clipping, tone filtering, wet/dry mix, and output trim stages in both preview playback and OfflineAudioContext WAV export. Disabled Overdrive must bypass the signal. Drive pushes signal into the clipping curve, clip controls the hard threshold, tone darkens or brightens the clipped path, mix blends dry and clipped signal, and output compensates level. This device must sound more aggressive and squared-off than Saturation, which remains the smoother tanh-style color device.

Browser validation must prove Overdrive changes exported audio. A test should import a generated WAV, export the baseline render, enable Overdrive with high drive, low clip threshold, full mix, and output trim, export again, parse both WAV files, and confirm measurable waveform change while preserving WAV format, frame count, and usable output level.

### Local Project Persistence
The app can save and reload project metadata locally. Large source audio storage must use a browser-appropriate strategy and must warn when files are missing or no longer accessible.

## UI Mockup
The UI remains the Phase 1 DAW shell. Editing commands use the existing bottom toolbar and contextual inspector. Export uses the existing header export action and should display concise progress or error feedback. Track effects live in the existing Effects inspector tab.

Mobile layout remains out of scope unless owner requests it.

## Behavior & Logic Notes
All destructive-sounding commands must be non-destructive unless a future phase explicitly defines destructive editing. Speed changes that intentionally affect pitch can use playback-rate style behavior. Pitch-preserving time-stretch and duration-preserving pitch shift require a real DSP path and must not be faked. Export validation checks timeline duration, available source buffers, and supported format settings before rendering. Effects must be part of the same preview/render graph so exported audio matches what the user heard.

Source-overage is not destructive and is not a waveform generation feature. It is a visual and timing state that tells the user the clip is longer than the available mapped source. The audio engine must treat that area consistently during preview and export.

## Dependencies
- Phase 1 completed.
- Phase 2 completed.
- A documented browser storage strategy.

## Acceptance Criteria
- Users can perform trim, split, move, gain, fade, pan, reverse, and export on real imported audio.
- Split, trim, delete, reverse, and fade controls operate on selected clips without altering the original source blob.
- Splitting a clip creates the right-side split segment on a new adjacent audio layer instead of leaving both split pieces visually cramped on the same layer.
- Moving or resizing an audio clip never leaves it overlapping another clip on the same audio layer; the edited clip is promoted to an adjacent layer when needed.
- Legacy saved projects with same-lane overlapping audio clips are repaired on load/save so each overlapping clip occupies its own readable lane.
- Left and right timeline resize handles both work; left resize updates start, source offset, duration, fades, and automation atomically.
- Dragging or resizing a clip beyond source length shows a source-overage region by default instead of fake waveform.
- Dragging the left edge before source time `0` shows left-side source-overage and does not pull or trim the original audio earlier.
- Source-overage regions are silent unless a documented real loop/stretch/freeze/tail mode is enabled.
- Users can slow/speed clips with pitch linked and with pitch preserved.
- Users can raise/lower pitch without changing clip duration.
- Pitch edits can show constrained timeline stretch/compression as a visual density aid.
- Pitch visual density compresses more freely than it stretches, while both directions keep readable min/max bounds.
- Users can enable cave reverb on a track and hear it during preview.
- Users can enable Graphic EQ on a selected track and hear/export the band gain changes.
- Graphic EQ settings are saved as project effect metadata and disabled EQ is bypassed.
- Users can enable Compressor and Limiter on a selected track and exported WAV output measurably reflects the dynamics settings.
- Dynamics settings are saved as project effect metadata and disabled dynamics devices are bypassed.
- Users can enable Delay/Echo on a selected track and exported WAV output measurably reflects delayed tail audio.
- Users can enable Noise Gate/Expander on a selected track and exported WAV output measurably reduces low-level material without muting the intended louder signal.
- Users can enable Chorus on a selected track and exported WAV output measurably reflects modulated delay thickening.
- Users can enable Flanger on a selected track and exported WAV output measurably reflects short-delay comb-filter modulation.
- Users can enable Vibrato on a selected track and exported WAV output measurably reflects pitch/time modulation.
- Delay/Echo settings are saved as project effect metadata and disabled delay is bypassed.
- Users can enable Saturation on a selected track and exported WAV output measurably reflects waveshaping color.
- Saturation settings are saved as project effect metadata and disabled saturation is bypassed.
- Users can enable Bitcrusher on a selected track and exported WAV output measurably reflects bit-depth and sample-rate reduction.
- Bitcrusher settings are saved as project effect metadata and disabled Bitcrusher is bypassed.
- Users can enable Overdrive/Hard Clip on a selected track and exported WAV output measurably reflects aggressive clipping.
- Overdrive settings are saved as project effect metadata and disabled Overdrive is bypassed.
- Export to WAV produces a downloadable file from real rendered project audio.
- Export opens a dedicated settings menu before rendering once the advanced export workflow is implemented.
- The advanced export menu supports validated WAV output and only exposes MP3 after real browser-backed MP3 rendering is available.
- Speed changes do not silently move existing timeline-locked keyframes.
- Exported output audibly reflects the edited project.
- Project state can be saved and reopened locally.
- Export failures are reported without claiming success.
