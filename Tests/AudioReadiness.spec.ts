// / - Arinara Network © 2026 - /
// This source code is the exclusive property of Arinara Network.
// Unauthorized use, reproduction, distribution, or modification of this
// code — in whole or in part — for any purpose whatsoever is strictly
// prohibited without prior written consent from Arinara Network as the
// sole legal owner of this codebase.
import {expect, test, type Download, type Locator, type Page} from '@playwright/test';
import {readFileSync, writeFileSync} from 'node:fs';

const appStateKey = 'arudio.appState.v1';
const audioSourceDatabaseName = 'ArudioAudioSources';

test('imported audio enables playback readiness, loop mode, and cache status', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');

  await expect(page.locator('.new-project-button')).toBeVisible();
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Create or open a project first');
  await expect(page.locator('.footer-icon[title="Jump to End"]')).toBeDisabled();
  await expect(page.locator('.player-bottom button[title*="pending"]')).toHaveCount(0);
  await expect(page.locator('.player-bottom .view-switches')).toHaveCount(0);
  await expect(page.locator('.tool-button')).toHaveText(['Select', 'Split', 'Move', 'Delete']);
  await expect(page.locator('.tool-button').filter({hasText: /Cut|Fade|Volume|Slip|Snap/})).toHaveCount(0);

  await page.locator('.new-project-button').click();
  await page.locator('.modal-panel .primary').click();
  await expect(page.locator('.project-button strong')).toHaveText('Untitled Project');
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Import audio before playback');

  const wavPath = testInfo.outputPath('arudio-readiness-tone.wav');
  writeFileSync(wavPath, createSineWaveWav());

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await expect(page.locator('.track-lane')).toHaveCount(1);
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Play');
  await expect(page.locator('.footer-icon[title="Jump to End"]')).toBeEnabled();
  await page.locator('.footer-icon[title="Jump to End"]').click();
  await expect.poll(() => isFooterTimeWithin(page, 0.95, 1.01)).toBe(true);
  await expect(page.locator('button[title="Export Audio"]')).toHaveCount(1);

  await page.goto('/');
  await expect(page.locator('.clip-block')).toHaveCount(1);
  const reloadStorageState = await readStoredAudioState(page);
  expect(reloadStorageState.sourceCount, JSON.stringify(reloadStorageState)).toBe(1);
  expect(reloadStorageState.blobAvailable, JSON.stringify(reloadStorageState)).toBe(true);
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Play');

  await page.locator('.loop-button').click();
  await expect(page.locator('.loop-button')).toHaveAttribute('title', 'Loop on');
  await expect(page.locator('.loop-chip')).toContainText('Loop');

  await page.locator('.footer-play').click();
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Pause');
  await expect(page.locator('.cache-status')).toContainText('Active cache');
  await expect(page.locator('.cache-status')).toContainText('Current');

  await page.locator('.footer-icon[title="Reset/Stop"]').click();
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Play');

  await deleteActiveUntitledProject(page);
  await expect(page.locator('.project-row')).toHaveCount(0);
  await expect(page.locator('.project-button strong')).toHaveText('No Project');
});

test('quick keyframe editor flexes to the right side of the bottom toolbar', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-quick-keyframe-layout.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 1, frequency: 440}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await expect(page.locator('.quick-keyframe-editor')).toBeVisible();

  const layout = await page.evaluate(() => {
    const toolbar = document.querySelector('.toolbar-band')?.getBoundingClientRect();
    const toolPill = document.querySelector('.tool-pill')?.getBoundingClientRect();
    const keyframeEditor = document.querySelector('.quick-keyframe-editor')?.getBoundingClientRect();
    const centerPane = document.querySelector('.center-pane')?.getBoundingClientRect();

    if (!toolbar || !toolPill || !keyframeEditor || !centerPane) {
      throw new Error('Toolbar layout elements are missing.');
    }

    return {
      centerRight: centerPane.right,
      editorHeight: keyframeEditor.height,
      editorLeft: keyframeEditor.left,
      editorRight: keyframeEditor.right,
      editorWidth: keyframeEditor.width,
      toolRight: toolPill.right,
      toolbarHeight: toolbar.height,
    };
  });

  expect(layout.editorLeft).toBeGreaterThan(layout.toolRight + 8);
  expect(layout.centerRight - layout.editorRight).toBeLessThanOrEqual(18);
  expect(layout.editorWidth).toBeGreaterThan(420);
  expect(layout.editorHeight).toBeGreaterThanOrEqual(layout.toolbarHeight - 22);

  await deleteActiveUntitledProject(page);
});

test('right-click timeline menu runs real keyframe and beat actions at the cursor', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-context-menu-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 1, frequency: 440}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await zoomTimelineTo30Seconds(page);

  await page.locator('.clip-block').click({button: 'right'});
  const menu = page.locator('.quick-context-menu');
  await expect(menu).toBeVisible();
  await expect(menu).toContainText('Cut Middle / Split');
  await expect(menu).toContainText('Cut Front');
  await expect(menu).toContainText('Export Settings');

  await menu.getByRole('menuitem', {name: /Add Keyframe/}).click();
  await expect(menu).toHaveCount(0);
  await expect(page.locator('.clip-keyframe.compound')).toHaveCount(1);

  await page.locator('.clip-block').click({button: 'right'});
  await page.locator('.quick-context-menu').getByRole('menuitem', {name: /Toggle Beat Marker/}).click();
  await expect(page.locator('.timeline-mark-band')).toHaveCount(1);

  await page.locator('.clip-block').click({button: 'right'});
  await page.locator('.quick-context-menu').getByRole('menuitem', {name: /Delete Keyframe/}).click();
  await expect(page.locator('.clip-keyframe.compound')).toHaveCount(0);

  await deleteActiveUntitledProject(page);
});

test('missing local source blob downgrades playback readiness with a specific error', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-missing-blob-tone.wav');
  writeFileSync(wavPath, createSineWaveWav());

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Play');

  await page.reload();
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Play');

  await clearStoredAudioSourceBlobs(page);
  const clearedStorageState = await readStoredAudioState(page);
  expect(clearedStorageState.blobAvailable, JSON.stringify(clearedStorageState)).toBe(false);
  await page.reload();
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await expect(page.locator('.footer-play')).toHaveAttribute(
    'title',
    'Local audio file is missing: "arudio-missing-blob-tone.wav"',
  );
  await expect(page.locator('.clip-title')).toHaveText('Missing media');
  await expect(page.locator('.lane-tag strong')).toHaveText('Missing media');

  await page.keyboard.press('Space');
  await expect(page.locator('.toast').last()).toContainText(
    'Local audio file is missing: "arudio-missing-blob-tone.wav"',
  );

  await deleteActiveUntitledProject(page);
});

test('audio layer name handle reorders layers vertically without moving clip timing', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const firstWavPath = testInfo.outputPath('arudio-layer-first.wav');
  const secondWavPath = testInfo.outputPath('arudio-layer-second.wav');
  writeFileSync(firstWavPath, createSineWaveWav({durationSeconds: 2, frequency: 330}));
  writeFileSync(secondWavPath, createSineWaveWav({durationSeconds: 2, frequency: 660}));

  await page.locator('input[type="file"]').setInputFiles([firstWavPath, secondWavPath]);
  await expect(page.locator('.track-lane')).toHaveCount(2);
  await expect(page.locator('.lane-tag strong')).toHaveText(['arudio-layer-first', 'arudio-layer-second']);

  await dragLayerTagByRows(page, 1, -1);
  await expect(page.locator('.lane-tag strong')).toHaveText(['arudio-layer-second', 'arudio-layer-first']);

  await page.locator('.save-button').click();
  await expect.poll(() => readStoredTrackOrder(page)).toEqual(['arudio-layer-second', 'arudio-layer-first']);
  await expect.poll(() => readStoredClipStartTimes(page)).toEqual([0, 0]);

  await page.reload();
  await expect(page.locator('.lane-tag strong')).toHaveText(['arudio-layer-second', 'arudio-layer-first']);

  await deleteActiveUntitledProject(page);
});

test('split sends the right clip segment to a new adjacent audio layer', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-split-layer-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 2, frequency: 440}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await expect(page.locator('.track-lane')).toHaveCount(1);
  await zoomTimelineTo30Seconds(page);
  await page.locator('.clip-block').click();
  await clickRulerAtSeconds(page, 1, 30);
  await expect.poll(() => isFooterTimeWithin(page, 0.95, 1.05)).toBe(true);

  await page.locator('.tool-button').filter({hasText: 'Split'}).click();
  await expect(page.locator('.toast').last()).toContainText('Clip split to new layer');
  await expect(page.locator('.clip-block')).toHaveCount(2);
  await expect(page.locator('.track-lane')).toHaveCount(2);
  await expect(page.locator('.lane-tag strong')).toHaveText(['arudio-split-layer-source', 'arudio-split-layer-source Split']);

  const clipTops = await page.locator('.clip-block').evaluateAll((elements) =>
    elements.map((element) => Math.round(element.getBoundingClientRect().top)),
  );
  expect(new Set(clipTops).size).toBe(2);

  await page.locator('.save-button').click();
  await expect(page.locator('.toast').last()).toContainText('Saved Untitled Project');
  await expect.poll(async () => (await readStoredSplitLayerState(page)).clipCount).toBe(2);
  const splitLayerState = await readStoredSplitLayerState(page);
  expect(splitLayerState.trackCount).toBe(2);
  expect(splitLayerState.trackNames).toEqual(['arudio-split-layer-source', 'arudio-split-layer-source Split']);
  expect(splitLayerState.clipTrackIndexes).toEqual([0, 1]);
  expect(splitLayerState.clipStarts[0]).toBe(0);
  expect(splitLayerState.clipStarts[1]).toBeGreaterThan(0.9);
  expect(splitLayerState.clipStarts[1]).toBeLessThan(1.1);
  expect(splitLayerState.clipDurations[0] + splitLayerState.clipDurations[1]).toBeCloseTo(2, 2);
  expect(splitLayerState.clipSourceStarts[0]).toBe(0);
  expect(splitLayerState.clipSourceStarts[1]).toBeCloseTo(splitLayerState.clipStarts[1], 2);

  const splitDownload = await exportWavFromHeader(page);
  const splitPath = testInfo.outputPath('arudio-split-layer-export.wav');
  await splitDownload.saveAs(splitPath);
  const splitWav = parseWavFile(readFileSync(splitPath));
  expect(splitWav.durationSeconds).toBeCloseTo(2, 2);
  expect(splitWav.getPeakInTimeRange(0.2, 0.8)).toBeGreaterThan(1000);
  expect(splitWav.getPeakInTimeRange(1.2, 1.8)).toBeGreaterThan(1000);

  await deleteActiveUntitledProject(page);
});

test('legacy same-lane overlapping audio clips are repaired into readable layers', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-overlap-repair-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 3, frequency: 440}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await seedSameTrackClipLayout(page, [
    {name: 'Overlap A', startTime: 0, duration: 1.2},
    {name: 'Overlap B', startTime: 0.6, duration: 1.1},
  ]);

  await page.reload();
  await expect(page.locator('.clip-block')).toHaveCount(2);
  await expect(page.locator('.track-lane')).toHaveCount(2);
  await expect(page.locator('.lane-tag strong')).toHaveText(['arudio-overlap-repair-source', 'arudio-overlap-repair-source Layer 2']);

  const repairedLayerState = await readStoredSplitLayerState(page);
  expect(repairedLayerState.trackCount).toBe(2);
  expect(new Set(repairedLayerState.clipTrackIndexes).size).toBe(2);
  expect(repairedLayerState.clipStarts).toEqual([0, 0.6]);
  expect(repairedLayerState.clipDurations).toEqual([1.2, 1.1]);

  await deleteActiveUntitledProject(page);
});

test('moving a clip into same-lane overlap promotes it to a new adjacent layer', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-overlap-move-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 3, frequency: 550}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await seedSameTrackClipLayout(page, [
    {name: 'Move A', startTime: 0, duration: 1},
    {name: 'Move B', startTime: 1.6, duration: 1},
  ]);
  await page.reload();
  await expect(page.locator('.clip-block')).toHaveCount(2);
  await expect(page.locator('.track-lane')).toHaveCount(1);

  await zoomTimelineTo30Seconds(page);
  await dragClipBySeconds(page, 1, -1, 30);
  await expect(page.locator('.track-lane')).toHaveCount(2);

  await page.locator('.save-button').click();
  await expect(page.locator('.toast').last()).toContainText('Saved Untitled Project');
  const movedLayerState = await readStoredSplitLayerState(page);
  expect(movedLayerState.trackCount).toBe(2);
  expect(new Set(movedLayerState.clipTrackIndexes).size).toBe(2);
  expect(movedLayerState.clipStarts[0]).toBe(0);
  expect(movedLayerState.clipStarts[1]).toBeGreaterThan(0.55);
  expect(movedLayerState.clipStarts[1]).toBeLessThan(0.7);

  await deleteActiveUntitledProject(page);
});

test('multi-file import creates real layers and deleting final clips removes empty audio layers', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const firstWavPath = testInfo.outputPath('arudio-multi-first.wav');
  const secondWavPath = testInfo.outputPath('arudio-multi-second.wav');
  writeFileSync(firstWavPath, createSineWaveWav({durationSeconds: 1, frequency: 330}));
  writeFileSync(secondWavPath, createSineWaveWav({durationSeconds: 1, frequency: 660}));

  await page.locator('input[type="file"]').setInputFiles([firstWavPath, secondWavPath]);
  await expect(page.locator('.clip-block')).toHaveCount(2);
  await expect(page.locator('.track-lane')).toHaveCount(2);
  await expect(page.locator('.lane-tag strong')).toHaveText(['arudio-multi-first', 'arudio-multi-second']);
  await expect(page.locator('.lane-controls')).toHaveCount(2);
  await expect.poll(() => readStoredProjectCounts(page)).toEqual({tracks: 2, clips: 2, sources: 2});
  await expect.poll(() => readStoredAudioBlobCount(page)).toBe(2);

  await page.locator('.clip-block').first().click();
  await page.keyboard.press('Delete');
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await expect(page.locator('.track-lane')).toHaveCount(1);
  await expect(page.locator('.lane-tag strong')).toHaveText('arudio-multi-second');
  await expect(page.locator('.lane-controls')).toHaveCount(1);
  await expect.poll(() => readStoredProjectCounts(page)).toEqual({tracks: 1, clips: 1, sources: 1});
  await expect.poll(() => readStoredAudioBlobCount(page)).toBe(1);

  await page.locator('.clip-block').click();
  await page.keyboard.press('Delete');
  await expect(page.locator('.clip-block')).toHaveCount(0);
  await expect(page.locator('.track-lane')).toHaveCount(0);
  await expect(page.locator('.lane-tag')).toHaveCount(0);
  await expect(page.locator('.lane-controls')).toHaveCount(0);
  await expect(page.locator('.timeline-empty')).toContainText('No audio in this project.');
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Import audio before playback');
  await expect.poll(() => readStoredProjectCounts(page)).toEqual({tracks: 0, clips: 0, sources: 0});
  await expect.poll(() => readStoredAudioBlobCount(page)).toBe(0);

  await deleteActiveUntitledProject(page);
});

test('legacy orphan audio layers are compacted on reload and new imports stack onto real lanes', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const firstWavPath = testInfo.outputPath('arudio-legacy-first.wav');
  const secondWavPath = testInfo.outputPath('arudio-legacy-second.wav');
  const thirdWavPath = testInfo.outputPath('arudio-legacy-third.wav');
  writeFileSync(firstWavPath, createSineWaveWav({durationSeconds: 1, frequency: 280}));
  writeFileSync(secondWavPath, createSineWaveWav({durationSeconds: 1, frequency: 560}));
  writeFileSync(thirdWavPath, createSineWaveWav({durationSeconds: 1, frequency: 840}));

  await page.locator('input[type="file"]').setInputFiles([firstWavPath, secondWavPath]);
  await expect(page.locator('.track-lane')).toHaveCount(2);
  await expect(page.locator('.lane-tag strong')).toHaveText(['arudio-legacy-first', 'arudio-legacy-second']);

  await leaveLegacyOrphanFirstAudioLayerInStorage(page);
  await expect.poll(() => readStoredProjectCounts(page)).toEqual({tracks: 2, clips: 1, sources: 2});

  await page.reload();
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await expect(page.locator('.track-lane')).toHaveCount(1);
  await expect(page.locator('.lane-tag strong')).toHaveText('arudio-legacy-second');
  await expect(page.locator('.lane-controls')).toHaveCount(1);
  await expect.poll(() => readStoredProjectCounts(page)).toEqual({tracks: 1, clips: 1, sources: 1});

  await page.locator('input[type="file"]').setInputFiles(thirdWavPath);
  await expect(page.locator('.clip-block')).toHaveCount(2);
  await expect(page.locator('.track-lane')).toHaveCount(2);
  await expect(page.locator('.lane-tag strong')).toHaveText(['arudio-legacy-second', 'arudio-legacy-third']);
  await expect(page.locator('.lane-controls')).toHaveCount(2);
  await expect.poll(() => readStoredProjectCounts(page)).toEqual({tracks: 2, clips: 2, sources: 2});

  await deleteActiveUntitledProject(page);
});

test('app settings shortcut hints hide command palette shortcut chips after reload', async ({page}) => {
  await resetLocalProjectState(page);
  await page.goto('/');

  await page.keyboard.press('Control+K');
  await expect(page.locator('.command-panel kbd').filter({hasText: 'Space'})).toHaveCount(1);
  await page.keyboard.press('Escape');

  await page.locator('button[title="App settings"]').click();
  await page.getByLabel('Shortcut hints').uncheck();
  await page.locator('button').filter({hasText: 'Save Settings'}).click();
  await expect(page.locator('.toast').last()).toContainText('Settings saved');

  await page.keyboard.press('Control+K');
  await expect(page.locator('.command-panel kbd')).toHaveCount(0);
  await page.keyboard.press('Escape');

  await page.reload();
  await page.keyboard.press('Control+K');
  await expect(page.locator('.command-panel kbd')).toHaveCount(0);
});

