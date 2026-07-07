# Phase 10 — Plugin System

## Goal
Add a plugin system only after effect automation, API support, and the advanced export workflow are ready. This matters because plugins should extend a stable product, not become a workaround for unfinished core editing behavior.

## Scope
- Define plugin capabilities and safety boundaries.
- Allow plugins to register commands, panels, presets, effect wrappers, analysis tools, or export helpers only through approved APIs.
- Add plugin install/load state only after owner confirmation to start this phase.
- Keep browser-first execution, validation, and source ownership rules intact.

## Features in This Phase

### Plugin Phase Stop Gate
Before coding starts on plugins, development must pause and notify the owner that Arudio is entering the plugin phase. No plugin scaffolding, plugin runtime, marketplace UI, or plugin API exposure should be implemented before that explicit stop-and-notify moment.

### Plugin Manifest
Each plugin uses a manifest that declares name, version, capabilities, permissions, commands, UI surfaces, and compatible Arudio API version.

### Plugin Runtime Boundary
Plugins run through a controlled boundary and call the Arudio API instead of mutating project state directly. Errors are isolated and visible.

### Plugin UI Surfaces
Plugin UI can appear in approved locations such as command palette entries, focused panels, effect detail drawers, or analysis panes. Plugins must not clutter the main timeline or pretend to be core features.

### Plugin Validation
Plugin loading, disabling, failure handling, and API compatibility checks must be validated before any plugin feature is considered complete.

## UI Mockup
Initial plugin management should be compact:

```txt
+-------------------------------+
| Plugins                       |
| Installed                     |
| [ ] Example Plugin            |
| Permissions: commands, panel  |
|                               |
| [Disable] [Settings]          |
+-------------------------------+
```

## Behavior & Logic Notes
Plugins must not bypass import/export safety, source blob access rules, automation timing rules, or audio engine validation. Native desktop audio plugin formats are out of scope unless a later phase creates a separate native host architecture.

## Dependencies
- Phase 4 full effect-parameter automation expansion completed.
- Phase 8 API support completed.
- Phase 9 advanced export workflow completed.
- Owner has been notified and confirms plugin implementation can begin.

## Acceptance Criteria
- Development stops and notifies the owner before plugin implementation begins.
- Plugin capabilities are permissioned and validated.
- Plugins interact through stable Arudio APIs only.
- Plugin errors do not corrupt projects or playback/export state.
- Plugin UI remains compact and does not create parameter scroll walls.
