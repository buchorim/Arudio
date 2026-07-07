<!-- / - Arinara Network © 2026 - / -->
<!-- This source code is the exclusive property of Arinara Network. -->
<!-- Unauthorized use, reproduction, distribution, or modification of this -->
<!-- code — in whole or in part — for any purpose whatsoever is strictly -->
<!-- prohibited without prior written consent from Arinara Network as the -->
<!-- sole legal owner of this codebase. -->
<script lang="ts">
  import {onDestroy, onMount} from 'svelte';
  import {
    deleteKeyframeNearTime,
    evaluateAutomationValue,
    getAutomationLane,
    getSortedKeyframes,
    updateKeyframe,
    upsertKeyframe,
  } from './AutomationEngine';
  import {
    CLIP_AUTOMATION_PARAMETERS,
    clampClipAutomationParameterValue,
    getClipAutomationParameterByProperty,
    getClipAutomationParameterDefinition,
    getClipAutomationParameterValue,
    type ClipAutomationParameterDefinition,
    type ClipAutomationParameterId,
  } from './AutomationParameterRegistry';
  import {
    createAudioSourceRecord,
    decodeAudioBlob,
    renderProjectToAudioBuffer,
    startProjectPlayback,
    type PlaybackHandle,
  } from './AudioEngine';
  import {
    clearAudioSourceBlobs,
    deleteAudioSourceBlob,
    loadAudioSourceBlob,
    saveAudioSourceBlob,
  } from './AudioSourceStore';
  import {
    createBitcrusherDefaultParameters,
    createChorusDefaultParameters,
    createCompressorDefaultParameters,
    createDelayDefaultParameters,
    createFilterDefaultParameters,
    createFlangerDefaultParameters,
    createGateDefaultParameters,
    createGraphicEqDefaultParameters,
    createLimiterDefaultParameters,
    createOverdriveDefaultParameters,
    createPhaserDefaultParameters,
    createRingModulatorDefaultParameters,
    createSaturationDefaultParameters,
    createTremoloDefaultParameters,
    createVibratoDefaultParameters,
  } from './EffectParameters';
  import {
    EFFECT_AUTOMATION_PARAMETERS,
    clampEffectAutomationParameterValue,
    getEffectAutomationParameterByEffectParameter,
    type EffectAutomationParameterDefinition,
  } from './EffectAutomationParameterRegistry';
  import {encodeRenderedAudioBuffer} from './ExportEncoder';
  import AppSettingsModal from './Components/AppSettingsModal.svelte';
  import CommandPalette from './Components/CommandPalette.svelte';
  import ConfirmDialog from './Components/ConfirmDialog.svelte';
  import EffectRack from './Components/EffectRack.svelte';
  import ExportSettingsModal from './Components/ExportSettingsModal.svelte';
  import HeaderTimeline from './Components/HeaderTimeline.svelte';
  import NewProjectModal from './Components/NewProjectModal.svelte';
  import PlayerBottom from './Components/PlayerBottom.svelte';
  import ProjectSettingsModal from './Components/ProjectSettingsModal.svelte';
  import QuickContextMenu from './Components/QuickContextMenu.svelte';
  import type {QuickContextMenuItem} from './Components/QuickContextMenu.svelte';
  import ReleaseNotesModal from './Components/ReleaseNotesModal.svelte';
  import SidebarLeft from './Components/SidebarLeft.svelte';
  import SidebarRight from './Components/SidebarRight.svelte';
  import ToolbarBottom from './Components/ToolbarBottom.svelte';
  import TrackTimeline from './Components/TrackTimeline.svelte';
  import {
    addProject,
    clearAppState,
    createDefaultAppState,
    createProjectRecord,
    deleteProject,
    duplicateProject,
    getActiveProject,
    loadAppState,
    makeId,
    openProject,
    saveAppState,
    updateProject,
  } from './ProjectStore';
  import {getLatestReleaseNote, isLatestReleaseSeen, RELEASE_NOTES, type ReleaseNotesView} from './ReleaseNotes';
  import {APP_VERSION} from './Types';
  import type {ExportRange, ExportSettings} from './ExportTypes';
  import type {
    AppSettings,
    AppState,
    AutomationKeyframe,
    Clip,
    CommandPaletteCommand,
    DawTool,
    EffectInstance,
    NewProjectInput,
    PlaybackCacheStatus,
    ProjectRecord,
    TimelineMarkRecord,
    Track,
  } from './Types';

  type ConfirmIntent =
    | {kind: 'delete-project'; project: ProjectRecord}
    | {kind: 'reset-data'}
    | null;

  type SourceBlobAvailability = 'checking' | 'available' | 'missing' | 'error';

  interface LoopRange {
    start: number;
    end: number;
  }

  interface QuickContextMenuState {
    x: number;
    y: number;
    time: number;
    clipId: string | null;
  }

  interface CommandPaletteContext {
    project: ProjectRecord | null;
    clip: Clip | null;
    timelineMark: TimelineMarkRecord | null;
    automationTime: number | null;
    currentPlayhead: number;
    playbackReady: boolean;
    playbackReason: string | null;
    playing: boolean;
    loopEnabled: boolean;
    importingAudio: boolean;
    exportingAudio: boolean;
  }

  interface ToolbarToolContext {
    project: ProjectRecord | null;
    clip: Clip | null;
    timelineMark: TimelineMarkRecord | null;
    currentPlayhead: number;
  }

  interface EffectFocusRequest {
    id: number;
    effectType: EffectInstance['type'];
  }

  type CommandId =
    | 'play-pause'
    | 'stop'
    | 'import-audio'
    | 'export-wav'
    | 'save-project'
    | 'project-settings'
    | 'app-settings'
    | 'whats-new'
    | 'changelog'
    | 'toggle-loop'
    | 'split-clip'
    | 'trim-start'
    | 'trim-end'
    | 'delete-selection'
    | 'delete-timeline-mark'
    | 'add-clip-keyframe'
    | 'delete-clip-keyframe'
    | 'previous-clip-keyframe'
    | 'next-clip-keyframe'
    | 'enable-graphic-eq'
    | 'enable-filter'
    | 'enable-compressor'
    | 'enable-gate'
    | 'enable-limiter'
    | 'enable-saturation'
    | 'enable-overdrive'
    | 'enable-bitcrusher'
    | 'enable-chorus'
    | 'enable-flanger'
    | 'enable-phaser'
    | 'enable-tremolo-auto-pan'
    | 'enable-vibrato'
    | 'enable-ring-modulator'
    | 'enable-cave-reverb'
    | 'enable-delay-echo';

  const trackColors = ['#7dd3fc', '#f9a8d4', '#a7f3d0', '#fde68a', '#c4b5fd', '#fca5a5'];
  const minimumClipDuration = 0.05;
  const keyframeCollisionTolerance = 0.01;
  const beatHitToleranceSeconds = 0.035;
  const beatHitHoldMs = 700;
  const loopBoundaryToleranceSeconds = 0.025;
  const timelineDurations = [30, 60, 120, 240];
  const audioSourceDatabaseName = 'ArudioAudioSources';
  const audioSourceStoreName = 'AudioSourceBlobs';
  const clipGainAutomationParameter = getClipAutomationParameterByProperty('gain') as ClipAutomationParameterDefinition;
  const clipPitchAutomationParameter = getClipAutomationParameterByProperty('pitch') as ClipAutomationParameterDefinition;

  let appState: AppState = createDefaultAppState();
  let activeTool: DawTool = 'select';
  let selectedClipId: string | null = null;
  let selectedTimelineMarkId: string | null = null;
  let selectedGainKeyframeId: string | null = null;
  let selectedPitchKeyframeId: string | null = null;
  let selectedClipAutomationTime: number | null = null;
  let playhead = 0;
  let timelineZoomIndex = 2;
  let timelineViewportStart = 0;
  let isLeftSidebarCollapsed = false;
  let isRightSidebarCollapsed = false;
  let effectFocusRequest: EffectFocusRequest | null = null;
  let effectFocusRequestCounter = 0;
  let isLoopEnabled = false;
  let hasUnsavedChanges = false;
  let isImportingAudio = false;
  let isExportingAudio = false;
  let isPlaying = false;
  let toastMessage: string | null = null;
  let toastTimer: number | null = null;
  let beatPulseTimer: number | null = null;
  let storageWarning: string | null = null;
  let playbackGenerationCounter = 0;
  let playbackCacheStatus: PlaybackCacheStatus = createIdlePlaybackCacheStatus();
  let activePlaybackLoopRange: LoopRange | null = null;
  let sourceBlobAvailability: Record<string, SourceBlobAvailability> = {};
  let sourceBlobAvailabilitySignature = '';
  let sourceBlobAvailabilityCheckCounter = 0;
  let sourceBlobAvailabilityError: string | null = null;
  let showCommandPalette = false;
  let showNewProjectModal = false;
  let showProjectSettingsModal = false;
  let showAppSettingsModal = false;
  let showExportSettingsModal = false;
  let quickContextMenu: QuickContextMenuState | null = null;
  let exportSettings: ExportSettings | null = null;
  let exportErrorMessage: string | null = null;
  let releaseNotesView: ReleaseNotesView | null = null;
  let confirmIntent: ConfirmIntent = null;
  let audioInputRef: HTMLInputElement;
  let playbackHandle: PlaybackHandle | null = null;
  let beatPulseMarkId: string | null = null;
  let previousBeatPlayhead = 0;
  let previousBeatProjectId: string | null = null;

  $: activeProject = getActiveProject(appState);
  $: selectedClip = activeProject?.clips.find((clip) => clip.id === selectedClipId) ?? null;
  $: selectedTimelineMark = activeProject?.timelineMarks.find((mark) => mark.id === selectedTimelineMarkId) ?? null;
  $: projectDuration = activeProject ? getProjectDuration(activeProject) : 0;
  $: selectedClipCompoundKeyframeTimes = selectedClip ? getClipCompoundKeyframeTimes(selectedClip) : [];
  $: exportSelectedClipRange = selectedClip ? {start: selectedClip.startTime, end: selectedClip.startTime + selectedClip.duration} : null;
  $: exportLoopRange = activeProject && isLoopEnabled ? getLoopRange(activeProject, playhead) : null;
  $: quickContextClip =
    quickContextMenu && activeProject
      ? activeProject.clips.find((clip) => clip.id === quickContextMenu?.clipId) ?? selectedClip
      : selectedClip;
  $: playheadInsideSelectedClip =
    selectedClip ? playhead >= selectedClip.startTime && playhead <= selectedClip.startTime + selectedClip.duration : false;
  $: activeCompoundParameterCount =
    selectedClip && selectedClipAutomationTime !== null
      ? getCompoundParameterCountAtTime(selectedClip, selectedClipAutomationTime)
      : 0;
  $: activeCompoundEasing =
    selectedClip && selectedClipAutomationTime !== null
      ? getCompoundEasingAtTime(selectedClip, selectedClipAutomationTime)
      : 'linear';
  $: activeProjectSourceSignature = getActiveProjectSourceSignature(activeProject);
  $: if (activeProjectSourceSignature !== sourceBlobAvailabilitySignature) {
    void refreshSourceBlobAvailability(activeProject, activeProjectSourceSignature);
  }
  $: playbackReadiness = getPlaybackReadiness(activeProject, sourceBlobAvailability, sourceBlobAvailabilityError);
  $: hasPlayableAudio = playbackReadiness.ready;
  $: quickContextItems = buildQuickContextMenuItems(quickContextMenu, quickContextClip);
  $: latestReleaseNote = getLatestReleaseNote();
  $: latestReleaseSeen = isLatestReleaseSeen(appState.settings.lastReleaseSeen);
  $: updateBeatPulse(activeProject, playhead, isPlaying);
  $: activeBeatMarkId = activeProject ? getActiveBeatMarkId(activeProject, playhead) ?? getPulsingBeatMarkId(activeProject) : null;
  $: commandPaletteCommands = buildCommandPaletteCommands({
    project: activeProject,
    clip: selectedClip,
    timelineMark: selectedTimelineMark,
    automationTime: selectedClipAutomationTime,
    currentPlayhead: playhead,
    playbackReady: hasPlayableAudio,
    playbackReason: playbackReadiness.reason,
    playing: isPlaying,
    loopEnabled: isLoopEnabled,
    importingAudio: isImportingAudio,
    exportingAudio: isExportingAudio,
  });
  $: toolbarToolReasons = buildToolbarToolReasons({
    project: activeProject,
    clip: selectedClip,
    timelineMark: selectedTimelineMark,
    currentPlayhead: playhead,
  });
  $: timelineDuration = timelineDurations[timelineZoomIndex] ?? 120;
  $: timelineViewportStart = clampTimelineViewportStart(timelineViewportStart, timelineDuration, projectDuration);
  $: timelineViewportEnd = timelineViewportStart + timelineDuration;
  $: timelineZoomLabel = `${formatTimelineDuration(timelineDuration)} @ ${formatTimelineOffset(timelineViewportStart)}`;
  $: timelineLaneHeight = appState.settings.density === 'comfortable' ? 120 : 96;

  onMount(() => {
    const result = loadAppState();
    appState = result.state;
    storageWarning = result.error;
    window.addEventListener('keydown', handleGlobalKeydown);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeydown);
    };
  });

  onDestroy(() => {
    stopPlayback(false);
    if (toastTimer) {
      window.clearTimeout(toastTimer);
    }
    if (beatPulseTimer) {
      window.clearTimeout(beatPulseTimer);
    }
  });

  function buildCommandPaletteCommands(context: CommandPaletteContext): CommandPaletteCommand[] {
    const hasProject = Boolean(context.project);
    const hasSelectedClip = Boolean(context.clip);
    const playheadInsideClip = Boolean(context.clip && isTimeInsideClip(context.currentPlayhead, context.clip));
    const hasCompoundKeyframes = Boolean(context.clip && getClipCompoundKeyframeTimes(context.clip).length > 0);
    const hasSelectedTimelineMark = Boolean(context.timelineMark);
    const selectedTrack = getSelectedClipTrack(context.project, context.clip);
    const hasSelectedTrack = Boolean(selectedTrack);
    const selectedTrackReason = hasSelectedClip ? 'Selected clip track is missing' : 'Select a clip first';

    return [
      createCommand('play-pause', context.playing ? 'Pause Playback' : 'Play', 'Transport', 'Start or pause timeline playback.', 'Space', context.playbackReady, context.playbackReason),
      createCommand('stop', 'Stop And Reset', 'Transport', 'Stop playback and return to the start.', null, hasProject, 'Open or create a project first'),
      createCommand('toggle-loop', context.loopEnabled ? 'Disable Loop' : 'Enable Loop', 'Transport', 'Toggle selected-clip or project loop playback.', 'L', hasProject, 'Open or create a project first'),
      createCommand('import-audio', 'Import Audio', 'Project', 'Import local audio files into the active project.', null, hasProject && !context.importingAudio, hasProject ? 'Audio import is already running' : 'Create a project first'),
      createCommand('export-wav', 'Export Audio', 'Export', 'Open export settings for WAV or MP3 output.', null, context.playbackReady && !context.exportingAudio, context.playbackReady ? 'Export is already running' : context.playbackReason ?? 'Audio is not ready for export'),
      createCommand('save-project', 'Save Project', 'Project', 'Save local project metadata.', 'Ctrl+S', hasProject, 'Create a project first'),
      createCommand('project-settings', 'Project Settings', 'Project', 'Open session tempo, grid, and export settings.', null, hasProject, 'Create a project first'),
      createCommand('app-settings', 'App Settings', 'App', 'Open local app preferences.', null, true, null),
      createCommand('whats-new', "What's New", 'App', 'Open the latest Arudio release notes.', null, true, null),
      createCommand('changelog', 'Changelog', 'App', 'Open all bundled Arudio release notes.', null, true, null),
      createCommand('split-clip', 'Split Selected Clip', 'Edit', 'Split the selected clip at the playhead.', 'S', hasSelectedClip && playheadInsideClip, hasSelectedClip ? 'Move playhead inside the selected clip' : 'Select a clip first'),
      createCommand('trim-start', 'Trim Start To Playhead', 'Edit', 'Move selected clip start to the playhead.', '[', hasSelectedClip && playheadInsideClip, hasSelectedClip ? 'Move playhead inside the selected clip' : 'Select a clip first'),
      createCommand('trim-end', 'Trim End To Playhead', 'Edit', 'Move selected clip end to the playhead.', ']', hasSelectedClip && playheadInsideClip, hasSelectedClip ? 'Move playhead inside the selected clip' : 'Select a clip first'),
      createCommand('delete-selection', getDeleteSelectionTitle(context), 'Edit', 'Delete the active marker, keyframe, or selected clip.', 'Delete', Boolean(context.timelineMark || context.automationTime !== null || context.clip), 'Select a marker, clip, or keyframe first'),
      createCommand('delete-timeline-mark', 'Delete Timeline Mark', 'Timeline', 'Delete the selected red timeline mark.', null, hasSelectedTimelineMark, 'Select a timeline mark first'),
      createCommand('add-clip-keyframe', 'Add Clip Keyframe', 'Automation', 'Add one compound keyframe at the playhead.', 'K', hasSelectedClip && playheadInsideClip, hasSelectedClip ? 'Move playhead inside the selected clip' : 'Select a clip first'),
      createCommand('delete-clip-keyframe', 'Delete Clip Keyframe', 'Automation', 'Delete the selected compound keyframe or keyframe at the playhead.', 'Shift+K', hasSelectedClip && hasCompoundKeyframes, hasSelectedClip ? 'No keyframes on this clip' : 'Select a clip first'),
      createCommand('previous-clip-keyframe', 'Previous Clip Keyframe', 'Automation', 'Jump to the previous compound keyframe.', null, hasSelectedClip && hasCompoundKeyframes, hasSelectedClip ? 'No keyframes on this clip' : 'Select a clip first'),
      createCommand('next-clip-keyframe', 'Next Clip Keyframe', 'Automation', 'Jump to the next compound keyframe.', null, hasSelectedClip && hasCompoundKeyframes, hasSelectedClip ? 'No keyframes on this clip' : 'Select a clip first'),
      createCommand('enable-graphic-eq', 'Enable Graphic EQ', 'Effects', 'Enable the real selected-track Graphic EQ device.', null, hasSelectedTrack, selectedTrackReason),
      createCommand('enable-filter', 'Enable Filter', 'Effects', 'Enable the real selected-track high-pass, low-pass, and notch filter device.', null, hasSelectedTrack, selectedTrackReason),
      createCommand('enable-compressor', 'Enable Compressor', 'Effects', 'Enable the real selected-track compressor device.', null, hasSelectedTrack, selectedTrackReason),
      createCommand('enable-gate', 'Enable Noise Gate', 'Effects', 'Enable the real selected-track Noise Gate/Expander device.', null, hasSelectedTrack, selectedTrackReason),
      createCommand('enable-limiter', 'Enable Limiter', 'Effects', 'Enable the real selected-track limiter device.', null, hasSelectedTrack, selectedTrackReason),
      createCommand('enable-saturation', 'Enable Saturation', 'Effects', 'Enable the real selected-track saturation color device.', null, hasSelectedTrack, selectedTrackReason),
      createCommand('enable-overdrive', 'Enable Overdrive', 'Effects', 'Enable the real selected-track hard clipping device.', null, hasSelectedTrack, selectedTrackReason),
      createCommand('enable-bitcrusher', 'Enable Bitcrusher', 'Effects', 'Enable the real selected-track lo-fi bitcrusher device.', null, hasSelectedTrack, selectedTrackReason),
      createCommand('enable-chorus', 'Enable Chorus', 'Effects', 'Enable the real selected-track chorus modulation device.', null, hasSelectedTrack, selectedTrackReason),
      createCommand('enable-flanger', 'Enable Flanger', 'Effects', 'Enable the real selected-track flanger modulation device.', null, hasSelectedTrack, selectedTrackReason),
      createCommand('enable-phaser', 'Enable Phaser', 'Effects', 'Enable the real selected-track phaser modulation device.', null, hasSelectedTrack, selectedTrackReason),
      createCommand('enable-tremolo-auto-pan', 'Enable Tremolo/Auto-Pan', 'Effects', 'Enable the real selected-track rhythmic modulation device.', null, hasSelectedTrack, selectedTrackReason),
      createCommand('enable-vibrato', 'Enable Vibrato', 'Effects', 'Enable the real selected-track pitch wobble modulation device.', null, hasSelectedTrack, selectedTrackReason),
      createCommand('enable-ring-modulator', 'Enable Ring Modulator', 'Effects', 'Enable the real selected-track carrier modulation device.', null, hasSelectedTrack, selectedTrackReason),
      createCommand('enable-cave-reverb', 'Enable Cave Reverb', 'Effects', 'Enable the real selected-track Cave Reverb device.', null, hasSelectedTrack, selectedTrackReason),
      createCommand('enable-delay-echo', 'Enable Delay/Echo', 'Effects', 'Enable the real selected-track Delay/Echo device.', null, hasSelectedTrack, selectedTrackReason),
    ];
  }

  function createCommand(
    id: CommandId,
    title: string,
    category: string,
    description: string,
    shortcut: string | null,
    enabled: boolean,
    disabledReason: string | null,
  ): CommandPaletteCommand {
    return {
      id,
      title,
      category,
      description,
      shortcut,
      disabled: !enabled,
      disabledReason: enabled ? null : disabledReason,
    };
  }

  function getDeleteSelectionTitle(context: CommandPaletteContext) {
    if (context.timelineMark) {
      return 'Delete Selected Timeline Mark';
    }

    if (context.automationTime !== null) {
      return 'Delete Selected Keyframe';
    }

    return 'Delete Selected Clip';
  }

  function getSelectedClipTrack(project: ProjectRecord | null, clip: Clip | null): Track | null {
    if (!project || !clip) {
      return null;
    }

    return project.tracks.find((track) => track.id === clip.trackId) ?? null;
  }

  function enableSelectedTrackEffect(effectType: EffectInstance['type'], label: string) {
    const track = getSelectedClipTrack(activeProject, selectedClip);
    if (!selectedClip) {
      showToast('Select a clip first');
      return;
    }

    if (!track) {
      showToast('Selected clip track is missing');
      return;
    }

    const existingEffect = track.effects.find((effect) => effect.type === effectType);
    handleUpdateTrackEffect(track.id, effectType, {enabled: true});
    showToast(existingEffect?.enabled ? `${label} already on` : `${label} enabled`);
  }

  function getActiveProjectSourceSignature(project: ProjectRecord | null) {
    if (!project) {
      return 'none';
    }

    const sourceIds = getRequiredSourceIds(project).sort().join('|');
    const clipSourceIds = project.clips.map((clip) => clip.sourceId ?? 'missing').sort().join('|');
    return `${project.id}:${sourceIds}:${clipSourceIds}:${project.audioSources.length}`;
  }

  async function refreshSourceBlobAvailability(project: ProjectRecord | null, signature: string) {
    sourceBlobAvailabilitySignature = signature;
    sourceBlobAvailabilityError = null;

    if (!project) {
      sourceBlobAvailability = {};
      return;
    }

    const sourceIds = getRequiredSourceIds(project);
    if (sourceIds.length === 0) {
      sourceBlobAvailability = {};
      return;
    }

    const checkId = sourceBlobAvailabilityCheckCounter + 1;
    sourceBlobAvailabilityCheckCounter = checkId;
    sourceBlobAvailability = Object.fromEntries(sourceIds.map((sourceId) => [sourceId, 'checking' as SourceBlobAvailability]));

    const checkedEntries = await Promise.all(
      sourceIds.map(async (sourceId) => {
        try {
          const blobExists = await checkAudioSourceBlobAvailability(sourceId);
          return [sourceId, blobExists ? 'available' : 'missing'] as const;
        } catch (error) {
          sourceBlobAvailabilityError = getErrorMessage(error);
          return [sourceId, 'error'] as const;
        }
      }),
    );

    if (sourceBlobAvailabilitySignature !== signature || sourceBlobAvailabilityCheckCounter !== checkId) {
      return;
    }

    sourceBlobAvailability = Object.fromEntries(checkedEntries);
  }

  function getRequiredSourceIds(project: ProjectRecord) {
    return [...new Set(project.clips.map((clip) => clip.sourceId).filter((sourceId): sourceId is string => Boolean(sourceId)))];
  }

  function checkAudioSourceBlobAvailability(sourceId: string): Promise<boolean> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.reject(new Error('Local audio file storage is not available in this browser session.'));
    }

    return new Promise((resolve, reject) => {
      const openRequest = window.indexedDB.open(audioSourceDatabaseName);
      openRequest.onerror = () => {
        reject(new Error('Local audio file storage could not be opened.'));
      };
      openRequest.onsuccess = () => {
        const database = openRequest.result;
        try {
          const transaction = database.transaction(audioSourceStoreName, 'readonly');
          const store = transaction.objectStore(audioSourceStoreName);
          const getRequest = store.get(sourceId);
          getRequest.onerror = () => {
            database.close();
            reject(new Error('Local audio storage request failed.'));
          };
          getRequest.onsuccess = () => {
            const storedRecord = getRequest.result as {blob?: Blob} | undefined;
            database.close();
            resolve(Boolean(storedRecord?.blob));
          };
        } catch (error) {
          database.close();
          reject(error);
        }
      };
    });
  }

  function getPlaybackReadiness(
    project: ProjectRecord | null,
    availabilityBySource: Record<string, SourceBlobAvailability>,
    availabilityError: string | null,
  ) {
    if (!project) {
      return {ready: false, reason: 'Create or open a project first'};
    }

    if (project.clips.length === 0) {
      return {ready: false, reason: 'Import audio before playback'};
    }

    const clipWithMissingSource = project.clips.find(
      (clip) => !clip.sourceId || !project.audioSources.some((source) => source.id === clip.sourceId),
    );
    if (clipWithMissingSource) {
      return {ready: false, reason: `Audio source metadata is missing for "${clipWithMissingSource.name}"`};
    }

    const sourceIds = getRequiredSourceIds(project);
    for (const sourceId of sourceIds) {
      const source = project.audioSources.find((item) => item.id === sourceId);
      const availability = availabilityBySource[sourceId] ?? 'checking';

      if (availability === 'checking') {
        continue;
      }

      if (availability === 'missing') {
        return {ready: false, reason: `Local audio file is missing: "${source?.fileName ?? sourceId}"`};
      }

      if (availability === 'error') {
        return {ready: false, reason: availabilityError ?? `Local audio file check failed for "${source?.fileName ?? sourceId}"`};
      }
    }

    return {ready: true, reason: null};
  }

  function buildToolbarToolReasons(context: ToolbarToolContext): Record<DawTool, string | null> {
    const hasProject = Boolean(context.project);
    const hasSelectedClip = Boolean(context.clip);
    const hasSelectedTimelineMark = Boolean(context.timelineMark);
    const playheadInsideClip = Boolean(context.clip && isTimeInsideClip(context.currentPlayhead, context.clip));

    if (!hasProject) {
      return {
        select: 'Create or open a project first',
        cut: 'Create or open a project first',
        split: 'Create or open a project first',
        move: 'Create or open a project first',
        delete: 'Create or open a project first',
        fade: 'Create or open a project first',
        volume: 'Create or open a project first',
        slip: 'Create or open a project first',
        snap: 'Create or open a project first',
      };
    }

    return {
      select: null,
      move: null,
      split: hasSelectedClip ? (playheadInsideClip ? null : 'Move playhead inside the selected clip') : 'Select a clip first',
      delete: hasSelectedTimelineMark || hasSelectedClip ? null : 'Select a marker or clip first',
      cut: 'Cut blade mode is not ready yet; use Split for now',
      fade: hasSelectedClip ? 'Fade handles are not on the toolbar yet; use the Fade controls in Edit' : 'Select a clip first',
      volume: hasSelectedClip ? 'Volume tool lane is not ready yet; use Gain in Edit' : 'Select a clip first',
      slip: 'Slip editing is not implemented yet',
      snap: 'Grid snap mode is pending timeline pan/scroll work',
    };
  }

  function runCommand(commandId: string) {
    const command = commandPaletteCommands.find((item) => item.id === commandId);
    if (command?.disabled) {
      showToast(command.disabledReason ?? 'Command is unavailable');
      return;
    }

    showCommandPalette = false;

    switch (commandId as CommandId) {
      case 'play-pause':
        void handleTogglePlayback();
        break;
      case 'stop':
        stopPlayback(true);
        break;
      case 'toggle-loop':
        handleToggleLoop();
        break;
      case 'import-audio':
        openImportAudioPicker();
        break;
      case 'export-wav':
        openExportSettings();
        break;
      case 'save-project':
        handleSaveProject();
        break;
      case 'project-settings':
        if (activeProject) {
          showProjectSettingsModal = true;
        }
        break;
      case 'app-settings':
        showAppSettingsModal = true;
        break;
      case 'whats-new':
        openReleaseNotes('latest');
        break;
      case 'changelog':
        openReleaseNotes('changelog');
        break;
      case 'split-clip':
        handleSplitSelectedClip();
        break;
      case 'trim-start':
        handleTrimSelectedClipStartToPlayhead();
        break;
      case 'trim-end':
        handleTrimSelectedClipEndToPlayhead();
        break;
      case 'delete-selection':
        if (selectedTimelineMarkId) {
          handleDeleteSelectedTimelineMark();
        } else if (selectedClipAutomationTime !== null) {
          handleDeleteClipCompoundKeyframe();
        } else {
          handleDeleteSelectedClip();
        }
        break;
      case 'delete-timeline-mark':
        handleDeleteSelectedTimelineMark();
        break;
      case 'add-clip-keyframe':
        handleAddClipCompoundKeyframe();
        break;
      case 'delete-clip-keyframe':
        handleDeleteClipCompoundKeyframe();
        break;
      case 'previous-clip-keyframe':
        handleGoToAdjacentClipCompoundKeyframe('previous');
        break;
      case 'next-clip-keyframe':
        handleGoToAdjacentClipCompoundKeyframe('next');
        break;
      case 'enable-graphic-eq':
        enableSelectedTrackEffect('eq', 'Graphic EQ');
        break;
      case 'enable-filter':
        enableSelectedTrackEffect('filter', 'Filter');
        break;
      case 'enable-compressor':
        enableSelectedTrackEffect('compressor', 'Compressor');
        break;
      case 'enable-gate':
        enableSelectedTrackEffect('gate', 'Noise Gate');
        break;
      case 'enable-limiter':
        enableSelectedTrackEffect('limiter', 'Limiter');
        break;
      case 'enable-saturation':
        enableSelectedTrackEffect('saturation', 'Saturation');
        break;
      case 'enable-overdrive':
        enableSelectedTrackEffect('overdrive', 'Overdrive');
        break;
      case 'enable-bitcrusher':
        enableSelectedTrackEffect('bitcrusher', 'Bitcrusher');
        break;
      case 'enable-chorus':
        enableSelectedTrackEffect('chorus', 'Chorus');
        break;
      case 'enable-flanger':
        enableSelectedTrackEffect('flanger', 'Flanger');
        break;
      case 'enable-phaser':
        enableSelectedTrackEffect('phaser', 'Phaser');
        break;
      case 'enable-tremolo-auto-pan':
        enableSelectedTrackEffect('tremolo', 'Tremolo/Auto-Pan');
        break;
      case 'enable-vibrato':
        enableSelectedTrackEffect('vibrato', 'Vibrato');
        break;
      case 'enable-ring-modulator':
        enableSelectedTrackEffect('ring', 'Ring Modulator');
        break;
      case 'enable-cave-reverb':
        enableSelectedTrackEffect('reverb', 'Cave Reverb');
        break;
      case 'enable-delay-echo':
        enableSelectedTrackEffect('delay', 'Delay/Echo');
        break;
    }
  }

  function buildQuickContextMenuItems(menu: QuickContextMenuState | null, clip: Clip | null): QuickContextMenuItem[] {
    const noProjectReason = activeProject ? null : 'Create or open a project first';
    const clipReason = noProjectReason ?? (clip ? null : 'Right-click a clip first');
    const insideClip = Boolean(menu && clip && isTimeInsideClip(menu.time, clip));
    const insideClipReason = clipReason ?? (insideClip ? null : 'Cursor is outside the clip');
    const hasKeyframeNearCursor = Boolean(
      menu &&
        clip &&
        getClipCompoundKeyframeTimes(clip).some((time) => Math.abs(time - menu.time) <= keyframeCollisionTolerance),
    );
    const beatNearCursor = menu && activeProject ? findTimelineMarkNearFrame(
      activeProject,
      timeToProjectFrame(activeProject, menu.time),
      beatHitToleranceSeconds,
    ) : null;

    return [
      {
        id: 'add-keyframe',
        label: 'Add Keyframe',
        hint: 'Diamond at cursor time',
        icon: 'keyframe',
        disabledReason: insideClipReason,
      },
      {
        id: 'delete-keyframe',
        label: 'Delete Keyframe',
        hint: 'Remove diamond near cursor',
        icon: 'keyframe',
        disabledReason: clipReason ?? (hasKeyframeNearCursor ? null : 'No keyframe near cursor'),
        danger: true,
      },
      {
        id: 'toggle-beat',
        label: 'Toggle Beat Marker',
        hint: 'Frame-locked red beat',
        icon: 'beat',
        disabledReason: noProjectReason,
      },
      {
        id: 'delete-beat',
        label: 'Delete Beat Near Cursor',
        hint: 'Remove nearby red marker',
        icon: 'beat',
        disabledReason: noProjectReason ?? (beatNearCursor ? null : 'No beat near cursor'),
        danger: true,
      },
      {
        id: 'split-middle',
        label: 'Cut Middle / Split',
        hint: 'Split to a new layer',
        icon: 'cut',
        disabledReason: insideClipReason,
      },
      {
        id: 'trim-front',
        label: 'Cut Front',
        hint: 'Remove clip before cursor',
        icon: 'cut',
        disabledReason: insideClipReason,
      },
      {
        id: 'trim-back',
        label: 'Cut Back',
        hint: 'Remove clip after cursor',
        icon: 'cut',
        disabledReason: insideClipReason,
      },
      {
        id: 'delete-clip',
        label: 'Delete Clip',
        hint: 'Remove selected layer clip',
        icon: 'delete',
        disabledReason: clipReason,
        danger: true,
      },
      {
        id: 'export-settings',
        label: 'Export Settings',
        hint: 'Open output panel',
        icon: 'export',
        disabledReason: hasPlayableAudio ? null : playbackReadiness?.reason ?? 'Audio is not ready for export',
      },
    ];
  }

  function handleOpenQuickContextMenu(input: QuickContextMenuState) {
    if (!activeProject) {
      return;
    }

    const clip = input.clipId ? activeProject.clips.find((item) => item.id === input.clipId) ?? null : null;
    if (clip) {
      selectedClipId = clip.id;
    }

    playhead = input.time;
    selectedTimelineMarkId = null;
    quickContextMenu = input;
  }

  function runQuickContextMenuAction(actionId: string) {
    if (!quickContextMenu) {
      return;
    }

    const context = quickContextMenu;
    const contextClip = activeProject?.clips.find((clip) => clip.id === context.clipId) ?? selectedClip;
    quickContextMenu = null;

    if (activeProject) {
      playhead = context.time;
    }

    if (contextClip) {
      selectedClipId = contextClip.id;
    }

    switch (actionId) {
      case 'add-keyframe':
        handleAddClipCompoundKeyframe();
        break;
      case 'delete-keyframe':
        if (contextClip) {
          syncSelectedClipAutomationKeyframes(contextClip, context.time);
        }
        handleDeleteClipCompoundKeyframe();
        break;
      case 'toggle-beat':
        handleAddTimelineMark(context.time);
        break;
      case 'delete-beat':
        deleteTimelineMarkNearContext(context.time);
        break;
      case 'split-middle':
        handleSplitSelectedClip();
        break;
      case 'trim-front':
        handleTrimSelectedClipStartToPlayhead();
        break;
      case 'trim-back':
        handleTrimSelectedClipEndToPlayhead();
        break;
      case 'delete-clip':
        void handleDeleteSelectedClip();
        break;
      case 'export-settings':
        openExportSettings();
        break;
    }
  }

  function deleteTimelineMarkNearContext(time: number) {
    if (!activeProject) {
      showToast('Create or open a project first');
      return;
    }

    const mark = findTimelineMarkNearFrame(activeProject, timeToProjectFrame(activeProject, time), beatHitToleranceSeconds);
    if (!mark) {
      showToast('No beat near cursor');
      return;
    }

    selectedTimelineMarkId = mark.id;
    handleDeleteSelectedTimelineMark();
  }

  function handleGlobalKeydown(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    const usesCommandModifier = event.ctrlKey || event.metaKey;
    const isDeleteKey = event.key === 'Delete' || event.key === 'Backspace';

    if (usesCommandModifier && key === 'k') {
      event.preventDefault();
      showCommandPalette = !showCommandPalette;
      return;
    }

    if (isDeleteKey && !isTextEditingTarget(event.target)) {
      event.preventDefault();
      runCommand('delete-selection');
      return;
    }

    if (isTextEntryTarget(event.target)) {
      return;
    }

    if (usesCommandModifier && key === 's') {
      event.preventDefault();
      runCommand('save-project');
      return;
    }

    if (key === ' ') {
      event.preventDefault();
      runCommand('play-pause');
      return;
    }

    if (key === 'l') {
      event.preventDefault();
      runCommand('toggle-loop');
      return;
    }

    if (key === 's') {
      event.preventDefault();
      runCommand('split-clip');
      return;
    }

    if (key === 'k' && event.shiftKey) {
      event.preventDefault();
      runCommand('delete-clip-keyframe');
      return;
    }

    if (key === 'k') {
      event.preventDefault();
      runCommand('add-clip-keyframe');
      return;
    }

    if (event.key === '[') {
      event.preventDefault();
      runCommand('trim-start');
      return;
    }

    if (event.key === ']') {
      event.preventDefault();
      runCommand('trim-end');
    }
  }

  function isTextEntryTarget(target: EventTarget | null) {
    return target instanceof HTMLElement
      ? Boolean(target.closest('input, textarea, select, button, a, [contenteditable="true"]'))
      : false;
  }

  function isTextEditingTarget(target: EventTarget | null) {
    return target instanceof HTMLElement
      ? Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
      : false;
  }

  function commitState(
    nextState: AppState,
    persist = true,
    options: {suppressPlaybackPending?: boolean} = {},
  ) {
    const previousProject = activeProject;
    const nextProject = getActiveProject(nextState);
    const projectChangedDuringPlayback = Boolean(
      isPlaying && playbackHandle && previousProject && nextProject && previousProject.id === nextProject.id && previousProject !== nextProject,
    );

    appState = nextState;
    if (persist) {
      saveAppState(nextState);
    }

    if (projectChangedDuringPlayback && nextProject && !options.suppressPlaybackPending) {
      markPlaybackCachePending(nextProject);
    }
  }

  function handleCreateProject(input: NewProjectInput) {
    const project = createProjectRecord(input);
    commitState(addProject(appState, project));
    selectedClipId = null;
    selectedTimelineMarkId = null;
    clearClipAutomationSelection();
    playhead = 0;
    hasUnsavedChanges = false;
    showNewProjectModal = false;
    showToast(`Created ${project.name}`);
  }

  function handleOpenProject(projectId: string) {
    stopPlayback(false);
    commitState(openProject(appState, projectId));
    selectedClipId = null;
    selectedTimelineMarkId = null;
    clearClipAutomationSelection();
    playhead = 0;
    hasUnsavedChanges = false;
  }

  function handleSaveProject() {
    if (!activeProject) {
      showToast('Create a project first');
      return;
    }

    commitState(updateProject(appState, activeProject));
    hasUnsavedChanges = false;
    showToast(`Saved ${activeProject.name}`);
  }

  function handleDuplicateProject(projectId: string) {
    commitState(duplicateProject(appState, projectId));
    selectedClipId = null;
    selectedTimelineMarkId = null;
    clearClipAutomationSelection();
    playhead = 0;
    hasUnsavedChanges = false;
    showToast('Project duplicated');
  }

  function handleDeleteProject(project: ProjectRecord) {
    confirmIntent = {kind: 'delete-project', project};
  }

  function handleProjectSettingsSave(project: ProjectRecord) {
    commitState(updateProject(appState, project));
    hasUnsavedChanges = false;
    showProjectSettingsModal = false;
    showToast('Project settings saved');
  }

  function handleAppSettingsSave(settings: AppSettings) {
    commitState({...appState, settings});
    showAppSettingsModal = false;
    showToast('Settings saved');
  }

  function openReleaseNotes(view: ReleaseNotesView) {
    releaseNotesView = view;
  }

  function openReleaseNotesFromSettings(view: ReleaseNotesView) {
    showAppSettingsModal = false;
    openReleaseNotes(view);
  }

  function closeReleaseNotes() {
    markLatestReleaseSeen();
    releaseNotesView = null;
  }

  function markLatestReleaseSeen() {
    if (!latestReleaseNote || latestReleaseSeen) {
      return;
    }

    commitState({
      ...appState,
      settings: {
        ...appState.settings,
        lastReleaseSeen: latestReleaseNote.version,
      },
    });
  }

  function handleMasterVolumeChange(volume: number) {
    if (!activeProject) {
      return;
    }

    commitState(updateProject(appState, {...activeProject, master: {...activeProject.master, volume}}), false);
    hasUnsavedChanges = true;
  }

  function handleZoomTimelineIn() {
    setTimelineZoomIndex(Math.max(0, timelineZoomIndex - 1));
  }

  function handleZoomTimelineOut() {
    setTimelineZoomIndex(Math.min(timelineDurations.length - 1, timelineZoomIndex + 1));
  }

  function handleZoomTimelineAt(anchorTime: number, direction: 'in' | 'out', anchorRatio: number) {
    const nextZoomIndex =
      direction === 'in'
        ? Math.max(0, timelineZoomIndex - 1)
        : Math.min(timelineDurations.length - 1, timelineZoomIndex + 1);
    setTimelineZoomIndex(nextZoomIndex, anchorTime, anchorRatio);
  }

  function setTimelineZoomIndex(nextZoomIndex: number, anchorTime = getTimelineZoomAnchor(), anchorRatio?: number) {
    if (nextZoomIndex === timelineZoomIndex) {
      return;
    }

    const nextDuration = timelineDurations[nextZoomIndex] ?? timelineDuration;
    const resolvedAnchorRatio =
      anchorRatio ?? Math.max(0, Math.min(1, (anchorTime - timelineViewportStart) / Math.max(1, timelineDuration)));
    timelineZoomIndex = nextZoomIndex;
    timelineViewportStart = clampTimelineViewportStart(anchorTime - nextDuration * resolvedAnchorRatio, nextDuration, projectDuration);
  }

  function getTimelineZoomAnchor() {
    if (playhead >= timelineViewportStart && playhead <= timelineViewportEnd) {
      return playhead;
    }

    return timelineViewportStart + timelineDuration / 2;
  }

  function handlePanTimeline(deltaSeconds: number) {
    setTimelineViewportStart(timelineViewportStart + deltaSeconds);
  }

  function handlePanTimelineLeft() {
    handlePanTimeline(-timelineDuration / 2);
  }

  function handlePanTimelineRight() {
    handlePanTimeline(timelineDuration / 2);
  }

  function setTimelineViewportStart(nextStart: number) {
    timelineViewportStart = clampTimelineViewportStart(nextStart, timelineDuration, projectDuration);
  }

  function revealTimeInTimelineViewport(time: number) {
    if (time < timelineViewportStart) {
      setTimelineViewportStart(time);
      return;
    }

    if (time > timelineViewportEnd) {
      setTimelineViewportStart(time - timelineDuration);
    }
  }

  function clampTimelineViewportStart(start: number, visibleDuration: number, duration: number) {
    const maxStart = Math.max(0, duration - visibleDuration);
    return Number(Math.max(0, Math.min(maxStart, start)).toFixed(3));
  }

  function formatTimelineDuration(seconds: number) {
    return `${seconds}s`;
  }

  function formatTimelineOffset(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  function handleChangeClipProperty(clipId: string, property: keyof Clip, value: Clip[keyof Clip]) {
    if (!activeProject) {
      return;
    }

    const clip = activeProject.clips.find((item) => item.id === clipId);
    if (!clip) {
      return;
    }

    const automationParameter = typeof value === 'number' ? getClipAutomationParameterByProperty(property) : null;
    if (automationParameter && selectedClipId === clipId && typeof value === 'number') {
      const keyframes = getSortedKeyframes(getAutomationLane(clip.automation, automationParameter.id));
      if (selectedClipAutomationTime !== null || getSelectedClipAutomationKeyframeId(automationParameter.id) || keyframes.length > 0) {
        handleSetClipAutomationValueAtPlayhead(clipId, automationParameter, value);
        return;
      }
    }

    applyClipPatchById(clipId, {[property]: value} as Partial<Clip>);
  }

  function handleMoveClipToTime(clipId: string, startTime: number) {
    if (!activeProject) {
      return;
    }

    const clip = activeProject.clips.find((item) => item.id === clipId);
    if (!clip) {
      return;
    }

    const timeDelta = startTime - clip.startTime;
    const track = activeProject.tracks.find((item) => item.id === clip.trackId) ?? null;
    const updatedClip = {
      ...clip,
      startTime,
      automation: shiftAutomationTimes(clip.automation, timeDelta),
    };
    const updatedProject: ProjectRecord = {
      ...activeProject,
      clips: activeProject.clips.map((item) => (item.id === clipId ? updatedClip : item)),
      tracks: track
        ? activeProject.tracks.map((item) =>
            item.id === track.id
              ? {
                  ...item,
                  automation: shiftAutomationTimesInRange(
                    item.automation,
                    clip.startTime,
                    clip.startTime + clip.duration,
                    timeDelta,
                  ),
                }
              : item,
          )
        : activeProject.tracks,
    };
    commitState(updateProject(appState, updatedProject), false);
    hasUnsavedChanges = true;
    if (selectedClipId === clipId && selectedClipAutomationTime !== null) {
      selectedClipAutomationTime += timeDelta;
    }
  }

  function handleReorderTrack(trackId: string, targetIndex: number) {
    if (!activeProject) {
      return;
    }

    const currentIndex = activeProject.tracks.findIndex((track) => track.id === trackId);
    const boundedTargetIndex = Math.max(0, Math.min(activeProject.tracks.length - 1, targetIndex));
    if (currentIndex < 0 || currentIndex === boundedTargetIndex) {
      return;
    }

    const tracks = [...activeProject.tracks];
    const [movedTrack] = tracks.splice(currentIndex, 1);
    if (!movedTrack) {
      return;
    }

    tracks.splice(boundedTargetIndex, 0, movedTrack);
    commitState(updateProject(appState, {...activeProject, tracks}), false);
    hasUnsavedChanges = true;
  }

  function handleResizeClipOnTimeline(clipId: string, edge: 'left' | 'right', startTime: number, duration: number) {
    if (!activeProject) {
      return;
    }

    const clip = activeProject.clips.find((item) => item.id === clipId);
    if (!clip) {
      return;
    }

    const clipEnd = clip.startTime + clip.duration;
    if (edge === 'left') {
      const nextStart = Math.max(0, Math.min(startTime, clipEnd - 0.5));
      const nextDuration = Math.max(0.5, clipEnd - nextStart);
      const playbackRate = getClipPlaybackRate(clip);
      const sourceAnchorTime = clip.startTime + getClipSourceTimelineOffset(clip);
      const rawSourceStart = clip.sourceStartTime + (nextStart - sourceAnchorTime) * playbackRate;
      const nextSourceStart = Math.max(0, rawSourceStart);
      const nextSourceTimelineOffset = rawSourceStart < 0 ? Math.abs(rawSourceStart) / playbackRate : 0;
      const nextEnd = nextStart + nextDuration;
      applyClipPatchById(clipId, {
        startTime: nextStart,
        sourceStartTime: nextSourceStart,
        sourceTimelineOffset: Math.min(nextDuration, nextSourceTimelineOffset),
        duration: nextDuration,
        fadeIn: Math.min(clip.fadeIn, nextDuration),
        fadeOut: Math.min(clip.fadeOut, nextDuration),
        automation: trimAutomationToRange(clip, nextStart, nextEnd),
      });
      return;
    }

    const nextDuration = Math.max(0.5, duration);
    const nextEnd = clip.startTime + nextDuration;
    applyClipPatchById(clipId, {
      duration: nextDuration,
      sourceTimelineOffset: Math.min(getClipSourceTimelineOffset(clip), nextDuration),
      fadeIn: Math.min(clip.fadeIn, nextDuration),
      fadeOut: Math.min(clip.fadeOut, nextDuration),
      automation: trimAutomationToRange(clip, clip.startTime, nextEnd),
    });
  }

  function applyClipPatchById(clipId: string, patch: Partial<Clip>) {
    if (!activeProject) {
      return;
    }

    const updatedProject: ProjectRecord = {
      ...activeProject,
      clips: activeProject.clips.map((clip) => (clip.id === clipId ? {...clip, ...patch} : clip)),
    };
    commitState(updateProject(appState, updatedProject), false);
    hasUnsavedChanges = true;
  }

  function handleSetClipAutomationValueAtPlayhead(
    clipId: string,
    parameter: ClipAutomationParameterDefinition,
    value: number,
  ) {
    if (!activeProject) {
      return false;
    }

    const clip = activeProject.clips.find((item) => item.id === clipId);
    if (!clip) {
      return false;
    }

    const nextValue = clampClipAutomationParameterValue(parameter, value);
    if (selectedClipId === clipId && selectedClipAutomationTime !== null) {
      return handleSetClipAutomationValueAtTime(clipId, parameter, selectedClipAutomationTime, nextValue, false);
    }

    const selectedKeyframeId = getSelectedClipAutomationKeyframeId(parameter.id);
    if (selectedClipId === clipId && selectedKeyframeId) {
      const updatedSelectedKeyframe = handleUpdateClipAutomationKeyframeForClip(
        clipId,
        parameter,
        selectedKeyframeId,
        {value: nextValue},
        false,
      );
      if (updatedSelectedKeyframe) {
        selectClipAutomationKeyframe(parameter.id, selectedKeyframeId);
        return true;
      }

      clearClipAutomationKeyframe(parameter.id);
    }

    const lane = getAutomationLane(clip.automation, parameter.id);
    const keyframes = getSortedKeyframes(lane);
    if (keyframes.length === 0) {
      applyClipPatchById(clipId, {[parameter.property]: nextValue} as Partial<Clip>);
      return true;
    }

    if (!isPlayheadInsideClip(clip)) {
      showToast(parameter.editOutsideClipMessage);
      return false;
    }

    const existingKeyframe = keyframes.find((keyframe) => Math.abs(keyframe.time - playhead) <= keyframeCollisionTolerance);
    if (existingKeyframe) {
      return handleUpdateClipAutomationKeyframeForClip(clipId, parameter, existingKeyframe.id, {value: nextValue}, false);
    }

    const keyframe: AutomationKeyframe = {
      id: makeId('keyframe'),
      time: playhead,
      value: nextValue,
      easing: 'linear',
      bezier: null,
    };
    const automation = upsertKeyframe(clip.automation, makeId('lane'), parameter.id, keyframe);
    const updatedClip = {...clip, automation};
    const updatedProject: ProjectRecord = {
      ...activeProject,
      clips: activeProject.clips.map((item) => (item.id === clipId ? updatedClip : item)),
    };
    commitState(updateProject(appState, updatedProject), false);
    selectedClipId = clipId;
    syncSelectedClipAutomationKeyframes(updatedClip, keyframe.time);
    hasUnsavedChanges = true;
    return true;
  }

  function handleSetClipAutomationValueAtTime(
    clipId: string,
    parameter: ClipAutomationParameterDefinition,
    time: number,
    value: number,
    showErrors = true,
  ) {
    if (!activeProject) {
      return false;
    }

    const clip = activeProject.clips.find((item) => item.id === clipId);
    if (!clip) {
      if (showErrors) {
        showToast('Select a clip first');
      }
      return false;
    }

    if (time < clip.startTime || time > clip.startTime + clip.duration) {
      if (showErrors) {
        showToast('Keyframe must stay inside the clip');
      }
      return false;
    }

    const nextValue = Number(clampClipAutomationParameterValue(parameter, value).toFixed(parameter.precision));
    const lane = getAutomationLane(clip.automation, parameter.id);
    const existingKeyframe = getSortedKeyframes(lane).find(
      (keyframe) => Math.abs(keyframe.time - time) <= keyframeCollisionTolerance,
    );
    const automation = existingKeyframe
      ? updateKeyframe(clip.automation, parameter.id, existingKeyframe.id, {value: nextValue})
      : upsertKeyframe(clip.automation, makeId('lane'), parameter.id, {
          id: makeId('keyframe'),
          time,
          value: nextValue,
          easing: 'linear',
          bezier: null,
        });
    const updatedClip = {...clip, automation};
    const updatedProject: ProjectRecord = {
      ...activeProject,
      clips: activeProject.clips.map((item) => (item.id === clipId ? updatedClip : item)),
    };
    commitState(updateProject(appState, updatedProject), false);
    selectedClipId = clipId;
    syncSelectedClipAutomationKeyframes(updatedClip, time);
    hasUnsavedChanges = true;
    return true;
  }

  function handleSplitSelectedClip() {
    if (!activeProject || !selectedClip) {
      showToast('Select a clip first');
      return;
    }

    const splitTime = playhead;
    const clipEnd = selectedClip.startTime + selectedClip.duration;
    if (splitTime <= selectedClip.startTime + minimumClipDuration || splitTime >= clipEnd - minimumClipDuration) {
      showToast('Move playhead inside the clip');
      return;
    }

    const sourceTrack = activeProject.tracks.find((track) => track.id === selectedClip.trackId);
    const sourceTrackIndex = activeProject.tracks.findIndex((track) => track.id === selectedClip.trackId);
    if (!sourceTrack || sourceTrackIndex < 0) {
      showToast('Selected clip track is missing');
      return;
    }

    const splitTrackId = makeId('track');
    const leftDuration = splitTime - selectedClip.startTime;
    const rightDuration = clipEnd - splitTime;
    const sourceTimelineOffset = getClipSourceTimelineOffset(selectedClip);
    const sourceAnchorTime = selectedClip.startTime + sourceTimelineOffset;
    const splitInsideLeftOverage = splitTime < sourceAnchorTime;
    const sourceDelta = Math.max(0, splitTime - sourceAnchorTime) * getClipPlaybackRate(selectedClip);
    const leftClip: Clip = {
      ...selectedClip,
      duration: leftDuration,
      sourceTimelineOffset: Math.min(sourceTimelineOffset, leftDuration),
      fadeOut: Math.min(selectedClip.fadeOut, leftDuration),
      automation: trimAutomationToRange(selectedClip, selectedClip.startTime, splitTime),
    };
    const rightClip: Clip = {
      ...selectedClip,
      id: makeId('clip'),
      trackId: splitTrackId,
      name: `${selectedClip.name} Split`,
      startTime: splitTime,
      sourceStartTime: splitInsideLeftOverage ? selectedClip.sourceStartTime : selectedClip.sourceStartTime + sourceDelta,
      sourceTimelineOffset: splitInsideLeftOverage ? Math.min(rightDuration, sourceAnchorTime - splitTime) : 0,
      duration: rightDuration,
      fadeIn: Math.min(selectedClip.fadeIn, rightDuration),
      fadeOut: Math.min(selectedClip.fadeOut, rightDuration),
      automation: trimAutomationToRange(selectedClip, splitTime, clipEnd),
    };
    const splitTrack: Track = {
      ...sourceTrack,
      id: splitTrackId,
      name: rightClip.name,
      effects: sourceTrack.effects.map((effect) => ({
        ...effect,
        id: makeId('effect'),
        parameters: {...effect.parameters},
      })),
      automation: sourceTrack.automation.map((lane) => ({
        ...lane,
        id: makeId('lane'),
        keyframes: lane.keyframes.map((keyframe) => ({...keyframe, id: makeId('keyframe')})),
      })),
    };
    const tracks = [...activeProject.tracks];
    tracks.splice(sourceTrackIndex + 1, 0, splitTrack);
    const updatedProject: ProjectRecord = {
      ...activeProject,
      tracks,
      clips: activeProject.clips.flatMap((clip) => (clip.id === selectedClip.id ? [leftClip, rightClip] : [clip])),
    };
    commitState(updateProject(appState, updatedProject), false);
    selectedClipId = rightClip.id;
    clearClipAutomationSelection();
    hasUnsavedChanges = true;
    showToast('Clip split to new layer');
  }

  async function handleDeleteSelectedClip() {
    if (!activeProject || !selectedClip) {
      showToast('Select a clip first');
      return;
    }

    const remainingClips = activeProject.clips.filter((clip) => clip.id !== selectedClip.id);
    const trackIdsWithClips = new Set(remainingClips.map((clip) => clip.trackId));
    const usedSourceIds = new Set(
      remainingClips.map((clip) => clip.sourceId).filter((sourceId): sourceId is string => Boolean(sourceId)),
    );
    const removedSourceIds = activeProject.audioSources
      .filter((source) => !usedSourceIds.has(source.id))
      .map((source) => source.id);
    const updatedProject: ProjectRecord = {
      ...activeProject,
      audioSources: activeProject.audioSources.filter((source) => usedSourceIds.has(source.id)),
      tracks: activeProject.tracks.filter((track) => track.type !== 'audio' || trackIdsWithClips.has(track.id)),
      clips: remainingClips,
    };
    const nextState = updateProject(appState, updatedProject);
    const remainingSourceIds = new Set(nextState.projects.flatMap((project) => project.audioSources.map((source) => source.id)));
    const sourceBlobIdsToDelete = removedSourceIds.filter((sourceId) => !remainingSourceIds.has(sourceId));
    commitState(nextState);
    sourceBlobAvailability = Object.fromEntries(
      Object.entries(sourceBlobAvailability).filter(([sourceId]) => !removedSourceIds.includes(sourceId)),
    );
    sourceBlobAvailabilitySignature = getActiveProjectSourceSignature(updatedProject);
    selectedClipId = null;
    clearClipAutomationSelection();
    activeTool = 'select';
    hasUnsavedChanges = false;
    try {
      await Promise.all(sourceBlobIdsToDelete.map(deleteAudioSourceBlob));
    } catch (error) {
      storageWarning = getErrorMessage(error);
    }
    showToast('Clip deleted');
  }

  function handleTrimSelectedClipStartToPlayhead() {
    if (!selectedClip) {
      showToast('Select a clip first');
      return;
    }

    const trimTime = playhead;
    const clipEnd = selectedClip.startTime + selectedClip.duration;
    if (trimTime <= selectedClip.startTime || trimTime >= clipEnd - minimumClipDuration) {
      showToast('Move playhead inside the clip');
      return;
    }

    const trimDelta = trimTime - selectedClip.startTime;
    const sourceAnchorTime = selectedClip.startTime + getClipSourceTimelineOffset(selectedClip);
    const rawSourceStart = selectedClip.sourceStartTime + (trimTime - sourceAnchorTime) * getClipPlaybackRate(selectedClip);
    const nextSourceStart = Math.max(0, rawSourceStart);
    const nextSourceTimelineOffset = rawSourceStart < 0 ? Math.abs(rawSourceStart) / getClipPlaybackRate(selectedClip) : 0;
    const nextDuration = selectedClip.duration - trimDelta;
    handleApplySelectedClipPatch({
      startTime: trimTime,
      sourceStartTime: nextSourceStart,
      sourceTimelineOffset: Math.min(nextDuration, nextSourceTimelineOffset),
      duration: nextDuration,
      fadeIn: Math.min(selectedClip.fadeIn, nextDuration),
      fadeOut: Math.min(selectedClip.fadeOut, nextDuration),
      automation: trimAutomationToRange(selectedClip, trimTime, clipEnd),
    });
    showToast('Clip start trimmed');
  }

  function handleTrimSelectedClipEndToPlayhead() {
    if (!selectedClip) {
      showToast('Select a clip first');
      return;
    }

    const trimTime = playhead;
    if (trimTime <= selectedClip.startTime + minimumClipDuration || trimTime >= selectedClip.startTime + selectedClip.duration) {
      showToast('Move playhead inside the clip');
      return;
    }

    const nextDuration = trimTime - selectedClip.startTime;
    handleApplySelectedClipPatch({
      duration: nextDuration,
      sourceTimelineOffset: Math.min(getClipSourceTimelineOffset(selectedClip), nextDuration),
      fadeIn: Math.min(selectedClip.fadeIn, nextDuration),
      fadeOut: Math.min(selectedClip.fadeOut, nextDuration),
      automation: trimAutomationToRange(selectedClip, selectedClip.startTime, trimTime),
    });
    showToast('Clip end trimmed');
  }

  function handleApplySelectedClipPatch(patch: Partial<Clip>) {
    if (!activeProject || !selectedClip) {
      return;
    }

    const updatedProject: ProjectRecord = {
      ...activeProject,
      clips: activeProject.clips.map((clip) => (clip.id === selectedClip.id ? {...clip, ...patch} : clip)),
    };
    commitState(updateProject(appState, updatedProject), false);
    hasUnsavedChanges = true;
  }

  function clearClipAutomationSelection() {
    selectedGainKeyframeId = null;
    selectedPitchKeyframeId = null;
    selectedClipAutomationTime = null;
  }

  function getClipCompoundKeyframeTimes(clip: Clip) {
    const times = new Map<string, number>();
    CLIP_AUTOMATION_PARAMETERS.forEach((parameter) => {
      getSortedKeyframes(getAutomationLane(clip.automation, parameter.id)).forEach((keyframe) => {
        times.set(keyframe.time.toFixed(3), keyframe.time);
      });
    });
    const track = activeProject?.tracks.find((item) => item.id === clip.trackId) ?? null;
    if (track) {
      EFFECT_AUTOMATION_PARAMETERS.forEach((parameter) => {
        getSortedKeyframes(getAutomationLane(track.automation, parameter.id)).forEach((keyframe) => {
          if (keyframe.time >= clip.startTime - keyframeCollisionTolerance && keyframe.time <= clip.startTime + clip.duration + keyframeCollisionTolerance) {
            times.set(keyframe.time.toFixed(3), keyframe.time);
          }
        });
      });
    }

    return [...times.values()].sort((first, second) => first - second);
  }

  function getClipCompoundKeyframeTimeNear(clip: Clip, time: number) {
    return (
      getClipCompoundKeyframeTimes(clip).find(
        (keyframeTime) => Math.abs(keyframeTime - time) <= keyframeCollisionTolerance,
      ) ?? null
    );
  }

  function getCompoundParameterCountAtTime(clip: Clip, time: number) {
    const track = activeProject?.tracks.find((item) => item.id === clip.trackId) ?? null;
    const clipParameterCount = CLIP_AUTOMATION_PARAMETERS.reduce(
      (count, parameter) => count + (findClipAutomationKeyframeAtTime(clip, parameter, time) ? 1 : 0),
      0,
    );
    const effectParameterCount = track
      ? EFFECT_AUTOMATION_PARAMETERS.reduce(
          (count, parameter) => count + (findTrackEffectAutomationKeyframeAtTime(track, parameter, time) ? 1 : 0),
          0,
        )
      : 0;

    return clipParameterCount + effectParameterCount;
  }

  function getCompoundEasingAtTime(clip: Clip, time: number): AutomationKeyframe['easing'] {
    const track = activeProject?.tracks.find((item) => item.id === clip.trackId) ?? null;
    const clipKeyframe =
      CLIP_AUTOMATION_PARAMETERS.map((parameter) => findClipAutomationKeyframeAtTime(clip, parameter, time)).find(Boolean) ??
      null;
    const effectKeyframe = track
      ? EFFECT_AUTOMATION_PARAMETERS.map((parameter) => findTrackEffectAutomationKeyframeAtTime(track, parameter, time)).find(Boolean) ??
        null
      : null;

    return (clipKeyframe ?? effectKeyframe)?.easing ?? 'linear';
  }

  function findClipAutomationKeyframeAtTime(
    clip: Clip,
    parameter: ClipAutomationParameterDefinition,
    time: number,
    tolerance = keyframeCollisionTolerance,
  ) {
    return (
      getSortedKeyframes(getAutomationLane(clip.automation, parameter.id)).find(
        (keyframe) => Math.abs(keyframe.time - time) <= tolerance,
      ) ?? null
    );
  }

  function findTrackEffectAutomationKeyframeAtTime(
    track: Track,
    parameter: EffectAutomationParameterDefinition,
    time: number,
    tolerance = keyframeCollisionTolerance,
  ) {
    return (
      getSortedKeyframes(getAutomationLane(track.automation, parameter.id)).find(
        (keyframe) => Math.abs(keyframe.time - time) <= tolerance,
      ) ?? null
    );
  }

  function syncSelectedClipAutomationKeyframes(clip: Clip, time: number | null) {
    if (time === null) {
      clearClipAutomationSelection();
      return;
    }

    selectedClipAutomationTime = time;
    selectedGainKeyframeId = findClipAutomationKeyframeAtTime(clip, clipGainAutomationParameter, time)?.id ?? null;
    selectedPitchKeyframeId = findClipAutomationKeyframeAtTime(clip, clipPitchAutomationParameter, time)?.id ?? null;
  }

  function syncCompoundSelectionAtPlayhead(time: number) {
    if (!selectedClip || !isTimeInsideClip(time, selectedClip)) {
      if (selectedClipAutomationTime !== null) {
        clearClipAutomationSelection();
      }
      return;
    }

    const compoundTime = getClipCompoundKeyframeTimeNear(selectedClip, time);
    if (compoundTime !== null) {
      syncSelectedClipAutomationKeyframes(selectedClip, compoundTime);
      return;
    }

    if (selectedClipAutomationTime !== null && Math.abs(selectedClipAutomationTime - time) > keyframeCollisionTolerance) {
      clearClipAutomationSelection();
    }
  }

  function getSelectedClipAutomationKeyframeId(parameterId: ClipAutomationParameterId) {
    return parameterId === clipPitchAutomationParameter.id ? selectedPitchKeyframeId : selectedGainKeyframeId;
  }

  function selectClipAutomationKeyframe(parameterId: ClipAutomationParameterId, keyframeId: string | null) {
    if (!keyframeId) {
      clearClipAutomationKeyframe(parameterId);
      return;
    }

    const parameter = getClipAutomationParameterDefinition(parameterId);
    const keyframeTime =
      selectedClip && parameter
        ? getSortedKeyframes(getAutomationLane(selectedClip.automation, parameter.id)).find((keyframe) => keyframe.id === keyframeId)
            ?.time ?? null
        : null;

    if (selectedClip && keyframeTime !== null) {
      syncSelectedClipAutomationKeyframes(selectedClip, keyframeTime);
      return;
    }

    if (parameterId === clipPitchAutomationParameter.id) {
      selectedGainKeyframeId = null;
      selectedPitchKeyframeId = keyframeId;
      return;
    }

    selectedGainKeyframeId = keyframeId;
    selectedPitchKeyframeId = null;
  }

  function clearClipAutomationKeyframe(parameterId: ClipAutomationParameterId) {
    if (parameterId === clipPitchAutomationParameter.id) {
      selectedPitchKeyframeId = null;
      if (!selectedGainKeyframeId) {
        selectedClipAutomationTime = null;
      }
      return;
    }

    selectedGainKeyframeId = null;
    if (!selectedPitchKeyframeId) {
      selectedClipAutomationTime = null;
    }
  }

  function handleAddClipCompoundKeyframe() {
    if (!selectedClip) {
      showToast('Select a clip first');
      return;
    }

    if (!isPlayheadInsideClip(selectedClip)) {
      showToast('Move playhead inside the clip');
      return;
    }

    let automation = selectedClip.automation;
    CLIP_AUTOMATION_PARAMETERS.forEach((parameter) => {
      const lane = getAutomationLane(automation, parameter.id);
      const value = Number(
        evaluateAutomationValue(lane, getClipAutomationParameterValue(selectedClip, parameter), playhead).toFixed(
          parameter.precision,
        ),
      );
      const existingKeyframe = getSortedKeyframes(lane).find(
        (keyframe) => Math.abs(keyframe.time - playhead) <= keyframeCollisionTolerance,
      );

      automation = existingKeyframe
        ? updateKeyframe(automation, parameter.id, existingKeyframe.id, {value})
        : upsertKeyframe(automation, makeId('lane'), parameter.id, {
            id: makeId('keyframe'),
            time: playhead,
            value,
            easing: 'linear',
            bezier: null,
          });
    });

    const updatedClip = {...selectedClip, automation};
    handleApplySelectedClipPatch({automation});
    syncSelectedClipAutomationKeyframes(updatedClip, playhead);
    showToast('Clip keyframe added');
  }

  function handleDeleteClipCompoundKeyframe() {
    if (!activeProject || !selectedClip) {
      showToast('Select a clip first');
      return;
    }

    const selectedTrack = activeProject.tracks.find((track) => track.id === selectedClip.trackId) ?? null;
    const targetTime = selectedClipAutomationTime ?? playhead;
    let automation = selectedClip.automation;
    let trackAutomation = selectedTrack?.automation ?? [];
    const previousCount = CLIP_AUTOMATION_PARAMETERS.reduce(
      (count, parameter) => count + getSortedKeyframes(getAutomationLane(automation, parameter.id)).length,
      0,
    ) +
      (selectedTrack
        ? EFFECT_AUTOMATION_PARAMETERS.reduce(
            (count, parameter) => count + getSortedKeyframes(getAutomationLane(trackAutomation, parameter.id)).length,
            0,
          )
        : 0);

    CLIP_AUTOMATION_PARAMETERS.forEach((parameter) => {
      automation = deleteKeyframeNearTime(automation, parameter.id, targetTime, keyframeCollisionTolerance);
    });
    if (selectedTrack) {
      EFFECT_AUTOMATION_PARAMETERS.forEach((parameter) => {
        trackAutomation = deleteKeyframeNearTime(trackAutomation, parameter.id, targetTime, keyframeCollisionTolerance);
      });
    }

    const nextCount = CLIP_AUTOMATION_PARAMETERS.reduce(
      (count, parameter) => count + getSortedKeyframes(getAutomationLane(automation, parameter.id)).length,
      0,
    ) +
      (selectedTrack
        ? EFFECT_AUTOMATION_PARAMETERS.reduce(
            (count, parameter) => count + getSortedKeyframes(getAutomationLane(trackAutomation, parameter.id)).length,
            0,
          )
        : 0);

    if (previousCount === nextCount) {
      showToast('No keyframe at this time');
      return;
    }

    const updatedProject: ProjectRecord = {
      ...activeProject,
      clips: activeProject.clips.map((clip) => (clip.id === selectedClip.id ? {...clip, automation} : clip)),
      tracks: selectedTrack
        ? activeProject.tracks.map((track) => (track.id === selectedTrack.id ? {...track, automation: trackAutomation} : track))
        : activeProject.tracks,
    };
    commitState(updateProject(appState, updatedProject), false);
    clearClipAutomationSelection();
    hasUnsavedChanges = true;
    showToast('Clip keyframe deleted');
  }

  function handleGoToAdjacentClipCompoundKeyframe(direction: 'previous' | 'next') {
    if (!selectedClip) {
      showToast('Select a clip first');
      return;
    }

    const keyframeTimes = getClipCompoundKeyframeTimes(selectedClip);
    const referenceTime = selectedClipAutomationTime ?? playhead;
    const keyframeTime =
      direction === 'previous'
        ? [...keyframeTimes].reverse().find((time) => time < referenceTime - keyframeCollisionTolerance) ?? null
        : keyframeTimes.find((time) => time > referenceTime + keyframeCollisionTolerance) ?? null;

    if (keyframeTime === null) {
      showToast(direction === 'previous' ? 'No previous keyframe' : 'No next keyframe');
      return;
    }

    playhead = keyframeTime;
    syncSelectedClipAutomationKeyframes(selectedClip, keyframeTime);
  }

  function handleSelectClipCompoundKeyframe(clipId: string, time: number) {
    const clip = activeProject?.clips.find((item) => item.id === clipId);
    if (!clip) {
      return;
    }

    selectedClipId = clipId;
    playhead = time;
    syncSelectedClipAutomationKeyframes(clip, time);
  }

  function handleMoveClipCompoundKeyframe(clipId: string, time: number, nextTime: number) {
    if (!activeProject) {
      return;
    }

    const clip = activeProject.clips.find((item) => item.id === clipId);
    if (!clip) {
      return;
    }

    const track = activeProject.tracks.find((item) => item.id === clip.trackId) ?? null;
    const sourceTime = selectedClipId === clipId && selectedClipAutomationTime !== null ? selectedClipAutomationTime : time;
    if (nextTime < clip.startTime || nextTime > clip.startTime + clip.duration) {
      showToast('Keyframe must stay inside the clip');
      return;
    }

    const collidesWithAnotherCompound = CLIP_AUTOMATION_PARAMETERS.some((parameter) =>
      getSortedKeyframes(getAutomationLane(clip.automation, parameter.id)).some(
        (keyframe) =>
          Math.abs(keyframe.time - nextTime) <= keyframeCollisionTolerance &&
          Math.abs(keyframe.time - sourceTime) > keyframeCollisionTolerance,
      ),
    );
    const collidesWithAnotherEffectCompound = track
      ? EFFECT_AUTOMATION_PARAMETERS.some((parameter) =>
          getSortedKeyframes(getAutomationLane(track.automation, parameter.id)).some(
            (keyframe) =>
              Math.abs(keyframe.time - nextTime) <= keyframeCollisionTolerance &&
              Math.abs(keyframe.time - sourceTime) > keyframeCollisionTolerance,
          ),
        )
      : false;
    if (collidesWithAnotherCompound || collidesWithAnotherEffectCompound) {
      showToast('Keyframes need a little space');
      return;
    }

    let automation = clip.automation;
    let trackAutomation = track?.automation ?? [];
    let moved = false;
    CLIP_AUTOMATION_PARAMETERS.forEach((parameter) => {
      const keyframe = findClipAutomationKeyframeAtTime(clip, parameter, sourceTime);
      if (!keyframe) {
        return;
      }

      automation = updateKeyframe(automation, parameter.id, keyframe.id, {time: nextTime});
      moved = true;
    });
    if (track) {
      EFFECT_AUTOMATION_PARAMETERS.forEach((parameter) => {
        const keyframe = findTrackEffectAutomationKeyframeAtTime(track, parameter, sourceTime);
        if (!keyframe) {
          return;
        }

        trackAutomation = updateKeyframe(trackAutomation, parameter.id, keyframe.id, {time: nextTime});
        moved = true;
      });
    }

    if (!moved) {
      return;
    }

    const updatedClip = {...clip, automation};
    const updatedProject: ProjectRecord = {
      ...activeProject,
      clips: activeProject.clips.map((item) => (item.id === clipId ? updatedClip : item)),
      tracks: track
        ? activeProject.tracks.map((item) => (item.id === track.id ? {...item, automation: trackAutomation} : item))
        : activeProject.tracks,
    };
    commitState(updateProject(appState, updatedProject), false);
    selectedClipId = clipId;
    playhead = nextTime;
    syncSelectedClipAutomationKeyframes(updatedClip, nextTime);
    hasUnsavedChanges = true;
  }

  function handleUpdateClipCompoundKeyframeTime(time: number) {
    if (!selectedClip || selectedClipAutomationTime === null) {
      return;
    }

    handleMoveClipCompoundKeyframe(selectedClip.id, selectedClipAutomationTime, time);
  }

  function handleUpdateClipCompoundKeyframeEasing(easing: AutomationKeyframe['easing']) {
    if (!activeProject || !selectedClip || selectedClipAutomationTime === null) {
      return;
    }

    const activeTime = selectedClipAutomationTime;
    const track = activeProject.tracks.find((item) => item.id === selectedClip.trackId) ?? null;
    let automation = selectedClip.automation;
    let trackAutomation = track?.automation ?? [];
    let updated = false;
    CLIP_AUTOMATION_PARAMETERS.forEach((parameter) => {
      const keyframe = findClipAutomationKeyframeAtTime(selectedClip, parameter, activeTime);
      if (!keyframe) {
        return;
      }

      automation = updateKeyframe(automation, parameter.id, keyframe.id, {
        easing,
        bezier:
          easing === 'custom-bezier'
            ? keyframe.bezier ?? ([0.42, 0, 0.58, 1] as [number, number, number, number])
            : null,
      });
      updated = true;
    });
    if (track) {
      EFFECT_AUTOMATION_PARAMETERS.forEach((parameter) => {
        const keyframe = findTrackEffectAutomationKeyframeAtTime(track, parameter, activeTime);
        if (!keyframe) {
          return;
        }

        trackAutomation = updateKeyframe(trackAutomation, parameter.id, keyframe.id, {
          easing,
          bezier:
            easing === 'custom-bezier'
              ? keyframe.bezier ?? ([0.42, 0, 0.58, 1] as [number, number, number, number])
              : null,
        });
        updated = true;
      });
    }

    if (!updated) {
      return;
    }

    const updatedClip = {...selectedClip, automation};
    const updatedProject: ProjectRecord = {
      ...activeProject,
      clips: activeProject.clips.map((clip) => (clip.id === selectedClip.id ? updatedClip : clip)),
      tracks: track
        ? activeProject.tracks.map((item) => (item.id === track.id ? {...item, automation: trackAutomation} : item))
        : activeProject.tracks,
    };
    commitState(updateProject(appState, updatedProject), false);
    syncSelectedClipAutomationKeyframes(updatedClip, activeTime);
    hasUnsavedChanges = true;
  }

  function handleUpdateClipAutomationKeyframe(
    parameterId: ClipAutomationParameterId,
    keyframeId: string,
    patch: Partial<Pick<AutomationKeyframe, 'time' | 'value' | 'easing' | 'bezier'>>,
  ) {
    const parameter = getClipAutomationParameterDefinition(parameterId);
    if (selectedClip && parameter) {
      handleUpdateClipAutomationKeyframeForClip(selectedClip.id, parameter, keyframeId, patch);
    }
  }

  function handleUpdateClipAutomationKeyframeForClip(
    clipId: string,
    parameter: ClipAutomationParameterDefinition,
    keyframeId: string,
    patch: Partial<Pick<AutomationKeyframe, 'time' | 'value' | 'easing' | 'bezier'>>,
    showErrors = true,
  ) {
    if (!activeProject) {
      return false;
    }

    const clip = activeProject.clips.find((item) => item.id === clipId);
    if (!clip) {
      if (showErrors) {
        showToast('Select a clip first');
      }
      return false;
    }

    const lane = getAutomationLane(clip.automation, parameter.id);
    const keyframes = getSortedKeyframes(lane);
    const currentKeyframe = keyframes.find((keyframe) => keyframe.id === keyframeId);
    if (!currentKeyframe) {
      if (showErrors) {
        showToast('Keyframe is no longer available');
      }
      return false;
    }

    const nextTime = patch.time ?? currentKeyframe.time;
    if (nextTime < clip.startTime || nextTime > clip.startTime + clip.duration) {
      if (showErrors) {
        showToast('Keyframe must stay inside the clip');
      }
      return false;
    }

    const collidesWithAnotherKeyframe = keyframes.some(
      (keyframe) => keyframe.id !== keyframeId && Math.abs(keyframe.time - nextTime) <= keyframeCollisionTolerance,
    );
    if (collidesWithAnotherKeyframe) {
      if (showErrors) {
        showToast('Keyframes need a little space');
      }
      return false;
    }

    const normalizedPatch: Partial<Pick<AutomationKeyframe, 'time' | 'value' | 'easing' | 'bezier'>> = {...patch};
    if (patch.value !== undefined) {
      normalizedPatch.value = clampClipAutomationParameterValue(parameter, patch.value);
    }

    if (patch.easing !== undefined) {
      normalizedPatch.bezier =
        patch.easing === 'custom-bezier'
          ? patch.bezier ?? currentKeyframe.bezier ?? ([0.42, 0, 0.58, 1] as [number, number, number, number])
          : null;
    }

    const automation = updateKeyframe(clip.automation, parameter.id, keyframeId, normalizedPatch);
    const nextSelectedTime = normalizedPatch.time ?? currentKeyframe.time;
    const updatedClip = {...clip, automation};
    const updatedProject: ProjectRecord = {
      ...activeProject,
      clips: activeProject.clips.map((item) => (item.id === clip.id ? updatedClip : item)),
    };
    commitState(updateProject(appState, updatedProject), false);
    selectedClipId = clip.id;
    syncSelectedClipAutomationKeyframes(updatedClip, nextSelectedTime);
    if (normalizedPatch.time !== undefined) {
      playhead = normalizedPatch.time;
    }
    hasUnsavedChanges = true;
    return true;
  }

  function handleChangeTrackProperty(trackId: string, property: keyof Track, value: Track[keyof Track]) {
    if (!activeProject) {
      return;
    }

    const updatedProject: ProjectRecord = {
      ...activeProject,
      tracks: activeProject.tracks.map((track) => (track.id === trackId ? {...track, [property]: value} : track)),
    };
    commitState(updateProject(appState, updatedProject), false);
    hasUnsavedChanges = true;
  }

  function handleFocusTrackEffect(trackId: string, effectType: EffectInstance['type']) {
    if (!activeProject?.tracks.some((track) => track.id === trackId)) {
      return;
    }

    isRightSidebarCollapsed = false;
    effectFocusRequestCounter += 1;
    effectFocusRequest = {
      id: effectFocusRequestCounter,
      effectType,
    };
  }

  function canLiveUpdateTrackEffect(
    previousEffect: EffectInstance,
    nextEffect: EffectInstance,
    patch: Partial<EffectInstance>,
  ) {
    if (!previousEffect.enabled || !nextEffect.enabled) {
      return false;
    }

    if (patch.enabled !== undefined && patch.enabled !== previousEffect.enabled) {
      return false;
    }

    const parameterKeys = Object.keys(patch.parameters ?? {});
    if (parameterKeys.length === 0) {
      return false;
    }

    if (nextEffect.type === 'reverb') {
      return parameterKeys.every((key) => key === 'amount');
    }

    return (
      nextEffect.type === 'eq' ||
      nextEffect.type === 'filter' ||
      nextEffect.type === 'compressor' ||
      nextEffect.type === 'gate' ||
      nextEffect.type === 'limiter' ||
      nextEffect.type === 'saturation' ||
      nextEffect.type === 'overdrive' ||
      nextEffect.type === 'bitcrusher' ||
      nextEffect.type === 'chorus' ||
      nextEffect.type === 'flanger' ||
      nextEffect.type === 'phaser' ||
      nextEffect.type === 'tremolo' ||
      nextEffect.type === 'vibrato' ||
      nextEffect.type === 'ring' ||
      nextEffect.type === 'delay'
    );
  }

  function handleSetTrackEffectAutomationValueAtTime(
    trackId: string,
    parameter: EffectAutomationParameterDefinition,
    time: number,
    value: number,
  ) {
    if (!activeProject || !selectedClip || selectedClip.trackId !== trackId) {
      return false;
    }

    if (time < selectedClip.startTime || time > selectedClip.startTime + selectedClip.duration) {
      showToast('Move playhead inside the clip');
      return false;
    }

    const track = activeProject.tracks.find((item) => item.id === trackId);
    if (!track) {
      showToast('Selected clip track is missing');
      return false;
    }

    const updatedProject = createProjectWithTrackEffectAutomation(activeProject, trackId, parameter, time, value);
    if (!updatedProject) {
      showToast('Selected clip track is missing');
      return false;
    }

    commitState(updateProject(appState, updatedProject), false);
    syncSelectedClipAutomationKeyframes(selectedClip, time);
    hasUnsavedChanges = true;
    return true;
  }

  function createProjectWithTrackEffectAutomation(
    project: ProjectRecord,
    trackId: string,
    parameter: EffectAutomationParameterDefinition,
    time: number,
    value: number,
  ): ProjectRecord | null {
    const track = project.tracks.find((item) => item.id === trackId);
    if (!track) {
      return null;
    }

    const normalizedValue = Number(clampEffectAutomationParameterValue(parameter, value).toFixed(parameter.precision));
    const lane = getAutomationLane(track.automation, parameter.id);
    const existingKeyframe = getSortedKeyframes(lane).find(
      (keyframe) => Math.abs(keyframe.time - time) <= keyframeCollisionTolerance,
    );
    const automation = existingKeyframe
      ? updateKeyframe(track.automation, parameter.id, existingKeyframe.id, {value: normalizedValue})
      : upsertKeyframe(track.automation, makeId('lane'), parameter.id, {
          id: makeId('keyframe'),
          time,
          value: normalizedValue,
          easing: 'linear',
          bezier: null,
        });

    return {
      ...project,
      tracks: project.tracks.map((item) => (item.id === track.id ? {...item, automation} : item)),
    };
  }

  function getTrackEffectAutomationWriteTime(
    trackId: string,
    effectType: EffectInstance['type'],
    parameterEntries: [string, unknown][],
  ) {
    if (!activeProject || !selectedClip || selectedClip.trackId !== trackId) {
      return null;
    }

    const track = activeProject.tracks.find((item) => item.id === trackId) ?? null;
    if (!track) {
      return null;
    }

    const playheadInsideClip = isTimeInsideClip(playhead, selectedClip);
    const playheadCompoundTime = playheadInsideClip ? getClipCompoundKeyframeTimeNear(selectedClip, playhead) : null;
    if (playheadCompoundTime !== null) {
      return playheadCompoundTime;
    }

    if (selectedClipAutomationTime !== null && isTimeInsideClip(selectedClipAutomationTime, selectedClip)) {
      return selectedClipAutomationTime;
    }

    const hasAutomatedParameter = parameterEntries.some(([key, value]) => {
      if (typeof value !== 'number') {
        return false;
      }

      const parameter = getEffectAutomationParameterByEffectParameter(effectType, key);
      return Boolean(parameter && getSortedKeyframes(getAutomationLane(track.automation, parameter.id)).length > 0);
    });

    return playheadInsideClip && hasAutomatedParameter ? playhead : null;
  }

  function handleUpdateTrackEffect(trackId: string, effectType: EffectInstance['type'], patch: Partial<EffectInstance>) {
    if (!activeProject) {
      return;
    }

    let projectForUpdate = activeProject;
    let wroteAutomation = false;
    let automationWriteTime: number | null = null;

    if (patch.parameters) {
      const parameterEntries = Object.entries(patch.parameters);
      automationWriteTime = getTrackEffectAutomationWriteTime(trackId, effectType, parameterEntries);
      const automatedParameterEntries = automationWriteTime === null ? [] : parameterEntries.filter(([key, value]) =>
        typeof value === 'number' && Boolean(getEffectAutomationParameterByEffectParameter(effectType, key)),
      );
      if (automationWriteTime !== null && automatedParameterEntries.length > 0) {
        const automationTime = automationWriteTime;
        automatedParameterEntries.forEach(([key, value]) => {
          const parameter = getEffectAutomationParameterByEffectParameter(effectType, key);
          if (parameter && typeof value === 'number') {
            const nextProject = createProjectWithTrackEffectAutomation(
              projectForUpdate,
              trackId,
              parameter,
              automationTime,
              value,
            );
            if (nextProject) {
              projectForUpdate = nextProject;
              wroteAutomation = true;
            }
          }
        });

        const remainingParameters = Object.fromEntries(
          Object.entries(patch.parameters).filter(
            ([key]) => !getEffectAutomationParameterByEffectParameter(effectType, key),
          ),
        );
        if (Object.keys(remainingParameters).length === 0 && patch.enabled === undefined) {
          if (wroteAutomation) {
            commitState(updateProject(appState, projectForUpdate), false);
            if (selectedClip) {
              syncSelectedClipAutomationKeyframes(selectedClip, automationTime);
            }
            hasUnsavedChanges = true;
          }
          return;
        }

        patch = {
          ...patch,
          parameters: remainingParameters,
        };
      }
    }

    let livePlaybackMutationApplied = false;
    const updatedProject: ProjectRecord = {
      ...projectForUpdate,
      tracks: projectForUpdate.tracks.map((track) => {
        if (track.id !== trackId) {
          return track;
        }

        const existingEffect = track.effects.find((effect) => effect.type === effectType);
        const baseEffect = existingEffect ?? createDefaultEffect(effectType);
        const updatedEffect: EffectInstance = {
          ...baseEffect,
          ...patch,
          parameters: {
            ...baseEffect.parameters,
            ...(patch.parameters ?? {}),
          },
        };
        const hasAutomatedPatchedEffectParameter = Object.keys(patch.parameters ?? {}).some((key) => {
          const parameter = getEffectAutomationParameterByEffectParameter(effectType, key);
          return Boolean(parameter && getSortedKeyframes(getAutomationLane(track.automation, parameter.id)).length > 0);
        });
        if (
          isPlaying &&
          playbackHandle &&
          !hasAutomatedPatchedEffectParameter &&
          canLiveUpdateTrackEffect(baseEffect, updatedEffect, patch) &&
          playbackHandle.updateTrackEffect(trackId, updatedEffect)
        ) {
          livePlaybackMutationApplied = true;
        }

        const effects = existingEffect
          ? track.effects.map((effect) => (effect.id === existingEffect.id ? updatedEffect : effect))
          : [...track.effects, updatedEffect];
        return {...track, effects};
      }),
    };
    commitState(updateProject(appState, updatedProject), false, {
      suppressPlaybackPending: livePlaybackMutationApplied,
    });
    if (wroteAutomation && selectedClip && automationWriteTime !== null) {
      syncSelectedClipAutomationKeyframes(selectedClip, automationWriteTime);
    }
    hasUnsavedChanges = true;
  }

  function openImportAudioPicker() {
    if (!activeProject) {
      showToast('Create a project first');
      return;
    }

    audioInputRef.click();
  }

  async function handleAudioInputChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';

    if (files.length > 0) {
      await handleImportAudioFiles(files);
    }
  }

  async function handleImportAudioFiles(files: File[]) {
    if (!activeProject) {
      showToast('Create a project first');
      return;
    }

    isImportingAudio = true;
    let workingProject = activeProject;
    let importedCount = 0;
    let selectedImportedClipId: string | null = null;
    const importErrors: string[] = [];

    for (const file of files) {
      try {
        const audioBuffer = await decodeAudioBlob(file);
        const sourceRecord = createAudioSourceRecord(makeId('source'), file, audioBuffer);
        const trackId = makeId('track');
        const clipId = makeId('clip');
        const cleanName = stripExtension(file.name);
        const track: Track = {
          id: trackId,
          name: cleanName,
          type: 'audio',
          color: trackColors[workingProject.tracks.length % trackColors.length],
          volume: 100,
          pan: 0,
          isMuted: false,
          isSoloed: false,
          effects: [],
          automation: [],
        };
        const clip: Clip = {
          id: clipId,
          trackId,
          sourceId: sourceRecord.id,
          name: cleanName,
          startTime: playhead,
          sourceStartTime: 0,
          sourceTimelineOffset: 0,
          duration: sourceRecord.duration,
          gain: 0,
          pan: 'C',
          pitch: 0,
          speed: 1,
          timeStretchMode: 'linked-speed-pitch',
          automationAnchorMode: 'timeline-locked',
          fadeIn: 0,
          fadeOut: 0,
          isReversed: false,
          waveformPeaks: sourceRecord.waveformPeaks,
          automation: [],
        };

        await saveAudioSourceBlob(workingProject.id, sourceRecord, file);
        sourceBlobAvailability = {...sourceBlobAvailability, [sourceRecord.id]: 'available'};
        workingProject = {
          ...workingProject,
          audioSources: [...workingProject.audioSources, sourceRecord],
          tracks: [...workingProject.tracks, track],
          clips: [...workingProject.clips, clip],
        };
        importedCount += 1;
        selectedImportedClipId = clipId;
      } catch (error) {
        importErrors.push(`${file.name}: ${getErrorMessage(error)}`);
      }
    }

    if (importedCount > 0) {
      sourceBlobAvailabilitySignature = getActiveProjectSourceSignature(workingProject);
      commitState(updateProject(appState, workingProject));
      selectedClipId = selectedImportedClipId;
      hasUnsavedChanges = false;
      showToast(importedCount === 1 ? 'Audio imported' : `${importedCount} audio files imported`);
    }

    if (importErrors.length > 0) {
      storageWarning = importErrors[0];
    }

    isImportingAudio = false;
  }

  async function handleTogglePlayback() {
    if (isPlaying) {
      stopPlayback(false);
      return;
    }

    if (!activeProject || !playbackReadiness.ready) {
      showToast(playbackReadiness.reason ?? 'Playback is unavailable');
      return;
    }

    await startPlaybackAt(playhead);
  }

  async function startPlaybackAt(
    startAt: number,
    options: {loopRange?: LoopRange | null; generationId?: number} = {},
  ) {
    if (!activeProject) {
      return;
    }

    try {
      const loopRange = isLoopEnabled ? options.loopRange ?? getLoopRange(activeProject, startAt) : null;
      const startTime = loopRange
        ? Math.max(
            loopRange.start,
            Math.min(
              loopRange.end,
              startAt >= loopRange.end - loopBoundaryToleranceSeconds ? loopRange.start : startAt,
            ),
          )
        : startAt >= getProjectDuration(activeProject)
          ? 0
          : startAt;
      const generationId = options.generationId ?? playbackGenerationCounter + 1;
      playhead = startTime;
      const handle = await startProjectPlayback({
        project: activeProject,
        startTime,
        endTime: loopRange?.end,
        generationId,
        loadSourceBlob: loadAudioSourceBlob,
        onPlayhead: (seconds) => {
          playhead = seconds;
        },
        onEnded: () => {
          playbackHandle = null;
          const nextLoopRange = isLoopEnabled && activeProject ? activePlaybackLoopRange ?? loopRange : null;
          if (nextLoopRange) {
            void startPlaybackAt(nextLoopRange.start, {generationId, loopRange: nextLoopRange});
            return;
          }

          isPlaying = false;
          activePlaybackLoopRange = null;
          playbackCacheStatus = createIdlePlaybackCacheStatus();
        },
      });
      const pendingGenerationId =
        playbackCacheStatus.pendingGenerationId && playbackCacheStatus.pendingGenerationId !== handle.generationId
          ? playbackCacheStatus.pendingGenerationId
          : null;
      const pendingFrameCount = pendingGenerationId ? playbackCacheStatus.pendingFrameCount : 0;
      playbackHandle = handle;
      playbackGenerationCounter = Math.max(playbackGenerationCounter, generationId);
      activePlaybackLoopRange = loopRange;
      playbackCacheStatus = {
        state: pendingGenerationId ? 'pending' : 'active',
        activeGenerationId: handle.generationId,
        pendingGenerationId,
        activeFrameCount: handle.frameCount,
        pendingFrameCount,
      };
      isPlaying = true;
    } catch (error) {
      playbackHandle = null;
      isPlaying = false;
      activePlaybackLoopRange = null;
      playbackCacheStatus = createIdlePlaybackCacheStatus();
      storageWarning = getErrorMessage(error);
    }
  }

  function openExportSettings() {
    if (!activeProject || !hasPlayableAudio) {
      showToast(playbackReadiness.reason ?? 'Audio is not ready for export');
      return;
    }

    exportSettings = createDefaultExportSettings(activeProject);
    exportErrorMessage = null;
    showExportSettingsModal = true;
  }

  async function handleExportProject(settings: ExportSettings) {
    if (!activeProject || !hasPlayableAudio) {
      exportErrorMessage = playbackReadiness.reason ?? 'Audio is not ready for export';
      return;
    }

    const exportRange = getExportRange(settings, activeProject, selectedClip, exportLoopRange);
    if (!exportRange || exportRange.end <= exportRange.start) {
      exportErrorMessage = 'Export range must have duration.';
      return;
    }

    isExportingAudio = true;
    exportErrorMessage = null;
    stopPlayback(false);

    try {
      const renderedBuffer = await renderProjectToAudioBuffer({
        project: activeProject,
        loadSourceBlob: loadAudioSourceBlob,
        sampleRate: settings.sampleRate,
        startTime: exportRange.start,
        endTime: exportRange.end,
      });
      const exportBlob = await encodeRenderedAudioBuffer(renderedBuffer, settings);
      downloadBlob(exportBlob, createExportFileName(settings));
      showExportSettingsModal = false;
      showToast(`${settings.format.toUpperCase()} exported`);
    } catch (error) {
      exportErrorMessage = getErrorMessage(error);
      storageWarning = exportErrorMessage;
    } finally {
      isExportingAudio = false;
    }
  }

  function handleSelectTool(tool: DawTool) {
    const unavailableReason = toolbarToolReasons[tool];
    if (unavailableReason) {
      showToast(unavailableReason);
      return;
    }

    if (tool === 'split') {
      handleSplitSelectedClip();
      return;
    }

    if (tool === 'delete') {
      runCommand('delete-selection');
      return;
    }

    activeTool = tool;
  }

  function stopPlayback(resetPlayhead: boolean) {
    playbackHandle?.stop();
    playbackHandle = null;
    isPlaying = false;
    activePlaybackLoopRange = null;
    playbackCacheStatus = createIdlePlaybackCacheStatus();

    if (resetPlayhead) {
      playhead = 0;
      setTimelineViewportStart(0);
    }
  }

  function handleChangePlayhead(seconds: number) {
    const projectDuration = activeProject ? getProjectDuration(activeProject) : 0;
    let nextPlayhead = Math.max(0, Math.min(projectDuration, seconds));

    if (isPlaying && playbackHandle && isLoopEnabled && activeProject) {
      const loopRange = activePlaybackLoopRange ?? getLoopRange(activeProject, playhead);
      if (loopRange) {
        nextPlayhead = clampPlayheadToLoopRange(nextPlayhead, loopRange);
      }
    }

    playhead = nextPlayhead;
    revealTimeInTimelineViewport(nextPlayhead);
    syncCompoundSelectionAtPlayhead(nextPlayhead);

    if (!isPlaying || !playbackHandle) {
      return;
    }

    playbackHandle.seek(nextPlayhead).catch((error) => {
      stopPlayback(false);
      storageWarning = getErrorMessage(error);
    });
  }

  async function handleConfirmIntent() {
    if (!confirmIntent) {
      return;
    }

    if (confirmIntent.kind === 'delete-project') {
      const nextState = deleteProject(appState, confirmIntent.project.id);
      commitState(nextState);
      await deleteUnusedSourceBlobs(confirmIntent.project, nextState);
      selectedClipId = null;
      selectedTimelineMarkId = null;
      clearClipAutomationSelection();
      playhead = 0;
      hasUnsavedChanges = false;
      showToast('Project deleted');
    }

    if (confirmIntent.kind === 'reset-data') {
      clearAppState();
      await clearAudioSourceBlobs();
      appState = createDefaultAppState();
      sourceBlobAvailability = {};
      sourceBlobAvailabilitySignature = '';
      selectedClipId = null;
      selectedTimelineMarkId = null;
      clearClipAutomationSelection();
      playhead = 0;
      hasUnsavedChanges = false;
      showAppSettingsModal = false;
      showToast('Local projects reset');
    }

    confirmIntent = null;
  }

  async function deleteUnusedSourceBlobs(project: ProjectRecord, nextState: AppState) {
    const remainingSourceIds = new Set(nextState.projects.flatMap((item) => item.audioSources.map((source) => source.id)));
    const sourceIdsToDelete = project.audioSources.map((source) => source.id).filter((sourceId) => !remainingSourceIds.has(sourceId));

    try {
      await Promise.all(sourceIdsToDelete.map(deleteAudioSourceBlob));
    } catch (error) {
      storageWarning = getErrorMessage(error);
    }
  }

  function getConfirmTitle() {
    return confirmIntent?.kind === 'delete-project' ? 'Delete project?' : 'Reset local data?';
  }

  function getConfirmMessage() {
    return confirmIntent?.kind === 'delete-project'
      ? `Delete "${confirmIntent.project.name}" from this browser? This cannot be undone.`
      : 'This removes all local Arudio projects stored in this browser.';
  }

  function stripExtension(fileName: string) {
    return fileName.replace(/\.[^/.]+$/, '').trim() || 'Audio Track';
  }

  function getProjectDuration(project: ProjectRecord) {
    return project.clips.reduce((duration, clip) => Math.max(duration, clip.startTime + clip.duration), 0);
  }

  function getLoopRange(project: ProjectRecord, startTime: number) {
    const duration = getProjectDuration(project);
    if (duration <= 0) {
      return null;
    }

    const loopClip = getLoopClipAtTime(project, startTime);
    if (loopClip) {
      return {
        start: loopClip.startTime,
        end: loopClip.startTime + loopClip.duration,
      };
    }

    return {start: 0, end: duration};
  }

  function getLoopClipAtTime(project: ProjectRecord, time: number) {
    if (selectedClip && project.clips.some((clip) => clip.id === selectedClip.id) && isTimeInLoopClipRange(time, selectedClip)) {
      return selectedClip;
    }

    return (
      [...project.clips]
        .filter((clip) => isTimeInLoopClipRange(time, clip))
        .sort((left, right) => {
          const leftEndDistance = Math.abs(left.startTime + left.duration - time);
          const rightEndDistance = Math.abs(right.startTime + right.duration - time);
          const leftOnEndEdge = leftEndDistance <= loopBoundaryToleranceSeconds;
          const rightOnEndEdge = rightEndDistance <= loopBoundaryToleranceSeconds;

          if (leftOnEndEdge !== rightOnEndEdge) {
            return leftOnEndEdge ? -1 : 1;
          }

          return right.startTime - left.startTime;
        })[0] ?? null
    );
  }

  function isTimeInLoopClipRange(time: number, clip: Clip) {
    const clipEnd = clip.startTime + clip.duration;
    return time >= clip.startTime - loopBoundaryToleranceSeconds && time <= clipEnd + loopBoundaryToleranceSeconds;
  }

  function clampPlayheadToLoopRange(seconds: number, loopRange: LoopRange) {
    if (loopRange.end <= loopRange.start) {
      return loopRange.start;
    }

    if (seconds < loopRange.start - loopBoundaryToleranceSeconds || seconds >= loopRange.end) {
      return loopRange.start;
    }

    return seconds;
  }

  function handleToggleLoop() {
    if (!activeProject) {
      showToast('Create or open a project first');
      return;
    }

    isLoopEnabled = !isLoopEnabled;
    showToast(isLoopEnabled ? 'Loop enabled' : 'Loop disabled');

    if (isPlaying && playbackHandle) {
      const restartAt = playhead;
      playbackHandle.stop();
      playbackHandle = null;
      isPlaying = false;
      void startPlaybackAt(restartAt);
    }
  }

  function clampTimelineTime(project: ProjectRecord, time: number) {
    const duration = Math.max(getProjectDuration(project), timelineDuration, 1);
    return Number(Math.max(0, Math.min(duration, time)).toFixed(6));
  }

  function handleAddTimelineMark(time: number, useLivePlaybackTime = false) {
    if (!activeProject) {
      return;
    }

    const markTime = useLivePlaybackTime && isPlaying && playbackHandle ? playbackHandle.getCurrentTime() : time;
    const mark = createFrameLockedTimelineMark(activeProject, markTime);
    const existingFrameMark = findTimelineMarkAtFrame(activeProject, mark.sampleFrame);
    if (existingFrameMark) {
      const updatedProject: ProjectRecord = {
        ...activeProject,
        timelineMarks: activeProject.timelineMarks.filter((item) => item.id !== existingFrameMark.id),
      };
      commitState(updateProject(appState, updatedProject), false);
      selectedTimelineMarkId = null;
      if (beatPulseMarkId === existingFrameMark.id) {
        beatPulseMarkId = null;
      }
      hasUnsavedChanges = true;
      showToast('Beat marker removed');
      return;
    }

    const updatedProject: ProjectRecord = {
      ...activeProject,
      timelineMarks: [...activeProject.timelineMarks, mark].sort((first, second) => first.time - second.time),
    };
    commitState(updateProject(appState, updatedProject), false);
    selectedTimelineMarkId = mark.id;
    playhead = mark.time;
    hasUnsavedChanges = true;
    showToast('Beat marker added');
  }

  function handleSelectTimelineMark(markId: string | null) {
    selectedTimelineMarkId = markId;
    const mark = activeProject?.timelineMarks.find((item) => item.id === markId);
    if (mark) {
      playhead = mark.time;
    }
  }

  function handleDeleteSelectedTimelineMark() {
    if (!activeProject || !selectedTimelineMarkId) {
      showToast('Select a timeline mark first');
      return;
    }

    const updatedProject: ProjectRecord = {
      ...activeProject,
      timelineMarks: activeProject.timelineMarks.filter((mark) => mark.id !== selectedTimelineMarkId),
    };
    commitState(updateProject(appState, updatedProject), false);
    selectedTimelineMarkId = null;
    hasUnsavedChanges = true;
    showToast('Timeline mark deleted');
  }

  function createFrameLockedTimelineMark(project: ProjectRecord, time: number): TimelineMarkRecord {
    const sampleFrame = timeToProjectFrame(project, clampTimelineTime(project, time));
    return {
      id: makeId('mark'),
      time: frameToProjectTime(project, sampleFrame),
      sampleFrame,
      label: null,
      createdAt: new Date().toISOString(),
    };
  }

  function getTimelineMarkFrame(project: ProjectRecord, mark: TimelineMarkRecord) {
    return Number.isFinite(mark.sampleFrame) ? mark.sampleFrame : timeToProjectFrame(project, mark.time);
  }

  function findTimelineMarkAtFrame(project: ProjectRecord, sampleFrame: number) {
    return project.timelineMarks.find((mark) => getTimelineMarkFrame(project, mark) === sampleFrame) ?? null;
  }

  function findTimelineMarkNearFrame(project: ProjectRecord, sampleFrame: number, toleranceSeconds: number) {
    const frameTolerance = Math.max(1, Math.round(project.settings.sampleRate * toleranceSeconds));
    return project.timelineMarks.find((mark) => Math.abs(getTimelineMarkFrame(project, mark) - sampleFrame) <= frameTolerance) ?? null;
  }

  function getActiveBeatMarkId(project: ProjectRecord, time: number) {
    const sampleFrame = timeToProjectFrame(project, time);
    return findTimelineMarkNearFrame(project, sampleFrame, beatHitToleranceSeconds)?.id ?? null;
  }

  function getPulsingBeatMarkId(project: ProjectRecord) {
    return beatPulseMarkId && project.timelineMarks.some((mark) => mark.id === beatPulseMarkId) ? beatPulseMarkId : null;
  }

  function updateBeatPulse(project: ProjectRecord | null, currentPlayhead: number, playing: boolean) {
    if (!project) {
      previousBeatProjectId = null;
      previousBeatPlayhead = currentPlayhead;
      beatPulseMarkId = null;
      return;
    }

    if (previousBeatProjectId !== project.id) {
      previousBeatProjectId = project.id;
      previousBeatPlayhead = currentPlayhead;
      return;
    }

    if (!playing || currentPlayhead < previousBeatPlayhead) {
      previousBeatPlayhead = currentPlayhead;
      return;
    }

    const crossedBeat = project.timelineMarks.find(
      (mark) => mark.time > previousBeatPlayhead + 0.000001 && mark.time <= currentPlayhead + 0.000001,
    );
    if (crossedBeat) {
      pulseBeatMark(crossedBeat.id);
    }

    previousBeatPlayhead = currentPlayhead;
  }

  function pulseBeatMark(markId: string) {
    beatPulseMarkId = markId;
    if (beatPulseTimer) {
      window.clearTimeout(beatPulseTimer);
    }

    beatPulseTimer = window.setTimeout(() => {
      beatPulseMarkId = null;
      beatPulseTimer = null;
    }, beatHitHoldMs);
  }

  function timeToProjectFrame(project: ProjectRecord, time: number) {
    return Math.max(0, Math.round(time * project.settings.sampleRate));
  }

  function frameToProjectTime(project: ProjectRecord, sampleFrame: number) {
    return Number((Math.max(0, sampleFrame) / project.settings.sampleRate).toFixed(6));
  }

  function createIdlePlaybackCacheStatus(): PlaybackCacheStatus {
    return {
      state: 'idle',
      activeGenerationId: null,
      pendingGenerationId: null,
      activeFrameCount: 0,
      pendingFrameCount: 0,
    };
  }

  function markPlaybackCachePending(project: ProjectRecord) {
    if (!playbackHandle || playbackCacheStatus.state === 'idle') {
      return;
    }

    const pendingGenerationId = playbackCacheStatus.pendingGenerationId ?? playbackGenerationCounter + 1;
    if (!playbackCacheStatus.pendingGenerationId) {
      playbackGenerationCounter = pendingGenerationId;
    }

    playbackCacheStatus = {
      ...playbackCacheStatus,
      state: 'pending',
      pendingGenerationId,
      pendingFrameCount: getProjectFrameCount(project),
    };
  }

  function getProjectFrameCount(project: ProjectRecord) {
    return Math.max(1, Math.ceil(getProjectDuration(project) * project.settings.sampleRate));
  }

  function getClipPlaybackRate(clip: Clip) {
    return Math.max(0.05, clip.speed * Math.pow(2, clip.pitch / 12));
  }

  function getClipSourceTimelineOffset(clip: Clip) {
    return Math.max(0, Math.min(clip.duration, clip.sourceTimelineOffset ?? 0));
  }

  function isPlayheadInsideClip(clip: Clip) {
    return isTimeInsideClip(playhead, clip);
  }

  function isTimeInsideClip(time: number, clip: Clip) {
    return time >= clip.startTime && time <= clip.startTime + clip.duration;
  }

  function trimAutomationToRange(clip: Clip, startTime: number, endTime: number) {
    return clip.automation
      .map((lane) => {
        const keyframes = lane.keyframes.filter((keyframe) => keyframe.time >= startTime && keyframe.time <= endTime);
        const parameter = getClipAutomationParameterDefinition(lane.parameterId);
        if (parameter && lane.keyframes.length > 0) {
          const fallbackValue = getClipAutomationParameterValue(clip, parameter);
          keyframes.push({
            id: makeId('keyframe'),
            time: startTime,
            value: evaluateAutomationValue(lane, fallbackValue, startTime),
            easing: 'linear',
            bezier: null,
          });
          keyframes.push({
            id: makeId('keyframe'),
            time: endTime,
            value: evaluateAutomationValue(lane, fallbackValue, endTime),
            easing: 'linear',
            bezier: null,
          });
        }

        return {
          ...lane,
          keyframes: dedupeKeyframesByTime(keyframes),
        };
      })
      .filter((lane) => lane.keyframes.length > 0);
  }

  function dedupeKeyframesByTime(keyframes: AutomationKeyframe[]) {
    const keyframeMap = new Map<string, AutomationKeyframe>();
    keyframes.forEach((keyframe) => {
      keyframeMap.set(keyframe.time.toFixed(3), keyframe);
    });

    return [...keyframeMap.values()].sort((first, second) => first.time - second.time);
  }

  function shiftAutomationTimes(lanes: Clip['automation'], delta: number) {
    if (Math.abs(delta) < 0.0001) {
      return lanes;
    }

    return lanes.map((lane) => ({
      ...lane,
      keyframes: lane.keyframes.map((keyframe) => ({
        ...keyframe,
        time: Number((keyframe.time + delta).toFixed(4)),
      })),
    }));
  }

  function shiftAutomationTimesInRange(lanes: Track['automation'], startTime: number, endTime: number, delta: number) {
    if (Math.abs(delta) < 0.0001) {
      return lanes;
    }

    return lanes.map((lane) => ({
      ...lane,
      keyframes: lane.keyframes
        .map((keyframe) =>
          keyframe.time >= startTime - keyframeCollisionTolerance && keyframe.time <= endTime + keyframeCollisionTolerance
            ? {
                ...keyframe,
                time: Number((keyframe.time + delta).toFixed(4)),
              }
            : keyframe,
        )
        .sort((first, second) => first.time - second.time),
    }));
  }

  function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'The audio operation failed.';
  }

  function createDefaultEffect(type: EffectInstance['type']): EffectInstance {
    if (type === 'eq') {
      return {
        id: makeId('effect'),
        type: 'eq',
        enabled: false,
        parameters: createGraphicEqDefaultParameters(),
      };
    }

    if (type === 'compressor') {
      return {
        id: makeId('effect'),
        type: 'compressor',
        enabled: false,
        parameters: createCompressorDefaultParameters(),
      };
    }

    if (type === 'filter') {
      return {
        id: makeId('effect'),
        type: 'filter',
        enabled: false,
        parameters: createFilterDefaultParameters(),
      };
    }

    if (type === 'gate') {
      return {
        id: makeId('effect'),
        type: 'gate',
        enabled: false,
        parameters: createGateDefaultParameters(),
      };
    }

    if (type === 'limiter') {
      return {
        id: makeId('effect'),
        type: 'limiter',
        enabled: false,
        parameters: createLimiterDefaultParameters(),
      };
    }

    if (type === 'saturation') {
      return {
        id: makeId('effect'),
        type: 'saturation',
        enabled: false,
        parameters: createSaturationDefaultParameters(),
      };
    }

    if (type === 'overdrive') {
      return {
        id: makeId('effect'),
        type: 'overdrive',
        enabled: false,
        parameters: createOverdriveDefaultParameters(),
      };
    }

    if (type === 'bitcrusher') {
      return {
        id: makeId('effect'),
        type: 'bitcrusher',
        enabled: false,
        parameters: createBitcrusherDefaultParameters(),
      };
    }

    if (type === 'chorus') {
      return {
        id: makeId('effect'),
        type: 'chorus',
        enabled: false,
        parameters: createChorusDefaultParameters(),
      };
    }

    if (type === 'flanger') {
      return {
        id: makeId('effect'),
        type: 'flanger',
        enabled: false,
        parameters: createFlangerDefaultParameters(),
      };
    }

    if (type === 'phaser') {
      return {
        id: makeId('effect'),
        type: 'phaser',
        enabled: false,
        parameters: createPhaserDefaultParameters(),
      };
    }

    if (type === 'tremolo') {
      return {
        id: makeId('effect'),
        type: 'tremolo',
        enabled: false,
        parameters: createTremoloDefaultParameters(),
      };
    }

    if (type === 'vibrato') {
      return {
        id: makeId('effect'),
        type: 'vibrato',
        enabled: false,
        parameters: createVibratoDefaultParameters(),
      };
    }

    if (type === 'ring') {
      return {
        id: makeId('effect'),
        type: 'ring',
        enabled: false,
        parameters: createRingModulatorDefaultParameters(),
      };
    }

    if (type === 'reverb') {
      return {
        id: makeId('effect'),
        type: 'reverb',
        enabled: false,
        parameters: {amount: 0.35, size: 2.8},
      };
    }

    if (type === 'delay') {
      return {
        id: makeId('effect'),
        type: 'delay',
        enabled: false,
        parameters: createDelayDefaultParameters(),
      };
    }

    return {
      id: makeId('effect'),
      type,
      enabled: false,
      parameters: {},
    };
  }

  function createDefaultExportSettings(project: ProjectRecord): ExportSettings {
    const date = new Date().toISOString().slice(0, 10);
    const pattern = project.settings.exportNamePattern || '{project}-{date}';
    const fileName = pattern
      .replaceAll('{project}', project.name)
      .replaceAll('{date}', date)
      .trim();

    return {
      format: 'wav',
      sampleRate: project.settings.sampleRate,
      bitDepth: 16,
      channelMode: 'stereo',
      rangeMode: 'full',
      customStart: 0,
      customEnd: getProjectDuration(project),
      normalizeMode: 'off',
      normalizePeakDb: -1,
      ditherMode: 'off',
      mp3Bitrate: 192,
      fileName: fileName || 'Arudio Export',
    };
  }

  function getExportRange(
    settings: ExportSettings,
    project: ProjectRecord,
    clip: Clip | null,
    loopRange: ExportRange | null,
  ): ExportRange | null {
    const duration = getProjectDuration(project);
    if (settings.rangeMode === 'selectedClip') {
      return clip ? {start: clip.startTime, end: clip.startTime + clip.duration} : null;
    }

    if (settings.rangeMode === 'loop') {
      return loopRange;
    }

    if (settings.rangeMode === 'custom') {
      return {
        start: clampExportTime(settings.customStart, duration),
        end: clampExportTime(settings.customEnd, duration),
      };
    }

    return {start: 0, end: duration};
  }

  function clampExportTime(seconds: number, duration: number) {
    if (!Number.isFinite(seconds)) {
      return 0;
    }

    return Math.max(0, Math.min(duration, seconds));
  }

  function createExportFileName(settings: ExportSettings) {
    const extension = settings.format === 'wav' ? 'wav' : 'mp3';
    const baseName = settings.fileName
      .replace(/\.[a-z0-9]{2,5}$/i, '')
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
    return `${baseName || 'Arudio Export'}.${extension}`;
  }

  function downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function showToast(message: string) {
    toastMessage = message;
    if (toastTimer) {
      window.clearTimeout(toastTimer);
    }

    toastTimer = window.setTimeout(() => {
      toastMessage = null;
      toastTimer = null;
    }, 2400);
  }