test('app settings density and reduced motion affect editor chrome after reload', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');

  const root = page.locator('.app-root');
  await expect(root).toHaveAttribute('data-density', 'compact');
  await expect(root).toHaveAttribute('data-reduced-motion', 'false');
  await createUntitledProject(page);
  const wavPath = testInfo.outputPath('arudio-density-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 1, frequency: 440}));
  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.track-lane')).toHaveCount(1);

  const compactTopBarHeight = await getElementPixelValue(page.locator('.top-bar'), 'height');
  const compactLeftSidebarWidth = await getElementPixelValue(page.locator('.sidebar-left'), 'width');
  const compactRightSidebarWidth = await getElementPixelValue(page.locator('.sidebar-right'), 'width');
  const compactLaneHeight = await getElementPixelValue(page.locator('.track-lane').first(), 'height');
  const compactClipHeight = await getElementPixelValue(page.locator('.clip-layer').first(), 'height');
  const compactRackHeight = await getElementPixelValue(page.locator('.effect-rack'), 'height');
  const compactToolHeight = await getElementPixelValue(page.locator('.tool-button').first(), 'height');
  const compactFooterPlayHeight = await getElementPixelValue(page.locator('.footer-play'), 'height');

  await page.locator('button[title="App settings"]').click();
  const settingsPanel = page.locator('.modal-panel');
  await settingsPanel.getByLabel('Density').selectOption('comfortable');
  await settingsPanel.getByLabel('Reduced motion').check();
  await page.locator('button').filter({hasText: 'Save Settings'}).click();
  await expect(page.locator('.toast').last()).toContainText('Settings saved');

  await expect(root).toHaveAttribute('data-density', 'comfortable');
  await expect(root).toHaveAttribute('data-reduced-motion', 'true');
  const comfortableTopBarHeight = await getElementPixelValue(page.locator('.top-bar'), 'height');
  const comfortableLeftSidebarWidth = await getElementPixelValue(page.locator('.sidebar-left'), 'width');
  const comfortableRightSidebarWidth = await getElementPixelValue(page.locator('.sidebar-right'), 'width');
  const comfortableLaneHeight = await getElementPixelValue(page.locator('.track-lane').first(), 'height');
  const comfortableClipHeight = await getElementPixelValue(page.locator('.clip-layer').first(), 'height');
  const comfortableRackHeight = await getElementPixelValue(page.locator('.effect-rack'), 'height');
  const comfortableToolHeight = await getElementPixelValue(page.locator('.tool-button').first(), 'height');
  const comfortableFooterPlayHeight = await getElementPixelValue(page.locator('.footer-play'), 'height');
  const maxTransitionSeconds = await getMaxTransitionSeconds(page.locator('.tool-button').first());
  expect(comfortableTopBarHeight).toBeGreaterThan(compactTopBarHeight);
  expect(comfortableLeftSidebarWidth).toBeGreaterThan(compactLeftSidebarWidth);
  expect(comfortableRightSidebarWidth).toBeGreaterThan(compactRightSidebarWidth);
  expect(comfortableLaneHeight).toBeGreaterThan(compactLaneHeight);
  expect(comfortableClipHeight).toBeGreaterThan(compactClipHeight);
  expect(comfortableRackHeight).toBeGreaterThan(compactRackHeight);
  expect(comfortableToolHeight).toBeGreaterThan(compactToolHeight);
  expect(comfortableFooterPlayHeight).toBeGreaterThan(compactFooterPlayHeight);
  expect(compactLaneHeight).toBeLessThanOrEqual(comfortableLaneHeight * 0.82);
  await expect.poll(() => readStoredClipStartTimes(page)).toEqual([0]);
  expect(maxTransitionSeconds).toBeLessThanOrEqual(0.001);

  await page.reload();
  await expect(page.locator('.app-root')).toHaveAttribute('data-density', 'comfortable');
  await expect(page.locator('.app-root')).toHaveAttribute('data-reduced-motion', 'true');
  await expect.poll(() => getElementPixelValue(page.locator('.tool-button').first(), 'height')).toBe(comfortableToolHeight);
  await expect.poll(() => getElementPixelValue(page.locator('.track-lane').first(), 'height')).toBe(comfortableLaneHeight);
});

test('release notes open from settings and command palette with persisted seen state', async ({page}) => {
  await resetLocalProjectState(page);
  await page.evaluate(
    (stateKey) => {
      window.localStorage.setItem(
        stateKey,
        JSON.stringify({
          version: 1,
          activeProjectId: null,
          projects: [],
          settings: {
            theme: 'dark',
            density: 'compact',
            reducedMotion: false,
            showShortcutHints: true,
            lastReleaseSeen: '0.7.0 Beta',
          },
        }),
      );
    },
    appStateKey,
  );
  await page.reload();

  await page.locator('button[title="App settings"]').click();
  await expect(page.locator('.release-zone')).toContainText('New notes available');
  await page.locator('.release-actions button').filter({hasText: "What's New"}).click();

  const releasePanel = page.locator('.release-panel');
  await expect(releasePanel).toBeVisible();
  await expect(releasePanel.locator('h2')).toHaveText("What's New");
  await expect(releasePanel).toContainText('Workflow Polish And Real Effect Tools');
  await expect(releasePanel).toContainText('Export now opens a dedicated Export Settings panel');
  await expect(releasePanel).toContainText('Saturation');
  const releaseVersion = (await releasePanel.locator('.version-chip').innerText()).replace('Arudio ', '');

  await releasePanel.locator('.release-actions button').filter({hasText: 'Changelog'}).click();
  await expect(releasePanel.locator('h2')).toHaveText('Changelog');
  await releasePanel.locator('footer button').click();

  await expect(releasePanel).toHaveCount(0);
  const lastReleaseSeen = await page.evaluate((stateKey) => {
    const rawState = window.localStorage.getItem(stateKey);
    return rawState ? JSON.parse(rawState).settings.lastReleaseSeen : null;
  }, appStateKey);
  expect(lastReleaseSeen).toBe(releaseVersion);

  await page.keyboard.press('Control+K');
  await page.getByLabel('Search commands').fill('changelog');
  await page.locator('.command-list button').filter({hasText: 'Changelog'}).click();
  await expect(page.locator('.release-panel h2')).toHaveText('Changelog');
  await page.locator('.release-panel footer button').click();
});

test('fatal error overlay shows verbatim global error details above the app', async ({page}) => {
  await resetLocalProjectState(page);
  await page.goto('/');

  await page.evaluate(() => {
    const error = new Error('ARUDIO_FATAL_VERBATIM_CHECK');
    error.stack = 'Error: ARUDIO_FATAL_VERBATIM_CHECK\n    at arudio-test.js:7:9';
    window.dispatchEvent(
      new ErrorEvent('error', {
        message: 'ARUDIO_FATAL_VERBATIM_CHECK',
        error,
        filename: 'arudio-test.js',
        lineno: 7,
        colno: 9,
      }),
    );
  });

  const overlay = page.locator('.fatal-error-surface');
  await expect(overlay).toBeVisible();
  await expect(overlay).toContainText('ARUDIO_FATAL_VERBATIM_CHECK');
  await expect(overlay).toContainText('arudio-test.js');
  await expect(overlay).toContainText('7:9');
  await overlay.locator('.fatal-error-dismiss').click();
  await expect(overlay).toHaveCount(0);
});

test('selected sharp red timeline marks delete before clips', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-marker-delete-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 1, frequency: 440}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await zoomTimelineTo30Seconds(page);

  await doubleClickUpperRulerAtSeconds(page, 0.5, 30);
  const rulerMark = page.locator('.timeline-mark-button').first();
  await expect(rulerMark).toHaveCount(1);
  await expect(rulerMark).toHaveClass(/selected/);
  await expect(page.locator('.timeline-mark-band')).toHaveCount(1);

  const rulerMarkStyle = await readTimelineMarkStyle(rulerMark);
  expect(rulerMarkStyle.boxShadow).toBe('none');
  expect(rulerMarkStyle.borderRadius).toBe('0px');
  expect(rulerMarkStyle.backgroundImage).toMatch(/(239,\s*68,\s*68|248,\s*113,\s*113)/);

  await page.locator('.tool-button').filter({hasText: 'Delete'}).click();
  await expect(page.locator('.toast').last()).toContainText('Timeline mark deleted');
  await expect(page.locator('.timeline-mark-button')).toHaveCount(0);
  await expect(page.locator('.timeline-mark-band')).toHaveCount(0);
  await expect(page.locator('.clip-block')).toHaveCount(1);

  await doubleClickUpperRulerAtSeconds(page, 0.75, 30);
  await expect(page.locator('.timeline-mark-button')).toHaveCount(1);
  await page.keyboard.press('Delete');
  await expect(page.locator('.toast').last()).toContainText('Timeline mark deleted');
  await expect(page.locator('.timeline-mark-button')).toHaveCount(0);
  await expect(page.locator('.clip-block')).toHaveCount(1);

  await deleteActiveUntitledProject(page);
});

test('frame-locked beat markers seek from marker clicks and keep aligned hit feedback', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-beat-marker-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 45, frequency: 440}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await zoomTimelineTo30Seconds(page);

  await clickUpperRulerAtSeconds(page, 5, 30);
  await expect(page.locator('.timeline-mark-button')).toHaveCount(0);

  await doubleClickUpperRulerAtSeconds(page, 5, 30);
  await expect(page.locator('.timeline-mark-button')).toHaveCount(1);
  await expect(page.locator('.timeline-mark-band')).toHaveCount(1);
  await expect(page.locator('.playhead-pin')).toHaveClass(/beat-hit/);
  await expect(page.locator('.playhead-line')).toHaveClass(/beat-hit/);
  await expect(page.locator('button[title="Tap beat at playhead"]')).toHaveCount(1);

  await page.locator('.save-button').click();
  const storedBeats = await readStoredTimelineMarks(page);
  expect(storedBeats).toHaveLength(1);
  expect(storedBeats[0].sampleFrame).toBe(Math.round(storedBeats[0].time * 48_000));
  expect(Math.abs(storedBeats[0].time - 5)).toBeLessThan(0.05);

  await doubleClickUpperRulerAtSeconds(page, 5.03, 30);
  await expect(page.locator('.timeline-mark-button')).toHaveCount(2);
  const markerAlignment = await readFirstMarkerGuideAlignment(page);
  expect(markerAlignment.centerDelta).toBeLessThanOrEqual(1);
  expect(markerAlignment.bandHeight).toBeGreaterThan(250);

  await page.locator('.timeline-mark-button').last().click();
  await expect(page.locator('.timeline-mark-button')).toHaveCount(2);
  await expect(page.locator('.timeline-mark-button').last()).toHaveClass(/selected/);
  await expect(page.locator('.playhead-pin')).toHaveClass(/beat-hit/);

  await clickRulerAtSeconds(page, 7, 30);
  await page.locator('button[title="Tap beat at playhead"]').click();
  await expect(page.locator('.timeline-mark-button')).toHaveCount(3);
  await expect(page.locator('.playhead-pin')).toHaveClass(/beat-hit/);

  await page.locator('.timeline-mark-band').last().click();
  await expect(page.locator('.timeline-mark-button')).toHaveCount(3);
  await expect(page.locator('.timeline-mark-button').last()).toHaveClass(/selected/);
  await expect(page.locator('.playhead-pin')).toHaveClass(/beat-hit/);

  await page.locator('button[title="Tap beat at playhead"]').click();
  await expect(page.locator('.timeline-mark-button')).toHaveCount(2);

  await panRulerByWheelDelta(page, 280);
  await expect(page.locator('.zoom-readout')).toContainText('30s @ 0:14');
  await doubleClickUpperRulerAtSeconds(page, 21, 30);
  const pannedMarkerAlignment = await readLastMarkerGuideAlignment(page);
  expect(pannedMarkerAlignment.centerDelta).toBeLessThanOrEqual(1);
  expect(pannedMarkerAlignment.markerLayerZIndex).toBeGreaterThan(pannedMarkerAlignment.trackLanesZIndex);
  const pannedClipCoverage = await readClipViewportCoverage(page);
  expect(pannedClipCoverage.leftDelta).toBeLessThanOrEqual(1);
  expect(pannedClipCoverage.rightDelta).toBeLessThanOrEqual(1);

  await page.locator('button[title="Jump to Start"]').click();
  await expect(page.locator('.zoom-readout')).toContainText('30s @ 0:00');
  await doubleClickUpperRulerAtSeconds(page, 2, 30);
  await page.locator('button[title="Jump to Start"]').click();
  await expect(page.locator('.playhead-pin')).not.toHaveClass(/beat-hit/);
  await page.locator('.footer-play').click();
  await expect
    .poll(async () => page.locator('.playhead-pin.beat-hit').count(), {timeout: 3500, intervals: [50, 50, 50, 100]})
    .toBe(1);
  await page.locator('.footer-icon[title="Reset/Stop"]').click();

  await deleteActiveUntitledProject(page);
});

test('playhead time badge stays aligned with the vertical timeline line', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-playhead-alignment-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 15, frequency: 440}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await zoomTimelineTo30Seconds(page);

  await page.locator('button[title="Jump to Start"]').click();
  const edgeBounds = await readPlayheadBadgeViewportBounds(page);
  expect(edgeBounds.badgeLeft).toBeGreaterThanOrEqual(edgeBounds.rulerLeft);
  expect(edgeBounds.badgeRight).toBeLessThanOrEqual(edgeBounds.rulerRight);
  const edgeAlignment = await readPlayheadAlignment(page);
  expect(edgeAlignment.badgeDelta).toBeLessThanOrEqual(1);
  expect(edgeAlignment.triangleDelta).toBeLessThanOrEqual(1);

  await page.locator('button[title="Merapatkan timeline"]').click();
  await expect(page.locator('.zoom-readout')).toContainText('60s @ 0:00');
  const mediumZoomStartAlignment = await readPlayheadAlignment(page);
  expect(mediumZoomStartAlignment.badgeDelta).toBeLessThanOrEqual(1);
  expect(mediumZoomStartAlignment.triangleDelta).toBeLessThanOrEqual(1);

  await page.locator('button[title="Merapatkan timeline"]').click();
  await expect(page.locator('.zoom-readout')).toContainText('120s @ 0:00');
  const wideZoomStartAlignment = await readPlayheadAlignment(page);
  expect(wideZoomStartAlignment.badgeDelta).toBeLessThanOrEqual(1);
  expect(wideZoomStartAlignment.triangleDelta).toBeLessThanOrEqual(1);

  await zoomTimelineTo30Seconds(page);

  await clickRulerAtSeconds(page, 12, 30);
  await expect.poll(() => isFooterTimeWithin(page, 11.95, 12.05)).toBe(true);
  await expect(page.locator('.playhead-badge')).toBeVisible();
  await expect(page.locator('.playhead-line')).toBeVisible();

  const alignment = await readPlayheadAlignment(page);
  expect(alignment.badgeDelta).toBeLessThanOrEqual(1);
  expect(alignment.triangleDelta).toBeLessThanOrEqual(1);

  await deleteActiveUntitledProject(page);
});

test('exported WAV download contains rendered imported audio data', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-export-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 1.25, frequency: 550}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Play');

  const download = await exportWavFromHeader(page);
  await expect(page.locator('.toast').last()).toContainText('WAV exported');
  expect(download.suggestedFilename()).toMatch(/\.wav$/);

  const exportedPath = testInfo.outputPath('arudio-export-render.wav');
  await download.saveAs(exportedPath);
  const wav = parseWavFile(readFileSync(exportedPath));

  expect(wav.riffId).toBe('RIFF');
  expect(wav.waveId).toBe('WAVE');
  expect(wav.formatTag).toBe(1);
  expect(wav.channelCount).toBe(2);
  expect(wav.sampleRate).toBe(48_000);
  expect(wav.bitsPerSample).toBe(16);
  expect(wav.frameCount).toBe(60_000);
  expect(wav.durationSeconds).toBeCloseTo(1.25, 3);
  expect(wav.peakSample).toBeGreaterThan(500);

  await deleteActiveUntitledProject(page);
});

test('export popup renders custom 24-bit mono WAV range only after confirmation', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-export-settings-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 1.5, frequency: 440}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);

  const immediateDownload = page.waitForEvent('download', {timeout: 350}).then(() => true, () => false);
  await page.locator('button[title="Export Audio"]').click();
  await expect(page.getByTestId('export-settings-modal')).toBeVisible();
  expect(await immediateDownload).toBe(false);

  const modal = page.getByTestId('export-settings-modal');
  await modal.getByLabel('Range').selectOption('custom');
  await modal.getByLabel('Start').fill('0.25');
  await modal.getByLabel('End').fill('1.00');
  await modal.getByLabel('Sample Rate').selectOption('96000');
  await modal.getByLabel('Bit Depth').selectOption('24');
  await modal.getByLabel('Channels').selectOption('mono');
  await modal.getByLabel('Output Name').fill('custom export check');

  const downloadPromise = page.waitForEvent('download');
  await modal.getByRole('button', {name: 'Export WAV'}).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('custom export check.wav');
  const exportedPath = testInfo.outputPath('arudio-export-settings-render.wav');
  await download.saveAs(exportedPath);
  const wav = parseWavFile(readFileSync(exportedPath));

  expect(wav.formatTag).toBe(1);
  expect(wav.channelCount).toBe(1);
  expect(wav.sampleRate).toBe(96_000);
  expect(wav.bitsPerSample).toBe(24);
  expect(wav.durationSeconds).toBeCloseTo(0.75, 3);

  await deleteActiveUntitledProject(page);
});

