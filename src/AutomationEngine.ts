// / - Arinara Network © 2026 - /
// This source code is the exclusive property of Arinara Network.
// Unauthorized use, reproduction, distribution, or modification of this
// code — in whole or in part — for any purpose whatsoever is strictly
// prohibited without prior written consent from Arinara Network as the
// sole legal owner of this codebase.
import type {AutomationKeyframe, AutomationLane} from './Types';

export const CLIP_GAIN_PARAMETER_ID = 'clip.gain';
export const CLIP_PITCH_PARAMETER_ID = 'clip.pitch';

export interface AutomationSample {
  time: number;
  value: number;
}

export function getAutomationLane(lanes: AutomationLane[], parameterId: string): AutomationLane | null {
  return lanes.find((lane) => lane.parameterId === parameterId) ?? null;
}

export function getSortedKeyframes(lane: AutomationLane | null): AutomationKeyframe[] {
  return [...(lane?.keyframes ?? [])].sort((first, second) => first.time - second.time);
}

export function evaluateAutomationValue(lane: AutomationLane | null, fallbackValue: number, timelineTime: number): number {
  const keyframes = getSortedKeyframes(lane);
  if (keyframes.length === 0) {
    return fallbackValue;
  }

  if (timelineTime <= keyframes[0].time) {
    return keyframes[0].value;
  }

  const finalKeyframe = keyframes[keyframes.length - 1];
  if (timelineTime >= finalKeyframe.time) {
    return finalKeyframe.value;
  }

  for (let index = 0; index < keyframes.length - 1; index += 1) {
    const left = keyframes[index];
    const right = keyframes[index + 1];
    if (timelineTime >= left.time && timelineTime <= right.time) {
      const progress = (timelineTime - left.time) / Math.max(0.0001, right.time - left.time);
      return interpolateKeyframes(left, right, progress);
    }
  }

  return fallbackValue;
}

export function upsertKeyframe(lanes: AutomationLane[], laneId: string, parameterId: string, keyframe: AutomationKeyframe) {
  const existingLane = getAutomationLane(lanes, parameterId);
  if (!existingLane) {
    return [
      ...lanes,
      {
        id: laneId,
        parameterId,
        anchorMode: 'timeline-locked' as const,
        keyframes: [keyframe],
      },
    ];
  }

  return lanes.map((lane) => {
    if (lane.id !== existingLane.id) {
      return lane;
    }

    const keyframes = lane.keyframes.filter((item) => Math.abs(item.time - keyframe.time) > 0.01);
    return {
      ...lane,
      keyframes: [...keyframes, keyframe].sort((first, second) => first.time - second.time),
    };
  });
}

export function deleteKeyframeNearTime(lanes: AutomationLane[], parameterId: string, timelineTime: number, tolerance = 0.04) {
  return lanes.map((lane) => {
    if (lane.parameterId !== parameterId) {
      return lane;
    }

    return {
      ...lane,
      keyframes: lane.keyframes.filter((keyframe) => Math.abs(keyframe.time - timelineTime) > tolerance),
    };
  });
}

export function findAdjacentKeyframeTime(lane: AutomationLane | null, timelineTime: number, direction: 'previous' | 'next') {
  const keyframes = getSortedKeyframes(lane);
  if (direction === 'previous') {
    return [...keyframes].reverse().find((keyframe) => keyframe.time < timelineTime - 0.01)?.time ?? null;
  }

  return keyframes.find((keyframe) => keyframe.time > timelineTime + 0.01)?.time ?? null;
}

export function findNearestKeyframe(
  lane: AutomationLane | null,
  timelineTime: number,
  maxDistance = Number.POSITIVE_INFINITY,
): AutomationKeyframe | null {
  const keyframes = getSortedKeyframes(lane);
  let nearest: AutomationKeyframe | null = null;
  let nearestDistance = maxDistance;

  keyframes.forEach((keyframe) => {
    const distance = Math.abs(keyframe.time - timelineTime);
    if (distance <= nearestDistance) {
      nearest = keyframe;
      nearestDistance = distance;
    }
  });

  return nearest;
}

