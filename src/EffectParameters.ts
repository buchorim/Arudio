// / - Arinara Network © 2026 - /
// This source code is the exclusive property of Arinara Network.
// Unauthorized use, reproduction, distribution, or modification of this
// code — in whole or in part — for any purpose whatsoever is strictly
// prohibited without prior written consent from Arinara Network as the
// sole legal owner of this codebase.
import type {EffectInstance} from './Types';

export interface NumericEffectParameterDefinition {
  key: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  unit: 'dB' | 'ratio' | 'seconds' | 'percent' | 'hertz' | 'q' | 'bits' | 'samples';
}

export const GRAPHIC_EQ_GAIN_MIN = -12;
export const GRAPHIC_EQ_GAIN_MAX = 12;
export const GRAPHIC_EQ_DEFAULT_GAIN = 0;
export const GRAPHIC_EQ_DEFAULT_Q = 1.15;

export const GRAPHIC_EQ_BANDS = [
  {frequency: 62, label: '62 Hz', parameterKey: 'eq.band.62.gain'},
  {frequency: 125, label: '125 Hz', parameterKey: 'eq.band.125.gain'},
  {frequency: 250, label: '250 Hz', parameterKey: 'eq.band.250.gain'},
  {frequency: 500, label: '500 Hz', parameterKey: 'eq.band.500.gain'},
  {frequency: 1000, label: '1 kHz', parameterKey: 'eq.band.1000.gain'},
  {frequency: 2000, label: '2 kHz', parameterKey: 'eq.band.2000.gain'},
  {frequency: 4000, label: '4 kHz', parameterKey: 'eq.band.4000.gain'},
  {frequency: 8000, label: '8 kHz', parameterKey: 'eq.band.8000.gain'},
  {frequency: 16000, label: '16 kHz', parameterKey: 'eq.band.16000.gain'},
] as const;

export const FILTER_PARAMETERS = {
  highpassFrequency: {key: 'filter.highpass.frequency', defaultValue: 20, min: 20, max: 4000, step: 10, unit: 'hertz'},
  highpassQ: {key: 'filter.highpass.q', defaultValue: 0.7, min: 0.1, max: 12, step: 0.1, unit: 'q'},
  lowpassFrequency: {key: 'filter.lowpass.frequency', defaultValue: 20000, min: 1000, max: 20000, step: 100, unit: 'hertz'},
  lowpassQ: {key: 'filter.lowpass.q', defaultValue: 0.7, min: 0.1, max: 12, step: 0.1, unit: 'q'},
  notchFrequency: {key: 'filter.notch.frequency', defaultValue: 1000, min: 40, max: 12000, step: 10, unit: 'hertz'},
  notchQ: {key: 'filter.notch.q', defaultValue: 4, min: 0.2, max: 20, step: 0.1, unit: 'q'},
  notchDepth: {key: 'filter.notch.depth', defaultValue: 0, min: -48, max: 0, step: 1, unit: 'dB'},
} as const satisfies Record<string, NumericEffectParameterDefinition>;

export const COMPRESSOR_PARAMETERS = {
  threshold: {key: 'compressor.threshold', defaultValue: -24, min: -60, max: 0, step: 1, unit: 'dB'},
  ratio: {key: 'compressor.ratio', defaultValue: 4, min: 1, max: 20, step: 0.5, unit: 'ratio'},
  attack: {key: 'compressor.attack', defaultValue: 0.02, min: 0.001, max: 1, step: 0.001, unit: 'seconds'},
  release: {key: 'compressor.release', defaultValue: 0.25, min: 0.01, max: 1, step: 0.01, unit: 'seconds'},
  knee: {key: 'compressor.knee', defaultValue: 18, min: 0, max: 40, step: 1, unit: 'dB'},
  makeup: {key: 'compressor.makeup', defaultValue: 0, min: -12, max: 18, step: 0.5, unit: 'dB'},
  mix: {key: 'compressor.mix', defaultValue: 1, min: 0, max: 1, step: 0.01, unit: 'percent'},
} as const satisfies Record<string, NumericEffectParameterDefinition>;

