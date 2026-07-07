// / - Arinara Network © 2026 - /
// This source code is the exclusive property of Arinara Network.
// Unauthorized use, reproduction, distribution, or modification of this
// code — in whole or in part — for any purpose whatsoever is strictly
// prohibited without prior written consent from Arinara Network as the
// sole legal owner of this codebase.
import {
  BITCRUSHER_PARAMETERS,
  CHORUS_PARAMETERS,
  COMPRESSOR_PARAMETERS,
  DELAY_PARAMETERS,
  FILTER_PARAMETERS,
  FLANGER_PARAMETERS,
  GATE_PARAMETERS,
  GRAPHIC_EQ_BANDS,
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
} from './EffectParameters';
import type {EffectInstance} from './Types';

export const REVERB_AMOUNT_AUTOMATION_PARAMETER_ID = 'track.reverb.amount';
export const REVERB_SIZE_AUTOMATION_PARAMETER_ID = 'track.reverb.size';

export type EffectAutomationParameterId = string;

export interface EffectAutomationParameterDefinition {
  id: EffectAutomationParameterId;
  effectType: EffectInstance['type'];
  parameterKey: string;
  label: string;
  keyframeLabel: string;
  minimum: number;
  maximum: number;
  step: number;
  precision: number;
  engineSupport: 'playback-export';
  formatValue: (value: number) => string;
}

interface EffectParameterEntryInput {
  effectType: EffectInstance['type'];
  labelPrefix: string;
  parameter: NumericEffectParameterDefinition;
  label: string;
  precision?: number;
}

function createEffectAutomationId(effectType: EffectInstance['type'], parameterKey: string) {
  return `track.${effectType}.${parameterKey}`;
}

function formatSignedDb(value: number, fractionDigits = 0) {
  const normalizedValue = Object.is(value, -0) ? 0 : value;
  const sign = normalizedValue > 0 ? '+' : '';
  return `${sign}${normalizedValue.toFixed(fractionDigits)} dB`;
}

