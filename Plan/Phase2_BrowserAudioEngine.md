# Phase 2 — Browser Audio Engine

## Goal
Replace demo playback with a real browser audio engine that can import, decode, preview, mix, and render audio clips in a way that supports future professional-style editing.

## Scope
- Add local audio file import and decoding.
- Persist imported audio blobs locally in browser storage and keep project metadata in the project record.
- Represent audio sources, tracks, clips, gains, pans, fades, mute, solo, and master volume as project data.
- Use Web Audio API for preview playback and OfflineAudioContext for rendering.
- Add honest source-coverage metadata so waveform rendering knows where real decoded audio ends.
- Add playback generation cache tracking so active playback can keep using the old rendered state while new edits are pending.
- Keep browser performance and memory limits explicit.

## Features in This Phase

### Audio Import And Clip Creation
Users can import audio files from the browser file picker. Supported files are decoded to audio buffers when the browser supports the format. Decode errors must be shown clearly. Imported files create audio source metadata, store the original file blob locally, create one audio track per imported file, and create a timeline clip at the current playhead without changing unrelated clips. Waveform peaks must be derived from decoded audio samples, not generated shapes.

### Honest Waveform And Source Coverage
Waveform rendering must know the clip's source coverage window: source start, source end, playback rate mapping, reverse state, and available decoded source duration. The visible waveform may only be drawn for timeline regions that map to real decoded audio samples. If a clip is dragged, resized, slowed, or otherwise extended beyond available source audio, the overage region remains visible inside the clip boundary as a distinct ghost or empty region. It must not repeat, stretch, or fabricate waveform peaks.

The source-overage indicator is enabled by default because it helps users understand why a selected clip outline extends past the audible source. In the selected clip state, the overage boundary may appear as a subtle mark inside the white stroke, with the overage side shaded or patterned. Playback for overage regions is silent unless a future documented loop, freeze, stretch, or generated tail mode is enabled and implemented in both preview and export.

### Local Audio Source Storage
Imported source blobs are stored in IndexedDB by source id. Project data stores only source metadata and clip references so localStorage is not overloaded by large audio binary data. Opening a project with missing source blobs must keep the project readable and show a clear playback/import error instead of silently replacing audio.

### Preview Mixing
Playback routes clips through clip gain, pan, fade, track gain, track pan, mute, solo, and master gain nodes. The playhead determines which clips are audible. Clips scheduled after the playhead should begin at their timeline position. Errors in blob loading, decoding, or node setup stop playback and surface a clear message.

While playback is running, the user can move the playhead. The transport must seek to the requested timeline position using the active playback generation instead of snapping back to the previous engine clock. If project parameters changed during playback and a newer generation is pending, the seek still uses the active old generation until playback is stopped or restarted. This makes transport behavior predictable: running playback stays stable, pending edits are visible, and the user chooses when to hear the newly rendered state.

Playback readiness must be based on real imported audio sources and accessible source blobs, not only a stale in-memory boolean. Pressing Space after an audio file has been imported must not show "Import audio before playback" if the active project contains playable clips. If a source blob is missing or cannot decode, the error should say that the source is missing or failed to load instead of incorrectly asking for import.

The readiness states must be explicit:
- No project: create or open a project first.
- No clips: import audio before playback.
- Clip missing source metadata: name the affected clip or missing source metadata.
- Source blob check in progress: keep the project usable when source metadata exists, while the background check confirms local file availability. Playback/export still load the real blob and surface a specific missing-file error if storage fails at action time.
- Source blob missing: name the missing audio source file and explain it is unavailable in local storage.
- Source blob available: enable Space/play/export.

After import, newly saved blobs are marked available immediately. After project open, app reload, source deletion, local data reset, or project metadata normalization, Arudio re-checks the active project's required source blobs asynchronously. The UI must not get stuck in a permanent checking state; if source metadata exists and the check has not proven a failure, playback may proceed through the real blob-loading path. If the check proves a blob is missing or storage errors, playback/export controls must show the specific failure.

### Automated Imported-Audio Validation Harness
Arudio must include a focused browser validation harness for imported-audio readiness because normal DOM smoke tests cannot prove native file input, IndexedDB blob persistence, playback readiness, loop control, or export state. The harness generates a tiny valid WAV fixture at runtime, uses a real browser file input upload, imports the file through the normal UI, verifies a real clip appears, checks that play/export controls become ready after source blob availability is confirmed, toggles loop, starts playback briefly, and cleans the local project state afterward.

This harness is development-only validation. It must not add fake audio paths, demo clips, product test buttons, or user-visible shortcuts to the app. Failure of the harness keeps the relevant 1.0 readiness item open.

The harness must also cover storage-loss downgrade behavior before 1.0. After a real imported file has been saved and reloaded, a test clears the source blob from IndexedDB while leaving project metadata intact, reloads the editor, and verifies that playback/export controls show the specific missing local file message instead of the generic import prompt. This protects the owner-reported Space/playback bug from returning when local browser storage is cleared, evicted, or corrupted.

Multi-clip loop validation belongs in the same harness because loop playback depends on both imported media and live transport state. A test project with more than one imported clip must prove that enabling loop with a selected eligible clip and the playhead inside that clip loops that clip's start/end range, while seeking during active loop playback stays inside the current loop region and keeps the active cache generation stable until stop/restart. The harness must also cover the edge case where playback starts at a clip's exact end boundary: loop mode should restart from that clip/source start, not from timeline `0:00`.

### Loop Playback Engine
The preview engine must support a loop region supplied by the UI. If loop is enabled with an eligible selected clip and the playhead is inside that clip or at that clip's end edge, the loop region is the selected clip start/end. If no eligible selected clip is active but the playhead is inside or on the end edge of another clip, that clip becomes the loop region before falling back to the whole project. If no clip-local loop region is eligible, the loop region is the full playable project duration. When playback reaches the region end, it seeks back to the region start and continues without clearing the active playback generation.

