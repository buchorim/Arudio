// / - Arinara Network © 2026 - /
// This source code is the exclusive property of Arinara Network.
// Unauthorized use, reproduction, distribution, or modification of this
// code — in whole or in part — for any purpose whatsoever is strictly
// prohibited without prior written consent from Arinara Network as the
// sole legal owner of this codebase.
import {CLIP_GAIN_PARAMETER_ID, CLIP_PITCH_PARAMETER_ID} from './AutomationEngine';
import type {Clip} from './Types';

export type ClipAutomationParameterId = typeof CLIP_GAIN_PARAMETER_ID | typeof CLIP_PITCH_PARAMETER_ID;
export type ClipAutomationNumberProperty = Extract<keyof Clip, 'gain' | 'pitch'>;

export interface ClipAutomationParameterDefinition {
  id: ClipAutomationParameterId;
  property: ClipAutomationNumberProperty;
  label: string;
  keyframeLabel: string;
  summarySuffix: string | null;
  minimum: number;
  maximum: number;
  step: number;
  precision: number;
  laneClass: string;
  markerClass: string;
  emptyScopeLabel: 'CLIP' | 'LINKED';
  engineSupport: 'playback-export';
  editOutsideClipMessage: string;
  formatValue: (value: number) => string;
}

export const CLIP_AUTOMATION_PARAMETERS: ClipAutomationParameterDefinition[] = [
  {
    id: CLIP_GAIN_PARAMETER_ID,
    property: 'gain',
    label: 'Gain',
    keyframeLabel: 'Gain Keyframes',
    summarySuffix: null,
    minimum: -24,
    maximum: 12,
    step: 0.1,
    precision: 1,
    laneClass: 'gain',
    markerClass: 'gain',
    emptyScopeLabel: 'CLIP',
    engineSupport: 'playback-export',
    editOutsideClipMessage: 'Move playhead inside the clip to edit automated gain',
    formatValue: (value) => `${value >= 0 ? '+' : ''}${value.toFixed(1)} dB`,
  },
  {
    id: CLIP_PITCH_PARAMETER_ID,
    property: 'pitch',
    label: 'Pitch',
    keyframeLabel: 'Pitch Keyframes',
    summarySuffix: 'Linked',
    minimum: -12,
    maximum: 12,
    step: 0.1,
    precision: 1,
    laneClass: 'pitch',
    markerClass: 'pitch',
    emptyScopeLabel: 'CLIP',
    engineSupport: 'playback-export',
    editOutsideClipMessage: 'Move playhead inside the clip to edit automated pitch',
    formatValue: (value) => `${value >= 0 ? '+' : ''}${value.toFixed(1)} st`,
  },
];

export function getClipAutomationParameterDefinition(parameterId: string) {
  return CLIP_AUTOMATION_PARAMETERS.find((parameter) => parameter.id === parameterId) ?? null;
}

export function getClipAutomationParameterByProperty(property: keyof Clip) {
  return CLIP_AUTOMATION_PARAMETERS.find((parameter) => parameter.property === property) ?? null;
}

export function getClipAutomationParameterValue(clip: Clip, parameter: ClipAutomationParameterDefinition) {
  return Number(clip[parameter.property]);
}

export function clampClipAutomationParameterValue(parameter: ClipAutomationParameterDefinition, value: number) {
  return Math.max(parameter.minimum, Math.min(parameter.maximum, value));
}
