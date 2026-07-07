# Contributing to Arudio

Thanks for caring enough to improve the editor.

## Good Issues

Please open an issue for:

- Audio import or playback bugs
- Export problems
- Timeline, marker, loop, or keyframe behavior that feels wrong
- UI overlap, clipping, or density problems
- Effect parameter bugs
- Performance problems with larger sessions
- Documentation gaps

## Useful Bug Reports

Include:

- Browser and version
- Operating system
- Steps to reproduce
- What you expected
- What actually happened
- Audio format and approximate duration
- Screenshot or screen recording when the issue is visual

## Development

```bash
npm install
npm run dev
npm run lint
npm run test:audio-readiness
npm run build
```

## Project Standards

- Keep the editor UI compact and work-focused.
- Do not add fake audio behavior.
- Document feature work in `Plan/` before implementation.
- Validate browser audio and export behavior when changing audio logic.
- Keep error messages explicit.
- Do not commit `node_modules`, `dist`, logs, local env files, Playwright reports, or test output.

## Credits

Please keep project credit to Arudio by Arinara Network in forks and distributions.