Looping must respect active playback cache behavior. If a pending generation exists during loop playback, the audible loop keeps using the active old generation until the user stops or restarts playback. Seeking inside a loop must stay within the active loop region unless the user disables loop or chooses a different region.

### Playback Generation Cache
The preview engine tracks playback cache generations. The active generation is the audio state currently being heard. When the user changes a parameter during playback, Arudio creates or marks a pending generation for the new project state while the active generation continues playing. The old cache must not be released while it is still audible. When playback stops, Arudio releases obsolete old cache data and promotes or prepares the newest valid state for the next playback.

The UI can show cache frame information for debugging and professional confidence: active generation, pending generation, cached frame count or duration, stale state, and release state. Old and new cache generations must use two distinct colors in the timeline/status display so users can see when playback is hearing the previous state while a newer edit is queued.

Cache info must be visible enough to understand progress at a glance. The active old generation and pending new generation should each show a compact label, frame count or duration, and readiness/progress state. The display should make it obvious whether playback is hearing old state, waiting on new state, or fully current.

Until Arudio has a true background cache renderer with measurable progress percentage, the cache UI must not fake a progress bar. The 1.0 cache completion slice uses honest readiness labels instead: the active pill says whether it is the current audible cache or an old audible cache, the pending pill says it is queued for the next playback start/restart, and a compact note states that the old audible cache releases on stop. Both generations must still show frame count and duration so users can inspect what is currently safe to play.

Before 1.0, active playback cache behavior must be validated in a browser with imported audio outside loop mode. A test must start playback from a real imported clip, change a supported clip parameter while playback continues, verify the active cache changes to an "old cache" state while a distinct "new cache" generation appears, seek the playhead during playback, and prove the active generation does not change or snap back until the user stops/restarts playback. Stopping playback must clear the cache display so obsolete audible state is released.

### Live Parameter Mutation During Playback
Some parameter edits must be able to update the active Web Audio graph while playback continues, without requiring the user to stop and press play again. This applies first to live-safe parameters that map to existing AudioParams or gain stages: clip gain/pan where nodes are still active, track volume/pan, EQ band gain, compressor threshold/ratio/attack/release/knee/makeup/mix, limiter ceiling/input/release/mix, reverb wet amount, and master volume.

Structural edits still use the existing pending-cache behavior. Structural edits include importing or deleting source audio, split/trim/delete clips, moving clips, changing source offsets, changing playback windows, changing reverse state, changing timeline duration, rebuilding an effect chain, and parameters that require replacing a node in a way that could glitch. For these edits, the old active cache may keep playing while a new state is queued, and the UI must keep showing the old/new cache distinction honestly.

The first live-mutation implementation should update active track effect nodes for currently playing clips and validate at least one audible parameter during playback. It should not claim every edit is real time until the corresponding active-node controller exists and is browser-validated.

### Offline Render Foundation
The app can render the current project timeline to an internal audio buffer using OfflineAudioContext. The render path must reuse the same source loading and mix rules as preview playback. Export format support is limited until release rules define the user-facing output.

Before 1.0, the imported-audio validation harness must prove the offline render path with a real browser download. The test imports a generated WAV through the normal file input, triggers the visible Export WAV action, saves the downloaded file, parses the RIFF/WAVE header, and checks project sample rate, stereo channel count, rendered frame count, data chunk size, and non-silent PCM samples. This validation is required because a visible export button is not enough evidence that OfflineAudioContext rendered real imported audio.

## UI Mockup
Desktop layout extends Phase 1 without changing the shell. Import controls appear in existing toolbar/sidebar surfaces. Clip waveforms reflect imported audio where available. Loading and decoding states appear inline near the relevant track or action.

Source-overage regions appear inside the clip body at the end of real source coverage. Cache status appears in a compact transport or signal area with two colors: one for the active audible cache and one for the pending new cache.

Mobile layout remains secondary until a dedicated responsive phase.

## Behavior & Logic Notes
Audio buffers should be cached by source id during a session to avoid repeated decode work. Playback generations are separate from source buffer caches: source buffers represent decoded media, while playback generations represent scheduled or rendered parameter states. Long files need visible import state while the browser decodes. Unsupported formats must fail explicitly. Demo tone playback from Phase 1 stays removed; playback is allowed only when real source blobs exist.

Moving the playhead during active playback is a transport operation, not a project edit. It must not dirty the project. Live-safe parameter changes during active playback dirty the project and may update existing active nodes immediately. Structural edits and unsupported parameters still create a pending generation that becomes audible only after playback is stopped or explicitly restarted.

## Dependencies
- Phase 1 completed.
- Browser Web Audio API support.

## Acceptance Criteria
- At least one imported audio file can be decoded, placed, previewed, and mixed.
- Waveform clips are based on decoded sample peaks from the imported file.
- Waveform display stops at real source coverage and shows source-overage separately when the clip extends beyond decoded audio.
- Imported audio source blobs persist locally through reloads.
- Mute, solo, clip gain, clip pan, track volume, track pan, and master volume affect real playback.
- Playback can continue using the active old cache while parameter edits create a pending new cache.
- Live-safe effect parameters can update active playback without requiring stop/play once their active-node controller is implemented and validated.
- Old and new playback cache generations are visually distinguishable.
- The playhead can be moved during playback without snapping back to the previous playback clock.
- Offline rendering produces an audio buffer with the expected duration.
- Missing or unsupported source files show clear errors and never create fake replacement audio.
- Demo-only playback is no longer present in the active engine.