export const GATE_PARAMETERS = {
  threshold: {key: 'gate.threshold', defaultValue: -42, min: -80, max: 0, step: 1, unit: 'dB'},
  reduction: {key: 'gate.reduction', defaultValue: -36, min: -80, max: 0, step: 1, unit: 'dB'},
  attack: {key: 'gate.attack', defaultValue: 0.012, min: 0.001, max: 0.5, step: 0.001, unit: 'seconds'},
  release: {key: 'gate.release', defaultValue: 0.16, min: 0.01, max: 1.5, step: 0.01, unit: 'seconds'},
  hold: {key: 'gate.hold', defaultValue: 0.04, min: 0, max: 0.5, step: 0.01, unit: 'seconds'},
  mix: {key: 'gate.mix', defaultValue: 1, min: 0, max: 1, step: 0.01, unit: 'percent'},
} as const satisfies Record<string, NumericEffectParameterDefinition>;

export const LIMITER_PARAMETERS = {
  ceiling: {key: 'limiter.ceiling', defaultValue: -1, min: -24, max: 0, step: 0.5, unit: 'dB'},
  input: {key: 'limiter.input', defaultValue: 0, min: -12, max: 24, step: 0.5, unit: 'dB'},
  release: {key: 'limiter.release', defaultValue: 0.12, min: 0.01, max: 1, step: 0.01, unit: 'seconds'},
  mix: {key: 'limiter.mix', defaultValue: 1, min: 0, max: 1, step: 0.01, unit: 'percent'},
} as const satisfies Record<string, NumericEffectParameterDefinition>;

export const SATURATION_PARAMETERS = {
  drive: {key: 'saturation.drive', defaultValue: 4, min: 0, max: 24, step: 0.5, unit: 'dB'},
  tone: {key: 'saturation.tone', defaultValue: 7200, min: 800, max: 16000, step: 100, unit: 'hertz'},
  mix: {key: 'saturation.mix', defaultValue: 0.45, min: 0, max: 1, step: 0.01, unit: 'percent'},
  output: {key: 'saturation.output', defaultValue: -1, min: -18, max: 6, step: 0.5, unit: 'dB'},
} as const satisfies Record<string, NumericEffectParameterDefinition>;

export const OVERDRIVE_PARAMETERS = {
  drive: {key: 'overdrive.drive', defaultValue: 10, min: 0, max: 30, step: 0.5, unit: 'dB'},
  clip: {key: 'overdrive.clip', defaultValue: 0.55, min: 0.12, max: 1, step: 0.01, unit: 'percent'},
  tone: {key: 'overdrive.tone', defaultValue: 5200, min: 500, max: 14000, step: 100, unit: 'hertz'},
  mix: {key: 'overdrive.mix', defaultValue: 0.65, min: 0, max: 1, step: 0.01, unit: 'percent'},
  output: {key: 'overdrive.output', defaultValue: -3, min: -24, max: 12, step: 0.5, unit: 'dB'},
} as const satisfies Record<string, NumericEffectParameterDefinition>;

export const BITCRUSHER_PARAMETERS = {
  bits: {key: 'bitcrusher.bits', defaultValue: 12, min: 2, max: 16, step: 1, unit: 'bits'},
  rateReduction: {key: 'bitcrusher.rateReduction', defaultValue: 4, min: 1, max: 64, step: 1, unit: 'samples'},
  mix: {key: 'bitcrusher.mix', defaultValue: 0.55, min: 0, max: 1, step: 0.01, unit: 'percent'},
  output: {key: 'bitcrusher.output', defaultValue: -1, min: -18, max: 12, step: 0.5, unit: 'dB'},
} as const satisfies Record<string, NumericEffectParameterDefinition>;

export const CHORUS_PARAMETERS = {
  rate: {key: 'chorus.rate', defaultValue: 1.2, min: 0.05, max: 8, step: 0.05, unit: 'hertz'},
  depth: {key: 'chorus.depth', defaultValue: 0.006, min: 0.001, max: 0.018, step: 0.0005, unit: 'seconds'},
  delay: {key: 'chorus.delay', defaultValue: 0.018, min: 0.004, max: 0.04, step: 0.001, unit: 'seconds'},
  feedback: {key: 'chorus.feedback', defaultValue: 0.18, min: 0, max: 0.72, step: 0.01, unit: 'percent'},
  mix: {key: 'chorus.mix', defaultValue: 0.45, min: 0, max: 1, step: 0.01, unit: 'percent'},
} as const satisfies Record<string, NumericEffectParameterDefinition>;