export function updateKeyframe(
  lanes: AutomationLane[],
  parameterId: string,
  keyframeId: string,
  patch: Partial<Pick<AutomationKeyframe, 'time' | 'value' | 'easing' | 'bezier'>>,
) {
  return lanes.map((lane) => {
    if (lane.parameterId !== parameterId) {
      return lane;
    }

    return {
      ...lane,
      keyframes: lane.keyframes
        .map((keyframe) => (keyframe.id === keyframeId ? {...keyframe, ...patch} : keyframe))
        .sort((first, second) => first.time - second.time),
    };
  });
}

export function sampleAutomationCurve(
  lane: AutomationLane | null,
  fallbackValue: number,
  startTime: number,
  endTime: number,
  sampleCount = 72,
): AutomationSample[] {
  const safeStart = Math.min(startTime, endTime);
  const safeEnd = Math.max(startTime, endTime);
  const duration = Math.max(0.0001, safeEnd - safeStart);
  const samples = new Set<number>();
  const keyframes = getSortedKeyframes(lane);
  const count = Math.max(2, Math.min(240, Math.round(sampleCount)));

  samples.add(safeStart);
  samples.add(safeEnd);
  keyframes.forEach((keyframe) => {
    if (keyframe.time >= safeStart && keyframe.time <= safeEnd) {
      samples.add(Number(keyframe.time.toFixed(4)));
    }
  });

  for (let index = 0; index < count; index += 1) {
    const progress = index / Math.max(1, count - 1);
    samples.add(Number((safeStart + duration * progress).toFixed(4)));
  }

  return [...samples]
    .sort((first, second) => first - second)
    .map((time) => ({
      time,
      value: evaluateAutomationValue(lane, fallbackValue, time),
    }));
}

function interpolateKeyframes(left: AutomationKeyframe, right: AutomationKeyframe, progress: number) {
  if (left.easing === 'hold') {
    return left.value;
  }

  const shapedProgress = shapeProgress(progress, left);
  return left.value + (right.value - left.value) * shapedProgress;
}

function shapeProgress(progress: number, keyframe: AutomationKeyframe) {
  if (keyframe.easing === 'custom-bezier' && keyframe.bezier) {
    return cubicBezierProgress(progress, keyframe.bezier);
  }

  if (keyframe.easing === 'ease-in') {
    return progress * progress;
  }

  if (keyframe.easing === 'ease-out') {
    return 1 - Math.pow(1 - progress, 2);
  }

  if (keyframe.easing === 'ease-in-out') {
    return progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
  }

  return progress;
}

function cubicBezierProgress(progress: number, bezier: [number, number, number, number]) {
  const [x1, y1, x2, y2] = bezier.map(clamp01) as [number, number, number, number];
  const t = solveBezierT(clamp01(progress), x1, x2);
  return clamp01(cubicBezierCoordinate(t, y1, y2));
}

function solveBezierT(targetX: number, x1: number, x2: number) {
  let t = targetX;

  for (let index = 0; index < 6; index += 1) {
    const x = cubicBezierCoordinate(t, x1, x2) - targetX;
    const derivative = cubicBezierDerivative(t, x1, x2);
    if (Math.abs(x) < 0.00001 || derivative < 0.00001) {
      break;
    }

    t = clamp01(t - x / derivative);
  }

  let low = 0;
  let high = 1;
  for (let index = 0; index < 8; index += 1) {
    const x = cubicBezierCoordinate(t, x1, x2);
    if (Math.abs(x - targetX) < 0.00001) {
      break;
    }

    if (x < targetX) {
      low = t;
    } else {
      high = t;
    }
    t = (low + high) / 2;
  }

  return clamp01(t);
}

function cubicBezierCoordinate(t: number, point1: number, point2: number) {
  const inverse = 1 - t;
  return 3 * inverse * inverse * t * point1 + 3 * inverse * t * t * point2 + t * t * t;
}

function cubicBezierDerivative(t: number, point1: number, point2: number) {
  const inverse = 1 - t;
  return 3 * inverse * inverse * point1 + 6 * inverse * t * (point2 - point1) + 3 * t * t * (1 - point2);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}