test('export popup renders a real MP3 download with encoder settings', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-mp3-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 1.2, frequency: 660}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);

  await page.locator('button[title="Export Audio"]').click();
  const modal = page.getByTestId('export-settings-modal');
  await expect(modal).toBeVisible();
  await modal.getByLabel('Format').selectOption('mp3');
  await expect(modal.getByLabel('MP3 Bitrate')).toBeVisible();
  await modal.getByLabel('MP3 Bitrate').selectOption('192');
  await modal.getByLabel('Channels').selectOption('mono');
  await modal.getByLabel('Output Name').fill('mp3 export check');
  await expect(modal).toContainText('LAME MP3');
  await expect(modal).toContainText('Bit depth and dither are WAV-only controls');

  const downloadPromise = page.waitForEvent('download');
  await modal.getByRole('button', {name: 'Export MP3'}).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('mp3 export check.mp3');
  const exportedPath = testInfo.outputPath('arudio-mp3-export.mp3');
  await download.saveAs(exportedPath);
  const mp3 = readFileSync(exportedPath);

  expect(mp3.byteLength).toBeGreaterThan(1000);
  expect(hasMp3FrameSync(mp3)).toBe(true);
  await expect(page.locator('.toast').last()).toContainText('MP3 exported');

  await deleteActiveUntitledProject(page);
});

test('graphic EQ track effect changes exported WAV output', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-graphic-eq-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 1, frequency: 500}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Play');

  const baselineDownload = await exportWavFromHeader(page);
  const baselinePath = testInfo.outputPath('arudio-graphic-eq-baseline.wav');
  await baselineDownload.saveAs(baselinePath);
  const baselineWav = parseWavFile(readFileSync(baselinePath));

  await page.locator('button[title="effects"]').click();
  await expect(page.locator('.eq-card')).toBeVisible();
  await setRangeInputValue(page.locator('input[aria-label="Graphic EQ 500 Hz gain"]'), '12');
  await expect(page.locator('.eq-card')).toHaveClass(/enabled/);
  await expect(page.locator('.eq-card')).toContainText('+12 dB');

  const processedDownload = await exportWavFromHeader(page);
  const processedPath = testInfo.outputPath('arudio-graphic-eq-processed.wav');
  await processedDownload.saveAs(processedPath);
  const processedWav = parseWavFile(readFileSync(processedPath));

  expect(processedWav.frameCount).toBe(baselineWav.frameCount);
  expect(processedWav.sampleRate).toBe(baselineWav.sampleRate);
  expect(processedWav.peakSample).toBeGreaterThan(baselineWav.peakSample * 1.8);

  await deleteActiveUntitledProject(page);
});

test('filter track effect attenuates exported low-frequency audio', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-filter-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 1, frequency: 120}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Play');

  const baselineDownload = await exportWavFromHeader(page);
  const baselinePath = testInfo.outputPath('arudio-filter-baseline.wav');
  await baselineDownload.saveAs(baselinePath);
  const baselineWav = parseWavFile(readFileSync(baselinePath));

  await page.locator('button[title="effects"]').click();
  const filterCard = page.locator('.filter-card').filter({hasText: 'Filter'});
  await expect(filterCard).toBeVisible();
  await page.locator('button[aria-label="Expand Filter controls"]').click();
  await setRangeInputValue(page.locator('input[aria-label="Filter High-pass"]'), '1200');
  await expect(filterCard).toHaveClass(/enabled/);
  await expect(filterCard).toContainText('1.2 kHz');

  const processedDownload = await exportWavFromHeader(page);
  const processedPath = testInfo.outputPath('arudio-filter-processed.wav');
  await processedDownload.saveAs(processedPath);
  const processedWav = parseWavFile(readFileSync(processedPath));

  expect(processedWav.frameCount).toBe(baselineWav.frameCount);
  expect(processedWav.sampleRate).toBe(baselineWav.sampleRate);
  expect(processedWav.peakSample).toBeLessThan(baselineWav.peakSample * 0.4);

  await deleteActiveUntitledProject(page);
});

test('saturation color effect waveshapes exported WAV output', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-saturation-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 1, frequency: 440, amplitude: 0.82}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Play');

  const baselineDownload = await exportWavFromHeader(page);
  const baselinePath = testInfo.outputPath('arudio-saturation-baseline.wav');
  await baselineDownload.saveAs(baselinePath);
  const baselineWav = parseWavFile(readFileSync(baselinePath));

  await page.locator('button[title="effects"]').click();
  const saturationCard = page.locator('.saturation-card').filter({hasText: 'Saturation'});
  await expect(saturationCard).toBeVisible();
  await page.locator('button[aria-label="Expand Saturation controls"]').click();
  await setRangeInputValue(page.locator('input[aria-label="Saturation Drive"]'), '18');
  await setRangeInputValue(page.locator('input[aria-label="Saturation Mix"]'), '1');
  await setRangeInputValue(page.locator('input[aria-label="Saturation Output"]'), '-3');
  await expect(saturationCard).toHaveClass(/enabled/);
  await expect(saturationCard).toContainText('+18 dB');
  await expect(saturationCard).toContainText('100%');

  const processedDownload = await exportWavFromHeader(page);
  const processedPath = testInfo.outputPath('arudio-saturation-processed.wav');
  await processedDownload.saveAs(processedPath);
  const processedWav = parseWavFile(readFileSync(processedPath));

  expect(processedWav.frameCount).toBe(baselineWav.frameCount);
  expect(processedWav.sampleRate).toBe(baselineWav.sampleRate);
  expect(getMeanAbsolutePcmDifference(baselineWav, processedWav, 0.08, 0.92)).toBeGreaterThan(650);

  await deleteActiveUntitledProject(page);
});

test('chorus modulation thickens exported WAV output', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-chorus-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 2, frequency: 440, amplitude: 0.48}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Play');

  const baselineDownload = await exportWavFromHeader(page);
  const baselinePath = testInfo.outputPath('arudio-chorus-baseline.wav');
  await baselineDownload.saveAs(baselinePath);
  const baselineWav = parseWavFile(readFileSync(baselinePath));

  await page.locator('button[title="effects"]').click();
  const chorusCard = page.locator('.chorus-card').filter({hasText: 'Chorus'});
  await expect(chorusCard).toBeVisible();
  await page.locator('button[aria-label="Expand Chorus controls"]').click();
  await setRangeInputValue(page.locator('input[aria-label="Chorus Rate"]'), '4');
  await setRangeInputValue(page.locator('input[aria-label="Chorus Depth"]'), '0.016');
  await setRangeInputValue(page.locator('input[aria-label="Chorus Delay"]'), '0.026');
  await setRangeInputValue(page.locator('input[aria-label="Chorus Feedback"]'), '0.55');
  await setRangeInputValue(page.locator('input[aria-label="Chorus Mix"]'), '1');
  await expect(chorusCard).toHaveClass(/enabled/);
  await expect(chorusCard).toContainText('4 Hz');
  await expect(chorusCard).toContainText('100% mix');

  const processedDownload = await exportWavFromHeader(page);
  const processedPath = testInfo.outputPath('arudio-chorus-processed.wav');
  await processedDownload.saveAs(processedPath);
  const processedWav = parseWavFile(readFileSync(processedPath));

  expect(processedWav.frameCount).toBe(baselineWav.frameCount);
  expect(processedWav.sampleRate).toBe(baselineWav.sampleRate);
  expect(processedWav.peakSample).toBeGreaterThan(2000);
  expect(getMeanAbsolutePcmDifference(baselineWav, processedWav, 0.08, 1.92)).toBeGreaterThan(600);

  await deleteActiveUntitledProject(page);
});

test('flanger modulation sweeps exported WAV output', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-flanger-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 2, frequency: 520, amplitude: 0.44}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Play');

  const baselineDownload = await exportWavFromHeader(page);
  const baselinePath = testInfo.outputPath('arudio-flanger-baseline.wav');
  await baselineDownload.saveAs(baselinePath);
  const baselineWav = parseWavFile(readFileSync(baselinePath));

  await page.locator('button[title="effects"]').click();
  const flangerCard = page.locator('.flanger-card').filter({hasText: 'Flanger'});
  await expect(flangerCard).toBeVisible();
  await page.locator('button[aria-label="Expand Flanger controls"]').click();
  await setRangeInputValue(page.locator('input[aria-label="Flanger Rate"]'), '2.5');
  await setRangeInputValue(page.locator('input[aria-label="Flanger Depth"]'), '0.009');
  await setRangeInputValue(page.locator('input[aria-label="Flanger Delay"]'), '0.004');
  await setRangeInputValue(page.locator('input[aria-label="Flanger Feedback"]'), '0.8');
  await setRangeInputValue(page.locator('input[aria-label="Flanger Mix"]'), '1');
  await expect(flangerCard).toHaveClass(/enabled/);
  await expect(flangerCard).toContainText('3 Hz');
  await expect(flangerCard).toContainText('80% fb');

  const processedDownload = await exportWavFromHeader(page);
  const processedPath = testInfo.outputPath('arudio-flanger-processed.wav');
  await processedDownload.saveAs(processedPath);
  const processedWav = parseWavFile(readFileSync(processedPath));

  expect(processedWav.frameCount).toBe(baselineWav.frameCount);
  expect(processedWav.sampleRate).toBe(baselineWav.sampleRate);
  expect(processedWav.peakSample).toBeGreaterThan(2000);
  expect(getMeanAbsolutePcmDifference(baselineWav, processedWav, 0.08, 1.92)).toBeGreaterThan(500);

  await deleteActiveUntitledProject(page);
});

test('phaser modulation sweeps exported WAV output', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-phaser-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 2, frequency: 620, amplitude: 0.46}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Play');

  const baselineDownload = await exportWavFromHeader(page);
  const baselinePath = testInfo.outputPath('arudio-phaser-baseline.wav');
  await baselineDownload.saveAs(baselinePath);
  const baselineWav = parseWavFile(readFileSync(baselinePath));

  await page.locator('button[title="effects"]').click();
  const phaserCard = page.locator('.phaser-card').filter({hasText: 'Phaser'});
  await expect(phaserCard).toBeVisible();
  await page.locator('button[aria-label="Expand Phaser controls"]').click();
  await setRangeInputValue(page.locator('input[aria-label="Phaser Rate"]'), '3');
  await setRangeInputValue(page.locator('input[aria-label="Phaser Depth"]'), '0.95');
  await setRangeInputValue(page.locator('input[aria-label="Phaser Center"]'), '1100');
  await setRangeInputValue(page.locator('input[aria-label="Phaser Feedback"]'), '0.7');
  await setRangeInputValue(page.locator('input[aria-label="Phaser Mix"]'), '1');
  await expect(phaserCard).toHaveClass(/enabled/);
  await expect(phaserCard).toContainText('3 Hz');
  await expect(phaserCard).toContainText('1.1 kHz center');
  await expect(phaserCard).toContainText('70% fb');

  const processedDownload = await exportWavFromHeader(page);
  const processedPath = testInfo.outputPath('arudio-phaser-processed.wav');
  await processedDownload.saveAs(processedPath);
  const processedWav = parseWavFile(readFileSync(processedPath));

  expect(processedWav.frameCount).toBe(baselineWav.frameCount);
  expect(processedWav.sampleRate).toBe(baselineWav.sampleRate);
  expect(processedWav.peakSample).toBeGreaterThan(2000);
  expect(getMeanAbsolutePcmDifference(baselineWav, processedWav, 0.08, 1.92)).toBeGreaterThan(350);

  await deleteActiveUntitledProject(page);
});

test('live-safe effect parameter changes update active playback without a pending cache', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-live-effect-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 8, frequency: 500}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Play');

  await page.locator('button[title="effects"]').click();
  await setRangeInputValue(page.locator('input[aria-label="Graphic EQ 500 Hz gain"]'), '6');
  await expect(page.locator('.eq-card')).toHaveClass(/enabled/);
  await expect(page.locator('.eq-card')).toContainText('+6 dB');
  const chorusCard = page.locator('.chorus-card').filter({hasText: 'Chorus'});
  await page.locator('button[aria-label="Expand Chorus controls"]').click();
  await setRangeInputValue(page.locator('input[aria-label="Chorus Mix"]'), '0.35');
  await expect(chorusCard).toHaveClass(/enabled/);
  const flangerCard = page.locator('.flanger-card').filter({hasText: 'Flanger'});
  await page.locator('button[aria-label="Expand Flanger controls"]').click();
  await setRangeInputValue(page.locator('input[aria-label="Flanger Feedback"]'), '0.45');
  await expect(flangerCard).toHaveClass(/enabled/);
  const phaserCard = page.locator('.phaser-card').filter({hasText: 'Phaser'});
  await page.locator('button[aria-label="Expand Phaser controls"]').click();
  await setRangeInputValue(page.locator('input[aria-label="Phaser Depth"]'), '0.7');
  await expect(phaserCard).toHaveClass(/enabled/);
  const vibratoCard = page.locator('.vibrato-card').filter({hasText: 'Vibrato'});
  await page.locator('button[aria-label="Expand Vibrato controls"]').click();
  await setRangeInputValue(page.locator('input[aria-label="Vibrato Mix"]'), '0.55');
  await expect(vibratoCard).toHaveClass(/enabled/);
  const ringCard = page.locator('.ring-card').filter({hasText: 'Ring Modulator'});
  await page.locator('button[aria-label="Expand Ring Modulator controls"]').click();
  await setRangeInputValue(page.locator('input[aria-label="Ring Modulator Depth"]'), '0.6');
  await expect(ringCard).toHaveClass(/enabled/);
  const bitcrusherCard = page.locator('.bitcrusher-card').filter({hasText: 'Bitcrusher'});
  await page.locator('button[aria-label="Expand Bitcrusher controls"]').click();
  await setRangeInputValue(page.locator('input[aria-label="Bitcrusher Bits"]'), '10');
  await expect(bitcrusherCard).toHaveClass(/enabled/);
  const overdriveCard = page.locator('.overdrive-card').filter({hasText: 'Overdrive'});
  await page.locator('button[aria-label="Expand Overdrive controls"]').click();
  await setRangeInputValue(page.locator('input[aria-label="Overdrive Clip"]'), '0.5');
  await expect(overdriveCard).toHaveClass(/enabled/);
  await page.locator('#effect-panel-eq .effect-expand').click();

  await page.locator('.footer-play').click();
  await expect(page.locator('.cache-status')).toContainText('Active cache');
  await expect(page.locator('.cache-status')).toContainText('Current');

  await setRangeInputValue(page.locator('input[aria-label="Graphic EQ 500 Hz gain"]'), '-6');
  await expect(page.locator('.eq-card')).toContainText('-6 dB');
  await expect(page.locator('.cache-status')).toContainText('Active cache');
  await expect(page.locator('.cache-status')).toContainText('Current');
  await expect(page.locator('.cache-status')).not.toContainText('New cache');
  await expect(page.locator('.cache-status')).not.toContainText('Old cache');
  await expect(page.locator('.cache-status')).not.toContainText('Queued next');

  await chorusCard.locator('.effect-expand').click();
  await setRangeInputValue(page.locator('input[aria-label="Chorus Depth"]'), '0.012');
  await expect(chorusCard).toContainText('12 ms depth');
  await expect(page.locator('.cache-status')).toContainText('Active cache');
  await expect(page.locator('.cache-status')).toContainText('Current');
  await expect(page.locator('.cache-status')).not.toContainText('New cache');
  await expect(page.locator('.cache-status')).not.toContainText('Old cache');
  await expect(page.locator('.cache-status')).not.toContainText('Queued next');

  await flangerCard.locator('.effect-expand').click();
  await setRangeInputValue(page.locator('input[aria-label="Flanger Depth"]'), '0.007');
  await expect(flangerCard).toContainText('7 ms sweep');
  await expect(page.locator('.cache-status')).toContainText('Active cache');
  await expect(page.locator('.cache-status')).toContainText('Current');
  await expect(page.locator('.cache-status')).not.toContainText('New cache');
  await expect(page.locator('.cache-status')).not.toContainText('Old cache');
  await expect(page.locator('.cache-status')).not.toContainText('Queued next');

  await phaserCard.locator('.effect-expand').click();
  await setRangeInputValue(page.locator('input[aria-label="Phaser Feedback"]'), '0.62');
  await expect(phaserCard).toContainText('62% fb');
  await expect(page.locator('.cache-status')).toContainText('Active cache');
  await expect(page.locator('.cache-status')).toContainText('Current');
  await expect(page.locator('.cache-status')).not.toContainText('New cache');
  await expect(page.locator('.cache-status')).not.toContainText('Old cache');
  await expect(page.locator('.cache-status')).not.toContainText('Queued next');

  await vibratoCard.locator('.effect-expand').click();
  await setRangeInputValue(page.locator('input[aria-label="Vibrato Depth"]'), '0.009');
  await expect(vibratoCard).toContainText('9 ms depth');
  await expect(page.locator('.cache-status')).toContainText('Active cache');
  await expect(page.locator('.cache-status')).toContainText('Current');
  await expect(page.locator('.cache-status')).not.toContainText('New cache');
  await expect(page.locator('.cache-status')).not.toContainText('Old cache');
  await expect(page.locator('.cache-status')).not.toContainText('Queued next');

  await ringCard.locator('.effect-expand').click();
  await setRangeInputValue(page.locator('input[aria-label="Ring Modulator Frequency"]'), '260');
  await expect(ringCard).toContainText('260 Hz carrier');
  await expect(page.locator('.cache-status')).toContainText('Active cache');
  await expect(page.locator('.cache-status')).toContainText('Current');
  await expect(page.locator('.cache-status')).not.toContainText('New cache');
  await expect(page.locator('.cache-status')).not.toContainText('Old cache');
  await expect(page.locator('.cache-status')).not.toContainText('Queued next');

  await bitcrusherCard.locator('.effect-expand').click();
  await setRangeInputValue(page.locator('input[aria-label="Bitcrusher Rate Reduction"]'), '18');
  await expect(bitcrusherCard).toContainText('18 sample hold');
  await expect(page.locator('.cache-status')).toContainText('Active cache');
  await expect(page.locator('.cache-status')).toContainText('Current');
  await expect(page.locator('.cache-status')).not.toContainText('New cache');
  await expect(page.locator('.cache-status')).not.toContainText('Old cache');
  await expect(page.locator('.cache-status')).not.toContainText('Queued next');

  await overdriveCard.locator('.effect-expand').click();
  await setRangeInputValue(page.locator('input[aria-label="Overdrive Drive"]'), '16');
  await expect(overdriveCard).toContainText('+16 dB drive');
  await expect(page.locator('.cache-status')).toContainText('Active cache');
  await expect(page.locator('.cache-status')).toContainText('Current');
  await expect(page.locator('.cache-status')).not.toContainText('New cache');
  await expect(page.locator('.cache-status')).not.toContainText('Old cache');
  await expect(page.locator('.cache-status')).not.toContainText('Queued next');

  await page.locator('.footer-icon[title="Reset/Stop"]').click();
  await deleteActiveUntitledProject(page);
});

