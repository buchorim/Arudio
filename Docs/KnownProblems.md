# Arudio Known Problems

Arudio is under active development. This list exists so users and contributors can see the honest rough edges.

## Automation and Keyframes

- Some effect automation workflows can still feel hard to understand.
- Users may expect every slider movement to become automation automatically, but Arudio still separates base effect values from keyframed values.
- Visual keyframe feedback needs more polish when many parameters exist at one diamond.
- Speed automation is not complete.
- Cubic-bezier graph editing is planned in the product direction but not available as a full graph editor.

## Pitch and Time Stretch

- Pitch and speed are not yet powered by a full professional phase-vocoder or PSOLA engine.
- Pitch/speed independence needs deeper DSP work.
- Formant shifting, pitch correction, and harmonizer workflows are not implemented.

## Large Projects

- Very large timelines need more performance profiling.
- Browser memory use depends on audio length, sample rate, and imported source count.
- Local browser storage limits vary by browser and device.

## Advanced Restoration

The following restoration features are not implemented:

- Noise profile reduction
- Click/pop removal
- Hum removal
- De-clip
- Spectral repair

## Plugin and API Support

- Plugin support is planned but not implemented.
- API support is planned before plugin implementation.
- External effect/plugin sandboxing has not been designed in production detail yet.

## Browser Differences

- Chromium-based browsers are the primary tested target.
- Audio behavior and storage behavior can differ across browsers.
- Clearing browser data can remove locally stored audio blobs.

## Release Readiness

- Arudio is not a stable 1.0 release yet.
- Some workflows still need UX polish before broad non-technical use.
- The repo may change quickly while core architecture and workflow details are being finalized.

## Reporting Problems

Please open an issue with exact reproduction steps, browser, operating system, audio format, and screenshots or recordings when useful.