function formatNumericValue(value: number, definition: Pick<NumericEffectParameterDefinition, 'unit' | 'step'>) {
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

function inferPrecision(step: number) {
  const stepText = String(step);
  const decimal = stepText.includes('.') ? stepText.split('.')[1]?.length ?? 0 : 0;
  return Math.max(0, Math.min(4, decimal));
}

function createNumericEffectParameter(input: EffectParameterEntryInput): EffectAutomationParameterDefinition {
  return {
    id: createEffectAutomationId(input.effectType, input.parameter.key),
    effectType: input.effectType,
    parameterKey: input.parameter.key,
    label: `${input.labelPrefix} ${input.label}`,
    keyframeLabel: `${input.labelPrefix} ${input.label} Keyframes`,
    minimum: input.parameter.min,
    maximum: input.parameter.max,
    step: input.parameter.step,
    precision: input.precision ?? inferPrecision(input.parameter.step),
    engineSupport: 'playback-export',
    formatValue: (value) => formatNumericValue(value, input.parameter),
  };
}

function createNumericEffectParameters(
  effectType: EffectInstance['type'],
  labelPrefix: string,
  controls: {label: string; parameter: NumericEffectParameterDefinition; precision?: number}[],
) {
  return controls.map((control) =>
    createNumericEffectParameter({
      effectType,
      labelPrefix,
      parameter: control.parameter,
      label: control.label,
      precision: control.precision,
    }),
  );
}

export const EFFECT_AUTOMATION_PARAMETERS: EffectAutomationParameterDefinition[] = [
  ...GRAPHIC_EQ_BANDS.map((band) => ({
    id: createEffectAutomationId('eq', band.parameterKey),
    effectType: 'eq' as const,
    parameterKey: band.parameterKey,
    label: `Graphic EQ ${band.label}`,
    keyframeLabel: `Graphic EQ ${band.label} Keyframes`,
    minimum: GRAPHIC_EQ_GAIN_MIN,
    maximum: GRAPHIC_EQ_GAIN_MAX,
    step: 0.5,
    precision: 1,
    engineSupport: 'playback-export' as const,
    formatValue: (value: number) => formatSignedDb(value, value % 1 === 0 ? 0 : 1),
  })),
  ...createNumericEffectParameters('filter', 'Filter', [
    {label: 'High-pass', parameter: FILTER_PARAMETERS.highpassFrequency},
    {label: 'High-pass Q', parameter: FILTER_PARAMETERS.highpassQ},
    {label: 'Low-pass', parameter: FILTER_PARAMETERS.lowpassFrequency},
    {label: 'Low-pass Q', parameter: FILTER_PARAMETERS.lowpassQ},
    {label: 'Notch Frequency', parameter: FILTER_PARAMETERS.notchFrequency},
    {label: 'Notch Q', parameter: FILTER_PARAMETERS.notchQ},
    {label: 'Notch Depth', parameter: FILTER_PARAMETERS.notchDepth},
  ]),
  ...createNumericEffectParameters('compressor', 'Compressor', [
    {label: 'Threshold', parameter: COMPRESSOR_PARAMETERS.threshold},
    {label: 'Ratio', parameter: COMPRESSOR_PARAMETERS.ratio},
    {label: 'Attack', parameter: COMPRESSOR_PARAMETERS.attack},
    {label: 'Release', parameter: COMPRESSOR_PARAMETERS.release},
    {label: 'Knee', parameter: COMPRESSOR_PARAMETERS.knee},
    {label: 'Makeup', parameter: COMPRESSOR_PARAMETERS.makeup},
    {label: 'Mix', parameter: COMPRESSOR_PARAMETERS.mix},
  ]),
  ...createNumericEffectParameters('gate', 'Noise Gate', [
    {label: 'Threshold', parameter: GATE_PARAMETERS.threshold},
    {label: 'Reduction', parameter: GATE_PARAMETERS.reduction},
    {label: 'Attack', parameter: GATE_PARAMETERS.attack},
    {label: 'Release', parameter: GATE_PARAMETERS.release},
    {label: 'Hold', parameter: GATE_PARAMETERS.hold},
    {label: 'Mix', parameter: GATE_PARAMETERS.mix},
  ]),
  ...createNumericEffectParameters('limiter', 'Limiter', [
    {label: 'Ceiling', parameter: LIMITER_PARAMETERS.ceiling},
    {label: 'Input', parameter: LIMITER_PARAMETERS.input},
    {label: 'Release', parameter: LIMITER_PARAMETERS.release},
    {label: 'Mix', parameter: LIMITER_PARAMETERS.mix},
  ]),
  ...createNumericEffectParameters('saturation', 'Saturation', [
    {label: 'Drive', parameter: SATURATION_PARAMETERS.drive},
    {label: 'Tone', parameter: SATURATION_PARAMETERS.tone},
    {label: 'Mix', parameter: SATURATION_PARAMETERS.mix},
    {label: 'Output', parameter: SATURATION_PARAMETERS.output},
  ]),
  ...createNumericEffectParameters('overdrive', 'Overdrive', [
    {label: 'Drive', parameter: OVERDRIVE_PARAMETERS.drive},
    {label: 'Clip', parameter: OVERDRIVE_PARAMETERS.clip},
    {label: 'Tone', parameter: OVERDRIVE_PARAMETERS.tone},
    {label: 'Mix', parameter: OVERDRIVE_PARAMETERS.mix},
    {label: 'Output', parameter: OVERDRIVE_PARAMETERS.output},
  ]),
  ...createNumericEffectParameters('bitcrusher', 'Bitcrusher', [
    {label: 'Bits', parameter: BITCRUSHER_PARAMETERS.bits},
    {label: 'Rate Reduction', parameter: BITCRUSHER_PARAMETERS.rateReduction},
    {label: 'Mix', parameter: BITCRUSHER_PARAMETERS.mix},
    {label: 'Output', parameter: BITCRUSHER_PARAMETERS.output},
  ]),
  ...createNumericEffectParameters('chorus', 'Chorus', [
    {label: 'Rate', parameter: CHORUS_PARAMETERS.rate},
    {label: 'Depth', parameter: CHORUS_PARAMETERS.depth},
    {label: 'Delay', parameter: CHORUS_PARAMETERS.delay},
    {label: 'Feedback', parameter: CHORUS_PARAMETERS.feedback},
    {label: 'Mix', parameter: CHORUS_PARAMETERS.mix},
  ]),
  ...createNumericEffectParameters('flanger', 'Flanger', [
    {label: 'Rate', parameter: FLANGER_PARAMETERS.rate},
    {label: 'Depth', parameter: FLANGER_PARAMETERS.depth},
    {label: 'Delay', parameter: FLANGER_PARAMETERS.delay},
    {label: 'Feedback', parameter: FLANGER_PARAMETERS.feedback},
    {label: 'Mix', parameter: FLANGER_PARAMETERS.mix},
  ]),
  ...createNumericEffectParameters('phaser', 'Phaser', [
    {label: 'Rate', parameter: PHASER_PARAMETERS.rate},
    {label: 'Depth', parameter: PHASER_PARAMETERS.depth},
    {label: 'Center', parameter: PHASER_PARAMETERS.center},
    {label: 'Feedback', parameter: PHASER_PARAMETERS.feedback},
    {label: 'Mix', parameter: PHASER_PARAMETERS.mix},
  ]),
  ...createNumericEffectParameters('tremolo', 'Tremolo/Auto-Pan', [
    {label: 'Rate', parameter: TREMOLO_PARAMETERS.rate},
    {label: 'Depth', parameter: TREMOLO_PARAMETERS.depth},
    {label: 'Auto-pan', parameter: TREMOLO_PARAMETERS.pan},
    {label: 'Mix', parameter: TREMOLO_PARAMETERS.mix},
  ]),
  ...createNumericEffectParameters('vibrato', 'Vibrato', [
    {label: 'Rate', parameter: VIBRATO_PARAMETERS.rate},
    {label: 'Depth', parameter: VIBRATO_PARAMETERS.depth},
    {label: 'Delay', parameter: VIBRATO_PARAMETERS.delay},
    {label: 'Mix', parameter: VIBRATO_PARAMETERS.mix},
    {label: 'Output', parameter: VIBRATO_PARAMETERS.output},
  ]),
  ...createNumericEffectParameters('ring', 'Ring Modulator', [
    {label: 'Frequency', parameter: RING_MODULATOR_PARAMETERS.frequency},
    {label: 'Depth', parameter: RING_MODULATOR_PARAMETERS.depth},
    {label: 'Mix', parameter: RING_MODULATOR_PARAMETERS.mix},
    {label: 'Output', parameter: RING_MODULATOR_PARAMETERS.output},
  ]),
  {
    id: REVERB_AMOUNT_AUTOMATION_PARAMETER_ID,
    effectType: 'reverb',
    parameterKey: 'amount',
    label: 'Reverb Amount',
    keyframeLabel: 'Reverb Amount Keyframes',
    minimum: 0,
    maximum: 1,
    step: 0.01,
    precision: 2,
    engineSupport: 'playback-export',
    formatValue: (value) => `${Math.round(value * 100)}%`,
  },
  {
    id: REVERB_SIZE_AUTOMATION_PARAMETER_ID,
    effectType: 'reverb',
    parameterKey: 'size',
    label: 'Reverb Size',
    keyframeLabel: 'Reverb Size Keyframes',
    minimum: 0.3,
    maximum: 8,
    step: 0.1,
    precision: 1,
    engineSupport: 'playback-export',
    formatValue: (value) => `${value.toFixed(1)}s`,
  },
  ...createNumericEffectParameters('delay', 'Delay/Echo', [
    {label: 'Time', parameter: DELAY_PARAMETERS.time},
    {label: 'Feedback', parameter: DELAY_PARAMETERS.feedback},
    {label: 'Mix', parameter: DELAY_PARAMETERS.mix},
    {label: 'Tone', parameter: DELAY_PARAMETERS.tone},
  ]),
];

export function getEffectAutomationParameterDefinition(parameterId: string) {
  return EFFECT_AUTOMATION_PARAMETERS.find((parameter) => parameter.id === parameterId) ?? null;
}

export function getEffectAutomationParameterByEffectParameter(effectType: EffectInstance['type'], parameterKey: string) {
  return (
    EFFECT_AUTOMATION_PARAMETERS.find(
      (parameter) => parameter.effectType === effectType && parameter.parameterKey === parameterKey,
    ) ?? null
  );
}

export function getEffectAutomationParametersByEffectType(effectType: EffectInstance['type']) {
  return EFFECT_AUTOMATION_PARAMETERS.filter((parameter) => parameter.effectType === effectType);
}

export function getEffectAutomationParameterValue(
  effect: EffectInstance | null,
  parameter: EffectAutomationParameterDefinition,
) {
  const value = effect?.parameters[parameter.parameterKey];
  return typeof value === 'number' ? value : parameter.minimum;
}

export function clampEffectAutomationParameterValue(
  parameter: EffectAutomationParameterDefinition,
  value: number,
) {
  return Math.max(parameter.minimum, Math.min(parameter.maximum, value));
}