test('compressor and limiter dynamics change exported WAV output', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-dynamics-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 1, frequency: 440, amplitude: 0.2}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Play');

  const baselineDownload = await exportWavFromHeader(page);
  const baselinePath = testInfo.outputPath('arudio-dynamics-baseline.wav');
  await baselineDownload.saveAs(baselinePath);
  const baselineWav = parseWavFile(readFileSync(baselinePath));

  await page.locator('button[title="effects"]').click();
  const compressorCard = page.locator('.dynamics-card').filter({hasText: 'Compressor'});
  await expect(compressorCard).toBeVisible();
  await compressorCard.locator('button[aria-label="Expand Compressor controls"]').click();
  await setRangeInputValue(page.locator('input[aria-label="Compressor Threshold"]'), '0');
  await setRangeInputValue(page.locator('input[aria-label="Compressor Ratio"]'), '1');
  await setRangeInputValue(page.locator('input[aria-label="Compressor Makeup"]'), '6');
  await expect(compressorCard).toHaveClass(/enabled/);
  await expect(compressorCard).toContainText('+6 dB');

  const compressorDownload = await exportWavFromHeader(page);
  const compressorPath = testInfo.outputPath('arudio-dynamics-compressor.wav');
  await compressorDownload.saveAs(compressorPath);
  const compressorWav = parseWavFile(readFileSync(compressorPath));

  expect(compressorWav.frameCount).toBe(baselineWav.frameCount);
  expect(compressorWav.peakSample).toBeGreaterThan(baselineWav.peakSample * 1.7);

  const limiterCard = page.locator('.dynamics-card').filter({hasText: 'Limiter'});
  await expect(limiterCard).toBeVisible();
  await limiterCard.locator('button[aria-label="Expand Limiter controls"]').click();
  await setRangeInputValue(page.locator('input[aria-label="Limiter Ceiling"]'), '-18');
  await setRangeInputValue(page.locator('input[aria-label="Limiter Input"]'), '12');
  await expect(limiterCard).toHaveClass(/enabled/);
  await expect(limiterCard).toContainText('-18 dB');

  const limiterDownload = await exportWavFromHeader(page);
  const limiterPath = testInfo.outputPath('arudio-dynamics-limiter.wav');
  await limiterDownload.saveAs(limiterPath);
  const limiterWav = parseWavFile(readFileSync(limiterPath));

  expect(limiterWav.frameCount).toBe(baselineWav.frameCount);
  expect(limiterWav.peakSample).toBeLessThan(compressorWav.peakSample * 0.55);
  expect(limiterWav.peakSample).toBeLessThanOrEqual(5200);

  await deleteActiveUntitledProject(page);
});

test('noise gate expander reduces quiet material while preserving loud audio', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-noise-gate-source.wav');
  writeFileSync(wavPath, createGateTestWav());

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Play');

  const baselineDownload = await exportWavFromHeader(page);
  const baselinePath = testInfo.outputPath('arudio-noise-gate-baseline.wav');
  await baselineDownload.saveAs(baselinePath);
  const baselineWav = parseWavFile(readFileSync(baselinePath));

  await page.locator('button[title="effects"]').click();
  const gateCard = page.locator('.gate-card').filter({hasText: 'Noise Gate'});
  await expect(gateCard).toBeVisible();
  await gateCard.locator('button[aria-label="Expand Noise Gate controls"]').click();
  await setRangeInputValue(page.locator('input[aria-label="Noise Gate Threshold"]'), '-28');
  await setRangeInputValue(page.locator('input[aria-label="Noise Gate Reduction"]'), '-60');
  await setRangeInputValue(page.locator('input[aria-label="Noise Gate Attack"]'), '0.001');
  await setRangeInputValue(page.locator('input[aria-label="Noise Gate Release"]'), '0.02');
  await setRangeInputValue(page.locator('input[aria-label="Noise Gate Hold"]'), '0.02');
  await setRangeInputValue(page.locator('input[aria-label="Noise Gate Mix"]'), '1');
  await expect(gateCard).toHaveClass(/enabled/);
  await expect(gateCard).toContainText('-28 dB');
  await expect(gateCard).toContainText('-60 dB');

  const processedDownload = await exportWavFromHeader(page);
  const processedPath = testInfo.outputPath('arudio-noise-gate-processed.wav');
  await processedDownload.saveAs(processedPath);
  const processedWav = parseWavFile(readFileSync(processedPath));

  expect(processedWav.frameCount).toBe(baselineWav.frameCount);
  expect(processedWav.sampleRate).toBe(baselineWav.sampleRate);
  expect(getMeanAbsolutePcm(processedWav, 0.35, 0.75)).toBeLessThan(getMeanAbsolutePcm(baselineWav, 0.35, 0.75) * 0.45);
  expect(getMeanAbsolutePcm(processedWav, 1.25, 1.75)).toBeGreaterThan(getMeanAbsolutePcm(baselineWav, 1.25, 1.75) * 0.65);

  await deleteActiveUntitledProject(page);
});

test('delay echo track effect adds exported tail audio', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-delay-source.wav');
  writeFileSync(wavPath, createPulseToneWav({durationSeconds: 1.2, pulseSeconds: 0.07, frequency: 660}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Play');

  const baselineDownload = await exportWavFromHeader(page);
  const baselinePath = testInfo.outputPath('arudio-delay-baseline.wav');
  await baselineDownload.saveAs(baselinePath);
  const baselineWav = parseWavFile(readFileSync(baselinePath));

  await page.locator('button[title="effects"]').click();
  const delayCard = page.locator('.delay-card').filter({hasText: 'Delay/Echo'});
  await expect(delayCard).toBeVisible();
  await page.locator('button[aria-label="Expand Delay/Echo controls"]').click();
  await setRangeInputValue(page.locator('input[aria-label="Delay/Echo Time"]'), '0.2');
  await setRangeInputValue(page.locator('input[aria-label="Delay/Echo Feedback"]'), '0.68');
  await setRangeInputValue(page.locator('input[aria-label="Delay/Echo Mix"]'), '0.9');
  await setRangeInputValue(page.locator('input[aria-label="Delay/Echo Tone"]'), '12000');
  await expect(delayCard).toHaveClass(/enabled/);
  await expect(delayCard).toContainText('90% mix');

  const processedDownload = await exportWavFromHeader(page);
  const processedPath = testInfo.outputPath('arudio-delay-processed.wav');
  await processedDownload.saveAs(processedPath);
  const processedWav = parseWavFile(readFileSync(processedPath));

  expect(processedWav.frameCount).toBe(baselineWav.frameCount);
  expect(baselineWav.getPeakInTimeRange(0.34, 0.52)).toBeLessThan(20);
  expect(processedWav.getPeakInTimeRange(0.34, 0.52)).toBeGreaterThan(450);
  expect(processedWav.getPeakInTimeRange(0.54, 0.78)).toBeGreaterThan(180);

  await deleteActiveUntitledProject(page);
});

test('compound keyframe writes Cave Reverb Amount automation and exports it', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-reverb-automation-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 2, frequency: 440, amplitude: 0.45}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await zoomTimelineTo30Seconds(page);
  await page.locator('.clip-block').click();

  await page.locator('button[title="effects"]').click();
  await page.locator('button[aria-label="Cave reverb enabled state"]').click();
  await page.locator('button[aria-label="Expand Cave Reverb controls"]').click();
  await setRangeInputValue(page.locator('input[aria-label="Cave Reverb Amount"]'), '0');
  await expect(page.locator('.effect-card').filter({hasText: 'Cave Reverb'})).toContainText('0%');

  const baselineDownload = await exportWavFromHeader(page);
  const baselinePath = testInfo.outputPath('arudio-reverb-automation-baseline.wav');
  await baselineDownload.saveAs(baselinePath);
  const baselineWav = parseWavFile(readFileSync(baselinePath));

  await page.locator('button[title="edit"]').click();
  await clickRulerAtSeconds(page, 0.4, 30);
  await page.locator('button[title="Add clip keyframe"]').click();
  await expect(page.locator('.clip-keyframe.compound')).toHaveCount(1);
  await expect(page.locator('.keyframe-active-row')).toContainText('2 param');

  await page.locator('button[title="effects"]').click();
  await setRangeInputValue(page.locator('input[aria-label="Cave Reverb Amount"]'), '1');
  await page.locator('button[title="edit"]').click();
  await expect(page.locator('.keyframe-active-row')).toContainText('3 param');
  await expect(page.locator('.compound-parameter-row').filter({hasText: 'Reverb Amount'})).toContainText('100%');

  await page.locator('.save-button').click();
  await expect(page.locator('.toast').last()).toContainText('Saved Untitled Project');
  await expect.poll(() => readActiveTrackEffectAutomationSignature(page)).toMatch(/^track\.reverb\.amount=0\.(3[5-9]|4[0-5]):1\.00$/);
  await page.reload();
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await page.locator('.clip-block').click();
  await page.locator('.clip-keyframe.compound').click();
  await expect(page.locator('.keyframe-active-row')).toContainText('3 param');
  await expect(page.locator('.compound-parameter-row').filter({hasText: 'Reverb Amount'})).toContainText('100%');
  await expect.poll(() => readActiveTrackEffectAutomationSignature(page)).toMatch(/^track\.reverb\.amount=0\.(3[5-9]|4[0-5]):1\.00$/);

  const processedDownload = await exportWavFromHeader(page);
  const processedPath = testInfo.outputPath('arudio-reverb-automation-processed.wav');
  await processedDownload.saveAs(processedPath);
  const processedWav = parseWavFile(readFileSync(processedPath));

  expect(processedWav.frameCount).toBe(baselineWav.frameCount);
  expect(processedWav.sampleRate).toBe(baselineWav.sampleRate);
  expect(getMeanAbsolutePcmDifference(baselineWav, processedWav, 0.12, 1.9)).toBeGreaterThan(350);

  await deleteActiveUntitledProject(page);
});

test('compound keyframe writes multiple effect parameters from the quick editor and exports them', async ({page}, testInfo) => {
  test.setTimeout(120_000);
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-full-effect-automation-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 2, frequency: 520, amplitude: 0.42}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await zoomTimelineTo30Seconds(page);
  await page.locator('.clip-block').click();
  await expect(page.locator('.quick-keyframe-editor')).toContainText('0 total');

  const baselineDownload = await exportWavFromHeader(page);
  const baselinePath = testInfo.outputPath('arudio-full-effect-automation-baseline.wav');
  await baselineDownload.saveAs(baselinePath);
  const baselineWav = parseWavFile(readFileSync(baselinePath));

  await clickRulerAtSeconds(page, 0.5, 30);
  await page.locator('.quick-keyframe-editor button[title="Add keyframe at playhead"]').click();
  await expect(page.locator('.clip-keyframe.compound')).toHaveCount(1);
  await expect(page.locator('.quick-keyframe-editor')).toContainText('2 param');

  await page.locator('button[title="effects"]').click();
  await page.locator('button[aria-label="Expand Delay/Echo controls"]').click();
  await setRangeInputValue(page.locator('input[aria-label="Delay/Echo Mix"]'), '0.9');
  await setRangeInputValue(page.locator('input[aria-label="Delay/Echo Feedback"]'), '0.68');
  await page.locator('button[aria-label="Expand Overdrive controls"]').click();
  await setRangeInputValue(page.locator('input[aria-label="Overdrive Clip"]'), '0.24');
  await setRangeInputValue(page.locator('input[aria-label="Rack Graphic EQ Mid"]'), '12');
  await page.locator('button[aria-label="Cave reverb enabled state"]').click();
  await page.locator('button[aria-label="Expand Cave Reverb controls"]').click();
  await setRangeInputValue(page.locator('input[aria-label="Cave Reverb Size"]'), '5.5');
  await expect(page.locator('.quick-keyframe-editor')).toContainText('7 param');

  await page.locator('.save-button').click();
  await expect(page.locator('.toast').last()).toContainText('Saved Untitled Project');
  await expect
    .poll(() =>
      readActiveTrackEffectAutomationSignature(page, [
        'track.delay.delay.mix',
        'track.delay.delay.feedback',
        'track.eq.eq.band.1000.gain',
        'track.overdrive.overdrive.clip',
        'track.reverb.size',
      ]),
    )
    .toContain('track.delay.delay.mix=');
  await expect
    .poll(() =>
      readActiveTrackEffectAutomationSignature(page, [
        'track.delay.delay.mix',
        'track.delay.delay.feedback',
        'track.eq.eq.band.1000.gain',
        'track.overdrive.overdrive.clip',
        'track.reverb.size',
      ]),
    )
    .toContain('track.overdrive.overdrive.clip=');
  await expect
    .poll(() =>
      readActiveTrackEffectAutomationSignature(page, [
        'track.delay.delay.mix',
        'track.delay.delay.feedback',
        'track.eq.eq.band.1000.gain',
        'track.overdrive.overdrive.clip',
        'track.reverb.size',
      ]),
    )
    .toContain('track.reverb.size=');

  await page.reload();
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await page.locator('.clip-block').click();
  await page.locator('.clip-keyframe.compound').click();
  await expect(page.locator('.quick-keyframe-editor')).toContainText('7 param');
  await page.locator('button[title="effects"]').click();
  await page.locator('button[aria-label="Expand Delay/Echo controls"]').click();
  await expect(page.locator('input[aria-label="Delay/Echo Mix"]')).toHaveValue('0.9');
  await page.locator('button[aria-label="Expand Overdrive controls"]').click();
  await expect(page.locator('input[aria-label="Overdrive Clip"]')).toHaveValue('0.24');
  await page.locator('button[aria-label="Expand Cave Reverb controls"]').click();
  await expect(page.locator('input[aria-label="Cave Reverb Size"]')).toHaveValue('5.5');

  const processedDownload = await exportWavFromHeader(page);
  const processedPath = testInfo.outputPath('arudio-full-effect-automation-processed.wav');
  await processedDownload.saveAs(processedPath);
  const processedWav = parseWavFile(readFileSync(processedPath));

  expect(processedWav.frameCount).toBe(baselineWav.frameCount);
  expect(processedWav.sampleRate).toBe(baselineWav.sampleRate);
  expect(getMeanAbsolutePcmDifference(baselineWav, processedWav, 0.1, 1.9)).toBeGreaterThan(450);

  await deleteActiveUntitledProject(page);
});

test('effect slider writes automation when playhead returns to an unselected compound keyframe', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-effect-automation-playhead-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 2, frequency: 520, amplitude: 0.42}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await zoomTimelineTo30Seconds(page);
  await page.locator('.clip-block').click();

  await clickRulerAtSeconds(page, 0.5, 30);
  await page.locator('.quick-keyframe-editor button[title="Add keyframe at playhead"]').click();
  await expect(page.locator('.clip-keyframe.compound')).toHaveCount(1);
  await expect(page.locator('.quick-keyframe-editor')).toContainText('2 param');

  await clickRulerAtSeconds(page, 1.2, 30);
  await expect(page.locator('.quick-keyframe-editor')).toContainText('1 total');
  await clickRulerAtSeconds(page, 0.5, 30);
  await expect(page.locator('.quick-keyframe-editor')).toContainText('2 param');

  await page.locator('button[title="effects"]').click();
  await page.locator('button[aria-label="Expand Delay/Echo controls"]').click();
  await setRangeInputValue(page.locator('input[aria-label="Delay/Echo Mix"]'), '0.9');
  await page.locator('.save-button').click();
  await expect(page.locator('.toast').last()).toContainText('Saved Untitled Project');

  await expect
    .poll(() => readActiveTrackEffectAutomationSignature(page, ['track.delay.delay.mix']))
    .toMatch(/^track\.delay\.delay\.mix=0\.(4[5-9]|5[0-5]):0\.90$/);
  await page.locator('button[title="edit"]').click();
  await expect(page.locator('.quick-keyframe-editor')).toContainText('3 param');

  const fixedDelayMix = await page.evaluate((stateKey) => {
    const rawState = window.localStorage.getItem(stateKey);
    if (!rawState) {
      throw new Error('Project state is missing.');
    }

    const state = JSON.parse(rawState);
    const project = state.projects.find((item: {id: string}) => item.id === state.activeProjectId);
    const track = project?.tracks.find((item: {effects?: Array<{type: string}>}) =>
      item.effects?.some((effect) => effect.type === 'delay'),
    );
    const delayEffect = track?.effects.find((effect: {type: string}) => effect.type === 'delay');
    const mix = delayEffect?.parameters?.['delay.mix'];
    return typeof mix === 'number' ? mix : null;
  }, appStateKey);
  expect(fixedDelayMix).toBe(0.35);

  await deleteActiveUntitledProject(page);
});

