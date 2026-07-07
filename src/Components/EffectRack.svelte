<!-- / - Arinara Network © 2026 - / -->
<!-- This source code is the exclusive property of Arinara Network. -->
<!-- Unauthorized use, reproduction, distribution, or modification of this -->
<!-- code — in whole or in part — for any purpose whatsoever is strictly -->
<!-- prohibited without prior written consent from Arinara Network as the -->
<!-- sole legal owner of this codebase. -->
<script lang="ts">
  import {Power, SlidersHorizontal} from '@lucide/svelte';
  import {evaluateAutomationValue, getAutomationLane, getSortedKeyframes} from '../AutomationEngine';
  import {
    BITCRUSHER_PARAMETERS,
    CHORUS_PARAMETERS,
    COMPRESSOR_PARAMETERS,
    DELAY_PARAMETERS,
    FILTER_PARAMETERS,
    FLANGER_PARAMETERS,
    GATE_PARAMETERS,
    GRAPHIC_EQ_BANDS,
    GRAPHIC_EQ_DEFAULT_GAIN,
    GRAPHIC_EQ_GAIN_MAX,
    GRAPHIC_EQ_GAIN_MIN,
    LIMITER_PARAMETERS,
    OVERDRIVE_PARAMETERS,
    PHASER_PARAMETERS,
    RING_MODULATOR_PARAMETERS,
    SATURATION_PARAMETERS,
    TREMOLO_PARAMETERS,
    VIBRATO_PARAMETERS,
    type NumericEffectParameterDefinition,
  } from '../EffectParameters';
  import {getEffectAutomationParameterByEffectParameter} from '../EffectAutomationParameterRegistry';
  import type {Clip, EffectInstance, ProjectRecord, TrackRecord} from '../Types';

  type RackDevice = {
    type: EffectInstance['type'];
    name: string;
    shortName: string;
    macroLabel: string;
    parameterKey: string;
    defaultValue: number;
    min: number;
    max: number;
    step: number;
    unit: NumericEffectParameterDefinition['unit'];
  };

  export let project: ProjectRecord | null;
  export let selectedClip: Clip | null;
  export let selectedClipAutomationTime: number | null = null;
  export let playhead = 0;
  export let onUpdateTrackEffect: (
    trackId: string,
    effectType: EffectInstance['type'],
    patch: Partial<EffectInstance>,
  ) => void = () => undefined;
  export let onFocusTrackEffect: (trackId: string, effectType: EffectInstance['type']) => void = () => undefined;

  const eqMidBand = GRAPHIC_EQ_BANDS.find((band) => band.frequency === 1000) ?? GRAPHIC_EQ_BANDS[4];
  const rackDevices: RackDevice[] = [
    {
      type: 'eq',
      name: 'Graphic EQ',
      shortName: 'EQ',
      macroLabel: 'Mid',
      parameterKey: eqMidBand.parameterKey,
      defaultValue: GRAPHIC_EQ_DEFAULT_GAIN,
      min: GRAPHIC_EQ_GAIN_MIN,
      max: GRAPHIC_EQ_GAIN_MAX,
      step: 0.5,
      unit: 'dB',
    },
    {
      type: 'filter',
      name: 'Filter',
      shortName: 'Filter',
      macroLabel: 'HP',
      parameterKey: FILTER_PARAMETERS.highpassFrequency.key,
      defaultValue: FILTER_PARAMETERS.highpassFrequency.defaultValue,
      min: FILTER_PARAMETERS.highpassFrequency.min,
      max: FILTER_PARAMETERS.highpassFrequency.max,
      step: FILTER_PARAMETERS.highpassFrequency.step,
      unit: FILTER_PARAMETERS.highpassFrequency.unit,
    },
    {
      type: 'compressor',
      name: 'Compressor',
      shortName: 'Comp',
      macroLabel: 'Makeup',
      parameterKey: COMPRESSOR_PARAMETERS.makeup.key,
      defaultValue: COMPRESSOR_PARAMETERS.makeup.defaultValue,
      min: COMPRESSOR_PARAMETERS.makeup.min,
      max: COMPRESSOR_PARAMETERS.makeup.max,
      step: COMPRESSOR_PARAMETERS.makeup.step,
      unit: COMPRESSOR_PARAMETERS.makeup.unit,
    },
    {
      type: 'gate',
      name: 'Noise Gate',
      shortName: 'Gate',
      macroLabel: 'Cut',
      parameterKey: GATE_PARAMETERS.reduction.key,
      defaultValue: GATE_PARAMETERS.reduction.defaultValue,
      min: GATE_PARAMETERS.reduction.min,
      max: GATE_PARAMETERS.reduction.max,
      step: GATE_PARAMETERS.reduction.step,
      unit: GATE_PARAMETERS.reduction.unit,
    },
    {
      type: 'limiter',
      name: 'Limiter',
      shortName: 'Limit',
      macroLabel: 'Ceiling',
      parameterKey: LIMITER_PARAMETERS.ceiling.key,
      defaultValue: LIMITER_PARAMETERS.ceiling.defaultValue,
      min: LIMITER_PARAMETERS.ceiling.min,
      max: LIMITER_PARAMETERS.ceiling.max,
      step: LIMITER_PARAMETERS.ceiling.step,
      unit: LIMITER_PARAMETERS.ceiling.unit,
    },
    {
      type: 'saturation',
      name: 'Saturation',
      shortName: 'Sat',
      macroLabel: 'Drive',
      parameterKey: SATURATION_PARAMETERS.drive.key,
      defaultValue: SATURATION_PARAMETERS.drive.defaultValue,
      min: SATURATION_PARAMETERS.drive.min,
      max: SATURATION_PARAMETERS.drive.max,
      step: SATURATION_PARAMETERS.drive.step,
      unit: SATURATION_PARAMETERS.drive.unit,
    },
    {
      type: 'overdrive',
      name: 'Overdrive',
      shortName: 'Drive',
      macroLabel: 'Clip',
      parameterKey: OVERDRIVE_PARAMETERS.clip.key,
      defaultValue: OVERDRIVE_PARAMETERS.clip.defaultValue,
      min: OVERDRIVE_PARAMETERS.clip.min,
      max: OVERDRIVE_PARAMETERS.clip.max,
      step: OVERDRIVE_PARAMETERS.clip.step,
      unit: OVERDRIVE_PARAMETERS.clip.unit,
    },
    {
      type: 'bitcrusher',
      name: 'Bitcrusher',
      shortName: 'Bits',
      macroLabel: 'Bits',
      parameterKey: BITCRUSHER_PARAMETERS.bits.key,
      defaultValue: BITCRUSHER_PARAMETERS.bits.defaultValue,
      min: BITCRUSHER_PARAMETERS.bits.min,
      max: BITCRUSHER_PARAMETERS.bits.max,
      step: BITCRUSHER_PARAMETERS.bits.step,
      unit: BITCRUSHER_PARAMETERS.bits.unit,
    },
    {
      type: 'chorus',
      name: 'Chorus',
      shortName: 'Chorus',
      macroLabel: 'Mix',
      parameterKey: CHORUS_PARAMETERS.mix.key,
      defaultValue: CHORUS_PARAMETERS.mix.defaultValue,
      min: CHORUS_PARAMETERS.mix.min,
      max: CHORUS_PARAMETERS.mix.max,
      step: CHORUS_PARAMETERS.mix.step,
      unit: CHORUS_PARAMETERS.mix.unit,
    },
    {
      type: 'flanger',
      name: 'Flanger',
      shortName: 'Flange',
      macroLabel: 'Feed',
      parameterKey: FLANGER_PARAMETERS.feedback.key,
      defaultValue: FLANGER_PARAMETERS.feedback.defaultValue,
      min: FLANGER_PARAMETERS.feedback.min,
      max: FLANGER_PARAMETERS.feedback.max,
      step: FLANGER_PARAMETERS.feedback.step,
      unit: FLANGER_PARAMETERS.feedback.unit,
    },
    {
      type: 'phaser',
      name: 'Phaser',
      shortName: 'Phaser',
      macroLabel: 'Depth',
      parameterKey: PHASER_PARAMETERS.depth.key,
      defaultValue: PHASER_PARAMETERS.depth.defaultValue,
      min: PHASER_PARAMETERS.depth.min,
      max: PHASER_PARAMETERS.depth.max,
      step: PHASER_PARAMETERS.depth.step,
      unit: PHASER_PARAMETERS.depth.unit,
    },
    {
      type: 'tremolo',
      name: 'Tremolo/Auto-Pan',
      shortName: 'Trem',
      macroLabel: 'Depth',
      parameterKey: TREMOLO_PARAMETERS.depth.key,
      defaultValue: TREMOLO_PARAMETERS.depth.defaultValue,
      min: TREMOLO_PARAMETERS.depth.min,
      max: TREMOLO_PARAMETERS.depth.max,
      step: TREMOLO_PARAMETERS.depth.step,
      unit: TREMOLO_PARAMETERS.depth.unit,
    },
    {
      type: 'vibrato',
      name: 'Vibrato',
      shortName: 'Vib',
      macroLabel: 'Depth',
      parameterKey: VIBRATO_PARAMETERS.depth.key,
      defaultValue: VIBRATO_PARAMETERS.depth.defaultValue,
      min: VIBRATO_PARAMETERS.depth.min,
      max: VIBRATO_PARAMETERS.depth.max,
      step: VIBRATO_PARAMETERS.depth.step,
      unit: VIBRATO_PARAMETERS.depth.unit,
    },
    {
      type: 'ring',
      name: 'Ring Modulator',
      shortName: 'Ring',
      macroLabel: 'Depth',
      parameterKey: RING_MODULATOR_PARAMETERS.depth.key,
      defaultValue: RING_MODULATOR_PARAMETERS.depth.defaultValue,
      min: RING_MODULATOR_PARAMETERS.depth.min,
      max: RING_MODULATOR_PARAMETERS.depth.max,
      step: RING_MODULATOR_PARAMETERS.depth.step,
      unit: RING_MODULATOR_PARAMETERS.depth.unit,
    },
    {
      type: 'reverb',
      name: 'Cave Reverb',
      shortName: 'Reverb',
      macroLabel: 'Amount',
      parameterKey: 'amount',
      defaultValue: 0.35,
      min: 0,
      max: 1,
      step: 0.01,
      unit: 'percent',
    },
    {
      type: 'delay',
      name: 'Delay/Echo',
      shortName: 'Delay',
      macroLabel: 'Mix',
      parameterKey: DELAY_PARAMETERS.mix.key,
      defaultValue: DELAY_PARAMETERS.mix.defaultValue,
      min: DELAY_PARAMETERS.mix.min,
      max: DELAY_PARAMETERS.mix.max,
      step: DELAY_PARAMETERS.mix.step,
      unit: DELAY_PARAMETERS.mix.unit,
    },
  ];

  $: selectedTrack = getSelectedTrack(project, selectedClip);
  $: enabledCount = selectedTrack?.effects.filter((effect) => effect.enabled).length ?? 0;

  function getSelectedTrack(projectRecord: ProjectRecord | null, clip: Clip | null): TrackRecord | null {
    if (!projectRecord || !clip) {
      return null;
    }

    return projectRecord.tracks.find((track) => track.id === clip.trackId) ?? null;
  }

  function getEffect(track: TrackRecord | null, type: EffectInstance['type']) {
    return track?.effects.find((effect) => effect.type === type) ?? null;
  }

  function getParameterValue(effect: EffectInstance | null, device: RackDevice) {
    const parameter = getEffectAutomationParameterByEffectParameter(device.type, device.parameterKey);
    const lane = parameter && selectedTrack ? getAutomationLane(selectedTrack.automation, parameter.id) : null;
    const keyframes = getSortedKeyframes(lane);
    const activeKeyframe =
      selectedClipAutomationTime !== null
        ? keyframes.find((keyframe) => Math.abs(keyframe.time - selectedClipAutomationTime) <= 0.01) ?? null
        : null;
    const value = effect?.parameters[device.parameterKey];
    const baseValue = typeof value === 'number' && !Number.isNaN(value) ? value : device.defaultValue;
    const inspectedValue =
      activeKeyframe?.value ??
      (selectedClip && keyframes.length > 0 && playhead >= selectedClip.startTime && playhead <= selectedClip.startTime + selectedClip.duration
        ? evaluateAutomationValue(lane, baseValue, selectedClipAutomationTime ?? playhead)
        : baseValue);

    if (typeof inspectedValue !== 'number' || Number.isNaN(inspectedValue)) {
      return device.defaultValue;
    }

    return Math.max(device.min, Math.min(device.max, inspectedValue));
  }

  function formatSignedDb(value: number, fractionDigits = 0) {
    const normalizedValue = Object.is(value, -0) ? 0 : value;
    const sign = normalizedValue > 0 ? '+' : '';
    return `${sign}${normalizedValue.toFixed(fractionDigits)} dB`;
  }

  function formatMacroValue(value: number, device: RackDevice) {
    if (device.unit === 'dB') {
      return formatSignedDb(value, device.step < 1 && !Number.isInteger(value) ? 1 : 0);
    }

    if (device.unit === 'seconds') {
      return value < 0.1 ? `${Math.round(value * 1000)} ms` : `${Math.round(value * 100) / 100}s`;
    }

    if (device.unit === 'hertz') {
      return value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)} kHz` : `${Math.round(value)} Hz`;
    }

    if (device.unit === 'ratio') {
      return `${value.toFixed(value % 1 === 0 ? 0 : 1)}:1`;
    }

    if (device.unit === 'q') {
      return `Q ${value.toFixed(value >= 10 ? 0 : 1)}`;
    }

    if (device.unit === 'bits') {
      return `${Math.round(value)} bit`;
    }

    if (device.unit === 'samples') {
      return `${Math.round(value)} smp`;
    }

    return `${Math.round(value * 100)}%`;
  }

  function getDeviceSummary(track: TrackRecord | null, device: RackDevice) {
    const effect = getEffect(track, device.type);
    if (device.type === 'eq') {
      const changedBands = GRAPHIC_EQ_BANDS.filter((band) => {
        const bandDevice = {...device, parameterKey: band.parameterKey, defaultValue: GRAPHIC_EQ_DEFAULT_GAIN};
        return Math.abs(getParameterValue(effect, bandDevice)) >= 0.05;
      }).length;
      return changedBands === 0 ? 'Flat' : `${changedBands} changed`;
    }

    return formatMacroValue(getParameterValue(effect, device), device);
  }

  function updateDeviceMacro(track: TrackRecord, device: RackDevice, value: number) {
    onUpdateTrackEffect(track.id, device.type, {
      enabled: true,
      parameters: {[device.parameterKey]: value},
    });
  }

  function toggleDevice(track: TrackRecord, device: RackDevice) {
    const effect = getEffect(track, device.type);
    onUpdateTrackEffect(track.id, device.type, {enabled: !effect?.enabled});
  }
</script>

<section class="effect-rack" aria-label="Selected track effect rack">
  <div class="rack-head">
    <div>
      <span class="panel-label">Effect Rack</span>
      <strong>{selectedTrack?.name ?? 'No selected track'}</strong>
    </div>
    <em>{selectedTrack ? `${enabledCount}/${rackDevices.length} on` : 'Select a clip'}</em>
  </div>

  {#if selectedTrack}
    <div class="rack-strip">
      {#each rackDevices as device (device.type)}
        {@const effect = getEffect(selectedTrack, device.type)}
        {@const value = getParameterValue(effect, device)}
        <article class:enabled={Boolean(effect?.enabled)} class="rack-device">
          <div class="device-top">
            <button
              type="button"
              class:enabled={Boolean(effect?.enabled)}
              class="device-power"
              title={`${effect?.enabled ? 'Bypass' : 'Enable'} ${device.name}`}
              aria-label={`${device.name} enabled state`}
              aria-pressed={Boolean(effect?.enabled)}
              on:click={() => toggleDevice(selectedTrack, device)}
            >
              <Power class="icon-xs" />
            </button>
            <div>
              <strong>{device.shortName}</strong>
              <span>{getDeviceSummary(selectedTrack, device)}</span>
            </div>
            <button
              type="button"
              class="device-settings"
              title={`Open ${device.name} settings`}
              aria-label={`Open ${device.name} settings`}
              on:click={() => onFocusTrackEffect(selectedTrack.id, device.type)}
            >
              <SlidersHorizontal class="icon-xs" />
            </button>
          </div>

          <label class="rack-macro">
            <span>
              <em>{device.macroLabel}</em>
              <strong class="mono">{formatMacroValue(value, device)}</strong>
            </span>
            <input
              class="range-compact"
              type="range"
              min={device.min}
              max={device.max}
              step={device.step}
              value={value}
              aria-label={`Rack ${device.name} ${device.macroLabel}`}
              on:input={(event) => updateDeviceMacro(selectedTrack, device, Number(event.currentTarget.value))}
            />
          </label>
        </article>
      {/each}
    </div>
  {:else}
    <div class="rack-empty">
      <SlidersHorizontal class="icon-sm" />
      <span>Select a clip to show its track effects.</span>
    </div>
  {/if}
</section>

<style>
  .effect-rack {
    display: grid;
    grid-template-columns: 140px minmax(0, 1fr);
    gap: 8px;
    align-items: stretch;
    border-top: 1px solid #1d2025;
    background: #0b0c0f;
    padding: 6px 10px;
  }

  .rack-head {
    display: flex;
    min-width: 0;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
    border-right: 1px solid #1d2025;
    padding-right: 10px;
  }

  .rack-head div {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 4px;
  }

  .rack-head strong {
    overflow: hidden;
    color: #f4f4f5;
    font-size: 12px;
    font-weight: 850;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .rack-head em {
    color: #71717a;
    font-size: 10px;
    font-style: normal;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .rack-strip {
    display: flex;
    min-width: 0;
    gap: 7px;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0 2px 5px 0;
    scrollbar-color: #3a3f49 transparent;
    scrollbar-width: thin;
  }

  .rack-strip::-webkit-scrollbar {
    height: 6px;
  }

  .rack-strip::-webkit-scrollbar-track {
    background: transparent;
  }

  .rack-strip::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: #303540;
  }

  .rack-device {
    flex: 0 0 118px;
    min-width: 0;
    border: 1px solid #1e2127;
    border-radius: 7px;
    background: #111318;
    padding: 6px;
    transition: border-color 140ms ease, background-color 140ms ease;
  }

  .rack-device.enabled {
    border-color: rgba(255, 255, 255, 0.3);
    background: #151820;
  }

  .device-top {
    display: grid;
    min-width: 0;
    grid-template-columns: 20px minmax(0, 1fr) 20px;
    gap: 5px;
    align-items: center;
    margin-bottom: 5px;
  }

  .device-top div {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 2px;
  }

  .device-top strong {
    overflow: hidden;
    color: #f4f4f5;
    font-size: 10px;
    font-weight: 900;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .device-top span {
    overflow: hidden;
    color: #8b8f98;
    font-size: 9px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .device-power {
    display: grid;
    width: 20px;
    height: 20px;
    place-items: center;
    border: 1px solid #252932;
    border-radius: 999px;
    background: #0c0e12;
    color: #737780;
    cursor: pointer;
  }

  .device-power.enabled {
    border-color: rgba(34, 197, 94, 0.55);
    color: #22c55e;
  }

  .device-power:hover {
    border-color: #3a3f49;
    color: #ffffff;
  }

  .device-settings {
    display: grid;
    width: 20px;
    height: 20px;
    place-items: center;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: #8b8f98;
    cursor: pointer;
  }

  .device-settings:hover {
    border-color: #303540;
    background: #171a20;
    color: #ffffff;
  }

  .rack-macro {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 4px;
  }

  .rack-macro span {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .rack-macro em {
    overflow: hidden;
    color: #a1a1aa;
    font-size: 9px;
    font-style: normal;
    font-weight: 750;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .rack-macro strong {
    color: #ffffff;
    font-size: 9px;
    font-weight: 800;
    white-space: nowrap;
  }

  .rack-empty {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 8px;
    border: 1px dashed #262a32;
    border-radius: 8px;
    color: #71717a;
    padding: 12px;
    font-size: 12px;
    font-weight: 750;
  }

  @media (max-width: 1240px) {
    .effect-rack {
      grid-template-columns: 118px minmax(0, 1fr);
      padding-inline: 10px;
    }

    .rack-strip {
      gap: 6px;
    }

    .rack-device {
      flex-basis: 108px;
      padding: 6px;
    }
  }
</style>
