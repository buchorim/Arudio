# Arudio

Arudio is a browser-first audio mixer and editor built with Svelte and Vite. It aims to feel like a compact DAW-style tool: import audio, arrange clips on a timeline, shape the sound with effects, add automation/keyframes, mark beats, loop sections, and export the result from the browser.

This project is still moving fast. The UI and workflow are the priority, while deeper audio-engine behavior is being improved step by step.

## Why Arudio

- Browser-based editing without a native audio backend.
- Dense editor UI made for repeated audio work, not a marketing landing page.
- Real imported audio playback and export path using Web Audio and OfflineAudioContext.
- Compact controls for effects, timeline, keyframes, project settings, and export settings.
- Designed for creators who want a lightweight editor that can grow toward serious production workflows.

## Get Started

Requirements:

- Node.js 20 or newer
- npm
- A modern Chromium-based browser is recommended for development testing

Install and run:

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:3000/
```

Install on Windows:

```powershell
.\InstallArudio.ps1
```

or double-click:

```txt
InstallArudio.bat
```

Install and launch after setup:

```powershell
.\InstallArudio.ps1 -StartAfterInstall
```

Build for production:

```bash
npm run build
```

Run local validation:

```bash
npm run lint
npm run test:audio-readiness
```

Windows quick launch:

```powershell
.\StartArudio.ps1
```

or double-click:

```txt
StartArudio.bat
```

## Main Benefits

- Fast local workflow for audio experiments.
- No server upload required for normal local project work.
- Project metadata is stored locally in the browser.
- Audio source blobs are stored locally through IndexedDB.
- Export settings are visible before rendering.
- Clear known-problem tracking so rough edges are not hidden.

## Use Cases

- Quick edits for short-form audio.
- DJ-style beat marking and loop preview.
- Trying effect chains before committing to a larger DAW session.
- Browser audio-engine experiments.
- UI/UX research for compact creative tools.
- Learning how Web Audio, timeline state, export rendering, and Svelte UI can work together.

## Feature Overview

Available feature families include:

- Multi-file audio import
- Clip timeline editing
- Split-to-new-layer workflow
- Clip gain, pan, pitch, speed, fades, reverse
- Timeline zoom, pan, ruler seek, and viewport slider
- Beat markers and timeline markers
- Loop playback for project or selected clip
- Playback cache status labels
- Effect rack and effects inspector
- Graphic EQ, Filter, Compressor, Gate, Limiter, Saturation, Overdrive, Bitcrusher, Chorus, Flanger, Phaser, Tremolo/Auto-Pan, Vibrato, Ring Modulator, Cave Reverb, Delay/Echo
- Compound diamond keyframes for supported clip and effect parameters
- Export settings popup
- WAV export
- MP3 export through a browser encoder
- App settings, release notes, fatal error popup, and right-click quick action menu

Read the detailed feature list in [Docs/FeatureList.md](Docs/FeatureList.md).

## Known Problems

Arudio is not at a stable 1.0 release yet. Known problem areas include:

- Some keyframe and effect automation workflows can still feel confusing.
- Pitch/speed independence is not yet a full professional phase-vocoder implementation.
- Large projects need more performance profiling.
- Plugin support is planned but not implemented.
- Advanced restoration tools such as spectral repair, de-clip, and noise profile reduction are not implemented.

Read the current public problem list in [Docs/KnownProblems.md](Docs/KnownProblems.md).

## Pros

- Runs in the browser.
- Real audio import/export path exists.
- UI is compact and editor-focused.
- Many effect devices are already wired into preview/export.
- MP3 and WAV export settings are visible before rendering.
- Good foundation for automation, plugins, and API support.

## Cons

- Not a replacement for mature DAWs yet.
- Some advanced DSP features are planned rather than finished.
- Browser audio behavior can vary by device and browser.
- Local browser storage can be cleared by the user or browser settings.
- Complex automation workflows still need more UX polish.

## Project Structure

```txt
src/        Svelte app, audio engine, export encoders, stores, and UI components
Tests/      Playwright browser validation
Plan/       Product plan, phase specs, and progress tracking
Docs/       Public feature and known-problem documentation
assets/     Static project assets
```

## Contributing

Issues and improvement ideas are welcome. Please open an issue with:

- What you expected
- What happened
- Steps to reproduce
- Browser and OS
- Audio format used, if relevant
- Screenshot or screen recording when possible

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Arudio is released under a custom permissive attribution license. You may use, copy, modify, distribute, and use it commercially, as long as credit is kept.

See [LICENSE](LICENSE).

## Credits

- Created by Arinara Network.
- Collaboration With Gpt 5.5.
- Built with Svelte, Vite, Web Audio API, Playwright, Lucide icons, and a browser MP3 encoder.

Made with love.
