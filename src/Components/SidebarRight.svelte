<!-- / - Arinara Network © 2026 - / -->
<!-- This source code is the exclusive property of Arinara Network. -->
<!-- Unauthorized use, reproduction, distribution, or modification of this -->
<!-- code — in whole or in part — for any purpose whatsoever is strictly -->
<!-- prohibited without prior written consent from Arinara Network as the -->
<!-- sole legal owner of this codebase. -->
<script lang="ts">
  import {tick} from 'svelte';
  import {ChevronLeft, ChevronRight, Diamond, FileAudio, Folder, HelpCircle, SkipBack, SkipForward, Split, StepBack, StepForward, Trash2, Volume2} from '@lucide/svelte';
  import {
    evaluateAutomationValue,
    getAutomationLane,
    getSortedKeyframes,
  } from '../AutomationEngine';
  import {
    CLIP_AUTOMATION_PARAMETERS,
    getClipAutomationParameterValue,
    type ClipAutomationParameterDefinition,
    type ClipAutomationParameterId,
  } from '../AutomationParameterRegistry';
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
  import {
    EFFECT_AUTOMATION_PARAMETERS,
    getEffectAutomationParameterValue,
    type EffectAutomationParameterDefinition,
  } from '../EffectAutomationParameterRegistry';
  import type {AutomationKeyframe, Clip, EffectInstance, ProjectRecord, Track} from '../Types';

  export let project: ProjectRecord | null;
  export let selectedClip: Clip | null;
  export let selectedGainKeyframeId: string | null;
  export let selectedPitchKeyframeId: string | null;
  export let selectedClipAutomationTime: number | null;
  export let playhead: number;
  export let hasPlayableAudio: boolean;
  export let isCollapsed = false;
  export let focusedEffectRequest: {id: number; effectType: EffectInstance['type']} | null = null;
  export let onChangeClipProperty: (id: string, property: keyof Clip, value: Clip[keyof Clip]) => void = () => undefined;
  export let onSplitSelectedClip: () => void = () => undefined;
  export let onDeleteSelectedClip: () => void = () => undefined;
  export let onTrimSelectedClipStart: () => void = () => undefined;
  export let onTrimSelectedClipEnd: () => void = () => undefined;
  export let onAddClipCompoundKeyframe: () => void = () => undefined;
  export let onDeleteClipCompoundKeyframe: () => void = () => undefined;
  export let onGoToPreviousClipCompoundKeyframe: () => void = () => undefined;
  export let onGoToNextClipCompoundKeyframe: () => void = () => undefined;
  export let onUpdateClipCompoundKeyframeTime: (time: number) => void = () => undefined;
  export let onUpdateClipCompoundKeyframeEasing: (easing: AutomationKeyframe['easing']) => void = () => undefined;
  export let onUpdateClipAutomationKeyframe: (
    parameterId: ClipAutomationParameterId,
    keyframeId: string,
    patch: Partial<Pick<AutomationKeyframe, 'time' | 'value' | 'easing' | 'bezier'>>,
  ) => void = () => undefined;
  export let onUpdateTrackEffect: (trackId: string, effectType: EffectInstance['type'], patch: Partial<EffectInstance>) => void = () =>
    undefined;
  export let onToggleCollapsed: () => void = () => undefined;

  type InspectorTab = 'edit' | 'effects' | 'inspector';
  type EffectPanelId = 'eq' | 'filter' | 'compressor' | 'gate' | 'limiter' | 'saturation' | 'overdrive' | 'bitcrusher' | 'chorus' | 'flanger' | 'phaser' | 'tremolo' | 'vibrato' | 'ring' | 'reverb' | 'delay';
  type EasingOption = Exclude<AutomationKeyframe['easing'], 'custom-bezier'>;
  interface ClipAutomationControlState {
    parameter: ClipAutomationParameterDefinition;
    keyframes: AutomationKeyframe[];
    activeKeyframe: AutomationKeyframe | null;
    automationActive: boolean;
    inspectedValue: number;
    sliderDisabled: boolean;
  }
  interface EffectAutomationControlState {
    parameter: EffectAutomationParameterDefinition;
    keyframes: AutomationKeyframe[];
    activeKeyframe: AutomationKeyframe | null;
    automationActive: boolean;
    inspectedValue: number;
    sliderDisabled: boolean;
  }
  interface CompoundParameterSummary {
    parameter: ClipAutomationParameterDefinition | EffectAutomationParameterDefinition;
    keyframe: AutomationKeyframe | null;
    value: number;
  }
  type CompoundAutomationControlState = ClipAutomationControlState | EffectAutomationControlState;

  let activeTab: InspectorTab = 'edit';
  let expandedEffectPanel: EffectPanelId | null = 'eq';
  let handledEffectFocusRequestId = 0;
  const tabs: InspectorTab[] = ['edit', 'effects', 'inspector'];
  const easingOptions: {value: EasingOption; label: string}[] = [
    {value: 'linear', label: 'Linear'},
    {value: 'hold', label: 'Hold'},
    {value: 'ease-in', label: 'Ease In'},
    {value: 'ease-out', label: 'Ease Out'},
    {value: 'ease-in-out', label: 'Ease In-Out'},
  ];
  const compressorControls = [
    {label: 'Threshold', parameter: COMPRESSOR_PARAMETERS.threshold},
    {label: 'Ratio', parameter: COMPRESSOR_PARAMETERS.ratio},
    {label: 'Attack', parameter: COMPRESSOR_PARAMETERS.attack},
    {label: 'Release', parameter: COMPRESSOR_PARAMETERS.release},
    {label: 'Knee', parameter: COMPRESSOR_PARAMETERS.knee},
    {label: 'Makeup', parameter: COMPRESSOR_PARAMETERS.makeup},
    {label: 'Mix', parameter: COMPRESSOR_PARAMETERS.mix},
  ];
  const gateControls = [
    {label: 'Threshold', parameter: GATE_PARAMETERS.threshold},
    {label: 'Reduction', parameter: GATE_PARAMETERS.reduction},
    {label: 'Attack', parameter: GATE_PARAMETERS.attack},
    {label: 'Release', parameter: GATE_PARAMETERS.release},
    {label: 'Hold', parameter: GATE_PARAMETERS.hold},
    {label: 'Mix', parameter: GATE_PARAMETERS.mix},
  ];
  const limiterControls = [
    {label: 'Ceiling', parameter: LIMITER_PARAMETERS.ceiling},
    {label: 'Input', parameter: LIMITER_PARAMETERS.input},
    {label: 'Release', parameter: LIMITER_PARAMETERS.release},
    {label: 'Mix', parameter: LIMITER_PARAMETERS.mix},
  ];
  const saturationControls = [
    {label: 'Drive', parameter: SATURATION_PARAMETERS.drive},
    {label: 'Tone', parameter: SATURATION_PARAMETERS.tone},
    {label: 'Mix', parameter: SATURATION_PARAMETERS.mix},
    {label: 'Output', parameter: SATURATION_PARAMETERS.output},
  ];
  const overdriveControls = [
    {label: 'Drive', parameter: OVERDRIVE_PARAMETERS.drive},
    {label: 'Clip', parameter: OVERDRIVE_PARAMETERS.clip},
    {label: 'Tone', parameter: OVERDRIVE_PARAMETERS.tone},
    {label: 'Mix', parameter: OVERDRIVE_PARAMETERS.mix},
    {label: 'Output', parameter: OVERDRIVE_PARAMETERS.output},
  ];
  const bitcrusherControls = [
    {label: 'Bits', parameter: BITCRUSHER_PARAMETERS.bits},
    {label: 'Rate Reduction', parameter: BITCRUSHER_PARAMETERS.rateReduction},
    {label: 'Mix', parameter: BITCRUSHER_PARAMETERS.mix},
    {label: 'Output', parameter: BITCRUSHER_PARAMETERS.output},
  ];
  const chorusControls = [
    {label: 'Rate', parameter: CHORUS_PARAMETERS.rate},
    {label: 'Depth', parameter: CHORUS_PARAMETERS.depth},
    {label: 'Delay', parameter: CHORUS_PARAMETERS.delay},
    {label: 'Feedback', parameter: CHORUS_PARAMETERS.feedback},
    {label: 'Mix', parameter: CHORUS_PARAMETERS.mix},
  ];
  const flangerControls = [
    {label: 'Rate', parameter: FLANGER_PARAMETERS.rate},
    {label: 'Depth', parameter: FLANGER_PARAMETERS.depth},
    {label: 'Delay', parameter: FLANGER_PARAMETERS.delay},
    {label: 'Feedback', parameter: FLANGER_PARAMETERS.feedback},
    {label: 'Mix', parameter: FLANGER_PARAMETERS.mix},
  ];
  const phaserControls = [
    {label: 'Rate', parameter: PHASER_PARAMETERS.rate},
    {label: 'Depth', parameter: PHASER_PARAMETERS.depth},
    {label: 'Center', parameter: PHASER_PARAMETERS.center},
    {label: 'Feedback', parameter: PHASER_PARAMETERS.feedback},
    {label: 'Mix', parameter: PHASER_PARAMETERS.mix},
  ];
  const tremoloControls = [
    {label: 'Rate', parameter: TREMOLO_PARAMETERS.rate},
    {label: 'Depth', parameter: TREMOLO_PARAMETERS.depth},
    {label: 'Auto-pan', parameter: TREMOLO_PARAMETERS.pan},
    {label: 'Mix', parameter: TREMOLO_PARAMETERS.mix},
  ];
  const vibratoControls = [
    {label: 'Rate', parameter: VIBRATO_PARAMETERS.rate},
    {label: 'Depth', parameter: VIBRATO_PARAMETERS.depth},
    {label: 'Delay', parameter: VIBRATO_PARAMETERS.delay},
    {label: 'Mix', parameter: VIBRATO_PARAMETERS.mix},
    {label: 'Output', parameter: VIBRATO_PARAMETERS.output},
  ];
  const ringControls = [
    {label: 'Frequency', parameter: RING_MODULATOR_PARAMETERS.frequency},
    {label: 'Depth', parameter: RING_MODULATOR_PARAMETERS.depth},
    {label: 'Mix', parameter: RING_MODULATOR_PARAMETERS.mix},
    {label: 'Output', parameter: RING_MODULATOR_PARAMETERS.output},
  ];
  const delayControls = [
    {label: 'Time', parameter: DELAY_PARAMETERS.time},
    {label: 'Feedback', parameter: DELAY_PARAMETERS.feedback},
    {label: 'Mix', parameter: DELAY_PARAMETERS.mix},
    {label: 'Tone', parameter: DELAY_PARAMETERS.tone},
  ];
  const filterControls = [
    {label: 'High-pass', parameter: FILTER_PARAMETERS.highpassFrequency},
    {label: 'HP Q', parameter: FILTER_PARAMETERS.highpassQ},
    {label: 'Low-pass', parameter: FILTER_PARAMETERS.lowpassFrequency},
    {label: 'LP Q', parameter: FILTER_PARAMETERS.lowpassQ},
    {label: 'Notch Freq', parameter: FILTER_PARAMETERS.notchFrequency},
    {label: 'Notch Q', parameter: FILTER_PARAMETERS.notchQ},
    {label: 'Notch Cut', parameter: FILTER_PARAMETERS.notchDepth},
  ];

  $: selectedTrack = project?.tracks.find((track) => track.id === selectedClip?.trackId) ?? null;
  $: eqEffect = selectedTrack?.effects.find((effect) => effect.type === 'eq') ?? null;
  $: filterEffect = selectedTrack?.effects.find((effect) => effect.type === 'filter') ?? null;
  $: compressorEffect = selectedTrack?.effects.find((effect) => effect.type === 'compressor') ?? null;
  $: gateEffect = selectedTrack?.effects.find((effect) => effect.type === 'gate') ?? null;
  $: limiterEffect = selectedTrack?.effects.find((effect) => effect.type === 'limiter') ?? null;
  $: saturationEffect = selectedTrack?.effects.find((effect) => effect.type === 'saturation') ?? null;
  $: overdriveEffect = selectedTrack?.effects.find((effect) => effect.type === 'overdrive') ?? null;
  $: bitcrusherEffect = selectedTrack?.effects.find((effect) => effect.type === 'bitcrusher') ?? null;
  $: chorusEffect = selectedTrack?.effects.find((effect) => effect.type === 'chorus') ?? null;
  $: flangerEffect = selectedTrack?.effects.find((effect) => effect.type === 'flanger') ?? null;
  $: phaserEffect = selectedTrack?.effects.find((effect) => effect.type === 'phaser') ?? null;
  $: tremoloEffect = selectedTrack?.effects.find((effect) => effect.type === 'tremolo') ?? null;
  $: vibratoEffect = selectedTrack?.effects.find((effect) => effect.type === 'vibrato') ?? null;
  $: ringEffect = selectedTrack?.effects.find((effect) => effect.type === 'ring') ?? null;
  $: reverbEffect = selectedTrack?.effects.find((effect) => effect.type === 'reverb') ?? null;
  $: delayEffect = selectedTrack?.effects.find((effect) => effect.type === 'delay') ?? null;
  $: playheadInsideSelectedClip = selectedClip ? playhead >= selectedClip.startTime && playhead <= selectedClip.startTime + selectedClip.duration : false;
  $: clipAutomationStates = CLIP_AUTOMATION_PARAMETERS.map((parameter) =>
    createClipAutomationControlState(
      parameter,
      selectedClip,
      selectedClipAutomationTime,
      selectedGainKeyframeId,
      selectedPitchKeyframeId,
      playhead,
      playheadInsideSelectedClip,
    ),
  );
  $: effectAutomationStates = EFFECT_AUTOMATION_PARAMETERS.map((parameter) =>
    createEffectAutomationControlState(parameter, selectedTrack, selectedClipAutomationTime, playhead),
  );
  $: gainAutomationState = clipAutomationStates.find((state) => state.parameter.property === 'gain') ?? null;
  $: pitchAutomationState = clipAutomationStates.find((state) => state.parameter.property === 'pitch') ?? null;
  $: reverbAmountValue = effectKeyValue(reverbEffect, 'amount', 0.35);
  $: reverbSizeValue = effectKeyValue(reverbEffect, 'size', 2.8);
  $: compoundKeyframeTimes = getCompoundKeyframeTimes([...clipAutomationStates, ...effectAutomationStates]);
  $: compoundParameterSummaries = getCompoundParameterSummaries(
    [...clipAutomationStates, ...effectAutomationStates],
    selectedClipAutomationTime,
  );
  $: activeCompoundParameterCount = compoundParameterSummaries.filter((summary) => summary.keyframe).length;
  $: activeCompoundEasing = getActiveCompoundEasing(compoundParameterSummaries);
  $: if (focusedEffectRequest && focusedEffectRequest.id !== handledEffectFocusRequestId) {
    handledEffectFocusRequestId = focusedEffectRequest.id;
    activeTab = 'effects';
    if (isEffectPanelId(focusedEffectRequest.effectType)) {
      expandedEffectPanel = focusedEffectRequest.effectType;
      void scrollEffectPanelIntoView(focusedEffectRequest.effectType);
    }
  }

  function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const cents = Math.floor((seconds % 1) * 100);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${cents.toString().padStart(2, '0')}`;
  }

  function panToValue(pan: string) {
    if (pan === 'C') {
      return 0;
    }

    if (pan.startsWith('L')) {
      return -Number(pan.slice(1));
    }

    return Number(pan.slice(1));
  }

  function valueToPan(value: number) {
    if (value < 0) {
      return `L${Math.abs(value)}`;
    }

    if (value > 0) {
      return `R${value}`;
    }

    return 'C';
  }

  function sampleRateLabel() {
    if (!project) {
      return '--';
    }

    return project.settings.sampleRate === 44100 ? '44.1 kHz' : '48.0 kHz';
  }

  function effectNumber(effect: EffectInstance | null, key: string, fallback: number) {
    const value = effect?.parameters[key];
    return typeof value === 'number' ? value : fallback;
  }

  function getEffectAutomationState(effectType: EffectInstance['type'], parameterKey: string) {
    return (
      effectAutomationStates.find(
        (state) => state.parameter.effectType === effectType && state.parameter.parameterKey === parameterKey,
      ) ?? null
    );
  }

  function effectKeyValue(effect: EffectInstance | null, key: string, fallback: number) {
    const automationState = effect ? getEffectAutomationState(effect.type, key) : null;
    return automationState?.inspectedValue ?? effectNumber(effect, key, fallback);
  }

  function formatSignedDb(value: number, fractionDigits = 0) {
    const normalizedValue = Object.is(value, -0) ? 0 : value;
    const sign = normalizedValue > 0 ? '+' : '';
    return `${sign}${normalizedValue.toFixed(fractionDigits)} dB`;
  }

  function effectParameterValue(effect: EffectInstance | null, definition: NumericEffectParameterDefinition) {
    return effectKeyValue(effect, definition.key, definition.defaultValue);
  }

  function formatEffectParameterValue(value: number, definition: NumericEffectParameterDefinition) {
    if (definition.unit === 'dB') {
      return formatSignedDb(value, definition.step < 1 && !Number.isInteger(value) ? 1 : 0);
    }

    if (definition.unit === 'ratio') {
      return `${value.toFixed(value % 1 === 0 ? 0 : 1)}:1`;
    }

    if (definition.unit === 'seconds') {
      return value < 0.1 ? `${Math.round(value * 1000)} ms` : `${Math.round(value * 100) / 100}s`;
    }

    if (definition.unit === 'hertz') {
      return value >= 1000 ? `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)} kHz` : `${Math.round(value)} Hz`;
    }

    if (definition.unit === 'q') {
      return `Q ${value.toFixed(value >= 10 ? 0 : 1)}`;
    }

    if (definition.unit === 'bits') {
      return `${Math.round(value)} bit`;
    }

    if (definition.unit === 'samples') {
      return `${Math.round(value)} samples`;
    }

    return `${Math.round(value * 100)}%`;
  }

  function toggleEffectPanel(panel: EffectPanelId) {
    expandedEffectPanel = expandedEffectPanel === panel ? null : panel;
  }

  function isEffectPanelId(effectType: EffectInstance['type']): effectType is EffectPanelId {
    return (
      effectType === 'eq' ||
      effectType === 'filter' ||
      effectType === 'compressor' ||
      effectType === 'gate' ||
      effectType === 'limiter' ||
      effectType === 'saturation' ||
      effectType === 'overdrive' ||
      effectType === 'bitcrusher' ||
      effectType === 'chorus' ||
      effectType === 'flanger' ||
      effectType === 'phaser' ||
      effectType === 'tremolo' ||
      effectType === 'vibrato' ||
      effectType === 'ring' ||
      effectType === 'reverb' ||
      effectType === 'delay'
    );
  }

  async function scrollEffectPanelIntoView(panel: EffectPanelId) {
    await tick();
    document.getElementById(`effect-panel-${panel}`)?.scrollIntoView({block: 'nearest', inline: 'nearest'});
  }

  function effectPanelTitle(panel: EffectPanelId) {
    return `${expandedEffectPanel === panel ? 'Collapse' : 'Expand'} ${effectPanelLabel(panel)} controls`;
  }

  function effectPanelLabel(panel: EffectPanelId) {
    if (panel === 'eq') {
      return 'Graphic EQ';
    }

    if (panel === 'filter') {
      return 'Filter';
    }

    if (panel === 'gate') {
      return 'Noise Gate';
    }

    if (panel === 'reverb') {
      return 'Cave Reverb';
    }

    if (panel === 'delay') {
      return 'Delay/Echo';
    }

    if (panel === 'saturation') {
      return 'Saturation';
    }

    if (panel === 'overdrive') {
      return 'Overdrive';
    }

    if (panel === 'bitcrusher') {
      return 'Bitcrusher';
    }

    if (panel === 'chorus') {
      return 'Chorus';
    }

    if (panel === 'flanger') {
      return 'Flanger';
    }

    if (panel === 'phaser') {
      return 'Phaser';
    }

    if (panel === 'tremolo') {
      return 'Tremolo/Auto-Pan';
    }

    if (panel === 'vibrato') {
      return 'Vibrato';
    }

    if (panel === 'ring') {
      return 'Ring Modulator';
    }

    return panel.charAt(0).toUpperCase() + panel.slice(1);
  }

  function eqSummary(effect: EffectInstance | null) {
    const activeBands = GRAPHIC_EQ_BANDS.filter(
      (band) => Math.abs(effectKeyValue(effect, band.parameterKey, GRAPHIC_EQ_DEFAULT_GAIN)) >= 0.05,
    );

    if (activeBands.length === 0) {
      return '9 bands flat';
    }

    return `${activeBands.length} band${activeBands.length === 1 ? '' : 's'} changed`;
  }

  function compressorSummary(effect: EffectInstance | null) {
    const threshold = effectParameterValue(effect, COMPRESSOR_PARAMETERS.threshold);
    const ratio = effectParameterValue(effect, COMPRESSOR_PARAMETERS.ratio);
    const makeup = effectParameterValue(effect, COMPRESSOR_PARAMETERS.makeup);
    return `${threshold.toFixed(0)} dB · ${ratio.toFixed(ratio % 1 === 0 ? 0 : 1)}:1 · ${formatSignedDb(makeup)}`;
  }

  function filterSummary(effect: EffectInstance | null) {
    const highpass = effectParameterValue(effect, FILTER_PARAMETERS.highpassFrequency);
    const lowpass = effectParameterValue(effect, FILTER_PARAMETERS.lowpassFrequency);
    const notchDepth = effectParameterValue(effect, FILTER_PARAMETERS.notchDepth);
    return `HP ${formatEffectParameterValue(highpass, FILTER_PARAMETERS.highpassFrequency)} / LP ${formatEffectParameterValue(lowpass, FILTER_PARAMETERS.lowpassFrequency)} / ${formatSignedDb(notchDepth)} notch`;
  }

  function gateSummary(effect: EffectInstance | null) {
    const threshold = effectParameterValue(effect, GATE_PARAMETERS.threshold);
    const reduction = effectParameterValue(effect, GATE_PARAMETERS.reduction);
    const mix = effectParameterValue(effect, GATE_PARAMETERS.mix);
    return `${threshold.toFixed(0)} dB th · ${formatSignedDb(reduction)} cut · ${Math.round(mix * 100)}% mix`;
  }

  function limiterSummary(effect: EffectInstance | null) {
    const ceiling = effectParameterValue(effect, LIMITER_PARAMETERS.ceiling);
    const input = effectParameterValue(effect, LIMITER_PARAMETERS.input);
    return `${formatSignedDb(ceiling)} ceil · ${formatSignedDb(input)} in`;
  }

  function saturationSummary(effect: EffectInstance | null) {
    const drive = effectParameterValue(effect, SATURATION_PARAMETERS.drive);
    const mix = effectParameterValue(effect, SATURATION_PARAMETERS.mix);
    const output = effectParameterValue(effect, SATURATION_PARAMETERS.output);
    return `${formatSignedDb(drive)} drive · ${Math.round(mix * 100)}% mix · ${formatSignedDb(output)} out`;
  }

  function overdriveSummary(effect: EffectInstance | null) {
    const drive = effectParameterValue(effect, OVERDRIVE_PARAMETERS.drive);
    const clip = effectParameterValue(effect, OVERDRIVE_PARAMETERS.clip);
    const mix = effectParameterValue(effect, OVERDRIVE_PARAMETERS.mix);
    const output = effectParameterValue(effect, OVERDRIVE_PARAMETERS.output);
    return `${formatSignedDb(drive)} drive - ${Math.round(clip * 100)}% clip - ${Math.round(mix * 100)}% mix - ${formatSignedDb(output)} out`;
  }

  function bitcrusherSummary(effect: EffectInstance | null) {
    const bits = effectParameterValue(effect, BITCRUSHER_PARAMETERS.bits);
    const rateReduction = effectParameterValue(effect, BITCRUSHER_PARAMETERS.rateReduction);
    const mix = effectParameterValue(effect, BITCRUSHER_PARAMETERS.mix);
    const output = effectParameterValue(effect, BITCRUSHER_PARAMETERS.output);
    return `${Math.round(bits)} bit - ${Math.round(rateReduction)} sample hold - ${Math.round(mix * 100)}% mix - ${formatSignedDb(output)} out`;
  }

  function chorusSummary(effect: EffectInstance | null) {
    const rate = effectParameterValue(effect, CHORUS_PARAMETERS.rate);
    const depth = effectParameterValue(effect, CHORUS_PARAMETERS.depth);
    const mix = effectParameterValue(effect, CHORUS_PARAMETERS.mix);
    return `${formatEffectParameterValue(rate, CHORUS_PARAMETERS.rate)} - ${formatEffectParameterValue(depth, CHORUS_PARAMETERS.depth)} depth - ${Math.round(mix * 100)}% mix`;
  }

  function flangerSummary(effect: EffectInstance | null) {
    const rate = effectParameterValue(effect, FLANGER_PARAMETERS.rate);
    const depth = effectParameterValue(effect, FLANGER_PARAMETERS.depth);
    const feedback = effectParameterValue(effect, FLANGER_PARAMETERS.feedback);
    return `${formatEffectParameterValue(rate, FLANGER_PARAMETERS.rate)} - ${formatEffectParameterValue(depth, FLANGER_PARAMETERS.depth)} sweep - ${Math.round(feedback * 100)}% fb`;
  }

  function phaserSummary(effect: EffectInstance | null) {
    const rate = effectParameterValue(effect, PHASER_PARAMETERS.rate);
    const center = effectParameterValue(effect, PHASER_PARAMETERS.center);
    const feedback = effectParameterValue(effect, PHASER_PARAMETERS.feedback);
    return `${formatEffectParameterValue(rate, PHASER_PARAMETERS.rate)} - ${formatEffectParameterValue(center, PHASER_PARAMETERS.center)} center - ${Math.round(feedback * 100)}% fb`;
  }

  function tremoloSummary(effect: EffectInstance | null) {
    const rate = effectParameterValue(effect, TREMOLO_PARAMETERS.rate);
    const depth = effectParameterValue(effect, TREMOLO_PARAMETERS.depth);
    const pan = effectParameterValue(effect, TREMOLO_PARAMETERS.pan);
    return `${formatEffectParameterValue(rate, TREMOLO_PARAMETERS.rate)} · ${Math.round(depth * 100)}% depth · ${Math.round(pan * 100)}% pan`;
  }

  function vibratoSummary(effect: EffectInstance | null) {
    const rate = effectParameterValue(effect, VIBRATO_PARAMETERS.rate);
    const depth = effectParameterValue(effect, VIBRATO_PARAMETERS.depth);
    const mix = effectParameterValue(effect, VIBRATO_PARAMETERS.mix);
    const output = effectParameterValue(effect, VIBRATO_PARAMETERS.output);
    return `${formatEffectParameterValue(rate, VIBRATO_PARAMETERS.rate)} - ${formatEffectParameterValue(depth, VIBRATO_PARAMETERS.depth)} depth - ${Math.round(mix * 100)}% mix - ${formatSignedDb(output)} out`;
  }

  function ringSummary(effect: EffectInstance | null) {
    const frequency = effectParameterValue(effect, RING_MODULATOR_PARAMETERS.frequency);
    const depth = effectParameterValue(effect, RING_MODULATOR_PARAMETERS.depth);
    const output = effectParameterValue(effect, RING_MODULATOR_PARAMETERS.output);
    return `${formatEffectParameterValue(frequency, RING_MODULATOR_PARAMETERS.frequency)} carrier - ${Math.round(depth * 100)}% depth - ${formatSignedDb(output)} out`;
  }

  function reverbSummary(effect: EffectInstance | null) {
    const amount = Math.round(effectKeyValue(effect, 'amount', 0.35) * 100);
    const size = effectKeyValue(effect, 'size', 2.8).toFixed(1);
    return `${amount}% · ${size}s`;
  }

  function delaySummary(effect: EffectInstance | null) {
    const time = effectParameterValue(effect, DELAY_PARAMETERS.time);
    const feedback = effectParameterValue(effect, DELAY_PARAMETERS.feedback);
    const mix = effectParameterValue(effect, DELAY_PARAMETERS.mix);
    return `${formatEffectParameterValue(time, DELAY_PARAMETERS.time)} · ${Math.round(feedback * 100)}% fb · ${Math.round(mix * 100)}% mix`;
  }

  function isPresetEasing(easing: AutomationKeyframe['easing']): easing is EasingOption {
    return easing !== 'custom-bezier';
  }

  function createClipAutomationControlState(
    parameter: ClipAutomationParameterDefinition,
    clip: Clip | null,
    automationTime: number | null,
    gainKeyframeId: string | null,
    pitchKeyframeId: string | null,
    currentPlayhead: number,
    isPlayheadInsideClip: boolean,
  ): ClipAutomationControlState {
    const lane = clip ? getAutomationLane(clip.automation, parameter.id) : null;
    const keyframes = getSortedKeyframes(lane);
    const legacySelectedKeyframeId = parameter.property === 'pitch' ? pitchKeyframeId : gainKeyframeId;
    const activeKeyframe =
      (automationTime !== null
        ? keyframes.find((keyframe) => Math.abs(keyframe.time - automationTime) <= 0.01)
        : null) ??
      keyframes.find((keyframe) => keyframe.id === legacySelectedKeyframeId) ??
      null;
    const automationActive = keyframes.length > 0;
    const baseValue = clip ? getClipAutomationParameterValue(clip, parameter) : 0;
    const inspectedTime = automationTime ?? currentPlayhead;
    const inspectedValue =
      activeKeyframe?.value ??
      (clip && (automationTime !== null || (automationActive && isPlayheadInsideClip))
        ? evaluateAutomationValue(lane, baseValue, inspectedTime)
        : baseValue);

    return {
      parameter,
      keyframes,
      activeKeyframe,
      automationActive,
      inspectedValue,
      sliderDisabled: Boolean(
        clip && automationActive && automationTime === null && !activeKeyframe && !isPlayheadInsideClip,
      ),
    };
  }

  function createEffectAutomationControlState(
    parameter: EffectAutomationParameterDefinition,
    track: Track | null,
    automationTime: number | null,
    currentPlayhead: number,
  ): EffectAutomationControlState {
    const effect = track?.effects.find((item) => item.type === parameter.effectType) ?? null;
    const lane = track ? getAutomationLane(track.automation, parameter.id) : null;
    const keyframes = getSortedKeyframes(lane);
    const activeKeyframe =
      automationTime !== null ? keyframes.find((keyframe) => Math.abs(keyframe.time - automationTime) <= 0.01) ?? null : null;
    const automationActive = keyframes.length > 0;
    const baseValue = getEffectAutomationParameterValue(effect, parameter);
    const inspectedTime = automationTime ?? currentPlayhead;
    const inspectedValue =
      activeKeyframe?.value ??
      (track && (automationTime !== null || automationActive)
        ? evaluateAutomationValue(lane, baseValue, inspectedTime)
        : baseValue);

    return {
      parameter,
      keyframes,
      activeKeyframe,
      automationActive,
      inspectedValue,
      sliderDisabled: false,
    };
  }

  function getCompoundKeyframeTimes(states: CompoundAutomationControlState[]) {
    const times = new Map<string, number>();
    states.forEach((state) => {
      state.keyframes.forEach((keyframe) => {
        times.set(keyframe.time.toFixed(3), keyframe.time);
      });
    });

    return [...times.values()].sort((first, second) => first - second);
  }

  function getCompoundParameterSummaries(
    states: CompoundAutomationControlState[],
    automationTime: number | null,
  ): CompoundParameterSummary[] {
    if (automationTime === null) {
      return [];
    }

    return states.map((state) => {
      const keyframe =
        state.keyframes.find((item) => Math.abs(item.time - automationTime) <= 0.01) ?? null;
      return {
        parameter: state.parameter,
        keyframe,
        value: keyframe?.value ?? state.inspectedValue,
      };
    });
  }

  function getActiveCompoundEasing(summaries: CompoundParameterSummary[]): EasingOption {
    const easing = summaries.find((summary) => summary.keyframe)?.keyframe?.easing ?? 'linear';
    return isPresetEasing(easing) ? easing : 'ease-in-out';
  }
</script>

<aside id="sidebar-right" class:collapsed={isCollapsed} class="sidebar-right">
  <div class="tab-bar" role="tablist" aria-label="Inspector panels">
    <button
      type="button"
      class="collapse-toggle"
      title={isCollapsed ? 'Expand inspector' : 'Collapse inspector'}
      aria-label={isCollapsed ? 'Expand inspector' : 'Collapse inspector'}
      on:click={onToggleCollapsed}
    >
      {#if isCollapsed}
        <ChevronLeft class="icon-sm" />
      {:else}
        <ChevronRight class="icon-sm" />
      {/if}
    </button>
    {#each tabs as tab (tab)}
      <button
        type="button"
        class:rail-tab={isCollapsed}
        class:active={activeTab === tab}
        role="tab"
        aria-selected={activeTab === tab}
        title={tab}
        on:click={() => {
          activeTab = tab;
        }}
      >
        {isCollapsed ? tab.slice(0, 1) : tab}
        {#if activeTab === tab}
          <span></span>
        {/if}
      </button>
    {/each}
  </div>

  {#if !isCollapsed}
  <div class="inspector-content">
    {#if activeTab === 'edit'}
      {#if selectedClip}
        <section class="panel-stack">
          <span class="panel-label">Clip</span>
          <div class="clip-name-field">
            <div class="clip-name-input">
              <Volume2 class="icon-xs" />
              <input
                type="text"
                value={selectedClip.name}
                aria-label="Clip name"
                on:input={(event) => onChangeClipProperty(selectedClip.id, 'name', event.currentTarget.value)}
              />
            </div>
            <Folder class="icon-xs folder-icon" />
          </div>
        </section>

        <section class="panel-stack">
          <span class="panel-label">Time</span>
          <div class="time-grid">
            <div>
              <span>Start</span>
              <strong class="mono">{formatTime(selectedClip.startTime)}</strong>
            </div>
            <div>
              <span>End</span>
              <strong class="mono">{formatTime(selectedClip.startTime + selectedClip.duration)}</strong>
            </div>
            <div>
              <span>Length</span>
              <strong class="mono">{formatTime(selectedClip.duration)}</strong>
            </div>
          </div>
        </section>

        <section class="panel-stack">
          <span class="panel-label">Edit</span>
          <div class="clip-command-grid">
            <button type="button" title="Split at playhead" on:click={onSplitSelectedClip}>
              <Split class="icon-xs" />
              <span>Split</span>
            </button>
            <button type="button" title="Trim start to playhead" on:click={onTrimSelectedClipStart}>
              <StepBack class="icon-xs" />
              <span>Start</span>
            </button>
            <button type="button" title="Trim end to playhead" on:click={onTrimSelectedClipEnd}>
              <StepForward class="icon-xs" />
              <span>End</span>
            </button>
            <button type="button" title="Delete selected clip" on:click={onDeleteSelectedClip}>
              <Trash2 class="icon-xs" />
              <span>Delete</span>
            </button>
          </div>
        </section>

        <section class="panel-stack audio-controls">
          <span class="panel-label">Audio</span>

          {#if gainAutomationState}
            <label class="slider-control">
              <span>
                <em>
                  {gainAutomationState.parameter.label}
                  {#if selectedClipAutomationTime !== null}
                    <small>KF</small>
                  {:else if gainAutomationState.automationActive}
                    <small>AUTO</small>
                  {/if}
                </em>
                <strong class="mono">{gainAutomationState.parameter.formatValue(gainAutomationState.inspectedValue)}</strong>
              </span>
              <input
                class="range-compact"
                type="range"
                min={gainAutomationState.parameter.minimum}
                max={gainAutomationState.parameter.maximum}
                step={gainAutomationState.parameter.step}
                value={gainAutomationState.inspectedValue}
                disabled={gainAutomationState.sliderDisabled}
                title={gainAutomationState.sliderDisabled ? gainAutomationState.parameter.editOutsideClipMessage : gainAutomationState.parameter.label}
                aria-label={`${gainAutomationState.parameter.label} ${gainAutomationState.parameter.formatValue(gainAutomationState.inspectedValue)}`}
                on:input={(event) => {
                  const nextValue = Number(event.currentTarget.value);
                  if (gainAutomationState.activeKeyframe) {
                    onUpdateClipAutomationKeyframe(gainAutomationState.parameter.id, gainAutomationState.activeKeyframe.id, {value: nextValue});
                    return;
                  }

                  onChangeClipProperty(selectedClip.id, gainAutomationState.parameter.property, nextValue);
                }}
              />
            </label>
          {/if}

          <label class="slider-control">
            <span>
              <em>Pan</em>
              <strong class="mono">{selectedClip.pan}</strong>
            </span>
            <input
              class="range-compact"
              type="range"
              min="-50"
              max="50"
              value={panToValue(selectedClip.pan)}
              aria-label={`Pan ${selectedClip.pan}`}
              on:input={(event) => onChangeClipProperty(selectedClip.id, 'pan', valueToPan(Number(event.currentTarget.value)))}
            />
          </label>

          {#if pitchAutomationState}
            <label class="slider-control">
              <span>
                <em>
                  {pitchAutomationState.parameter.label}
                  {#if selectedClipAutomationTime !== null}
                    <small>KF</small>
                  {:else if pitchAutomationState.automationActive}
                    <small>AUTO</small>
                  {:else}
                    <small class="clip-scope">{pitchAutomationState.parameter.emptyScopeLabel}</small>
                  {/if}
                </em>
                <strong class="mono">{pitchAutomationState.parameter.formatValue(pitchAutomationState.inspectedValue)}</strong>
              </span>
              <input
                class="range-compact"
                type="range"
                min={pitchAutomationState.parameter.minimum}
                max={pitchAutomationState.parameter.maximum}
                step={pitchAutomationState.parameter.step}
                value={pitchAutomationState.inspectedValue}
                disabled={pitchAutomationState.sliderDisabled}
                title={pitchAutomationState.sliderDisabled ? pitchAutomationState.parameter.editOutsideClipMessage : 'Linked pitch'}
                aria-label={`${pitchAutomationState.parameter.label} ${pitchAutomationState.parameter.formatValue(pitchAutomationState.inspectedValue)}`}
                on:input={(event) => {
                  const nextValue = Number(event.currentTarget.value);
                  if (pitchAutomationState.activeKeyframe) {
                    onUpdateClipAutomationKeyframe(pitchAutomationState.parameter.id, pitchAutomationState.activeKeyframe.id, {value: nextValue});
                    return;
                  }

                  onChangeClipProperty(selectedClip.id, pitchAutomationState.parameter.property, nextValue);
                }}
              />
            </label>
          {/if}

          <label class="slider-control">
            <span>
              <em>Speed <small class="clip-scope">CLIP</small></em>
              <strong class="mono">{selectedClip.speed.toFixed(2)}x</strong>
            </span>
            <input
              class="range-compact"
              type="range"
              min="0.25"
              max="4"
              step="0.01"
              value={selectedClip.speed}
              title="Speed is clip-wide until speed keyframes are implemented"
              aria-label={`Speed ${selectedClip.speed.toFixed(2)}x`}
              on:input={(event) => onChangeClipProperty(selectedClip.id, 'speed', Number(event.currentTarget.value))}
            />
          </label>

          <label class="slider-control">
            <span>
              <em>Fade In</em>
              <strong class="mono">{selectedClip.fadeIn.toFixed(2)}s</strong>
            </span>
            <input
              class="range-compact"
              type="range"
              min="0"
              max={Math.max(0, selectedClip.duration / 2)}
              step="0.01"
              value={selectedClip.fadeIn}
              aria-label={`Fade In ${selectedClip.fadeIn.toFixed(2)}s`}
              on:input={(event) => onChangeClipProperty(selectedClip.id, 'fadeIn', Number(event.currentTarget.value))}
            />
          </label>

          <label class="slider-control">
            <span>
              <em>Fade Out</em>
              <strong class="mono">{selectedClip.fadeOut.toFixed(2)}s</strong>
            </span>
            <input
              class="range-compact"
              type="range"
              min="0"
              max={Math.max(0, selectedClip.duration / 2)}
              step="0.01"
              value={selectedClip.fadeOut}
              aria-label={`Fade Out ${selectedClip.fadeOut.toFixed(2)}s`}
              on:input={(event) => onChangeClipProperty(selectedClip.id, 'fadeOut', Number(event.currentTarget.value))}
            />
          </label>

          <div class="switch-row">
            <span>Reverse</span>
            <button
              type="button"
              class:enabled={selectedClip.isReversed}
              class="switch"
              aria-label="Reverse selected clip"
              aria-pressed={selectedClip.isReversed}
              on:click={() => onChangeClipProperty(selectedClip.id, 'isReversed', !selectedClip.isReversed)}
            >
              <i></i>
            </button>
          </div>
        </section>

        <section class="panel-stack">
          <span class="panel-label">Keyframe</span>
          <div class="keyframe-tools">
            <button type="button" title="Add clip keyframe" on:click={onAddClipCompoundKeyframe}>
              <Diamond class="icon-xs" />
              <span>Add</span>
            </button>
            <button type="button" title="Previous clip keyframe" on:click={onGoToPreviousClipCompoundKeyframe}>
              <SkipBack class="icon-xs" />
              <span>Prev</span>
            </button>
            <button type="button" title="Next clip keyframe" on:click={onGoToNextClipCompoundKeyframe}>
              <SkipForward class="icon-xs" />
              <span>Next</span>
            </button>
            <button type="button" title="Delete active clip keyframe" on:click={onDeleteClipCompoundKeyframe}>
              <Trash2 class="icon-xs" />
              <span>Del</span>
            </button>
          </div>

          {#if selectedClipAutomationTime !== null}
            <div class="keyframe-editor compact-keyframe-editor">
              <div class="keyframe-active-row">
                <span class="keyframe-active-dot compound"></span>
                <strong>{formatTime(selectedClipAutomationTime)}</strong>
                <em>{activeCompoundParameterCount} param</em>
              </div>

              <div class="compound-parameter-list">
                {#each compoundParameterSummaries as summary (summary.parameter.id)}
                  <div class:stored={Boolean(summary.keyframe)} class="compound-parameter-row">
                    <span>{summary.parameter.label}</span>
                    <strong>{summary.parameter.formatValue(summary.value)}</strong>
                  </div>
                {/each}
              </div>

              <div class="keyframe-editor-row single">
                <label>
                  <span>Time</span>
                  <input
                    class="keyframe-number"
                    type="number"
                    min={selectedClip.startTime}
                    max={selectedClip.startTime + selectedClip.duration}
                    step="0.01"
                    value={selectedClipAutomationTime.toFixed(2)}
                    on:change={(event) => onUpdateClipCompoundKeyframeTime(Number(event.currentTarget.value))}
                  />
                </label>
              </div>

              <label class="keyframe-easing">
                <span>Easing</span>
                <select
                  value={activeCompoundEasing}
                  on:change={(event) => onUpdateClipCompoundKeyframeEasing(event.currentTarget.value as EasingOption)}
                >
                  {#each easingOptions as option (option.value)}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
              </label>
            </div>
          {:else}
            <div class="keyframe-summary">
              <span>{compoundKeyframeTimes.length} KF</span>
            </div>
          {/if}
        </section>
      {:else}
        <div class="empty-state">
          <HelpCircle class="empty-icon" />
          <span>{project ? 'No clip selected' : 'No project loaded'}</span>
          <p>{project ? 'Clip parameters are unavailable.' : 'Project details are unavailable.'}</p>
        </div>
      {/if}
    {/if}

    {#if activeTab === 'effects'}
      <section class="panel-stack">
        <span class="panel-label">Effects</span>
        {#if selectedTrack}
          <div id="effect-panel-eq" class:enabled={Boolean(eqEffect?.enabled)} class:expanded={expandedEffectPanel === 'eq'} class="effect-card eq-card">
            <div class="effect-row">
              <div class="effect-title-cell">
                <button
                  type="button"
                  class:enabled={Boolean(eqEffect?.enabled)}
                  class="switch"
                  aria-label="Graphic EQ enabled state"
                  aria-pressed={Boolean(eqEffect?.enabled)}
                  on:click={() => onUpdateTrackEffect(selectedTrack.id, 'eq', {enabled: !eqEffect?.enabled})}
                >
                  <i></i>
                </button>
                <button
                  type="button"
                  class="effect-expand"
                  title={effectPanelTitle('eq')}
                  aria-label={effectPanelTitle('eq')}
                  aria-expanded={expandedEffectPanel === 'eq'}
                  on:click={() => toggleEffectPanel('eq')}
                >
                  <ChevronRight class={`icon-xs ${expandedEffectPanel === 'eq' ? 'expanded' : ''}`} />
                  <span>Graphic EQ</span>
                </button>
              </div>
              <strong>{eqEffect?.enabled ? 'On' : 'Bypass'}</strong>
            </div>

            <div class="effect-summary-row">
              <span>{eqSummary(eqEffect)}</span>
              <em>9 params</em>
            </div>

            {#if expandedEffectPanel === 'eq'}
            <div class="eq-band-grid" aria-label="Graphic EQ band gains">
              {#each GRAPHIC_EQ_BANDS as band (band.parameterKey)}
                {@const gainValue = effectKeyValue(eqEffect, band.parameterKey, GRAPHIC_EQ_DEFAULT_GAIN)}
                <label class="eq-band">
                  <span class="eq-value mono">{formatSignedDb(gainValue)}</span>
                  <input
                    class="eq-band-slider"
                    type="range"
                    min={GRAPHIC_EQ_GAIN_MIN}
                    max={GRAPHIC_EQ_GAIN_MAX}
                    step="0.5"
                    value={gainValue}
                    aria-label={`Graphic EQ ${band.label} gain`}
                    on:input={(event) =>
                      onUpdateTrackEffect(selectedTrack.id, 'eq', {
                        enabled: true,
                        parameters: {[band.parameterKey]: Number(event.currentTarget.value)},
                      })}
                  />
                  <span class="eq-frequency">{band.label}</span>
                </label>
              {/each}
            </div>
            {/if}
          </div>

          <div id="effect-panel-filter" class:enabled={Boolean(filterEffect?.enabled)} class:expanded={expandedEffectPanel === 'filter'} class="effect-card filter-card">
            <div class="effect-row">
              <div class="effect-title-cell">
                <button
                  type="button"
                  class:enabled={Boolean(filterEffect?.enabled)}
                  class="switch"
                  aria-label="Filter enabled state"
                  aria-pressed={Boolean(filterEffect?.enabled)}
                  on:click={() => onUpdateTrackEffect(selectedTrack.id, 'filter', {enabled: !filterEffect?.enabled})}
                >
                  <i></i>
                </button>
                <button
                  type="button"
                  class="effect-expand"
                  title={effectPanelTitle('filter')}
                  aria-label={effectPanelTitle('filter')}
                  aria-expanded={expandedEffectPanel === 'filter'}
                  on:click={() => toggleEffectPanel('filter')}
                >
                  <ChevronRight class={`icon-xs ${expandedEffectPanel === 'filter' ? 'expanded' : ''}`} />
                  <span>Filter</span>
                </button>
              </div>
              <strong>{filterEffect?.enabled ? 'On' : 'Bypass'}</strong>
            </div>

            <div class="effect-summary-row">
              <span>{filterSummary(filterEffect)}</span>
              <em>7 params</em>
            </div>

            {#if expandedEffectPanel === 'filter'}
            <div class="parameter-micro-grid">
              {#each filterControls as control (control.parameter.key)}
                {@const value = effectParameterValue(filterEffect, control.parameter)}
                <label class="parameter-micro-control">
                  <span>
                    <em>{control.label}</em>
                    <strong class="mono">{formatEffectParameterValue(value, control.parameter)}</strong>
                  </span>
                  <input
                    class="range-compact"
                    type="range"
                    min={control.parameter.min}
                    max={control.parameter.max}
                    step={control.parameter.step}
                    value={value}
                    aria-label={`Filter ${control.label}`}
                    on:input={(event) =>
                      onUpdateTrackEffect(selectedTrack.id, 'filter', {
                        enabled: true,
                        parameters: {[control.parameter.key]: Number(event.currentTarget.value)},
                      })}
                  />
                </label>
              {/each}
            </div>
            {/if}
          </div>

          <div id="effect-panel-compressor" class:enabled={Boolean(compressorEffect?.enabled)} class:expanded={expandedEffectPanel === 'compressor'} class="effect-card dynamics-card">
            <div class="effect-row">
              <div class="effect-title-cell">
                <button
                  type="button"
                  class:enabled={Boolean(compressorEffect?.enabled)}
                  class="switch"
                  aria-label="Compressor enabled state"
                  aria-pressed={Boolean(compressorEffect?.enabled)}
                  on:click={() => onUpdateTrackEffect(selectedTrack.id, 'compressor', {enabled: !compressorEffect?.enabled})}
                >
                  <i></i>
                </button>
                <button
                  type="button"
                  class="effect-expand"
                  title={effectPanelTitle('compressor')}
                  aria-label={effectPanelTitle('compressor')}
                  aria-expanded={expandedEffectPanel === 'compressor'}
                  on:click={() => toggleEffectPanel('compressor')}
                >
                  <ChevronRight class={`icon-xs ${expandedEffectPanel === 'compressor' ? 'expanded' : ''}`} />
                  <span>Compressor</span>
                </button>
              </div>
              <strong>{compressorEffect?.enabled ? 'On' : 'Bypass'}</strong>
            </div>

            <div class="effect-summary-row">
              <span>{compressorSummary(compressorEffect)}</span>
              <em>7 params</em>
            </div>

            {#if expandedEffectPanel === 'compressor'}
            <div class="parameter-micro-grid">
              {#each compressorControls as control (control.parameter.key)}
                {@const value = effectParameterValue(compressorEffect, control.parameter)}
                <label class:wide={control.parameter.key === COMPRESSOR_PARAMETERS.mix.key} class="parameter-micro-control">
                  <span>
                    <em>{control.label}</em>
                    <strong class="mono">{formatEffectParameterValue(value, control.parameter)}</strong>
                  </span>
                  <input
                    class="range-compact"
                    type="range"
                    min={control.parameter.min}
                    max={control.parameter.max}
                    step={control.parameter.step}
                    value={value}
                    aria-label={`Compressor ${control.label}`}
                    on:input={(event) =>
                      onUpdateTrackEffect(selectedTrack.id, 'compressor', {
                        enabled: true,
                        parameters: {[control.parameter.key]: Number(event.currentTarget.value)},
                      })}
                  />
                </label>
              {/each}
            </div>
            {/if}
          </div>

          <div id="effect-panel-gate" class:enabled={Boolean(gateEffect?.enabled)} class:expanded={expandedEffectPanel === 'gate'} class="effect-card dynamics-card gate-card">
            <div class="effect-row">
              <div class="effect-title-cell">
                <button
                  type="button"
                  class:enabled={Boolean(gateEffect?.enabled)}
                  class="switch"
                  aria-label="Noise Gate enabled state"
                  aria-pressed={Boolean(gateEffect?.enabled)}
                  on:click={() => onUpdateTrackEffect(selectedTrack.id, 'gate', {enabled: !gateEffect?.enabled})}
                >
                  <i></i>
                </button>
                <button
                  type="button"
                  class="effect-expand"
                  title={effectPanelTitle('gate')}
                  aria-label={effectPanelTitle('gate')}
                  aria-expanded={expandedEffectPanel === 'gate'}
                  on:click={() => toggleEffectPanel('gate')}
                >
                  <ChevronRight class={`icon-xs ${expandedEffectPanel === 'gate' ? 'expanded' : ''}`} />
                  <span>Noise Gate</span>
                </button>
              </div>
              <strong>{gateEffect?.enabled ? 'On' : 'Bypass'}</strong>
            </div>

            <div class="effect-summary-row">
              <span>{gateSummary(gateEffect)}</span>
              <em>6 params</em>
            </div>

            {#if expandedEffectPanel === 'gate'}
            <div class="parameter-micro-grid">
              {#each gateControls as control (control.parameter.key)}
                {@const value = effectParameterValue(gateEffect, control.parameter)}
                <label class:wide={control.parameter.key === GATE_PARAMETERS.mix.key} class="parameter-micro-control">
                  <span>
                    <em>{control.label}</em>
                    <strong class="mono">{formatEffectParameterValue(value, control.parameter)}</strong>
                  </span>
                  <input
                    class="range-compact"
                    type="range"
                    min={control.parameter.min}
                    max={control.parameter.max}
                    step={control.parameter.step}
                    value={value}
                    aria-label={`Noise Gate ${control.label}`}
                    on:input={(event) =>
                      onUpdateTrackEffect(selectedTrack.id, 'gate', {
                        enabled: true,
                        parameters: {[control.parameter.key]: Number(event.currentTarget.value)},
                      })}
                  />
                </label>
              {/each}
            </div>
            {/if}
          </div>

          <div id="effect-panel-limiter" class:enabled={Boolean(limiterEffect?.enabled)} class:expanded={expandedEffectPanel === 'limiter'} class="effect-card dynamics-card">
            <div class="effect-row">
              <div class="effect-title-cell">
                <button
                  type="button"
                  class:enabled={Boolean(limiterEffect?.enabled)}
                  class="switch"
                  aria-label="Limiter enabled state"
                  aria-pressed={Boolean(limiterEffect?.enabled)}
                  on:click={() => onUpdateTrackEffect(selectedTrack.id, 'limiter', {enabled: !limiterEffect?.enabled})}
                >
                  <i></i>
                </button>
                <button
                  type="button"
                  class="effect-expand"
                  title={effectPanelTitle('limiter')}
                  aria-label={effectPanelTitle('limiter')}
                  aria-expanded={expandedEffectPanel === 'limiter'}
                  on:click={() => toggleEffectPanel('limiter')}
                >
                  <ChevronRight class={`icon-xs ${expandedEffectPanel === 'limiter' ? 'expanded' : ''}`} />
                  <span>Limiter</span>
                </button>
              </div>
              <strong>{limiterEffect?.enabled ? 'On' : 'Bypass'}</strong>
            </div>

            <div class="effect-summary-row">
              <span>{limiterSummary(limiterEffect)}</span>
              <em>4 params</em>
            </div>

            {#if expandedEffectPanel === 'limiter'}
            <div class="parameter-micro-grid">
              {#each limiterControls as control (control.parameter.key)}
                {@const value = effectParameterValue(limiterEffect, control.parameter)}
                <label class="parameter-micro-control">
                  <span>
                    <em>{control.label}</em>
                    <strong class="mono">{formatEffectParameterValue(value, control.parameter)}</strong>
                  </span>
                  <input
                    class="range-compact"
                    type="range"
                    min={control.parameter.min}
                    max={control.parameter.max}
                    step={control.parameter.step}
                    value={value}
                    aria-label={`Limiter ${control.label}`}
                    on:input={(event) =>
                      onUpdateTrackEffect(selectedTrack.id, 'limiter', {
                        enabled: true,
                        parameters: {[control.parameter.key]: Number(event.currentTarget.value)},
                      })}
                  />
                </label>
              {/each}
            </div>
            {/if}
          </div>

          <div id="effect-panel-saturation" class:enabled={Boolean(saturationEffect?.enabled)} class:expanded={expandedEffectPanel === 'saturation'} class="effect-card saturation-card">
            <div class="effect-row">
              <div class="effect-title-cell">
                <button
                  type="button"
                  class:enabled={Boolean(saturationEffect?.enabled)}
                  class="switch"
                  aria-label="Saturation enabled state"
                  aria-pressed={Boolean(saturationEffect?.enabled)}
                  on:click={() => onUpdateTrackEffect(selectedTrack.id, 'saturation', {enabled: !saturationEffect?.enabled})}
                >
                  <i></i>
                </button>
                <button
                  type="button"
                  class="effect-expand"
                  title={effectPanelTitle('saturation')}
                  aria-label={effectPanelTitle('saturation')}
                  aria-expanded={expandedEffectPanel === 'saturation'}
                  on:click={() => toggleEffectPanel('saturation')}
                >
                  <ChevronRight class={`icon-xs ${expandedEffectPanel === 'saturation' ? 'expanded' : ''}`} />
                  <span>Saturation</span>
                </button>
              </div>
              <strong>{saturationEffect?.enabled ? 'On' : 'Bypass'}</strong>
            </div>

            <div class="effect-summary-row">
              <span>{saturationSummary(saturationEffect)}</span>
              <em>4 params</em>
            </div>

            {#if expandedEffectPanel === 'saturation'}
            <div class="parameter-micro-grid">
              {#each saturationControls as control (control.parameter.key)}
                {@const value = effectParameterValue(saturationEffect, control.parameter)}
                <label class="parameter-micro-control">
                  <span>
                    <em>{control.label}</em>
                    <strong class="mono">{formatEffectParameterValue(value, control.parameter)}</strong>
                  </span>
                  <input
                    class="range-compact"
                    type="range"
                    min={control.parameter.min}
                    max={control.parameter.max}
                    step={control.parameter.step}
                    value={value}
                    aria-label={`Saturation ${control.label}`}
                    on:input={(event) =>
                      onUpdateTrackEffect(selectedTrack.id, 'saturation', {
                        enabled: true,
                        parameters: {[control.parameter.key]: Number(event.currentTarget.value)},
                      })}
                  />
                </label>
              {/each}
            </div>
            {/if}
          </div>

          <div id="effect-panel-overdrive" class:enabled={Boolean(overdriveEffect?.enabled)} class:expanded={expandedEffectPanel === 'overdrive'} class="effect-card overdrive-card">
            <div class="effect-row">
              <div class="effect-title-cell">
                <button
                  type="button"
                  class:enabled={Boolean(overdriveEffect?.enabled)}
                  class="switch"
                  aria-label="Overdrive enabled state"
                  aria-pressed={Boolean(overdriveEffect?.enabled)}
                  on:click={() => onUpdateTrackEffect(selectedTrack.id, 'overdrive', {enabled: !overdriveEffect?.enabled})}
                >
                  <i></i>
                </button>
                <button
                  type="button"
                  class="effect-expand"
                  title={effectPanelTitle('overdrive')}
                  aria-label={effectPanelTitle('overdrive')}
                  aria-expanded={expandedEffectPanel === 'overdrive'}
                  on:click={() => toggleEffectPanel('overdrive')}
                >
                  <ChevronRight class={`icon-xs ${expandedEffectPanel === 'overdrive' ? 'expanded' : ''}`} />
                  <span>Overdrive</span>
                </button>
              </div>
              <strong>{overdriveEffect?.enabled ? 'On' : 'Bypass'}</strong>
            </div>

            <div class="effect-summary-row">
              <span>{overdriveSummary(overdriveEffect)}</span>
              <em>5 params</em>
            </div>

            {#if expandedEffectPanel === 'overdrive'}
            <div class="parameter-micro-grid">
              {#each overdriveControls as control (control.parameter.key)}
                {@const value = effectParameterValue(overdriveEffect, control.parameter)}
                <label class="parameter-micro-control">
                  <span>
                    <em>{control.label}</em>
                    <strong class="mono">{formatEffectParameterValue(value, control.parameter)}</strong>
                  </span>
                  <input
                    class="range-compact"
                    type="range"
                    min={control.parameter.min}
                    max={control.parameter.max}
                    step={control.parameter.step}
                    value={value}
                    aria-label={`Overdrive ${control.label}`}
                    on:input={(event) =>
                      onUpdateTrackEffect(selectedTrack.id, 'overdrive', {
                        enabled: true,
                        parameters: {[control.parameter.key]: Number(event.currentTarget.value)},
                      })}
                  />
                </label>
              {/each}
            </div>
            {/if}
          </div>

          <div id="effect-panel-bitcrusher" class:enabled={Boolean(bitcrusherEffect?.enabled)} class:expanded={expandedEffectPanel === 'bitcrusher'} class="effect-card bitcrusher-card">
            <div class="effect-row">
              <div class="effect-title-cell">
                <button
                  type="button"
                  class:enabled={Boolean(bitcrusherEffect?.enabled)}
                  class="switch"
                  aria-label="Bitcrusher enabled state"
                  aria-pressed={Boolean(bitcrusherEffect?.enabled)}
                  on:click={() => onUpdateTrackEffect(selectedTrack.id, 'bitcrusher', {enabled: !bitcrusherEffect?.enabled})}
                >
                  <i></i>
                </button>
                <button
                  type="button"
                  class="effect-expand"
                  title={effectPanelTitle('bitcrusher')}
                  aria-label={effectPanelTitle('bitcrusher')}
                  aria-expanded={expandedEffectPanel === 'bitcrusher'}
                  on:click={() => toggleEffectPanel('bitcrusher')}
                >
                  <ChevronRight class={`icon-xs ${expandedEffectPanel === 'bitcrusher' ? 'expanded' : ''}`} />
                  <span>Bitcrusher</span>
                </button>
              </div>
              <strong>{bitcrusherEffect?.enabled ? 'On' : 'Bypass'}</strong>
            </div>

            <div class="effect-summary-row">
              <span>{bitcrusherSummary(bitcrusherEffect)}</span>
              <em>4 params</em>
            </div>

            {#if expandedEffectPanel === 'bitcrusher'}
            <div class="parameter-micro-grid">
              {#each bitcrusherControls as control (control.parameter.key)}
                {@const value = effectParameterValue(bitcrusherEffect, control.parameter)}
                <label class="parameter-micro-control">
                  <span>
                    <em>{control.label}</em>
                    <strong class="mono">{formatEffectParameterValue(value, control.parameter)}</strong>
                  </span>
                  <input
                    class="range-compact"
                    type="range"
                    min={control.parameter.min}
                    max={control.parameter.max}
                    step={control.parameter.step}
                    value={value}
                    aria-label={`Bitcrusher ${control.label}`}
                    on:input={(event) =>
                      onUpdateTrackEffect(selectedTrack.id, 'bitcrusher', {
                        enabled: true,
                        parameters: {[control.parameter.key]: Number(event.currentTarget.value)},
                      })}
                  />
                </label>
              {/each}
            </div>
            {/if}
          </div>

          <div id="effect-panel-chorus" class:enabled={Boolean(chorusEffect?.enabled)} class:expanded={expandedEffectPanel === 'chorus'} class="effect-card chorus-card">
            <div class="effect-row">
              <div class="effect-title-cell">
                <button
                  type="button"
                  class:enabled={Boolean(chorusEffect?.enabled)}
                  class="switch"
                  aria-label="Chorus enabled state"
                  aria-pressed={Boolean(chorusEffect?.enabled)}
                  on:click={() => onUpdateTrackEffect(selectedTrack.id, 'chorus', {enabled: !chorusEffect?.enabled})}
                >
                  <i></i>
                </button>
                <button
                  type="button"
                  class="effect-expand"
                  title={effectPanelTitle('chorus')}
                  aria-label={effectPanelTitle('chorus')}
                  aria-expanded={expandedEffectPanel === 'chorus'}
                  on:click={() => toggleEffectPanel('chorus')}
                >
                  <ChevronRight class={`icon-xs ${expandedEffectPanel === 'chorus' ? 'expanded' : ''}`} />
                  <span>Chorus</span>
                </button>
              </div>
              <strong>{chorusEffect?.enabled ? 'On' : 'Bypass'}</strong>
            </div>

            <div class="effect-summary-row">
              <span>{chorusSummary(chorusEffect)}</span>
              <em>5 params</em>
            </div>

            {#if expandedEffectPanel === 'chorus'}
            <div class="parameter-micro-grid">
              {#each chorusControls as control (control.parameter.key)}
                {@const value = effectParameterValue(chorusEffect, control.parameter)}
                <label class="parameter-micro-control">
                  <span>
                    <em>{control.label}</em>
                    <strong class="mono">{formatEffectParameterValue(value, control.parameter)}</strong>
                  </span>
                  <input
                    class="range-compact"
                    type="range"
                    min={control.parameter.min}
                    max={control.parameter.max}
                    step={control.parameter.step}
                    value={value}
                    aria-label={`Chorus ${control.label}`}
                    on:input={(event) =>
                      onUpdateTrackEffect(selectedTrack.id, 'chorus', {
                        enabled: true,
                        parameters: {[control.parameter.key]: Number(event.currentTarget.value)},
                      })}
                  />
                </label>
              {/each}
            </div>
            {/if}
          </div>

          <div id="effect-panel-flanger" class:enabled={Boolean(flangerEffect?.enabled)} class:expanded={expandedEffectPanel === 'flanger'} class="effect-card flanger-card">
            <div class="effect-row">
              <div class="effect-title-cell">
                <button
                  type="button"
                  class:enabled={Boolean(flangerEffect?.enabled)}
                  class="switch"
                  aria-label="Flanger enabled state"
                  aria-pressed={Boolean(flangerEffect?.enabled)}
                  on:click={() => onUpdateTrackEffect(selectedTrack.id, 'flanger', {enabled: !flangerEffect?.enabled})}
                >
                  <i></i>
                </button>
                <button
                  type="button"
                  class="effect-expand"
                  title={effectPanelTitle('flanger')}
                  aria-label={effectPanelTitle('flanger')}
                  aria-expanded={expandedEffectPanel === 'flanger'}
                  on:click={() => toggleEffectPanel('flanger')}
                >
                  <ChevronRight class={`icon-xs ${expandedEffectPanel === 'flanger' ? 'expanded' : ''}`} />
                  <span>Flanger</span>
                </button>
              </div>
              <strong>{flangerEffect?.enabled ? 'On' : 'Bypass'}</strong>
            </div>

            <div class="effect-summary-row">
              <span>{flangerSummary(flangerEffect)}</span>
              <em>5 params</em>
            </div>

            {#if expandedEffectPanel === 'flanger'}
            <div class="parameter-micro-grid">
              {#each flangerControls as control (control.parameter.key)}
                {@const value = effectParameterValue(flangerEffect, control.parameter)}
                <label class="parameter-micro-control">
                  <span>
                    <em>{control.label}</em>
                    <strong class="mono">{formatEffectParameterValue(value, control.parameter)}</strong>
                  </span>
                  <input
                    class="range-compact"
                    type="range"
                    min={control.parameter.min}
                    max={control.parameter.max}
                    step={control.parameter.step}
                    value={value}
                    aria-label={`Flanger ${control.label}`}
                    on:input={(event) =>
                      onUpdateTrackEffect(selectedTrack.id, 'flanger', {
                        enabled: true,
                        parameters: {[control.parameter.key]: Number(event.currentTarget.value)},
                      })}
                  />
                </label>
              {/each}
            </div>
            {/if}
          </div>

          <div id="effect-panel-phaser" class:enabled={Boolean(phaserEffect?.enabled)} class:expanded={expandedEffectPanel === 'phaser'} class="effect-card phaser-card">
            <div class="effect-row">
              <div class="effect-title-cell">
                <button
                  type="button"
                  class:enabled={Boolean(phaserEffect?.enabled)}
                  class="switch"
                  aria-label="Phaser enabled state"
                  aria-pressed={Boolean(phaserEffect?.enabled)}
                  on:click={() => onUpdateTrackEffect(selectedTrack.id, 'phaser', {enabled: !phaserEffect?.enabled})}
                >
                  <i></i>
                </button>
                <button
                  type="button"
                  class="effect-expand"
                  title={effectPanelTitle('phaser')}
                  aria-label={effectPanelTitle('phaser')}
                  aria-expanded={expandedEffectPanel === 'phaser'}
                  on:click={() => toggleEffectPanel('phaser')}
                >
                  <ChevronRight class={`icon-xs ${expandedEffectPanel === 'phaser' ? 'expanded' : ''}`} />
                  <span>Phaser</span>
                </button>
              </div>
              <strong>{phaserEffect?.enabled ? 'On' : 'Bypass'}</strong>
            </div>

            <div class="effect-summary-row">
              <span>{phaserSummary(phaserEffect)}</span>
              <em>5 params</em>
            </div>

            {#if expandedEffectPanel === 'phaser'}
            <div class="parameter-micro-grid">
              {#each phaserControls as control (control.parameter.key)}
                {@const value = effectParameterValue(phaserEffect, control.parameter)}
                <label class="parameter-micro-control">
                  <span>
                    <em>{control.label}</em>
                    <strong class="mono">{formatEffectParameterValue(value, control.parameter)}</strong>
                  </span>
                  <input
                    class="range-compact"
                    type="range"
                    min={control.parameter.min}
                    max={control.parameter.max}
                    step={control.parameter.step}
                    value={value}
                    aria-label={`Phaser ${control.label}`}
                    on:input={(event) =>
                      onUpdateTrackEffect(selectedTrack.id, 'phaser', {
                        enabled: true,
                        parameters: {[control.parameter.key]: Number(event.currentTarget.value)},
                      })}
                  />
                </label>
              {/each}
            </div>
            {/if}
          </div>

          <div id="effect-panel-tremolo" class:enabled={Boolean(tremoloEffect?.enabled)} class:expanded={expandedEffectPanel === 'tremolo'} class="effect-card tremolo-card">
            <div class="effect-row">
              <div class="effect-title-cell">
                <button
                  type="button"
                  class:enabled={Boolean(tremoloEffect?.enabled)}
                  class="switch"
                  aria-label="Tremolo/Auto-Pan enabled state"
                  aria-pressed={Boolean(tremoloEffect?.enabled)}
                  on:click={() => onUpdateTrackEffect(selectedTrack.id, 'tremolo', {enabled: !tremoloEffect?.enabled})}
                >
                  <i></i>
                </button>
                <button
                  type="button"
                  class="effect-expand"
                  title={effectPanelTitle('tremolo')}
                  aria-label={effectPanelTitle('tremolo')}
                  aria-expanded={expandedEffectPanel === 'tremolo'}
                  on:click={() => toggleEffectPanel('tremolo')}
                >
                  <ChevronRight class={`icon-xs ${expandedEffectPanel === 'tremolo' ? 'expanded' : ''}`} />
                  <span>Tremolo/Auto-Pan</span>
                </button>
              </div>
              <strong>{tremoloEffect?.enabled ? 'On' : 'Bypass'}</strong>
            </div>

            <div class="effect-summary-row">
              <span>{tremoloSummary(tremoloEffect)}</span>
              <em>4 params</em>
            </div>

            {#if expandedEffectPanel === 'tremolo'}
            <div class="parameter-micro-grid">
              {#each tremoloControls as control (control.parameter.key)}
                {@const value = effectParameterValue(tremoloEffect, control.parameter)}
                <label class="parameter-micro-control">
                  <span>
                    <em>{control.label}</em>
                    <strong class="mono">{formatEffectParameterValue(value, control.parameter)}</strong>
                  </span>
                  <input
                    class="range-compact"
                    type="range"
                    min={control.parameter.min}
                    max={control.parameter.max}
                    step={control.parameter.step}
                    value={value}
                    aria-label={`Tremolo/Auto-Pan ${control.label}`}
                    on:input={(event) =>
                      onUpdateTrackEffect(selectedTrack.id, 'tremolo', {
                        enabled: true,
                        parameters: {[control.parameter.key]: Number(event.currentTarget.value)},
                      })}
                  />
                </label>
              {/each}
            </div>
            {/if}
          </div>

          <div id="effect-panel-vibrato" class:enabled={Boolean(vibratoEffect?.enabled)} class:expanded={expandedEffectPanel === 'vibrato'} class="effect-card vibrato-card">
            <div class="effect-row">
              <div class="effect-title-cell">
                <button
                  type="button"
                  class:enabled={Boolean(vibratoEffect?.enabled)}
                  class="switch"
                  aria-label="Vibrato enabled state"
                  aria-pressed={Boolean(vibratoEffect?.enabled)}
                  on:click={() => onUpdateTrackEffect(selectedTrack.id, 'vibrato', {enabled: !vibratoEffect?.enabled})}
                >
                  <i></i>
                </button>
                <button
                  type="button"
                  class="effect-expand"
                  title={effectPanelTitle('vibrato')}
                  aria-label={effectPanelTitle('vibrato')}
                  aria-expanded={expandedEffectPanel === 'vibrato'}
                  on:click={() => toggleEffectPanel('vibrato')}
                >
                  <ChevronRight class={`icon-xs ${expandedEffectPanel === 'vibrato' ? 'expanded' : ''}`} />
                  <span>Vibrato</span>
                </button>
              </div>
              <strong>{vibratoEffect?.enabled ? 'On' : 'Bypass'}</strong>
            </div>

            <div class="effect-summary-row">
              <span>{vibratoSummary(vibratoEffect)}</span>
              <em>5 params</em>
            </div>

            {#if expandedEffectPanel === 'vibrato'}
            <div class="parameter-micro-grid">
              {#each vibratoControls as control (control.parameter.key)}
                {@const value = effectParameterValue(vibratoEffect, control.parameter)}
                <label class="parameter-micro-control">
                  <span>
                    <em>{control.label}</em>
                    <strong class="mono">{formatEffectParameterValue(value, control.parameter)}</strong>
                  </span>
                  <input
                    class="range-compact"
                    type="range"
                    min={control.parameter.min}
                    max={control.parameter.max}
                    step={control.parameter.step}
                    value={value}
                    aria-label={`Vibrato ${control.label}`}
                    on:input={(event) =>
                      onUpdateTrackEffect(selectedTrack.id, 'vibrato', {
                        enabled: true,
                        parameters: {[control.parameter.key]: Number(event.currentTarget.value)},
                      })}
                  />
                </label>
              {/each}
            </div>
            {/if}
          </div>

          <div id="effect-panel-ring" class:enabled={Boolean(ringEffect?.enabled)} class:expanded={expandedEffectPanel === 'ring'} class="effect-card ring-card">
            <div class="effect-row">
              <div class="effect-title-cell">
                <button
                  type="button"
                  class:enabled={Boolean(ringEffect?.enabled)}
                  class="switch"
                  aria-label="Ring Modulator enabled state"
                  aria-pressed={Boolean(ringEffect?.enabled)}
                  on:click={() => onUpdateTrackEffect(selectedTrack.id, 'ring', {enabled: !ringEffect?.enabled})}
                >
                  <i></i>
                </button>
                <button
                  type="button"
                  class="effect-expand"
                  title={effectPanelTitle('ring')}
                  aria-label={effectPanelTitle('ring')}
                  aria-expanded={expandedEffectPanel === 'ring'}
                  on:click={() => toggleEffectPanel('ring')}
                >
                  <ChevronRight class={`icon-xs ${expandedEffectPanel === 'ring' ? 'expanded' : ''}`} />
                  <span>Ring Modulator</span>
                </button>
              </div>
              <strong>{ringEffect?.enabled ? 'On' : 'Bypass'}</strong>
            </div>

            <div class="effect-summary-row">
              <span>{ringSummary(ringEffect)}</span>
              <em>4 params</em>
            </div>

            {#if expandedEffectPanel === 'ring'}
            <div class="parameter-micro-grid">
              {#each ringControls as control (control.parameter.key)}
                {@const value = effectParameterValue(ringEffect, control.parameter)}
                <label class="parameter-micro-control">
                  <span>
                    <em>{control.label}</em>
                    <strong class="mono">{formatEffectParameterValue(value, control.parameter)}</strong>
                  </span>
                  <input
                    class="range-compact"
                    type="range"
                    min={control.parameter.min}
                    max={control.parameter.max}
                    step={control.parameter.step}
                    value={value}
                    aria-label={`Ring Modulator ${control.label}`}
                    on:input={(event) =>
                      onUpdateTrackEffect(selectedTrack.id, 'ring', {
                        enabled: true,
                        parameters: {[control.parameter.key]: Number(event.currentTarget.value)},
                      })}
                  />
                </label>
              {/each}
            </div>
            {/if}
          </div>

          <div id="effect-panel-reverb" class:enabled={Boolean(reverbEffect?.enabled)} class:expanded={expandedEffectPanel === 'reverb'} class="effect-card">
            <div class="effect-row">
              <div class="effect-title-cell">
                <button
                  type="button"
                  class:enabled={Boolean(reverbEffect?.enabled)}
                  class="switch"
                  aria-label="Cave reverb enabled state"
                  aria-pressed={Boolean(reverbEffect?.enabled)}
                  on:click={() => onUpdateTrackEffect(selectedTrack.id, 'reverb', {enabled: !reverbEffect?.enabled})}
                >
                  <i></i>
                </button>
                <button
                  type="button"
                  class="effect-expand"
                  title={effectPanelTitle('reverb')}
                  aria-label={effectPanelTitle('reverb')}
                  aria-expanded={expandedEffectPanel === 'reverb'}
                  on:click={() => toggleEffectPanel('reverb')}
                >
                  <ChevronRight class={`icon-xs ${expandedEffectPanel === 'reverb' ? 'expanded' : ''}`} />
                  <span>Cave Reverb</span>
                </button>
              </div>
              <strong>{reverbEffect?.enabled ? 'On' : 'Bypass'}</strong>
            </div>

            <div class="effect-summary-row">
              <span>{reverbSummary(reverbEffect)}</span>
              <em>2 params</em>
            </div>

            {#if expandedEffectPanel === 'reverb'}
            <label class="slider-control compact">
              <span>
                <em>Amount</em>
                <strong class="mono">{Math.round(reverbAmountValue * 100)}%</strong>
              </span>
              <input
                class="range-compact"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={reverbAmountValue}
                aria-label="Cave Reverb Amount"
                on:input={(event) =>
                  onUpdateTrackEffect(selectedTrack.id, 'reverb', {
                    parameters: {amount: Number(event.currentTarget.value)},
                  })}
              />
            </label>

            <label class="slider-control compact">
              <span>
                <em>Size</em>
                <strong class="mono">{reverbSizeValue.toFixed(1)}s</strong>
              </span>
              <input
                class="range-compact"
                type="range"
                min="0.3"
                max="8"
                step="0.1"
                value={reverbSizeValue}
                aria-label="Cave Reverb Size"
                on:input={(event) =>
                  onUpdateTrackEffect(selectedTrack.id, 'reverb', {
                    parameters: {size: Number(event.currentTarget.value)},
                  })}
              />
            </label>
            {/if}
          </div>

          <div id="effect-panel-delay" class:enabled={Boolean(delayEffect?.enabled)} class:expanded={expandedEffectPanel === 'delay'} class="effect-card delay-card">
            <div class="effect-row">
              <div class="effect-title-cell">
                <button
                  type="button"
                  class:enabled={Boolean(delayEffect?.enabled)}
                  class="switch"
                  aria-label="Delay/Echo enabled state"
                  aria-pressed={Boolean(delayEffect?.enabled)}
                  on:click={() => onUpdateTrackEffect(selectedTrack.id, 'delay', {enabled: !delayEffect?.enabled})}
                >
                  <i></i>
                </button>
                <button
                  type="button"
                  class="effect-expand"
                  title={effectPanelTitle('delay')}
                  aria-label={effectPanelTitle('delay')}
                  aria-expanded={expandedEffectPanel === 'delay'}
                  on:click={() => toggleEffectPanel('delay')}
                >
                  <ChevronRight class={`icon-xs ${expandedEffectPanel === 'delay' ? 'expanded' : ''}`} />
                  <span>Delay/Echo</span>
                </button>
              </div>
              <strong>{delayEffect?.enabled ? 'On' : 'Bypass'}</strong>
            </div>

            <div class="effect-summary-row">
              <span>{delaySummary(delayEffect)}</span>
              <em>4 params</em>
            </div>

            {#if expandedEffectPanel === 'delay'}
            <div class="parameter-micro-grid">
              {#each delayControls as control (control.parameter.key)}
                {@const value = effectParameterValue(delayEffect, control.parameter)}
                <label class="parameter-micro-control">
                  <span>
                    <em>{control.label}</em>
                    <strong class="mono">{formatEffectParameterValue(value, control.parameter)}</strong>
                  </span>
                  <input
                    class="range-compact"
                    type="range"
                    min={control.parameter.min}
                    max={control.parameter.max}
                    step={control.parameter.step}
                    value={value}
                    aria-label={`Delay/Echo ${control.label}`}
                    on:input={(event) =>
                      onUpdateTrackEffect(selectedTrack.id, 'delay', {
                        enabled: true,
                        parameters: {[control.parameter.key]: Number(event.currentTarget.value)},
                      })}
                  />
                </label>
              {/each}
            </div>
            {/if}
          </div>
        {:else}
          <div class="empty-panel">
            <FileAudio class="icon-sm" />
            <span>No track effects.</span>
          </div>
        {/if}
      </section>
    {/if}

    {#if activeTab === 'inspector'}
      <section class="metadata-panel">
        <span class="panel-label">Project</span>
        <div class="metadata-card mono">
          <div><span>Name:</span><strong>{project?.name ?? '--'}</strong></div>
          <div><span>Sample Rate:</span><strong>{sampleRateLabel()}</strong></div>
          <div><span>Grid:</span><strong>{project?.settings.gridResolution ?? '--'}</strong></div>
          <div><span>Default Fade:</span><strong>{project ? `${project.settings.defaultFadeSeconds.toFixed(2)}s` : '--'}</strong></div>
          <div><span>Tracks:</span><strong>{project?.tracks.length ?? 0}</strong></div>
          <div><span>Clips:</span><strong>{project?.clips.length ?? 0}</strong></div>
        </div>

        <span class="panel-label block-label">Master</span>
        <div class="metadata-card mono">
          <div><span>Volume:</span><strong>{project ? `${project.master.volume}%` : '--'}</strong></div>
          <div><span>Effects:</span><strong>{project?.master.effects.length ?? 0}</strong></div>
          <div><span>Signal:</span><strong>{hasPlayableAudio ? 'File-backed' : 'No signal'}</strong></div>
        </div>
      </section>
    {/if}
  </div>

  <div class="signal-footer">
    <span class="panel-label">Signal</span>
    <div class:active={hasPlayableAudio} class="signal-box">
      <span></span>
      <strong>{hasPlayableAudio ? 'Audio source loaded' : 'No signal'}</strong>
    </div>
  </div>
  {/if}
</aside>

<style>
  .sidebar-right {
    display: flex;
    width: 300px;
    height: 100%;
    flex-shrink: 0;
    flex-direction: column;
    user-select: none;
    border-left: 1px solid #1d2025;
    background: #0a0b0d;
    color: #ffffff;
    transition: width 160ms ease;
  }

  .sidebar-right.collapsed {
    width: 54px;
  }

  .tab-bar {
    display: flex;
    height: 48px;
    align-items: flex-end;
    justify-content: space-around;
    border-bottom: 1px solid #1d2025;
    padding: 0 8px;
  }

  .sidebar-right.collapsed .tab-bar {
    height: 100%;
    align-items: center;
    justify-content: flex-start;
    flex-direction: column;
    gap: 8px;
    border-bottom: 0;
    padding: 10px 6px;
  }

  .tab-bar button {
    position: relative;
    flex: 1;
    background: transparent;
    color: #71717a;
    cursor: pointer;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.06em;
    padding-bottom: 10px;
    text-align: center;
    text-transform: uppercase;
    transition: color 140ms ease;
  }

  .tab-bar .collapse-toggle {
    flex: 0 0 auto;
    width: 34px;
    height: 34px;
    border: 1px solid #1e2127;
    border-radius: 8px;
    background: #101216;
    color: #a1a1aa;
    padding: 0;
  }

  .tab-bar button.rail-tab {
    flex: 0 0 auto;
    width: 34px;
    height: 34px;
    border: 1px solid #1e2127;
    border-radius: 8px;
    background: #101216;
    padding: 0;
  }

  .tab-bar button:hover,
  .tab-bar button.active {
    color: #ffffff;
  }

  .tab-bar button.rail-tab.active {
    border-color: #ffffff;
    background: #1c1f26;
  }

  .tab-bar button span {
    position: absolute;
    right: 16px;
    bottom: 0;
    left: 16px;
    height: 2px;
    border-radius: 999px;
    background: #ffffff;
  }

  .tab-bar button.rail-tab span {
    right: 9px;
    bottom: 5px;
    left: 9px;
  }

  .inspector-content {
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    gap: 20px;
    overflow-y: auto;
    padding: 16px;
  }

  .panel-stack {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .clip-name-field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 1px solid #1e2127;
    border-radius: 8px;
    background: #121418;
    color: #a1a1aa;
    padding: 8px 12px;
  }

  .clip-name-input {
    display: flex;
    min-width: 0;
    flex: 1;
    align-items: center;
    gap: 8px;
    overflow: hidden;
  }

  .clip-name-input input {
    min-width: 0;
    width: 100%;
    border: 0;
    background: transparent;
    color: #e4e4e7;
    font-size: 12px;
    font-weight: 600;
    outline: none;
    text-overflow: ellipsis;
  }

  .clip-name-field :global(.folder-icon) {
    color: #71717a;
  }

  .time-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .time-grid div {
    border: 1px solid #1e2127;
    border-radius: 8px;
    background: #121418;
    padding: 8px;
    text-align: center;
  }

  .time-grid span {
    display: block;
    margin-bottom: 4px;
    color: #71717a;
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .time-grid strong {
    color: #d4d4d8;
    font-size: 11px;
    font-weight: 600;
  }

  .clip-command-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .clip-command-grid button {
    display: flex;
    height: 34px;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1px solid #1e2127;
    border-radius: 8px;
    background: #121418;
    color: #d4d4d8;
    cursor: pointer;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    transition: border-color 140ms ease, background-color 140ms ease, color 140ms ease;
  }

  .clip-command-grid button:hover {
    border-color: #303744;
    background: #171a20;
    color: #ffffff;
  }

  .keyframe-tools {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }

  .keyframe-tools button {
    display: flex;
    height: 32px;
    min-width: 0;
    align-items: center;
    justify-content: center;
    gap: 4px;
    border: 1px solid #1e2127;
    border-radius: 8px;
    background: #121418;
    color: #d4d4d8;
    cursor: pointer;
    font-size: 9px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .keyframe-tools button:hover {
    border-color: #303744;
    background: #171a20;
    color: #ffffff;
  }

  .keyframe-editor {
    display: flex;
    flex-direction: column;
    gap: 9px;
    border: 1px solid #1e2127;
    border-radius: 8px;
    background: #101216;
    padding: 10px;
  }

  .compact-keyframe-editor {
    gap: 8px;
  }

  .keyframe-active-row {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 8px;
    color: #a1a1aa;
    font-size: 10px;
    font-weight: 800;
  }

  .keyframe-active-dot {
    width: 9px;
    height: 9px;
    flex: 0 0 auto;
    border: 1px solid #0a0b0d;
    border-radius: 2px;
    background: #facc15;
    transform: rotate(45deg);
    box-shadow: 0 0 10px rgba(250, 204, 21, 0.45);
  }

  .keyframe-active-dot.compound {
    border-color: rgba(250, 204, 21, 0.82);
    background: #ffffff;
    box-shadow: 0 0 0 1px rgba(250, 204, 21, 0.55), 0 0 12px rgba(250, 204, 21, 0.42);
  }

  .keyframe-active-row strong {
    color: #ffffff;
    font: 800 10px "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
  }

  .keyframe-active-row em {
    margin-left: auto;
    color: #d4d4d8;
    font: 800 10px "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
    font-style: normal;
  }

  .keyframe-editor-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .keyframe-editor-row.single {
    grid-template-columns: minmax(0, 1fr);
  }

  .compound-parameter-list {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 5px;
  }

  .compound-parameter-row {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    border: 1px solid #1c2027;
    border-radius: 6px;
    background: #0b0d10;
    color: #71717a;
    font-size: 10px;
    font-weight: 800;
    padding: 6px 8px;
  }

  .compound-parameter-row.stored {
    border-color: rgba(250, 204, 21, 0.24);
    color: #d4d4d8;
  }

  .compound-parameter-row strong {
    color: #e4e4e7;
    font: 800 10px "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
  }

  .keyframe-editor-row label,
  .keyframe-easing {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 5px;
    color: #71717a;
    font-size: 9px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .keyframe-number,
  .keyframe-easing select {
    width: 100%;
    min-width: 0;
    border: 1px solid #252a33;
    border-radius: 6px;
    background: #0b0d10;
    color: #e4e4e7;
    font: 600 11px "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
    outline: none;
  }

  .keyframe-number {
    height: 28px;
    padding: 0 8px;
  }

  .keyframe-easing select {
    height: 30px;
    cursor: pointer;
    padding: 0 8px;
  }

  .keyframe-number:focus,
  .keyframe-easing select:focus {
    border-color: #525866;
  }

  .keyframe-summary {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #1e2127;
    border-radius: 8px;
    background: #101216;
    color: #71717a;
    font-size: 10px;
    font-weight: 900;
    min-height: 32px;
    text-transform: uppercase;
  }

  .audio-controls {
    gap: 12px;
  }

  .slider-control {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .slider-control > span,
  .switch-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #a1a1aa;
    font-size: 12px;
  }

  .slider-control em {
    font-style: normal;
  }

  .slider-control em small {
    margin-left: 4px;
    border: 1px solid rgba(250, 204, 21, 0.3);
    border-radius: 4px;
    color: #facc15;
    font-size: 8px;
    font-style: normal;
    font-weight: 900;
    padding: 1px 3px;
    vertical-align: middle;
  }

  .slider-control em small.clip-scope {
    border-color: rgba(148, 163, 184, 0.34);
    color: #94a3b8;
  }

  .slider-control strong {
    color: #e4e4e7;
    font-size: 12px;
    font-weight: 600;
  }

  .switch-row {
    padding-top: 4px;
  }

  .switch {
    position: relative;
    width: 36px;
    height: 20px;
    border-radius: 999px;
    background: #27272a;
    cursor: pointer;
    transition: background-color 140ms ease;
  }

  .switch:disabled {
    cursor: default;
  }

  .switch.enabled {
    background: #ffffff;
  }

  .switch i {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: #a1a1aa;
    transition: transform 140ms ease, background-color 140ms ease;
  }

  .switch.enabled i {
    transform: translateX(16px);
    background: #000000;
  }

  .empty-state,
  .empty-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #71717a;
    text-align: center;
  }

  .empty-state {
    padding: 40px 0;
  }

  .empty-panel {
    min-height: 140px;
    border: 1px dashed #252a33;
    border-radius: 8px;
    background: #0d0f12;
    gap: 8px;
  }

  .empty-state span,
  .empty-panel span {
    color: #a1a1aa;
    font-size: 12px;
  }

  .empty-state p {
    max-width: 180px;
    margin: 4px 0 0;
    font-size: 10px;
    line-height: 1.45;
  }

  .empty-state :global(.empty-icon) {
    width: 26px;
    height: 26px;
    margin-bottom: 10px;
  }

  .effect-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    border: 1px solid #1e2127;
    border-radius: 8px;
    background: #121418;
    padding: 10px;
  }

  .effect-card.enabled {
    border-color: rgba(249, 115, 22, 0.34);
  }

  .effect-card.expanded {
    border-color: rgba(255, 255, 255, 0.22);
  }

  .effect-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 1px solid #1e2127;
    border-radius: 8px;
    background: #121418;
    padding: 10px;
  }

  .effect-card .effect-row {
    border: 0;
    background: transparent;
    padding: 0;
  }

  .effect-row > div,
  .effect-title-cell {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 8px;
  }

  .effect-title-cell {
    flex: 1 1 auto;
  }

  .effect-expand {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 5px;
    border: 0;
    background: transparent;
    color: #e4e4e7;
    cursor: pointer;
    padding: 0;
  }

  .effect-expand :global(svg) {
    flex: 0 0 auto;
    color: #71717a;
    transition: transform 140ms ease, color 140ms ease;
  }

  .effect-expand :global(svg.expanded) {
    color: #ffffff;
    transform: rotate(90deg);
  }

  .effect-expand span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .effect-row span {
    color: #e4e4e7;
    font-size: 12px;
    font-weight: 700;
    text-transform: capitalize;
  }

  .effect-row strong {
    color: #a1a1aa;
    font-size: 11px;
    font-weight: 800;
  }

  .effect-summary-row {
    display: flex;
    min-height: 24px;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    border: 1px solid #1d2025;
    border-radius: 7px;
    background: #0b0d10;
    color: #9ca3af;
    font-size: 10px;
    font-weight: 800;
    padding: 5px 7px;
  }

  .effect-summary-row span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .effect-summary-row em {
    color: #71717a;
    font-size: 9px;
    font-style: normal;
    font-weight: 900;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .slider-control.compact {
    gap: 5px;
  }

  .eq-card {
    gap: 10px;
  }

  .eq-band-grid {
    display: grid;
    grid-template-columns: repeat(9, minmax(0, 1fr));
    gap: 3px;
    border: 1px solid #1d2025;
    border-radius: 8px;
    background: #0b0d10;
    padding: 8px 5px 7px;
  }

  .eq-band {
    display: flex;
    min-width: 0;
    align-items: center;
    flex-direction: column;
    gap: 5px;
  }

  .eq-value {
    min-height: 10px;
    color: #e4e4e7;
    font-size: 7px;
    font-weight: 800;
    line-height: 1;
    white-space: nowrap;
  }

  .eq-band-slider {
    width: 18px;
    height: 72px;
    accent-color: #f97316;
    cursor: ns-resize;
    writing-mode: vertical-lr;
    direction: rtl;
  }

  .eq-frequency {
    overflow: hidden;
    max-width: 100%;
    color: #8b93a3;
    font-size: 7px;
    font-weight: 900;
    line-height: 1;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dynamics-card {
    gap: 10px;
  }

  .parameter-micro-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    border: 1px solid #1d2025;
    border-radius: 8px;
    background: #0b0d10;
    padding: 8px;
  }

  .parameter-micro-control {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 5px;
  }

  .parameter-micro-control.wide {
    grid-column: 1 / -1;
  }

  .parameter-micro-control span {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .parameter-micro-control em {
    overflow: hidden;
    color: #9ca3af;
    font-size: 9px;
    font-style: normal;
    font-weight: 900;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .parameter-micro-control strong {
    color: #e4e4e7;
    font-size: 9px;
    font-weight: 800;
    white-space: nowrap;
  }

  .parameter-micro-control input {
    width: 100%;
    accent-color: #f97316;
  }

  .metadata-panel {
    color: #a1a1aa;
    font-size: 12px;
    line-height: 1.55;
  }

  .metadata-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    border: 1px solid #1d2025;
    border-radius: 8px;
    background: #111317;
    color: #a1a1aa;
    font-size: 11px;
    margin-top: 8px;
    padding: 12px;
  }

  .metadata-card div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }

  .metadata-card strong {
    overflow: hidden;
    color: #e4e4e7;
    text-align: right;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .block-label {
    display: block;
    margin-top: 16px;
  }

  .signal-footer {
    display: flex;
    flex-direction: column;
    gap: 8px;
    border-top: 1px solid #1d2025;
    background: #08090b;
    padding: 16px;
  }

  .signal-box {
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid #1d2025;
    border-radius: 8px;
    background: #0e1013;
    color: #71717a;
    padding: 12px;
  }

  .signal-box span {
    width: 8px;
    height: 8px;
    flex-shrink: 0;
    border-radius: 999px;
    background: #52525b;
  }

  .signal-box.active span {
    background: #22c55e;
  }

  .signal-box strong {
    font-size: 12px;
    font-weight: 800;
  }
</style>