export const FLANGER_PARAMETERS = {
  rate: {key: 'flanger.rate', defaultValue: 0.45, min: 0.05, max: 8, step: 0.05, unit: 'hertz'},
  depth: {key: 'flanger.depth', defaultValue: 0.0035, min: 0.0005, max: 0.01, step: 0.0005, unit: 'seconds'},
  delay: {key: 'flanger.delay', defaultValue: 0.003, min: 0.0005, max: 0.012, step: 0.0005, unit: 'seconds'},
  feedback: {key: 'flanger.feedback', defaultValue: 0.42, min: 0, max: 0.82, step: 0.01, unit: 'percent'},
  mix: {key: 'flanger.mix', defaultValue: 0.55, min: 0, max: 1, step: 0.01, unit: 'percent'},
} as const satisfies Record<string, NumericEffectParameterDefinition>;

export const PHASER_PARAMETERS = {
  rate: {key: 'phaser.rate', defaultValue: 0.7, min: 0.05, max: 10, step: 0.05, unit: 'hertz'},
  depth: {key: 'phaser.depth', defaultValue: 0.68, min: 0, max: 1, step: 0.01, unit: 'percent'},
  center: {key: 'phaser.center', defaultValue: 820, min: 160, max: 4200, step: 10, unit: 'hertz'},
  feedback: {key: 'phaser.feedback', defaultValue: 0.36, min: 0, max: 0.74, step: 0.01, unit: 'percent'},
  mix: {key: 'phaser.mix', defaultValue: 0.55, min: 0, max: 1, step: 0.01, unit: 'percent'},
} as const satisfies Record<string, NumericEffectParameterDefinition>;

export const TREMOLO_PARAMETERS = {
  rate: {key: 'tremolo.rate', defaultValue: 5, min: 0.1, max: 20, step: 0.1, unit: 'hertz'},
  depth: {key: 'tremolo.depth', defaultValue: 0.65, min: 0, max: 1, step: 0.01, unit: 'percent'},
  pan: {key: 'tremolo.pan', defaultValue: 0.35, min: 0, max: 1, step: 0.01, unit: 'percent'},
  mix: {key: 'tremolo.mix', defaultValue: 1, min: 0, max: 1, step: 0.01, unit: 'percent'},
} as const satisfies Record<string, NumericEffectParameterDefinition>;

export const VIBRATO_PARAMETERS = {
  rate: {key: 'vibrato.rate', defaultValue: 5, min: 0.1, max: 12, step: 0.1, unit: 'hertz'},
  depth: {key: 'vibrato.depth', defaultValue: 0.004, min: 0.0005, max: 0.012, step: 0.0005, unit: 'seconds'},
  delay: {key: 'vibrato.delay', defaultValue: 0.008, min: 0.002, max: 0.02, step: 0.0005, unit: 'seconds'},
  mix: {key: 'vibrato.mix', defaultValue: 0.75, min: 0, max: 1, step: 0.01, unit: 'percent'},
  output: {key: 'vibrato.output', defaultValue: 0, min: -18, max: 12, step: 0.5, unit: 'dB'},
} as const satisfies Record<string, NumericEffectParameterDefinition>;

export const RING_MODULATOR_PARAMETERS = {
  frequency: {key: 'ring.frequency', defaultValue: 160, min: 1, max: 2000, step: 1, unit: 'hertz'},
  depth: {key: 'ring.depth', defaultValue: 0.65, min: 0, max: 1, step: 0.01, unit: 'percent'},
  mix: {key: 'ring.mix', defaultValue: 0.6, min: 0, max: 1, step: 0.01, unit: 'percent'},
  output: {key: 'ring.output', defaultValue: 0, min: -18, max: 12, step: 0.5, unit: 'dB'},
} as const satisfies Record<string, NumericEffectParameterDefinition>;