</script>

<div
  class="app-root"
  class:compact-density={appState.settings.density === 'compact'}
  class:comfortable-density={appState.settings.density === 'comfortable'}
  class:reduced-motion={appState.settings.reducedMotion}
  data-density={appState.settings.density}
  data-reduced-motion={appState.settings.reducedMotion}
>
  <input
    bind:this={audioInputRef}
    type="file"
    accept="audio/*"
    multiple
    hidden
    on:change={handleAudioInputChange}
  />

  {#if toastMessage}
    <div class="toast" role="status">
      <span class="toast-dot"></span>
      <span>{toastMessage}</span>
    </div>
  {/if}

  {#if storageWarning}
    <div class="toast" role="alert">
      <span class="toast-dot"></span>
      <span>{storageWarning}</span>
      <button type="button" on:click={() => (storageWarning = null)}>Dismiss</button>
    </div>
  {/if}

  <div class="main-layout">
    <SidebarLeft
      projects={appState.projects}
      activeProjectId={appState.activeProjectId}
      isCollapsed={isLeftSidebarCollapsed}
      onNewProject={() => {
        showNewProjectModal = true;
      }}
      onOpenProject={handleOpenProject}
      onDuplicateProject={handleDuplicateProject}
      onDeleteProject={handleDeleteProject}
      onToggleCollapsed={() => {
        isLeftSidebarCollapsed = !isLeftSidebarCollapsed;
      }}
    />

    <section class="center-pane">
      <HeaderTimeline
        project={activeProject}
        {playhead}
        {hasPlayableAudio}
        playbackUnavailableReason={playbackReadiness.reason}
        {hasUnsavedChanges}
        {isImportingAudio}
        {isExportingAudio}
        {timelineDuration}
        {timelineViewportStart}
        {timelineZoomLabel}
        {projectDuration}
        timelineMarks={activeProject?.timelineMarks ?? []}
        {selectedTimelineMarkId}
        {activeBeatMarkId}
        {isLoopEnabled}
        onChangePlayhead={handleChangePlayhead}
        onAddTimelineMark={handleAddTimelineMark}
        onSelectTimelineMark={handleSelectTimelineMark}
        onDeleteSelectedTimelineMark={handleDeleteSelectedTimelineMark}
        onZoomTimelineIn={handleZoomTimelineIn}
        onZoomTimelineOut={handleZoomTimelineOut}
        onZoomTimelineAt={handleZoomTimelineAt}
        onPanTimeline={handlePanTimeline}
        onPanTimelineLeft={handlePanTimelineLeft}
        onPanTimelineRight={handlePanTimelineRight}
        onToggleLoop={handleToggleLoop}
        onImportAudio={openImportAudioPicker}
        onExportProject={openExportSettings}
        onStopPlayback={() => stopPlayback(true)}
        onSave={handleSaveProject}
        onOpenCommandPalette={() => {
          showCommandPalette = true;
        }}
        onOpenAppSettings={() => {
          showAppSettingsModal = true;
        }}
        onOpenProjectSettings={() => {
          if (activeProject) {
            showProjectSettingsModal = true;
          }
        }}
      />

      <TrackTimeline
        project={activeProject}
        tracks={activeProject?.tracks ?? []}
        clips={activeProject?.clips ?? []}
        {playhead}
        {timelineDuration}
        {timelineViewportStart}
        {timelineLaneHeight}
        {projectDuration}
        timelineMarks={activeProject?.timelineMarks ?? []}
        {sourceBlobAvailability}
        {selectedTimelineMarkId}
        {activeBeatMarkId}
        {selectedClipId}
        {selectedClipAutomationTime}
        onChangePlayhead={handleChangePlayhead}
        onPanTimeline={handlePanTimeline}
        onZoomTimelineAt={handleZoomTimelineAt}
        onSelectTimelineMark={handleSelectTimelineMark}
        onSelectClip={(clipId) => {
          selectedClipId = clipId;
          clearClipAutomationSelection();
        }}
        onSelectClipCompoundKeyframe={handleSelectClipCompoundKeyframe}
        onMoveClipCompoundKeyframe={handleMoveClipCompoundKeyframe}
        onMoveClip={handleMoveClipToTime}
        onResizeClip={handleResizeClipOnTimeline}
        onReorderTrack={handleReorderTrack}
        onChangeTrackProperty={handleChangeTrackProperty}
        onOpenQuickContextMenu={handleOpenQuickContextMenu}
      />

      <EffectRack
        project={activeProject}
        {selectedClip}
        {selectedClipAutomationTime}
        {playhead}
        onUpdateTrackEffect={handleUpdateTrackEffect}
        onFocusTrackEffect={handleFocusTrackEffect}
      />

      <ToolbarBottom
        {activeTool}
        disabled={!activeProject}
        toolDisabledReasons={toolbarToolReasons}
        selectedClipName={selectedClip?.name ?? null}
        {selectedClipAutomationTime}
        compoundKeyframeCount={selectedClipCompoundKeyframeTimes.length}
        {activeCompoundParameterCount}
        {activeCompoundEasing}
        {playheadInsideSelectedClip}
        onSelectTool={handleSelectTool}
        onAddClipCompoundKeyframe={handleAddClipCompoundKeyframe}
        onDeleteClipCompoundKeyframe={handleDeleteClipCompoundKeyframe}
        onGoToPreviousClipCompoundKeyframe={() => handleGoToAdjacentClipCompoundKeyframe('previous')}
        onGoToNextClipCompoundKeyframe={() => handleGoToAdjacentClipCompoundKeyframe('next')}
        onUpdateClipCompoundKeyframeTime={handleUpdateClipCompoundKeyframeTime}
        onUpdateClipCompoundKeyframeEasing={handleUpdateClipCompoundKeyframeEasing}
      />
    </section>

    <SidebarRight
      project={activeProject}
      {selectedClip}
      isCollapsed={isRightSidebarCollapsed}
      focusedEffectRequest={effectFocusRequest}
      {selectedGainKeyframeId}
      {selectedPitchKeyframeId}
      {selectedClipAutomationTime}
      {playhead}
      {hasPlayableAudio}
      onChangeClipProperty={handleChangeClipProperty}
      onSplitSelectedClip={handleSplitSelectedClip}
      onDeleteSelectedClip={handleDeleteSelectedClip}
      onTrimSelectedClipStart={handleTrimSelectedClipStartToPlayhead}
      onTrimSelectedClipEnd={handleTrimSelectedClipEndToPlayhead}
      onAddClipCompoundKeyframe={handleAddClipCompoundKeyframe}
      onDeleteClipCompoundKeyframe={handleDeleteClipCompoundKeyframe}
      onGoToPreviousClipCompoundKeyframe={() => handleGoToAdjacentClipCompoundKeyframe('previous')}
      onGoToNextClipCompoundKeyframe={() => handleGoToAdjacentClipCompoundKeyframe('next')}
      onUpdateClipCompoundKeyframeTime={handleUpdateClipCompoundKeyframeTime}
      onUpdateClipCompoundKeyframeEasing={handleUpdateClipCompoundKeyframeEasing}
      onUpdateClipAutomationKeyframe={handleUpdateClipAutomationKeyframe}
      onUpdateTrackEffect={handleUpdateTrackEffect}
      onToggleCollapsed={() => {
        isRightSidebarCollapsed = !isRightSidebarCollapsed;
      }}
    />
  </div>

  <PlayerBottom
    project={activeProject}
    {playhead}
    {hasPlayableAudio}
    playbackUnavailableReason={playbackReadiness.reason}
    {isPlaying}
    {isLoopEnabled}
    {playbackCacheStatus}
    masterVolume={activeProject?.master.volume ?? 68}
    onTogglePlayback={handleTogglePlayback}
    onStopPlayback={() => stopPlayback(true)}
    onJumpToEnd={() => handleChangePlayhead(projectDuration)}
    onChangeMasterVolume={handleMasterVolumeChange}
  />

  {#if showCommandPalette}
    <CommandPalette
      commands={commandPaletteCommands}
      showShortcutHints={appState.settings.showShortcutHints}
      onClose={() => {
        showCommandPalette = false;
      }}
      onRun={runCommand}
    />
  {/if}

  {#if quickContextMenu}
    <QuickContextMenu
      x={quickContextMenu.x}
      y={quickContextMenu.y}
      title="Timeline Quick Actions"
      items={quickContextItems}
      onRun={runQuickContextMenuAction}
      onClose={() => {
        quickContextMenu = null;
      }}
    />
  {/if}

  {#if showNewProjectModal}
    <NewProjectModal
      onCreate={handleCreateProject}
      onCancel={() => {
        showNewProjectModal = false;
      }}
    />
  {/if}

  {#if showProjectSettingsModal && activeProject}
    <ProjectSettingsModal
      project={activeProject}
      onSave={handleProjectSettingsSave}
      onCancel={() => {
        showProjectSettingsModal = false;
      }}
    />
  {/if}

  {#if showAppSettingsModal}
    <AppSettingsModal
      settings={appState.settings}
      currentVersion={APP_VERSION}
      latestReleaseSeen={latestReleaseSeen}
      onOpenWhatsNew={() => openReleaseNotesFromSettings('latest')}
      onOpenChangelog={() => openReleaseNotesFromSettings('changelog')}
      onSave={handleAppSettingsSave}
      onResetData={() => {
        confirmIntent = {kind: 'reset-data'};
      }}
      onCancel={() => {
        showAppSettingsModal = false;
      }}
    />
  {/if}

  {#if showExportSettingsModal && activeProject && exportSettings}
    <ExportSettingsModal
      initialSettings={exportSettings}
      projectName={activeProject.name}
      {projectDuration}
      selectedClipName={selectedClip?.name ?? null}
      selectedClipRange={exportSelectedClipRange}
      loopRange={exportLoopRange}
      isExporting={isExportingAudio}
      errorMessage={exportErrorMessage}
      onCancel={() => {
        if (!isExportingAudio) {
          showExportSettingsModal = false;
          exportErrorMessage = null;
        }
      }}
      onSubmit={(settings) => {
        exportSettings = settings;
        void handleExportProject(settings);
      }}
    />
  {/if}

  {#if releaseNotesView}
    <ReleaseNotesModal
      releaseNotes={RELEASE_NOTES}
      view={releaseNotesView}
      onChangeView={(view) => {
        releaseNotesView = view;
      }}
      onClose={closeReleaseNotes}
    />
  {/if}

  {#if confirmIntent}
    <ConfirmDialog
      title={getConfirmTitle()}
      message={getConfirmMessage()}
      confirmLabel={confirmIntent.kind === 'delete-project' ? 'Delete' : 'Reset'}
      onConfirm={handleConfirmIntent}
      onCancel={() => {
        confirmIntent = null;
      }}
    />
  {/if}
</div>