test('tremolo auto-pan modulates exported WAV output', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-tremolo-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 2, frequency: 440, amplitude: 0.5}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Play');

  const baselineDownload = await exportWavFromHeader(page);
  const baselinePath = testInfo.outputPath('arudio-tremolo-baseline.wav');
  await baselineDownload.saveAs(baselinePath);
  const baselineWav = parseWavFile(readFileSync(baselinePath));

  await page.locator('button[title="effects"]').click();
  const tremoloCard = page.locator('.tremolo-card').filter({hasText: 'Tremolo/Auto-Pan'});
  await expect(tremoloCard).toBeVisible();
  await page.locator('button[aria-label="Expand Tremolo/Auto-Pan controls"]').click();
  await setRangeInputValue(page.locator('input[aria-label="Tremolo/Auto-Pan Rate"]'), '8');
  await setRangeInputValue(page.locator('input[aria-label="Tremolo/Auto-Pan Depth"]'), '1');
  await setRangeInputValue(page.locator('input[aria-label="Tremolo/Auto-Pan Auto-pan"]'), '0');
  await setRangeInputValue(page.locator('input[aria-label="Tremolo/Auto-Pan Mix"]'), '1');
  await expect(tremoloCard).toHaveClass(/enabled/);
  await expect(tremoloCard).toContainText('8 Hz');
  await expect(tremoloCard).toContainText('100% depth');

  const processedDownload = await exportWavFromHeader(page);
  const processedPath = testInfo.outputPath('arudio-tremolo-processed.wav');
  await processedDownload.saveAs(processedPath);
  const processedWav = parseWavFile(readFileSync(processedPath));

  expect(processedWav.frameCount).toBe(baselineWav.frameCount);
  expect(processedWav.sampleRate).toBe(baselineWav.sampleRate);
  expect(getWindowedMeanAbsoluteSpread(baselineWav, 0.15, 1.85, 0.04)).toBeLessThan(500);
  expect(getWindowedMeanAbsoluteSpread(processedWav, 0.15, 1.85, 0.04)).toBeGreaterThan(3000);

  await deleteActiveUntitledProject(page);
});

test('vibrato pitch wobble changes exported WAV output', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-vibrato-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 2, frequency: 520, amplitude: 0.45}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Play');

  const baselineDownload = await exportWavFromHeader(page);
  const baselinePath = testInfo.outputPath('arudio-vibrato-baseline.wav');
  await baselineDownload.saveAs(baselinePath);
  const baselineWav = parseWavFile(readFileSync(baselinePath));

  await page.locator('button[title="effects"]').click();
  const vibratoCard = page.locator('.vibrato-card').filter({hasText: 'Vibrato'});
  await expect(vibratoCard).toBeVisible();
  await page.locator('button[aria-label="Expand Vibrato controls"]').click();
  await setRangeInputValue(page.locator('input[aria-label="Vibrato Rate"]'), '6');
  await setRangeInputValue(page.locator('input[aria-label="Vibrato Depth"]'), '0.01');
  await setRangeInputValue(page.locator('input[aria-label="Vibrato Delay"]'), '0.012');
  await setRangeInputValue(page.locator('input[aria-label="Vibrato Mix"]'), '1');
  await setRangeInputValue(page.locator('input[aria-label="Vibrato Output"]'), '0');
  await expect(vibratoCard).toHaveClass(/enabled/);
  await expect(vibratoCard).toContainText('6 Hz');
  await expect(vibratoCard).toContainText('10 ms depth');
  await expect(vibratoCard).toContainText('100% mix');

  const processedDownload = await exportWavFromHeader(page);
  const processedPath = testInfo.outputPath('arudio-vibrato-processed.wav');
  await processedDownload.saveAs(processedPath);
  const processedWav = parseWavFile(readFileSync(processedPath));

  expect(processedWav.frameCount).toBe(baselineWav.frameCount);
  expect(processedWav.sampleRate).toBe(baselineWav.sampleRate);
  expect(processedWav.peakSample).toBeGreaterThan(1200);
  expect(getMeanAbsolutePcmDifference(baselineWav, processedWav, 0.1, 1.9)).toBeGreaterThan(450);

  await deleteActiveUntitledProject(page);
});

test('ring modulator carrier modulation changes exported WAV output', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-ring-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 2, frequency: 440, amplitude: 0.45}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Play');

  const baselineDownload = await exportWavFromHeader(page);
  const baselinePath = testInfo.outputPath('arudio-ring-baseline.wav');
  await baselineDownload.saveAs(baselinePath);
  const baselineWav = parseWavFile(readFileSync(baselinePath));

  await page.locator('button[title="effects"]').click();
  const ringCard = page.locator('.ring-card').filter({hasText: 'Ring Modulator'});
  await expect(ringCard).toBeVisible();
  await page.locator('button[aria-label="Expand Ring Modulator controls"]').click();
  await setRangeInputValue(page.locator('input[aria-label="Ring Modulator Frequency"]'), '120');
  await setRangeInputValue(page.locator('input[aria-label="Ring Modulator Depth"]'), '1');
  await setRangeInputValue(page.locator('input[aria-label="Ring Modulator Mix"]'), '1');
  await setRangeInputValue(page.locator('input[aria-label="Ring Modulator Output"]'), '3');
  await expect(ringCard).toHaveClass(/enabled/);
  await expect(ringCard).toContainText('120 Hz carrier');
  await expect(ringCard).toContainText('100% depth');
  await expect(ringCard).toContainText('+3 dB out');

  const processedDownload = await exportWavFromHeader(page);
  const processedPath = testInfo.outputPath('arudio-ring-processed.wav');
  await processedDownload.saveAs(processedPath);
  const processedWav = parseWavFile(readFileSync(processedPath));

  expect(processedWav.frameCount).toBe(baselineWav.frameCount);
  expect(processedWav.sampleRate).toBe(baselineWav.sampleRate);
  expect(processedWav.peakSample).toBeGreaterThan(2000);
  expect(getMeanAbsolutePcmDifference(baselineWav, processedWav, 0.08, 1.92)).toBeGreaterThan(1200);

  await deleteActiveUntitledProject(page);
});

test('bitcrusher quantization and sample hold change exported WAV output', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-bitcrusher-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 2, frequency: 520, amplitude: 0.45}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Play');

  const baselineDownload = await exportWavFromHeader(page);
  const baselinePath = testInfo.outputPath('arudio-bitcrusher-baseline.wav');
  await baselineDownload.saveAs(baselinePath);
  const baselineWav = parseWavFile(readFileSync(baselinePath));

  await page.locator('button[title="effects"]').click();
  const bitcrusherCard = page.locator('.bitcrusher-card').filter({hasText: 'Bitcrusher'});
  await expect(bitcrusherCard).toBeVisible();
  await page.locator('button[aria-label="Expand Bitcrusher controls"]').click();
  await setRangeInputValue(page.locator('input[aria-label="Bitcrusher Bits"]'), '4');
  await setRangeInputValue(page.locator('input[aria-label="Bitcrusher Rate Reduction"]'), '24');
  await setRangeInputValue(page.locator('input[aria-label="Bitcrusher Mix"]'), '1');
  await setRangeInputValue(page.locator('input[aria-label="Bitcrusher Output"]'), '-2');
  await expect(bitcrusherCard).toHaveClass(/enabled/);
  await expect(bitcrusherCard).toContainText('4 bit');
  await expect(bitcrusherCard).toContainText('24 sample hold');
  await expect(bitcrusherCard).toContainText('100% mix');
  await expect(bitcrusherCard).toContainText('-2 dB out');

  const processedDownload = await exportWavFromHeader(page);
  const processedPath = testInfo.outputPath('arudio-bitcrusher-processed.wav');
  await processedDownload.saveAs(processedPath);
  const processedWav = parseWavFile(readFileSync(processedPath));

  expect(processedWav.frameCount).toBe(baselineWav.frameCount);
  expect(processedWav.sampleRate).toBe(baselineWav.sampleRate);
  expect(processedWav.peakSample).toBeGreaterThan(1500);
  expect(getMeanAbsolutePcmDifference(baselineWav, processedWav, 0.08, 1.92)).toBeGreaterThan(900);

  await deleteActiveUntitledProject(page);
});

test('overdrive hard clipping changes exported WAV output', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-overdrive-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 2, frequency: 330, amplitude: 0.42}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Play');

  const baselineDownload = await exportWavFromHeader(page);
  const baselinePath = testInfo.outputPath('arudio-overdrive-baseline.wav');
  await baselineDownload.saveAs(baselinePath);
  const baselineWav = parseWavFile(readFileSync(baselinePath));

  await page.locator('button[title="effects"]').click();
  const overdriveCard = page.locator('.overdrive-card').filter({hasText: 'Overdrive'});
  await expect(overdriveCard).toBeVisible();
  await page.locator('button[aria-label="Expand Overdrive controls"]').click();
  await setRangeInputValue(page.locator('input[aria-label="Overdrive Drive"]'), '24');
  await setRangeInputValue(page.locator('input[aria-label="Overdrive Clip"]'), '0.24');
  await setRangeInputValue(page.locator('input[aria-label="Overdrive Tone"]'), '9000');
  await setRangeInputValue(page.locator('input[aria-label="Overdrive Mix"]'), '1');
  await setRangeInputValue(page.locator('input[aria-label="Overdrive Output"]'), '-6');
  await expect(overdriveCard).toHaveClass(/enabled/);
  await expect(overdriveCard).toContainText('+24 dB drive');
  await expect(overdriveCard).toContainText('24% clip');
  await expect(overdriveCard).toContainText('100% mix');
  await expect(overdriveCard).toContainText('-6 dB out');

  const processedDownload = await exportWavFromHeader(page);
  const processedPath = testInfo.outputPath('arudio-overdrive-processed.wav');
  await processedDownload.saveAs(processedPath);
  const processedWav = parseWavFile(readFileSync(processedPath));

  expect(processedWav.frameCount).toBe(baselineWav.frameCount);
  expect(processedWav.sampleRate).toBe(baselineWav.sampleRate);
  expect(processedWav.peakSample).toBeGreaterThan(3000);
  expect(getMeanAbsolutePcmDifference(baselineWav, processedWav, 0.08, 1.92)).toBeGreaterThan(1000);

  await deleteActiveUntitledProject(page);
});

test('bottom effect rack macro writes the selected track effect state', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-effect-rack-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 1, frequency: 440}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await expect(page.locator('.effect-rack')).toBeVisible();
  await expect(page.locator('.rack-device')).toHaveCount(16);
  await expect
    .poll(() =>
      page.locator('.rack-strip').evaluate((element) => ({
        overflowX: window.getComputedStyle(element).overflowX,
        scrollable: element.scrollWidth > element.clientWidth,
      })),
    )
    .toEqual({overflowX: 'auto', scrollable: true});

  const delayRackDevice = page.locator('.rack-device').filter({hasText: 'Delay'});
  await delayRackDevice.scrollIntoViewIfNeeded();
  await page.locator('button[aria-label="Open Delay/Echo settings"]').click();
  await expect(page.locator('button[role="tab"][title="effects"]')).toHaveClass(/active/);
  await expect(page.locator('.delay-card.expanded')).toHaveCount(1);
  await expect(page.locator('.delay-card.expanded')).toBeInViewport();
  await expect(page.locator('input[aria-label="Delay/Echo Time"]')).toHaveCount(1);
  await expect(page.locator('.delay-card')).not.toHaveClass(/enabled/);

  const reverbRackDevice = page.locator('.rack-device').filter({hasText: 'Reverb'});
  await reverbRackDevice.scrollIntoViewIfNeeded();
  await setRangeInputValue(page.locator('input[aria-label="Rack Cave Reverb Amount"]'), '0.72');
  await expect(reverbRackDevice).toHaveClass(/enabled/);
  await expect(reverbRackDevice).toContainText('72%');
  await page.locator('button[title="effects"]').click();
  await expect(page.locator('.effect-card').filter({hasText: 'Cave Reverb'})).toContainText('72%');
  await page.locator('.save-button').click();
  await expect(page.locator('.toast').last()).toContainText('Saved Untitled Project');

  const storedAmount = await page.evaluate((stateKey) => {
    const rawState = window.localStorage.getItem(stateKey);
    if (!rawState) {
      throw new Error('Project state is missing.');
    }

    const state = JSON.parse(rawState);
    const project = state.projects.find((item: {id: string}) => item.id === state.activeProjectId);
    const track = project?.tracks?.[0];
    const reverb = track?.effects?.find((effect: {type: string}) => effect.type === 'reverb');
    return reverb?.enabled && typeof reverb.parameters?.amount === 'number' ? reverb.parameters.amount : null;
  }, appStateKey);
  expect(storedAmount).toBeCloseTo(0.72, 3);

  await deleteActiveUntitledProject(page);
});

test('command palette enables only implemented selected-track effects', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  await page.keyboard.press('Control+K');
  await page.getByLabel('Search commands').fill('parametric');
  await expect(page.locator('.command-empty')).toContainText('No commands found');
  await page.getByLabel('Search commands').fill('delay');
  const disabledDelayCommand = page.locator('.command-list button').filter({hasText: 'Enable Delay/Echo'});
  await expect(disabledDelayCommand).toContainText('Select a clip first');
  await disabledDelayCommand.click();
  await expect(page.locator('.toast').last()).toContainText('Select a clip first');
  await page.keyboard.press('Escape');

  const wavPath = testInfo.outputPath('arudio-command-effects-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 1, frequency: 440}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await page.locator('.clip-block').click();
  await expect(page.locator('.effect-rack')).toBeVisible();

  await page.keyboard.press('Control+K');
  await page.getByLabel('Search commands').fill('filter');
  await page.locator('.command-list button').filter({hasText: 'Enable Filter'}).click();
  const filterRackDevice = page.locator('.rack-device').filter({hasText: 'Filter'});
  await expect(filterRackDevice).toHaveClass(/enabled/);
  await expect(page.locator('.toast').last()).toContainText('Filter enabled');

  await page.keyboard.press('Control+K');
  await page.getByLabel('Search commands').fill('saturation');
  await page.locator('.command-list button').filter({hasText: 'Enable Saturation'}).click();
  const saturationRackDevice = page.locator('.rack-device').filter({hasText: 'Sat'});
  await expect(saturationRackDevice).toHaveClass(/enabled/);
  await expect(page.locator('.toast').last()).toContainText('Saturation enabled');

  await page.keyboard.press('Control+K');
  await page.getByLabel('Search commands').fill('chorus');
  await page.locator('.command-list button').filter({hasText: 'Enable Chorus'}).click();
  const chorusRackDevice = page.locator('.rack-device').filter({hasText: 'Chorus'});
  await expect(chorusRackDevice).toHaveClass(/enabled/);
  await expect(page.locator('.toast').last()).toContainText('Chorus enabled');

  await page.keyboard.press('Control+K');
  await page.getByLabel('Search commands').fill('flanger');
  await page.locator('.command-list button').filter({hasText: 'Enable Flanger'}).click();
  const flangerRackDevice = page.locator('.rack-device').filter({hasText: 'Flange'});
  await expect(flangerRackDevice).toHaveClass(/enabled/);
  await expect(page.locator('.toast').last()).toContainText('Flanger enabled');

  await page.keyboard.press('Control+K');
  await page.getByLabel('Search commands').fill('phaser');
  await page.locator('.command-list button').filter({hasText: 'Enable Phaser'}).click();
  const phaserRackDevice = page.locator('.rack-device').filter({hasText: 'Phaser'});
  await expect(phaserRackDevice).toHaveClass(/enabled/);
  await expect(page.locator('.toast').last()).toContainText('Phaser enabled');

  await page.keyboard.press('Control+K');
  await page.getByLabel('Search commands').fill('gate');
  await page.locator('.command-list button').filter({hasText: 'Enable Noise Gate'}).click();
  const gateRackDevice = page.locator('.rack-device').filter({hasText: 'Gate'});
  await expect(gateRackDevice).toHaveClass(/enabled/);
  await expect(page.locator('.toast').last()).toContainText('Noise Gate enabled');

  await page.keyboard.press('Control+K');
  await page.getByLabel('Search commands').fill('tremolo');
  await page.locator('.command-list button').filter({hasText: 'Enable Tremolo/Auto-Pan'}).click();
  const tremoloRackDevice = page.locator('.rack-device').filter({hasText: 'Trem'});
  await expect(tremoloRackDevice).toHaveClass(/enabled/);
  await expect(page.locator('.toast').last()).toContainText('Tremolo/Auto-Pan enabled');

  await page.keyboard.press('Control+K');
  await page.getByLabel('Search commands').fill('vibrato');
  await page.locator('.command-list button').filter({hasText: 'Enable Vibrato'}).click();
  const vibratoRackDevice = page.locator('.rack-device').filter({hasText: 'Vib'});
  await expect(vibratoRackDevice).toHaveClass(/enabled/);
  await expect(page.locator('.toast').last()).toContainText('Vibrato enabled');

  await page.keyboard.press('Control+K');
  await page.getByLabel('Search commands').fill('ring');
  await page.locator('.command-list button').filter({hasText: 'Enable Ring Modulator'}).click();
  const ringRackDevice = page.locator('.rack-device').filter({hasText: 'Ring'});
  await expect(ringRackDevice).toHaveClass(/enabled/);
  await expect(page.locator('.toast').last()).toContainText('Ring Modulator enabled');

  await page.keyboard.press('Control+K');
  await page.getByLabel('Search commands').fill('bitcrusher');
  await page.locator('.command-list button').filter({hasText: 'Enable Bitcrusher'}).click();
  const bitcrusherRackDevice = page.locator('.rack-device').filter({hasText: 'Bits'});
  await expect(bitcrusherRackDevice).toHaveClass(/enabled/);
  await expect(page.locator('.toast').last()).toContainText('Bitcrusher enabled');

  await page.keyboard.press('Control+K');
  await page.getByLabel('Search commands').fill('overdrive');
  await page.locator('.command-list button').filter({hasText: 'Enable Overdrive'}).click();
  const overdriveRackDevice = page.locator('.rack-device').filter({hasText: 'Clip'});
  await expect(overdriveRackDevice).toHaveClass(/enabled/);
  await expect(page.locator('.toast').last()).toContainText('Overdrive enabled');

  await page.keyboard.press('Control+K');
  await page.getByLabel('Search commands').fill('delay');
  await page.locator('.command-list button').filter({hasText: 'Enable Delay/Echo'}).click();
  const delayRackDevice = page.locator('.rack-device').filter({hasText: 'Delay'});
  await expect(delayRackDevice).toHaveClass(/enabled/);
  await expect(page.locator('.toast').last()).toContainText('Delay/Echo enabled');

  await page.keyboard.press('Control+K');
  await page.getByLabel('Search commands').fill('reverb');
  await page.locator('.command-list button').filter({hasText: 'Enable Cave Reverb'}).click();
  const reverbRackDevice = page.locator('.rack-device').filter({hasText: 'Reverb'});
  await expect(reverbRackDevice).toHaveClass(/enabled/);
  await expect(page.locator('.toast').last()).toContainText('Cave Reverb enabled');

  await page.keyboard.press('Control+K');
  await page.getByLabel('Search commands').fill('delay');
  await page.locator('.command-list button').filter({hasText: 'Enable Delay/Echo'}).click();
  await expect(page.locator('.toast').last()).toContainText('Delay/Echo already on');

  await page.locator('.save-button').click();
  await expect(page.locator('.toast').last()).toContainText('Saved Untitled Project');

  const effectState = await page.evaluate((stateKey) => {
    const rawState = window.localStorage.getItem(stateKey);
    if (!rawState) {
      throw new Error('Project state is missing.');
    }

    const state = JSON.parse(rawState);
    const project = state.projects.find((item: {id: string}) => item.id === state.activeProjectId);
    const effects = project?.tracks?.[0]?.effects ?? [];
    return {
      delayCount: effects.filter((effect: {type: string}) => effect.type === 'delay').length,
      filterCount: effects.filter((effect: {type: string}) => effect.type === 'filter').length,
      gateCount: effects.filter((effect: {type: string}) => effect.type === 'gate').length,
      saturationCount: effects.filter((effect: {type: string}) => effect.type === 'saturation').length,
      overdriveCount: effects.filter((effect: {type: string}) => effect.type === 'overdrive').length,
      chorusCount: effects.filter((effect: {type: string}) => effect.type === 'chorus').length,
      flangerCount: effects.filter((effect: {type: string}) => effect.type === 'flanger').length,
      phaserCount: effects.filter((effect: {type: string}) => effect.type === 'phaser').length,
      tremoloCount: effects.filter((effect: {type: string}) => effect.type === 'tremolo').length,
      vibratoCount: effects.filter((effect: {type: string}) => effect.type === 'vibrato').length,
      ringCount: effects.filter((effect: {type: string}) => effect.type === 'ring').length,
      bitcrusherCount: effects.filter((effect: {type: string}) => effect.type === 'bitcrusher').length,
      reverbCount: effects.filter((effect: {type: string}) => effect.type === 'reverb').length,
      enabledTypes: effects
        .filter((effect: {enabled: boolean}) => effect.enabled)
        .map((effect: {type: string}) => effect.type)
        .sort(),
    };
  }, appStateKey);

  expect(effectState.delayCount).toBe(1);
  expect(effectState.filterCount).toBe(1);
  expect(effectState.gateCount).toBe(1);
  expect(effectState.saturationCount).toBe(1);
  expect(effectState.overdriveCount).toBe(1);
  expect(effectState.chorusCount).toBe(1);
  expect(effectState.flangerCount).toBe(1);
  expect(effectState.phaserCount).toBe(1);
  expect(effectState.tremoloCount).toBe(1);
  expect(effectState.vibratoCount).toBe(1);
  expect(effectState.ringCount).toBe(1);
  expect(effectState.bitcrusherCount).toBe(1);
  expect(effectState.reverbCount).toBe(1);
  expect(effectState.enabledTypes).toEqual([
    'bitcrusher',
    'chorus',
    'delay',
    'filter',
    'flanger',
    'gate',
    'overdrive',
    'phaser',
    'reverb',
    'ring',
    'saturation',
    'tremolo',
    'vibrato',
  ]);

  await deleteActiveUntitledProject(page);
});