export const DELAY_PARAMETERS = {
  time: {key: 'delay.time', defaultValue: 0.28, min: 0.02, max: 1.5, step: 0.01, unit: 'seconds'},
  feedback: {key: 'delay.feedback', defaultValue: 0.32, min: 0, max: 0.85, step: 0.01, unit: 'percent'},
  mix: {key: 'delay.mix', defaultValue: 0.35, min: 0, max: 1, step: 0.01, unit: 'percent'},
  tone: {key: 'delay.tone', defaultValue: 6500, min: 500, max: 14000, step: 100, unit: 'hertz'},
} as const satisfies Record<string, NumericEffectParameterDefinition>;

export function createGraphicEqDefaultParameters(): EffectInstance['parameters'] {
  return Object.fromEntries(GRAPHIC_EQ_BANDS.map((band) => [band.parameterKey, GRAPHIC_EQ_DEFAULT_GAIN]));
}

export function createFilterDefaultParameters(): EffectInstance['parameters'] {
  return createNumericEffectDefaultParameters(FILTER_PARAMETERS);
}

export function createCompressorDefaultParameters(): EffectInstance['parameters'] {
  return createNumericEffectDefaultParameters(COMPRESSOR_PARAMETERS);
}

export function createGateDefaultParameters(): EffectInstance['parameters'] {
  return createNumericEffectDefaultParameters(GATE_PARAMETERS);
}

export function createLimiterDefaultParameters(): EffectInstance['parameters'] {
  return createNumericEffectDefaultParameters(LIMITER_PARAMETERS);
}

export function createSaturationDefaultParameters(): EffectInstance['parameters'] {
  return createNumericEffectDefaultParameters(SATURATION_PARAMETERS);
}

export function createOverdriveDefaultParameters(): EffectInstance['parameters'] {
  return createNumericEffectDefaultParameters(OVERDRIVE_PARAMETERS);
}

export function createBitcrusherDefaultParameters(): EffectInstance['parameters'] {
  return createNumericEffectDefaultParameters(BITCRUSHER_PARAMETERS);
}

export function createChorusDefaultParameters(): EffectInstance['parameters'] {
  return createNumericEffectDefaultParameters(CHORUS_PARAMETERS);
}

export function createFlangerDefaultParameters(): EffectInstance['parameters'] {
  return createNumericEffectDefaultParameters(FLANGER_PARAMETERS);
}

export function createPhaserDefaultParameters(): EffectInstance['parameters'] {
  return createNumericEffectDefaultParameters(PHASER_PARAMETERS);
}

export function createTremoloDefaultParameters(): EffectInstance['parameters'] {
  return createNumericEffectDefaultParameters(TREMOLO_PARAMETERS);
}

export function createVibratoDefaultParameters(): EffectInstance['parameters'] {
  return createNumericEffectDefaultParameters(VIBRATO_PARAMETERS);
}

export function createRingModulatorDefaultParameters(): EffectInstance['parameters'] {
  return createNumericEffectDefaultParameters(RING_MODULATOR_PARAMETERS);
}

export function createDelayDefaultParameters(): EffectInstance['parameters'] {
  return createNumericEffectDefaultParameters(DELAY_PARAMETERS);
}

export function getGraphicEqBandGain(effect: EffectInstance, parameterKey: string) {
  const value = effect.parameters[parameterKey];
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return GRAPHIC_EQ_DEFAULT_GAIN;
  }

  return Math.max(GRAPHIC_EQ_GAIN_MIN, Math.min(GRAPHIC_EQ_GAIN_MAX, value));
}

export function getNumericEffectParameterValue(
  effect: EffectInstance,
  definition: NumericEffectParameterDefinition,
) {
  const value = effect.parameters[definition.key];
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return definition.defaultValue;
  }

  return Math.max(definition.min, Math.min(definition.max, value));
}

function createNumericEffectDefaultParameters(
  parameters: Record<string, NumericEffectParameterDefinition>,
): EffectInstance['parameters'] {
  return Object.fromEntries(
    Object.values(parameters).map((definition) => [definition.key, definition.defaultValue]),
  );
}
