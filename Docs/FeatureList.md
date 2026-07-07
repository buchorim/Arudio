# Arudio Feature List

This document lists the user-visible features currently present in the repository. Some areas are actively being refined, especially automation behavior and advanced DSP quality.

## Project Workflow

- Local project creation
- Local project save state
- Duplicate project support
- Project settings for BPM, time signature, key, and basic metadata
- Local library project list
- App settings modal
- Release notes and changelog modal
- Fatal error popup that shows verbatim browser errors
- Right-click quick action menu for common editor actions

## Audio Import and Storage

- Import local audio files through the browser file picker
- Multi-file upload support
- Decoded waveform peak generation
- Audio source metadata storage
- IndexedDB-backed local audio blob storage
- Source availability checks for playback/export readiness
- Missing-source handling when browser local storage is cleared

## Timeline and Editing

- DAW-style timeline lanes
- Clip selection
- Clip movement
- Layer reorder by dragging layer names
- Split selected clip
- Split-to-new-layer behavior
- Delete clip
- Trim clip start to playhead
- Trim clip end to playhead
- Left and right source-overage indicators
- Honest waveform coverage for decoded source regions
- Collision guard for overlapping same-lane clips
- Timeline zoom buttons
- Ctrl-wheel timeline zoom
- Timeline horizontal viewport slider
- Ruler click seek
- Timeline pan controls
- Full-height grid, marker, and playhead guides for tall sessions

## Clip Controls

- Gain
- Pan
- Pitch
- Speed
- Fade in
- Fade out
- Reverse
- Clip range display
- Source readiness signal

## Playback

- Browser preview playback using Web Audio
- Master volume
- Track mute and solo
- Track volume and pan
- Movable playhead during playback
- Selected-clip loop
- Whole-project loop
- Loop-at-clip-end restart behavior
- Playback cache status labels for active and pending generation states

## Markers and Beat Workflow

- Timeline markers
- DJ-style beat markers
- Frame-locked beat storage
- Double-click ruler beat creation
- Tap beat at playhead
- Beat hit feedback on playhead when playback crosses a marker
- Marker selection and deletion

## Automation and Keyframes

- Compound diamond keyframe markers on clips
- Clip gain automation
- Linked pitch automation
- Supported effect-parameter automation through track automation lanes
- Keyframe add, previous, next, and delete actions
- Keyframe time editing
- Easing presets for compound keyframes
- Compound keyframe summaries in the editor
- Bottom quick keyframe editor

Automation remains a priority polish area. The intended model is one visible diamond at a timeline time carrying all supported parameter values.

## Effect Devices

Current implemented effect devices include:

- Graphic EQ with 9 gain bands
- Filter with high-pass, low-pass, and notch parameters
- Compressor
- Noise Gate / Expander
- Limiter
- Saturation
- Overdrive / Hard Clip
- Bitcrusher
- Chorus
- Flanger
- Phaser
- Tremolo / Auto-Pan
- Vibrato
- Ring Modulator
- Cave Reverb
- Delay / Echo

Effect devices are exposed through compact rack cards and the right-side effects panel.

## Export

- Export Settings popup before render
- WAV export
- MP3 export
- Output filename control
- Full project export range
- Selected clip export range
- Loop range export
- Custom time range export
- Sample rate selection
- Bit depth options for WAV
- Bitrate options for MP3
- Mono/stereo channel mode
- Peak normalization option
- Dither option for reduced WAV bit depth

## Validation

The repo includes Playwright browser validation for many core workflows, including:

- Import readiness
- Source blob persistence
- Playback readiness messages
- Loop behavior
- Exported WAV structure
- Source-overage silence
- Cache labels
- Timeline pan and zoom
- Marker and beat behavior
- Effect export behavior
- Export settings and MP3 export

Run:

```bash
npm run lint
npm run test:audio-readiness
npm run build
```