test('effects accordion keeps only one parameter-heavy device expanded', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-effects-accordion-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 1, frequency: 440}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await page.locator('button[title="effects"]').click();

  await expect(page.locator('.effect-card.expanded')).toHaveCount(1);
  await expect(page.locator('.effect-summary-row')).toHaveCount(16);
  await expect(page.locator('input[aria-label="Graphic EQ 500 Hz gain"]')).toHaveCount(1);
  await expect(page.locator('input[aria-label="Compressor Threshold"]')).toHaveCount(0);

  const compressorCard = page.locator('.dynamics-card').filter({hasText: 'Compressor'});
  await page.locator('button[aria-label="Expand Compressor controls"]').click();
  await expect(page.locator('.effect-card.expanded')).toHaveCount(1);
  await expect(page.locator('input[aria-label="Graphic EQ 500 Hz gain"]')).toHaveCount(0);
  await expect(page.locator('input[aria-label="Compressor Threshold"]')).toHaveCount(1);

  await compressorCard.locator('.effect-expand').click();
  await expect(page.locator('.effect-card.expanded')).toHaveCount(0);
  await expect(page.locator('input[aria-label="Compressor Threshold"]')).toHaveCount(0);
  await expect(page.locator('.effect-summary-row')).toHaveCount(16);

  await deleteActiveUntitledProject(page);
});

test('timeline grid and playhead span tall imported layer stacks', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPaths = Array.from({length: 6}, (_, index) => {
    const wavPath = testInfo.outputPath(`arudio-tall-layer-${index + 1}.wav`);
    writeFileSync(wavPath, createSineWaveWav({durationSeconds: 1, frequency: 280 + index * 80}));
    return wavPath;
  });

  await page.locator('input[type="file"]').setInputFiles(wavPaths);
  await expect(page.locator('.track-lane')).toHaveCount(6);

  const guideMetrics = await readTimelineGuideMetrics(page);
  expect(guideMetrics.trackLanesHeight).toBeGreaterThan(guideMetrics.rootHeight);
  expect(guideMetrics.gridHeight).toBeGreaterThanOrEqual(guideMetrics.trackLanesHeight - 1);
  expect(guideMetrics.markLayerHeight).toBeGreaterThanOrEqual(guideMetrics.trackLanesHeight - 1);
  expect(guideMetrics.playheadWrapHeight).toBeGreaterThanOrEqual(guideMetrics.trackLanesHeight - 1);
  expect(guideMetrics.playheadLineHeight).toBeGreaterThanOrEqual(guideMetrics.trackLanesHeight - 1);

  await deleteActiveUntitledProject(page);
});

test('source overage renders as visual ghost regions and exported silence', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-overage-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 1, frequency: 440}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await createSourceOverageClipForTest(page);
  await page.reload();
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await zoomTimelineTo30Seconds(page);

  await expect(page.locator('.source-overage.left')).toHaveCount(1);
  await expect(page.locator('.source-overage.right')).toHaveCount(1);
  await expect(page.locator('.source-overage-boundary.left')).toHaveCount(1);
  await expect(page.locator('.source-overage-boundary.right')).toHaveCount(1);

  const download = await exportWavFromHeader(page);
  const exportedPath = testInfo.outputPath('arudio-overage-render.wav');
  await download.saveAs(exportedPath);
  const wav = parseWavFile(readFileSync(exportedPath));

  expect(wav.frameCount).toBe(96_000);
  expect(wav.durationSeconds).toBeCloseTo(2, 3);
  expect(wav.getPeakInTimeRange(0.05, 0.45)).toBeLessThanOrEqual(2);
  expect(wav.getPeakInTimeRange(0.65, 1.35)).toBeGreaterThan(500);
  expect(wav.getPeakInTimeRange(1.6, 1.95)).toBeLessThanOrEqual(2);

  await deleteActiveUntitledProject(page);
});

test('one compound clip keyframe stores gain and pitch edits at the same time and survives reload', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-compound-keyframe-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 1.5, frequency: 440}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await zoomTimelineTo30Seconds(page);

  const clip = page.locator('.clip-block');
  await clip.click();
  await expect(clip).toHaveAttribute('aria-pressed', 'true');
  await clickRulerAtSeconds(page, 0.4, 30);
  await expect.poll(() => isFooterTimeWithin(page, 0.35, 0.45)).toBe(true);

  await page.locator('button[title="Add clip keyframe"]').click();
  await expect(page.locator('.clip-keyframe.compound')).toHaveCount(1);
  await expect(page.locator('.clip-keyframe.compound')).toHaveAttribute('title', 'Keyframe: Gain, Pitch');
  await expect(page.locator('.keyframe-active-row')).toContainText('2 param');

  await setRangeInputValue(page.locator('input[aria-label^="Gain"]').first(), '6');
  await setRangeInputValue(page.locator('input[aria-label^="Pitch"]').first(), '5');
  await expect(page.locator('.clip-keyframe.compound')).toHaveCount(1);
  await expect(page.locator('.keyframe-active-row')).toContainText('2 param');
  await page.locator('.save-button').click();
  await expect.poll(() => readActiveClipAutomationSignature(page)).toMatch(
    /^times=(\d+\.\d{2});clip\.gain=\1:6\.0;clip\.pitch=\1:5\.0$/,
  );

  await page.reload();
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await page.locator('.clip-block').click();
  await expect(page.locator('.clip-keyframe.compound')).toHaveCount(1);
  await expect(page.locator('.clip-keyframe.compound')).toHaveAttribute('title', 'Keyframe: Gain, Pitch');
  await page.locator('.clip-keyframe.compound').click();
  await expect(page.locator('.keyframe-active-row')).toContainText('2 param');
  await expect.poll(() => readActiveClipAutomationSignature(page)).toMatch(
    /^times=(\d+\.\d{2});clip\.gain=\1:6\.0;clip\.pitch=\1:5\.0$/,
  );

  await deleteActiveUntitledProject(page);
});

test('bottom delete tool removes a selected compound keyframe before deleting the clip', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-toolbar-delete-keyframe-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 1.5, frequency: 440}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await zoomTimelineTo30Seconds(page);

  const clip = page.locator('.clip-block');
  await clip.click();
  await clickRulerAtSeconds(page, 0.45, 30);
  await expect.poll(() => isFooterTimeWithin(page, 0.4, 0.5)).toBe(true);
  await page.locator('button[title="Add clip keyframe"]').click();
  await expect(page.locator('.clip-keyframe.compound')).toHaveCount(1);

  await page.locator('.clip-keyframe.compound').click();
  await expect(page.locator('.keyframe-active-row')).toContainText('2 param');
  await page.locator('.tool-button').filter({hasText: 'Delete'}).click();

  await expect(page.locator('.clip-block')).toHaveCount(1);
  await expect(page.locator('.clip-keyframe.compound')).toHaveCount(0);
  await expect.poll(() => readActiveClipAutomationSignature(page)).toBe('times=;');

  await deleteActiveUntitledProject(page);
});

test('active playback keeps old cache while edits queue new cache and seeking stays live', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-cache-seek-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 4, frequency: 440}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Play');
  await zoomTimelineTo30Seconds(page);

  await page.locator('.footer-play').click();
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Pause');
  await expect(page.locator('.cache-status')).toContainText('Active cache');
  await expect(page.locator('.cache-status')).toContainText('Current');

  const activeGeneration = await page.locator('.cache-pill.active strong').innerText();
  await setRangeInputValue(page.locator('input[aria-label^="Gain"]').first(), '6');

  await expect(page.locator('.cache-status')).toContainText('Old cache');
  await expect(page.locator('.cache-status')).toContainText('New cache');
  await expect(page.locator('.cache-status')).toContainText('Audible now');
  await expect(page.locator('.cache-status')).toContainText('Queued next');
  await expect(page.locator('.cache-status')).toContainText('Old releases on stop');
  const pendingGeneration = await page.locator('.cache-pill.pending strong').innerText();
  await expect(page.locator('.cache-pill.active strong')).toHaveText(activeGeneration);

  await clickRulerAtSeconds(page, 2.5, 30);
  await expect(page.locator('.cache-pill.active strong')).toHaveText(activeGeneration);
  await expect(page.locator('.cache-pill.pending strong')).toHaveText(pendingGeneration);
  await expect.poll(() => isFooterTimeWithin(page, 2, 3.8), {timeout: 2000}).toBe(true);

  await page.locator('.footer-icon[title="Reset/Stop"]').click();
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Play');
  await expect(page.locator('.cache-status')).toHaveCount(0);

  await deleteActiveUntitledProject(page);
});

test('timeline pan shifts ruler and clip viewport without moving project timing', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-timeline-pan-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 1, frequency: 440}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await moveSingleClipForTimelinePanTest(page);
  await page.reload();
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await expect(page.locator('input[aria-label="Timeline horizontal viewport"]')).toHaveCount(0);

  await zoomTimelineTo30Seconds(page);
  await expect(page.locator('.zoom-readout')).toContainText('30s @ 0:00');
  await expect(page.locator('.clip-block')).toHaveCount(0);

  const viewportSlider = page.locator('input[aria-label="Timeline horizontal viewport"]');
  await expect(viewportSlider).toHaveCount(1);
  await setRangeInputValue(viewportSlider, '31');
  await expect(page.locator('.zoom-readout')).toContainText('30s @ 0:31');
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await expect.poll(() => readStoredClipStartTimes(page)).toEqual([60]);

  const panRightButton = page.locator('button[title="Pan timeline right"]');
  await panRightButton.click();
  await expect(page.locator('.zoom-readout')).toContainText('30s @ 0:31');
  await expect(page.locator('.clip-block')).toHaveCount(1);

  await clickRulerAtViewportRatio(page, 0.5);
  await expect.poll(() => isFooterTimeWithin(page, 45.7, 46.3)).toBe(true);

  await deleteActiveUntitledProject(page);
});

test('ctrl wheel zooms timeline around the mouse cursor without moving project timing', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const wavPath = testInfo.outputPath('arudio-direct-zoom-source.wav');
  writeFileSync(wavPath, createSineWaveWav({durationSeconds: 1, frequency: 440}));

  await page.locator('input[type="file"]').setInputFiles(wavPath);
  await expect(page.locator('.clip-block')).toHaveCount(1);
  await stretchSingleClipForTimelineZoomTest(page);
  await page.reload();

  await expect(page.locator('.zoom-readout')).toContainText('120s @ 0:00');
  await ctrlWheelRulerAtViewportRatio(page, 0.75, -700);
  await expect(page.locator('.zoom-readout')).toContainText('60s @ 0:44');

  await ctrlWheelTimelineAtViewportRatio(page, 0.25, -700);
  await expect(page.locator('.zoom-readout')).toContainText('30s @ 0:52');

  const clipTiming = await readStoredClipTiming(page);
  expect(clipTiming).toEqual({startTime: 60, duration: 90});

  await deleteActiveUntitledProject(page);
});

test('selected clip loop keeps active cache generation while seeking in a multi-clip project', async ({page}, testInfo) => {
  await resetLocalProjectState(page);
  await page.goto('/');
  await createUntitledProject(page);

  const firstWavPath = testInfo.outputPath('arudio-loop-first.wav');
  const secondWavPath = testInfo.outputPath('arudio-loop-second.wav');
  writeFileSync(firstWavPath, createSineWaveWav({frequency: 330}));
  writeFileSync(secondWavPath, createSineWaveWav({frequency: 660}));

  await page.locator('input[type="file"]').setInputFiles([firstWavPath, secondWavPath]);
  await expect(page.locator('.clip-block')).toHaveCount(2);
  await moveImportedClipsForLoopTest(page);
  await page.reload();
  await expect(page.locator('.clip-block')).toHaveCount(2);
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Play');

  await zoomTimelineTo30Seconds(page);

  const selectedClip = page.locator('.clip-block').nth(1);
  await selectedClip.click();
  await expect(selectedClip).toHaveAttribute('aria-pressed', 'true');

  await page.locator('.loop-button').click();
  await expect(page.locator('.loop-button')).toHaveAttribute('title', 'Loop on');

  await clickRulerAtSeconds(page, 3, 30);
  await expect.poll(() => isFooterTimeWithin(page, 2.98, 3.01)).toBe(true);
  await page.locator('.footer-play').click();
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Pause');
  await expect.poll(() => isFooterTimeWithin(page, 2, 2.35)).toBe(true);
  await expect(page.locator('.cache-status')).toContainText('Active cache');
  await page.locator('.footer-icon[title="Reset/Stop"]').click();
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Play');

  await clickRulerAtSeconds(page, 2.5, 30);
  await expect.poll(() => readFooterTime(page)).toMatch(/^00:02\./);
  await page.locator('.footer-play').click();
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Pause');
  await expect(page.locator('.cache-status')).toContainText('Active cache');

  const activeGeneration = await page.locator('.cache-pill.active strong').innerText();
  await clickRulerAtSeconds(page, 5, 30);
  await expect(page.locator('.cache-pill.active strong')).toHaveText(activeGeneration);
  await expect.poll(() => readFooterTime(page)).toMatch(/^00:02\./);

  await page.locator('.footer-icon[title="Reset/Stop"]').click();
  await expect(page.locator('.footer-play')).toHaveAttribute('title', 'Play');

  await deleteActiveUntitledProject(page);
});

