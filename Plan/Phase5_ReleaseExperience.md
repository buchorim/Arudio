# Phase 5 — Release Experience

## Goal
Create a polished in-app release communication system so every meaningful Arudio update feels intentional, traceable, and easy for users to understand without mixing release messaging into the editor workflow.

## Scope
- Add a What's New surface for new versions.
- Add a changelog page inside the app.
- Add release banner support for each public update.
- Add settings entries for release notes, app version, and update visibility.
- Keep release content user-facing and separate from internal implementation notes.

## Features in This Phase

### Update Banner
When a new user-facing update is available, Arudio shows a compact banner that presents the version, short release title, and one primary action to view details. The banner must not block editing controls, must be dismissible, and must remember the dismissed version through local settings. If the user has already seen the active version, the banner stays hidden.

### What's New Modal
The What's New modal shows the latest release title, version, release date, banner image, and short user-facing changes. It supports sections for new features, changed behavior, fixes, and notes. Empty sections are omitted. The modal never lists internal refactors, dependency changes, file renames, or developer-only work.

### Changelog Page
The changelog page lists previous public releases in reverse chronological order. Each entry includes the release banner, version, release date, short title, and user-facing notes. The page must be reachable from app settings and must support a clean empty state before the first public release.

### Release Banner Assets
Each public changelog entry starts with a generated banner image. The first banner establishes the Arudio release visual style: dark editor-inspired background, strong product UI mockups, sharp corporate composition, and restrained brand color. Later banners must visually match the established style.

### Settings Integration
App settings show the installed version, a button to open What's New, a button to open the full changelog page, and the user's last seen release state. Project settings remain focused on project-specific audio/session configuration and must not include release messaging.

### Initial In-App Release Notes Slice
The first implementation slice adds bundled release metadata, a compact What's New modal, a full changelog modal, command palette access, and app settings buttons. This slice is not a public 1.0 Beta release by itself. It uses user-facing release text and real persisted `lastReleaseSeen` state so the release system is functional before public banner assets are prepared.

The modal must be dense and editor-like. It shows the latest version, title, release date, short summary, and non-empty sections for What's New, Changed, Fixed, and Notes. The changelog view lists all bundled entries in reverse chronological order. Closing the latest What's New marks that version as seen. Opening either view must not change project state, selected clips, playback state, timeline position, or unsaved project metadata.

Public release banner images remain required before any public 1.0 Beta handoff. Until a generated release banner asset exists, this initial slice must avoid pretending a public release banner is complete.

## UI Mockup
Desktop layout:

```txt
+--------------------------------------------------------------------------+
| Update Banner: Arudio 0.x.x Beta — Short Release Title        What's New |
+--------------------------------------------------------------------------+
| Editor UI                                                                 |
+--------------------------------------------------------------------------+

+---------------------- Settings ----------------------+
| App Preferences                                      |
| Version: Arudio 0.x.x Beta                           |
| [What's New] [Changelog]                             |
+------------------------------------------------------+

+--------------------- Changelog ----------------------+
| Banner Image                                         |
| Arudio 0.x.x Beta — Release Title                    |
| What's New / Changed / Fixed / Notes                 |
| Banner Image                                         |
| Arudio 0.x.x Beta — Previous Release                 |
+------------------------------------------------------+
```

Mobile layout uses a full-screen release notes view with the same content order and no overlapping controls.

Empty state: the changelog page states that no public changelog entries exist yet.

Loading state: release notes load from bundled local metadata first; remote update checks are outside this phase unless a later phase defines them.

Main interactions: dismiss banner, open What's New, open changelog, scroll changelog, close modal, and return to the editor without losing project state.

## Behavior & Logic Notes
Release notes are data-driven from versioned release metadata. Dismissed version state is stored in app settings. Public release copy must stay user-facing and must match the changelog rules in `Rules.md` and the owner prompt. Banner images are generated assets, not CSS-only or script-rendered graphics.

## Dependencies
- Phase 1 local app settings.
- Release metadata structure.
- Generated release banner image for each public release.

## Acceptance Criteria
- A new release can show a compact update banner once per version.
- Users can open What's New from the banner and app settings.
- Users can open a full changelog page from app settings.
- Changelog entries omit empty sections and internal-only changes.
- Each public changelog entry includes a generated release banner image.
- Dismissing the banner persists through reloads.
- The initial in-app release notes slice lets users open What's New and Changelog from app settings and command palette without disturbing the current project or editor selection.
