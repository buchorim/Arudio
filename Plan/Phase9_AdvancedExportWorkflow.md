# Phase 9 — Advanced Export Workflow

## Goal
Replace immediate export downloads with a serious export menu that gives users control over format and output settings before rendering. This matters because Arudio should feel like real production software before plugin support expands what users can do.

## Scope
- Open an export menu from the existing header Export action.
- Support validated WAV export through the menu.
- Add MP3 only when a real browser-backed encoder path exists.
- Add output settings for format, sample rate, bit depth, channel mode, render range, filename, normalization/loudness behavior, and dither where relevant.
- Add progress/readiness/error states for export jobs.

## Features in This Phase

### Export Menu
Clicking Export opens a compact modal or right-side drawer instead of immediately downloading. The menu shows selected project, render duration, output format, settings, estimated output summary, and an explicit Render/Export button.

### WAV Settings
WAV export supports sample rate, bit depth, channel mode, filename, render range, peak normalization, and dither where encoder support exists. Existing validated WAV behavior remains the baseline and must not regress. Bit-depth controls must alter the downloaded WAV header and sample packing, not only UI text.

### MP3 Settings
MP3 support appears only after a real encoder path exists. It should expose bitrate or quality mode, channel mode, filename, and format notes only when needed. If MP3 is not implemented yet, it must be hidden or disabled with a clear reason, not shown as a fake working option.

The first MP3 encoder slice uses the same OfflineAudioContext render path as WAV, then encodes the rendered PCM through a browser-side MP3 encoder. The MP3 option must create an actual `.mp3` download with MPEG frame sync bytes, respect sample rate, channel mode, filename, range, and peak normalization, and must not apply WAV-only bit-depth or dither claims to MP3 output. If encoding fails, the export menu shows the verbatim failure and does not download a corrupt file.

### Render Range
Users can export the full project, selected clip range, loop range, or custom time range where implemented. Ranges must use timeline time and must not move clips or keyframes. A non-zero export start creates a file that begins at output time 0 while automation and clips are evaluated at their original timeline positions.

### Loudness And Dither Controls
Normalization and loudness options must be explicit. Peak normalize, loudness normalize, and no normalize are separate choices. Dither appears only when reducing bit depth and should default safely.

### Export Progress And Errors
The menu shows a compact rendering state, validation errors, unsupported format reasons, and successful download state. Failed export must not create a corrupt file or claim success.

## UI Mockup
Desktop modal/drawer layout:

```txt
+--------------------------------------------------+
| Export                                           |
| Format: WAV v        Range: Full Project v       |
| Sample Rate: 48 kHz  Bit Depth: 24-bit           |
| Channels: Stereo     Normalize: Off              |
| Filename: Untitled Project.wav                   |
|                                                  |
| Summary: 00:45.50, stereo, 48 kHz WAV            |
| [Cancel]                              [Export]   |
+--------------------------------------------------+
```

Mobile and narrow layouts stack settings in one column with fixed footer actions. Empty state shows why export is unavailable, such as no playable audio or missing local source data.

## Behavior & Logic Notes
Opening the menu must not start rendering. Rendering starts only after the user confirms. Export settings are not destructive project edits unless the user explicitly saves them as project defaults later. Existing browser validation must be updated to drive export through the menu and inspect downloaded output.

## Dependencies
- Phase 3 WAV export foundation completed.
- Phase 8 export API boundary available or implemented in parallel.
- Plugin work has not started.

## Acceptance Criteria
- Header Export opens the export menu instead of immediately downloading.
- WAV export from the menu produces the same valid audio as the previous direct path.
- MP3 is hidden or disabled until real encoded MP3 output is available.
- MP3 export creates a real MPEG audio file through the browser encoder path and validates the downloaded file extension and frame header.
- Format, range, sample rate, bit depth/channel, filename, normalization, and dither settings are visible and validated.
- WAV bit depth changes the exported WAV header and sample packing for supported 16-bit and 24-bit output.
- Selected clip and custom ranges render the requested timeline section without shifting timeline-locked automation.
- Export progress, success, and failure states are explicit.
- Browser validation captures the menu-driven download and parses the result.
- This phase completes before Phase 10 plugin implementation begins.