async function resetLocalProjectState(page: Page) {
  await page.goto('/');
  await page.evaluate(
    ({stateKey, databaseName}) =>
      new Promise<void>((resolve) => {
        window.localStorage.removeItem(stateKey);
        const openRequest = window.indexedDB.open(databaseName);
        openRequest.onupgradeneeded = () => {
          const database = openRequest.result;
          if (!database.objectStoreNames.contains('AudioSourceBlobs')) {
            database.createObjectStore('AudioSourceBlobs', {keyPath: 'id'});
          }
        };
        openRequest.onerror = () => resolve();
        openRequest.onsuccess = () => {
          const database = openRequest.result;
          const transaction = database.transaction('AudioSourceBlobs', 'readwrite');
          const store = transaction.objectStore('AudioSourceBlobs');
          store.clear();
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
          transaction.onerror = () => {
            database.close();
            resolve();
          };
        };
      }),
    {stateKey: appStateKey, databaseName: audioSourceDatabaseName},
  );
}

async function createUntitledProject(page: Page) {
  await expect(page.locator('.new-project-button')).toBeVisible();
  await page.locator('.new-project-button').click();
  await page.locator('.modal-panel .primary').click();
  await expect(page.locator('.project-button strong')).toHaveText('Untitled Project');
}

async function exportWavFromHeader(page: Page): Promise<Download> {
  await page.locator('button[title="Export Audio"]').click();
  const modal = page.getByTestId('export-settings-modal');
  await expect(modal).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await modal.getByRole('button', {name: 'Export WAV'}).click();
  return downloadPromise;
}

async function deleteActiveUntitledProject(page: Page) {
  const deleteButton = page.locator('button[aria-label="Delete Untitled Project"]');
  if ((await deleteButton.count()) !== 1) {
    return;
  }

  await deleteButton.click({force: true});
  await page.locator('.dialog-panel .danger').click();
}

async function clearStoredAudioSourceBlobs(page: Page) {
  await page.evaluate(
    (databaseName) =>
      new Promise<void>((resolve) => {
        const openRequest = window.indexedDB.open(databaseName);
        openRequest.onupgradeneeded = () => {
          const database = openRequest.result;
          if (!database.objectStoreNames.contains('AudioSourceBlobs')) {
            database.createObjectStore('AudioSourceBlobs', {keyPath: 'id'});
          }
        };
        openRequest.onerror = () => resolve();
        openRequest.onsuccess = () => {
          const database = openRequest.result;
          const transaction = database.transaction('AudioSourceBlobs', 'readwrite');
          const store = transaction.objectStore('AudioSourceBlobs');
          store.clear();
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
          transaction.onerror = () => {
            database.close();
            resolve();
          };
        };
      }),
    audioSourceDatabaseName,
  );
}

async function moveImportedClipsForLoopTest(page: Page) {
  await page.evaluate((stateKey) => {
    const rawState = window.localStorage.getItem(stateKey);
    if (!rawState) {
      throw new Error('Project state is missing.');
    }

    const state = JSON.parse(rawState);
    const project = state.projects.find((item: {id: string}) => item.id === state.activeProjectId);
    if (!project || project.clips.length < 2) {
      throw new Error('Loop test project needs two imported clips.');
    }

    project.clips = project.clips.map((clip: {startTime: number; duration: number}, index: number) => ({
      ...clip,
      startTime: index === 0 ? 0 : 2,
      duration: 1,
      sourceStartTime: 0,
      sourceTimelineOffset: 0,
    }));
    window.localStorage.setItem(stateKey, JSON.stringify(state));
  }, appStateKey);
}

async function createSourceOverageClipForTest(page: Page) {
  await page.evaluate((stateKey) => {
    const rawState = window.localStorage.getItem(stateKey);
    if (!rawState) {
      throw new Error('Project state is missing.');
    }

    const state = JSON.parse(rawState);
    const project = state.projects.find((item: {id: string}) => item.id === state.activeProjectId);
    if (!project || project.clips.length < 1) {
      throw new Error('Source-overage test project needs one imported clip.');
    }

    project.clips = project.clips.map((clip: {startTime: number; duration: number}) => ({
      ...clip,
      startTime: 0,
      duration: 2,
      sourceStartTime: 0,
      sourceTimelineOffset: 0.5,
      fadeIn: 0,
      fadeOut: 0,
      speed: 1,
      pitch: 0,
    }));
    window.localStorage.setItem(stateKey, JSON.stringify(state));
  }, appStateKey);
}

async function moveSingleClipForTimelinePanTest(page: Page) {
  await page.evaluate((stateKey) => {
    const rawState = window.localStorage.getItem(stateKey);
    if (!rawState) {
      throw new Error('Project state is missing.');
    }

    const state = JSON.parse(rawState);
    const project = state.projects.find((item: {id: string}) => item.id === state.activeProjectId);
    if (!project || project.clips.length < 1) {
      throw new Error('Timeline pan test project needs one imported clip.');
    }

    project.clips = project.clips.map((clip: {startTime: number; duration: number}) => ({
      ...clip,
      startTime: 60,
      duration: 1,
      sourceStartTime: 0,
      sourceTimelineOffset: 0,
    }));
    window.localStorage.setItem(stateKey, JSON.stringify(state));
  }, appStateKey);
}

async function stretchSingleClipForTimelineZoomTest(page: Page) {
  await page.evaluate((stateKey) => {
    const rawState = window.localStorage.getItem(stateKey);
    if (!rawState) {
      throw new Error('App state missing for timeline zoom test.');
    }

    const state = JSON.parse(rawState);
    const project = state.projects[0];
    project.clips = project.clips.map((clip: {startTime: number; duration: number}) => ({
      ...clip,
      startTime: 60,
      duration: 90,
      sourceStartTime: 0,
      sourceTimelineOffset: 0,
    }));
    window.localStorage.setItem(stateKey, JSON.stringify(state));
  }, appStateKey);
}

async function zoomTimelineTo30Seconds(page: Page) {
  const zoomInButton = page.locator('button[title="Merenggangkan timeline"]');
  await zoomInButton.click();
  await zoomInButton.click();
  await expect(page.locator('.zoom-readout')).toContainText('30s');
}

async function clickRulerAtSeconds(page: Page, seconds: number, timelineDuration: number) {
  const ruler = page.locator('.ruler-bar');
  const box = await ruler.boundingBox();
  expect(box).not.toBeNull();
  if (!box) {
    throw new Error('Timeline ruler is not visible.');
  }

  await ruler.click({
    position: {
      x: getTimelineActiveX(box.width, await getViewportRatioForTimelineTime(page, seconds, timelineDuration)),
      y: Math.max(24, box.height - 6),
    },
  });
}

async function clickUpperRulerAtSeconds(page: Page, seconds: number, timelineDuration: number) {
  await clickUpperRulerAtViewportSeconds(page, seconds, timelineDuration, 'click');
}

async function doubleClickUpperRulerAtSeconds(page: Page, seconds: number, timelineDuration: number) {
  await clickUpperRulerAtViewportSeconds(page, seconds, timelineDuration, 'dblclick');
}

async function clickUpperRulerAtViewportSeconds(
  page: Page,
  seconds: number,
  timelineDuration: number,
  clickCount: 'click' | 'dblclick',
) {
  const ruler = page.locator('.ruler-bar');
  const box = await ruler.boundingBox();
  expect(box).not.toBeNull();
  if (!box) {
    throw new Error('Timeline ruler is not visible.');
  }

  const position = {
    x: getTimelineActiveX(box.width, await getViewportRatioForTimelineTime(page, seconds, timelineDuration)),
    y: 8,
  };

  if (clickCount === 'dblclick') {
    await ruler.dblclick({position});
    return;
  }

  await ruler.click({position});
}

async function getViewportRatioForTimelineTime(page: Page, seconds: number, timelineDuration: number) {
  const viewportStart = await readTimelineViewportStart(page);
  return (seconds - viewportStart) / timelineDuration;
}

async function readTimelineViewportStart(page: Page) {
  const readout = await page.locator('.zoom-readout').innerText();
  const match = readout.match(/@\s*(\d+):(\d+)/);
  if (!match) {
    return 0;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

async function panRulerByWheelDelta(page: Page, deltaX: number) {
  const ruler = page.locator('.ruler-bar');
  const box = await ruler.boundingBox();
  expect(box).not.toBeNull();
  if (!box) {
    throw new Error('Timeline ruler is not visible.');
  }

  await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height - 4, 32));
  await page.mouse.wheel(deltaX, 0);
}

async function ctrlWheelRulerAtViewportRatio(page: Page, ratio: number, deltaY: number) {
  const ruler = page.locator('.ruler-bar');
  const box = await ruler.boundingBox();
  expect(box).not.toBeNull();
  if (!box) {
    throw new Error('Timeline ruler is not visible.');
  }

  await page.mouse.move(box.x + getTimelineActiveX(box.width, ratio), box.y + Math.min(box.height - 4, 32));
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, deltaY);
  await page.keyboard.up('Control');
}

async function ctrlWheelTimelineAtViewportRatio(page: Page, ratio: number, deltaY: number) {
  const timeline = page.locator('.timeline-root');
  const box = await timeline.boundingBox();
  expect(box).not.toBeNull();
  if (!box) {
    throw new Error('Timeline is not visible.');
  }

  await page.mouse.move(box.x + getTimelineActiveX(box.width, ratio), box.y + Math.min(box.height - 12, Math.max(48, box.height / 2)));
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, deltaY);
  await page.keyboard.up('Control');
}

async function clickRulerAtViewportRatio(page: Page, ratio: number) {
  const ruler = page.locator('.ruler-bar');
  const box = await ruler.boundingBox();
  expect(box).not.toBeNull();
  if (!box) {
    throw new Error('Timeline ruler is not visible.');
  }

  await ruler.click({
    position: {
      x: getTimelineActiveX(box.width, ratio),
      y: Math.min(box.height - 4, 32),
    },
  });
}

async function readStoredTimelineMarks(page: Page): Promise<Array<{time: number; sampleFrame: number}>> {
  return page.evaluate((stateKey) => {
    const rawState = window.localStorage.getItem(stateKey);
    if (!rawState) {
      return [];
    }

    const state = JSON.parse(rawState);
    return state.projects[0]?.timelineMarks ?? [];
  }, appStateKey);
}

async function readStoredClipTiming(page: Page) {
  return page.evaluate((stateKey) => {
    const rawState = window.localStorage.getItem(stateKey);
    if (!rawState) {
      return null;
    }

    const state = JSON.parse(rawState);
    const clip = state.projects[0]?.clips[0];
    return clip ? {startTime: clip.startTime, duration: clip.duration} : null;
  }, appStateKey);
}

async function readStoredTrackOrder(page: Page) {
  return page.evaluate((stateKey) => {
    const rawState = window.localStorage.getItem(stateKey);
    if (!rawState) {
      return [];
    }

    const state = JSON.parse(rawState);
    const project = state.projects.find((item: {id: string}) => item.id === state.activeProjectId);
    return (project?.tracks ?? []).map((track: {name: string}) => track.name);
  }, appStateKey);
}

async function readStoredClipStartTimes(page: Page) {
  return page.evaluate((stateKey) => {
    const rawState = window.localStorage.getItem(stateKey);
    if (!rawState) {
      return [];
    }

    const state = JSON.parse(rawState);
    const project = state.projects.find((item: {id: string}) => item.id === state.activeProjectId);
    return (project?.clips ?? []).map((clip: {startTime: number}) => clip.startTime);
  }, appStateKey);
}

async function readStoredSplitLayerState(page: Page) {
  return page.evaluate((stateKey) => {
    const rawState = window.localStorage.getItem(stateKey);
    if (!rawState) {
      throw new Error('Expected saved app state after splitting a clip.');
    }

    const state = JSON.parse(rawState);
    const project = state.projects.find((item: {id: string}) => item.id === state.activeProjectId);
    if (!project) {
      throw new Error('Expected an active project after splitting a clip.');
    }

    const tracks = project.tracks ?? [];
    const clips = [...(project.clips ?? [])].sort(
      (first: {startTime: number}, second: {startTime: number}) => first.startTime - second.startTime,
    );

    return {
      trackCount: tracks.length,
      clipCount: clips.length,
      trackNames: tracks.map((track: {name: string}) => track.name),
      clipTrackIndexes: clips.map((clip: {trackId: string}) =>
        tracks.findIndex((track: {id: string}) => track.id === clip.trackId),
      ),
      clipStarts: clips.map((clip: {startTime: number}) => Number(clip.startTime.toFixed(3))),
      clipDurations: clips.map((clip: {duration: number}) => Number(clip.duration.toFixed(3))),
      clipSourceStarts: clips.map((clip: {sourceStartTime?: number}) => Number((clip.sourceStartTime ?? 0).toFixed(3))),
    };
  }, appStateKey);
}

async function leaveLegacyOrphanFirstAudioLayerInStorage(page: Page) {
  await page.evaluate((stateKey) => {
    const rawState = window.localStorage.getItem(stateKey);
    if (!rawState) {
      throw new Error('Expected saved app state before seeding a legacy orphan layer.');
    }

    const state = JSON.parse(rawState);
    const project = state.projects.find((item: {id: string}) => item.id === state.activeProjectId);
    if (!project || !Array.isArray(project.clips) || project.clips.length < 2) {
      throw new Error('Expected a multi-clip project before seeding a legacy orphan layer.');
    }

    project.clips = project.clips.slice(1);
    window.localStorage.setItem(stateKey, JSON.stringify(state));
  }, appStateKey);
}

async function readStoredProjectCounts(page: Page) {
  return page.evaluate((stateKey) => {
    const rawState = window.localStorage.getItem(stateKey);
    if (!rawState) {
      return {tracks: 0, clips: 0, sources: 0};
    }

    const state = JSON.parse(rawState);
    const project = state.projects.find((item: {id: string}) => item.id === state.activeProjectId);
    return {
      tracks: project?.tracks?.length ?? 0,
      clips: project?.clips?.length ?? 0,
      sources: project?.audioSources?.length ?? 0,
    };
  }, appStateKey);
}

async function readStoredAudioBlobCount(page: Page) {
  return page.evaluate(
    (databaseName) =>
      new Promise<number>((resolve) => {
        const openRequest = window.indexedDB.open(databaseName);
        openRequest.onupgradeneeded = () => {
          const database = openRequest.result;
          if (!database.objectStoreNames.contains('AudioSourceBlobs')) {
            database.createObjectStore('AudioSourceBlobs', {keyPath: 'id'});
          }
        };
        openRequest.onerror = () => resolve(0);
        openRequest.onsuccess = () => {
          const database = openRequest.result;
          const transaction = database.transaction('AudioSourceBlobs', 'readonly');
          const store = transaction.objectStore('AudioSourceBlobs');
          const countRequest = store.count();
          countRequest.onsuccess = () => {
            database.close();
            resolve(countRequest.result);
          };
          countRequest.onerror = () => {
            database.close();
            resolve(0);
          };
        };
      }),
    audioSourceDatabaseName,
  );
}

async function seedSameTrackClipLayout(
  page: Page,
  layouts: Array<{name: string; startTime: number; duration: number; sourceStartTime?: number}>,
) {
  await page.evaluate(
    ({stateKey, nextLayouts}) => {
      const rawState = window.localStorage.getItem(stateKey);
      if (!rawState) {
        throw new Error('Expected saved app state before seeding same-track clips.');
      }

      const state = JSON.parse(rawState);
      const project = state.projects.find((item: {id: string}) => item.id === state.activeProjectId);
      const sourceClip = project?.clips?.[0];
      if (!project || !sourceClip) {
        throw new Error('Expected one imported clip before seeding same-track clips.');
      }

      project.clips = nextLayouts.map((layout, index) => ({
        ...sourceClip,
        id: `seeded-same-track-clip-${index}`,
        trackId: sourceClip.trackId,
        name: layout.name,
        startTime: layout.startTime,
        sourceStartTime: layout.sourceStartTime ?? 0,
        sourceTimelineOffset: 0,
        duration: layout.duration,
        fadeIn: 0,
        fadeOut: 0,
        automation: [],
      }));
      window.localStorage.setItem(stateKey, JSON.stringify(state));
    },
    {stateKey: appStateKey, nextLayouts: layouts},
  );
}

async function dragClipBySeconds(page: Page, clipIndex: number, deltaSeconds: number, timelineDuration: number) {
  const clip = page.locator('.clip-block').nth(clipIndex);
  const timeline = page.locator('.timeline-root');
  const clipBox = await clip.boundingBox();
  const timelineBox = await timeline.boundingBox();
  expect(clipBox).not.toBeNull();
  expect(timelineBox).not.toBeNull();
  if (!clipBox || !timelineBox) {
    throw new Error('Clip drag target is missing.');
  }

  const activeWidth = Math.max(1, timelineBox.width - 72);
  const deltaX = (deltaSeconds / timelineDuration) * activeWidth;
  const startX = clipBox.x + clipBox.width / 2;
  const startY = clipBox.y + clipBox.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY, {steps: 12});
  await page.mouse.up();
}

async function dragLayerTagByRows(page: Page, rowIndex: number, rowDelta: number) {
  const tag = page.locator('.lane-tag').nth(rowIndex);
  const lane = page.locator('.track-lane').nth(rowIndex);
  const tagBox = await tag.boundingBox();
  const laneBox = await lane.boundingBox();
  expect(tagBox).not.toBeNull();
  expect(laneBox).not.toBeNull();
  if (!tagBox || !laneBox) {
    throw new Error('Layer tag drag target is missing.');
  }

  const startX = tagBox.x + tagBox.width / 2;
  const startY = tagBox.y + tagBox.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX, startY + rowDelta * laneBox.height, {steps: 8});
  await page.mouse.up();
}

async function readFirstMarkerGuideAlignment(page: Page) {
  return readMarkerGuideAlignment(page, 0);
}

async function readLastMarkerGuideAlignment(page: Page) {
  const markerCount = await page.locator('.timeline-mark-button').count();
  return readMarkerGuideAlignment(page, Math.max(0, markerCount - 1));
}

async function readTimelineGuideMetrics(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector('.timeline-root');
    const trackLanes = document.querySelector('.track-lanes');
    const grid = document.querySelector('.timeline-grid');
    const markLayer = document.querySelector('.timeline-mark-layer');
    const playheadWrap = document.querySelector('.playhead-line-wrap');
    const playheadLine = document.querySelector('.playhead-line');
    if (!root || !trackLanes || !grid || !markLayer || !playheadWrap || !playheadLine) {
      throw new Error('Timeline guide metric elements are missing.');
    }

    const heightOf = (element: Element) => element.getBoundingClientRect().height;
    return {
      rootHeight: heightOf(root),
      trackLanesHeight: heightOf(trackLanes),
      gridHeight: heightOf(grid),
      markLayerHeight: heightOf(markLayer),
      playheadWrapHeight: heightOf(playheadWrap),
      playheadLineHeight: heightOf(playheadLine),
    };
  });
}

async function readMarkerGuideAlignment(page: Page, index: number) {
  return page.evaluate((markerIndex) => {
    const rulerMarker = document.querySelectorAll('.timeline-mark-button')[markerIndex];
    const timelineMarker = document.querySelectorAll('.timeline-mark-band')[markerIndex];
    if (!rulerMarker || !timelineMarker) {
      throw new Error('Marker guide is missing.');
    }

    const centerX = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return rect.left + rect.width / 2;
    };
    const zIndexNumber = (element: Element | null) => {
      const value = element ? window.getComputedStyle(element).zIndex : '0';
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const bandRect = timelineMarker.getBoundingClientRect();
    return {
      centerDelta: Math.abs(centerX(rulerMarker) - centerX(timelineMarker)),
      bandHeight: bandRect.height,
      markerLayerZIndex: zIndexNumber(document.querySelector('.timeline-mark-layer')),
      trackLanesZIndex: zIndexNumber(document.querySelector('.track-lanes')),
    };
  }, index);
}

async function readClipViewportCoverage(page: Page) {
  return page.evaluate(() => {
    const clipLayer = document.querySelector('.clip-layer');
    const clip = document.querySelector('.clip-block');
    if (!clipLayer || !clip) {
      throw new Error('Clip viewport coverage elements are missing.');
    }

    const layerRect = clipLayer.getBoundingClientRect();
    const clipRect = clip.getBoundingClientRect();
    return {
      leftDelta: Math.max(0, clipRect.left - layerRect.left),
      rightDelta: Math.max(0, layerRect.right - clipRect.right),
    };
  });
}

function getTimelineActiveX(totalWidth: number, ratio: number) {
  const inset = 36;
  const activeWidth = Math.max(1, totalWidth - inset * 2);
  return inset + Math.max(0, Math.min(1, ratio)) * activeWidth;
}

async function setRangeInputValue(locator: Locator, value: string) {
  await locator.evaluate((element, nextValue) => {
    if (!(element instanceof HTMLInputElement)) {
      throw new Error('Range control is not an input element.');
    }

    element.value = nextValue;
    element.dispatchEvent(new Event('input', {bubbles: true}));
  }, value);
}

async function readFooterTime(page: Page) {
  return page.locator('.time-badge strong').innerText();
}

async function readActiveClipAutomationSignature(page: Page) {
  const summary = await page.evaluate((stateKey) => {
    const rawState = window.localStorage.getItem(stateKey);
    if (!rawState) {
      throw new Error('Project state is missing.');
    }

    const state = JSON.parse(rawState);
    const project = state.projects.find((item: {id: string}) => item.id === state.activeProjectId);
    if (!project || project.clips.length < 1) {
      throw new Error('Automation test needs one imported clip.');
    }

    const clip = project.clips[0] as {
      automation: Array<{
        parameterId: string;
        keyframes: Array<{time: number; value: number}>;
      }>;
    };
    const lanes = clip.automation
      .filter((lane) => lane.parameterId === 'clip.gain' || lane.parameterId === 'clip.pitch')
      .map((lane) => ({
        parameterId: lane.parameterId,
        keyframes: lane.keyframes
          .map((keyframe) => ({
            time: Number(keyframe.time.toFixed(2)),
            value: Number(keyframe.value.toFixed(1)),
          }))
          .sort((first, second) => first.time - second.time),
      }))
      .sort((first, second) => first.parameterId.localeCompare(second.parameterId));
    const compoundTimes = [
      ...new Set(lanes.flatMap((lane) => lane.keyframes.map((keyframe) => keyframe.time.toFixed(2)))),
    ].sort();

    return {compoundTimes, lanes};
  }, appStateKey);

  const laneSignature = summary.lanes
    .map((lane) => `${lane.parameterId}=${lane.keyframes.map((keyframe) => `${keyframe.time.toFixed(2)}:${keyframe.value.toFixed(1)}`).join(',')}`)
    .join(';');

  return `times=${summary.compoundTimes.join(',')};${laneSignature}`;
}

async function readActiveTrackEffectAutomationSignature(page: Page, parameterIds = ['track.reverb.amount']) {
  return page.evaluate(({stateKey, parameterIds}) => {
    const rawState = window.localStorage.getItem(stateKey);
    if (!rawState) {
      throw new Error('Project state is missing.');
    }

    const state = JSON.parse(rawState);
    const project = state.projects.find((item: {id: string}) => item.id === state.activeProjectId);
    if (!project || project.tracks.length < 1) {
      throw new Error('Effect automation test needs one imported track.');
    }

    const track = project.tracks.find((item: {automation?: Array<{parameterId: string}>}) =>
      item.automation?.some((lane) => parameterIds.includes(lane.parameterId)),
    ) as
      | {
      automation: Array<{
        parameterId: string;
        keyframes: Array<{time: number; value: number}>;
      }>;
    }
      | undefined;
    if (!track) {
      return '';
    }

    return track.automation
      .filter((lane) => parameterIds.includes(lane.parameterId))
      .sort((first, second) => first.parameterId.localeCompare(second.parameterId))
      .map((lane) =>
        `${lane.parameterId}=${lane.keyframes
          .map((keyframe) => `${keyframe.time.toFixed(2)}:${keyframe.value.toFixed(2)}`)
          .join(',')}`,
      )
      .join(';');
  }, {stateKey: appStateKey, parameterIds});
}

async function getElementPixelValue(locator: Locator, propertyName: string) {
  return locator.evaluate((element, property) => {
    const value = getComputedStyle(element).getPropertyValue(property);
    return Number.parseFloat(value);
  }, propertyName);
}

async function getMaxTransitionSeconds(locator: Locator) {
  const transitionDuration = await locator.evaluate((element) => getComputedStyle(element).transitionDuration);
  return Math.max(...transitionDuration.split(',').map(parseCssTime));
}

function parseCssTime(value: string) {
  const trimmed = value.trim();
  if (trimmed.endsWith('ms')) {
    return Number.parseFloat(trimmed) / 1000;
  }

  if (trimmed.endsWith('s')) {
    return Number.parseFloat(trimmed);
  }

  return Number.parseFloat(trimmed) || 0;
}

async function readTimelineMarkStyle(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundImage: style.backgroundImage,
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
    };
  });
}

async function readPlayheadAlignment(page: Page) {
  return page.evaluate(() => {
    const badge = document.querySelector('.playhead-badge');
    const triangle = document.querySelector('.playhead-triangle');
    const line = document.querySelector('.playhead-line');
    if (!badge || !triangle || !line) {
      throw new Error('Playhead badge, triangle, or line is missing.');
    }

    const centerX = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return rect.left + rect.width / 2;
    };
    const lineCenter = centerX(line);

    return {
      badgeDelta: Math.abs(centerX(badge) - lineCenter),
      triangleDelta: Math.abs(centerX(triangle) - lineCenter),
    };
  });
}

async function readPlayheadBadgeViewportBounds(page: Page) {
  return page.evaluate(() => {
    const badge = document.querySelector('.playhead-badge');
    const ruler = document.querySelector('.ruler-bar');
    if (!badge || !ruler) {
      throw new Error('Playhead badge or ruler is missing.');
    }

    const badgeRect = badge.getBoundingClientRect();
    const rulerRect = ruler.getBoundingClientRect();
    return {
      badgeLeft: badgeRect.left,
      badgeRight: badgeRect.right,
      rulerLeft: rulerRect.left,
      rulerRight: rulerRect.right,
    };
  });
}

async function isFooterTimeWithin(page: Page, minimumSeconds: number, maximumSeconds: number) {
  const time = await readFooterTime(page);
  const seconds = parseFooterTime(time);
  return seconds >= minimumSeconds && seconds <= maximumSeconds;
}

function parseFooterTime(value: string) {
  const match = value.match(/^(\d+):(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Unexpected footer time: ${value}`);
  }

  const [, minutes, seconds, cents] = match;
  return Number(minutes) * 60 + Number(seconds) + Number(cents) / 100;
}

function parseWavFile(buffer: Buffer) {
  const riffId = buffer.toString('ascii', 0, 4);
  const waveId = buffer.toString('ascii', 8, 12);
  let offset = 12;
  let formatTag = 0;
  let channelCount = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let dataOffset = -1;
  let dataByteLength = 0;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkDataOffset = offset + 8;

    if (chunkId === 'fmt ') {
      formatTag = buffer.readUInt16LE(chunkDataOffset);
      channelCount = buffer.readUInt16LE(chunkDataOffset + 2);
      sampleRate = buffer.readUInt32LE(chunkDataOffset + 4);
      bitsPerSample = buffer.readUInt16LE(chunkDataOffset + 14);
    }

    if (chunkId === 'data') {
      dataOffset = chunkDataOffset;
      dataByteLength = chunkSize;
    }

    offset = chunkDataOffset + chunkSize + (chunkSize % 2);
  }

  if (dataOffset < 0 || channelCount <= 0 || bitsPerSample <= 0) {
    throw new Error('Exported WAV is missing required fmt/data chunks.');
  }

  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = channelCount * bytesPerSample;
  const frameCount = dataByteLength / blockAlign;
  const getSample = (frame: number, channel: number) => {
    const safeFrame = Math.max(0, Math.min(frameCount - 1, frame));
    const safeChannel = Math.max(0, Math.min(channelCount - 1, channel));
    return buffer.readInt16LE(dataOffset + safeFrame * blockAlign + safeChannel * bytesPerSample);
  };
  const getPeakInTimeRange = (startSeconds: number, endSeconds: number) => {
    const startFrame = Math.max(0, Math.min(frameCount, Math.floor(startSeconds * sampleRate)));
    const endFrame = Math.max(startFrame, Math.min(frameCount, Math.ceil(endSeconds * sampleRate)));
    let peakSample = 0;

    for (let frame = startFrame; frame < endFrame; frame += 1) {
      const frameOffset = dataOffset + frame * blockAlign;
      for (let channel = 0; channel < channelCount; channel += 1) {
        const sampleOffset = frameOffset + channel * bytesPerSample;
        peakSample = Math.max(peakSample, Math.abs(buffer.readInt16LE(sampleOffset)));
      }
    }

    return peakSample;
  };

  return {
    riffId,
    waveId,
    formatTag,
    channelCount,
    sampleRate,
    bitsPerSample,
    dataByteLength,
    frameCount,
    durationSeconds: frameCount / sampleRate,
    peakSample: getPeakInTimeRange(0, frameCount / sampleRate),
    getSample,
    getPeakInTimeRange,
  };
}

function hasMp3FrameSync(buffer: Buffer) {
  for (let index = 0; index < Math.max(0, buffer.length - 1); index += 1) {
    if (buffer[index] === 0xff && (buffer[index + 1] & 0xe0) === 0xe0) {
      return true;
    }
  }

  return false;
}

function getMeanAbsolutePcmDifference(
  firstWav: ReturnType<typeof parseWavFile>,
  secondWav: ReturnType<typeof parseWavFile>,
  startSeconds: number,
  endSeconds: number,
) {
  expect(secondWav.channelCount).toBe(firstWav.channelCount);
  expect(secondWav.sampleRate).toBe(firstWav.sampleRate);
  const startFrame = Math.max(0, Math.min(firstWav.frameCount, Math.floor(startSeconds * firstWav.sampleRate)));
  const endFrame = Math.max(startFrame, Math.min(firstWav.frameCount, Math.ceil(endSeconds * firstWav.sampleRate)));
  let totalDifference = 0;
  let sampleCount = 0;

  for (let frame = startFrame; frame < endFrame; frame += 1) {
    for (let channel = 0; channel < firstWav.channelCount; channel += 1) {
      totalDifference += Math.abs(firstWav.getSample(frame, channel) - secondWav.getSample(frame, channel));
      sampleCount += 1;
    }
  }

  return sampleCount > 0 ? totalDifference / sampleCount : 0;
}

function getMeanAbsolutePcm(
  wav: ReturnType<typeof parseWavFile>,
  startSeconds: number,
  endSeconds: number,
) {
  const startFrame = Math.max(0, Math.min(wav.frameCount, Math.floor(startSeconds * wav.sampleRate)));
  const endFrame = Math.max(startFrame, Math.min(wav.frameCount, Math.ceil(endSeconds * wav.sampleRate)));
  let total = 0;
  let sampleCount = 0;

  for (let frame = startFrame; frame < endFrame; frame += 1) {
    for (let channel = 0; channel < wav.channelCount; channel += 1) {
      total += Math.abs(wav.getSample(frame, channel));
      sampleCount += 1;
    }
  }

  return sampleCount > 0 ? total / sampleCount : 0;
}

function getWindowedMeanAbsoluteSpread(
  wav: ReturnType<typeof parseWavFile>,
  startSeconds: number,
  endSeconds: number,
  windowSeconds: number,
) {
  const means: number[] = [];
  for (let windowStart = startSeconds; windowStart + windowSeconds <= endSeconds; windowStart += windowSeconds) {
    means.push(getMeanAbsolutePcm(wav, windowStart, windowStart + windowSeconds));
  }

  return means.length > 0 ? Math.max(...means) - Math.min(...means) : 0;
}

function createSineWaveWav(options: {frequency?: number; durationSeconds?: number; amplitude?: number} = {}) {
  const sampleRate = 44_100;
  const durationSeconds = options.durationSeconds ?? 1;
  const frequency = options.frequency ?? 440;
  const amplitude = options.amplitude ?? 0.22;
  const frameCount = sampleRate * durationSeconds;
  const dataByteLength = frameCount * 2;
  const buffer = Buffer.alloc(44 + dataByteLength);

  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataByteLength, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataByteLength, 40);

  for (let index = 0; index < frameCount; index += 1) {
    const sample = Math.sin((index / sampleRate) * Math.PI * 2 * frequency) * amplitude;
    buffer.writeInt16LE(Math.round(sample * 0x7fff), 44 + index * 2);
  }

  return buffer;
}

function createGateTestWav() {
  const sampleRate = 44_100;
  const durationSeconds = 2;
  const frameCount = sampleRate * durationSeconds;
  const dataByteLength = frameCount * 2;
  const buffer = Buffer.alloc(44 + dataByteLength);

  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataByteLength, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataByteLength, 40);

  for (let index = 0; index < frameCount; index += 1) {
    const time = index / sampleRate;
    const amplitude = time < 1 ? 0.018 : 0.42;
    const frequency = time < 1 ? 310 : 620;
    const sample = Math.sin(time * Math.PI * 2 * frequency) * amplitude;
    buffer.writeInt16LE(Math.round(sample * 0x7fff), 44 + index * 2);
  }

  return buffer;
}

function createPulseToneWav(
  options: {frequency?: number; durationSeconds?: number; pulseSeconds?: number; amplitude?: number} = {},
) {
  const sampleRate = 44_100;
  const durationSeconds = options.durationSeconds ?? 1;
  const pulseSeconds = options.pulseSeconds ?? 0.08;
  const frequency = options.frequency ?? 440;
  const amplitude = options.amplitude ?? 0.45;
  const frameCount = Math.floor(sampleRate * durationSeconds);
  const dataByteLength = frameCount * 2;
  const buffer = Buffer.alloc(44 + dataByteLength);

  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataByteLength, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataByteLength, 40);

  for (let index = 0; index < frameCount; index += 1) {
    const time = index / sampleRate;
    const envelope = time <= pulseSeconds ? Math.sin((time / pulseSeconds) * Math.PI) : 0;
    const sample = Math.sin(time * Math.PI * 2 * frequency) * amplitude * envelope;
    buffer.writeInt16LE(Math.round(sample * 0x7fff), 44 + index * 2);
  }

  return buffer;
}

async function readStoredAudioState(page: Page) {
  return page.evaluate(
    ({stateKey, databaseName}) =>
      new Promise<{sourceCount: number; sourceId: string | null; blobAvailable: boolean; error: string | null}>((resolve) => {
        const rawState = window.localStorage.getItem(stateKey);
        const sourceId = rawState ? JSON.parse(rawState)?.projects?.[0]?.audioSources?.[0]?.id ?? null : null;
        if (!sourceId) {
          resolve({sourceCount: 0, sourceId: null, blobAvailable: false, error: null});
          return;
        }

        const openRequest = window.indexedDB.open(databaseName);
        openRequest.onerror = () => {
          resolve({sourceCount: 1, sourceId, blobAvailable: false, error: 'open failed'});
        };
        openRequest.onsuccess = () => {
          const database = openRequest.result;
          const transaction = database.transaction('AudioSourceBlobs', 'readonly');
          const store = transaction.objectStore('AudioSourceBlobs');
          const getRequest = store.get(sourceId);
          getRequest.onerror = () => {
            database.close();
            resolve({sourceCount: 1, sourceId, blobAvailable: false, error: 'get failed'});
          };
          getRequest.onsuccess = () => {
            const storedRecord = getRequest.result as {blob?: Blob} | undefined;
            database.close();
            resolve({sourceCount: 1, sourceId, blobAvailable: Boolean(storedRecord?.blob), error: null});
          };
        };
      }),
    {stateKey: appStateKey, databaseName: audioSourceDatabaseName},
  );
}
