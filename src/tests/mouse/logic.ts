// Framework-free logic for the mouse test module.
// No Vue imports and no imports from src/core.

export const MOUSE_BUTTONS = [0, 1, 2, 3, 4] as const;

export type MouseButton = (typeof MOUSE_BUTTONS)[number];

export const MOUSE_BUTTON_NAMES = ['left', 'middle', 'right', 'back', 'forward'] as const;

export type MouseButtonType = (typeof MOUSE_BUTTON_NAMES)[number];

export function mouseButtonName(button: number): MouseButtonType | null {
  if (!Number.isInteger(button) || button < 0 || button > 4) {
    return null;
  }
  return MOUSE_BUTTON_NAMES[button] as MouseButtonType;
}

export function isMouseButton(button: number): button is MouseButton {
  return Number.isInteger(button) && button >= 0 && button <= 4;
}

// ---------- Button state reducer ----------

export interface ButtonTestState {
  readonly pressed: readonly boolean[];
  readonly tested: readonly boolean[];
}

export type ButtonAction =
  | { readonly type: 'mousedown'; readonly button: number }
  | { readonly type: 'mouseup'; readonly button: number }
  | { readonly type: 'reset' };

export function initialButtonState(): ButtonTestState {
  return {
    pressed: [false, false, false, false, false],
    tested: [false, false, false, false, false],
  };
}

export function buttonReducer(state: ButtonTestState, action: ButtonAction): ButtonTestState {
  switch (action.type) {
    case 'reset':
      return initialButtonState();
    case 'mousedown': {
      if (!isMouseButton(action.button)) {
        return state;
      }
      const pressed = state.pressed.slice();
      const tested = state.tested.slice();
      pressed[action.button] = true;
      tested[action.button] = true;
      return { pressed, tested };
    }
    case 'mouseup': {
      if (!isMouseButton(action.button)) {
        return state;
      }
      const pressed = state.pressed.slice();
      pressed[action.button] = false;
      return { pressed, tested: state.tested.slice() };
    }
    default: {
      const exhaustive: never = action;
      void exhaustive;
      return state;
    }
  }
}

export function isButtonPressed(state: ButtonTestState, button: number): boolean {
  if (!isMouseButton(button)) {
    return false;
  }
  return state.pressed[button] === true;
}

export function isButtonTested(state: ButtonTestState, button: number): boolean {
  if (!isMouseButton(button)) {
    return false;
  }
  return state.tested[button] === true;
}

export function testedButtonCount(state: ButtonTestState): number {
  return state.tested.reduce((count, value) => (value ? count + 1 : count), 0);
}

export function allButtonsTested(state: ButtonTestState): boolean {
  return state.tested.every((value) => value === true);
}

// ---------- Double-click / click interval ----------

export interface ClickTrackerState {
  readonly clickCount: number;
  readonly lastClickAt: number | null;
  readonly lastIntervalMs: number | null;
  readonly intervals: readonly number[];
}

export type ClickAction =
  | { readonly type: 'click'; readonly timestamp: number }
  | { readonly type: 'reset' };

export function initialClickTrackerState(): ClickTrackerState {
  return {
    clickCount: 0,
    lastClickAt: null,
    lastIntervalMs: null,
    intervals: [],
  };
}

export function clickInterval(firstMs: number, secondMs: number): number | null {
  const delta = secondMs - firstMs;
  if (delta < 0) {
    return null;
  }
  return delta;
}

export function clickTrackerReducer(state: ClickTrackerState, action: ClickAction): ClickTrackerState {
  switch (action.type) {
    case 'reset':
      return initialClickTrackerState();
    case 'click': {
      if (state.lastClickAt === null) {
        return {
          clickCount: state.clickCount + 1,
          lastClickAt: action.timestamp,
          lastIntervalMs: null,
          intervals: state.intervals,
        };
      }
      const delta = action.timestamp - state.lastClickAt;
      const interval = delta >= 0 ? delta : null;
      const nextIntervals = interval === null ? state.intervals : [...state.intervals, interval];
      return {
        clickCount: state.clickCount + 1,
        lastClickAt: action.timestamp,
        lastIntervalMs: interval,
        intervals: nextIntervals,
      };
    }
    default: {
      const exhaustive: never = action;
      void exhaustive;
      return state;
    }
  }
}

export function medianClickInterval(intervals: readonly number[]): number | null {
  if (intervals.length === 0) {
    return null;
  }
  const sorted = [...intervals].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle] as number;
  }
  return ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
}

// ---------- Wheel classification ----------

export type WheelDirection = 'up' | 'down' | 'left' | 'right' | null;

export type DeltaModeLabel = 'pixel' | 'line' | 'page' | 'unknown';

export function classifyWheel(deltaX: number, deltaY: number): WheelDirection {
  if (deltaX === 0 && deltaY === 0) {
    return null;
  }
  if (Math.abs(deltaY) >= Math.abs(deltaX)) {
    return deltaY < 0 ? 'up' : 'down';
  }
  return deltaX < 0 ? 'left' : 'right';
}

export function deltaModeLabel(mode: number): DeltaModeLabel {
  switch (mode) {
    case 0:
      return 'pixel';
    case 1:
      return 'line';
    case 2:
      return 'page';
    default:
      return 'unknown';
  }
}

// ---------- Drag ----------

export interface DragState {
  readonly dragging: boolean;
  readonly startX: number | null;
  readonly startY: number | null;
  readonly x: number | null;
  readonly y: number | null;
  readonly distance: number;
  readonly completed: boolean;
}

export type DragAction =
  | { readonly type: 'start'; readonly x: number; readonly y: number }
  | { readonly type: 'move'; readonly x: number; readonly y: number }
  | { readonly type: 'end'; readonly x: number; readonly y: number }
  | { readonly type: 'reset' };

export function initialDragState(): DragState {
  return {
    dragging: false,
    startX: null,
    startY: null,
    x: null,
    y: null,
    distance: 0,
    completed: false,
  };
}

export function dragDistance(startX: number, startY: number, endX: number, endY: number): number {
  const dx = endX - startX;
  const dy = endY - startY;
  return Math.hypot(dx, dy);
}

export function dragReducer(state: DragState, action: DragAction): DragState {
  switch (action.type) {
    case 'reset':
      return initialDragState();
    case 'start': {
      return {
        dragging: true,
        startX: action.x,
        startY: action.y,
        x: action.x,
        y: action.y,
        distance: 0,
        completed: false,
      };
    }
    case 'move': {
      if (!state.dragging || state.startX === null || state.startY === null) {
        return state;
      }
      return {
        dragging: true,
        startX: state.startX,
        startY: state.startY,
        x: action.x,
        y: action.y,
        distance: dragDistance(state.startX, state.startY, action.x, action.y),
        completed: false,
      };
    }
    case 'end': {
      if (state.startX === null || state.startY === null) {
        return state;
      }
      const endX = action.x;
      const endY = action.y;
      return {
        dragging: false,
        startX: state.startX,
        startY: state.startY,
        x: endX,
        y: endY,
        distance: dragDistance(state.startX, state.startY, endX, endY),
        completed: true,
      };
    }
    default: {
      const exhaustive: never = action;
      void exhaustive;
      return state;
    }
  }
}

export function isDrag(distance: number, threshold: number = 5): boolean {
  return distance >= threshold;
}

// ---------- Chatter detection ----------

export const DEFAULT_CHATTER_THRESHOLD_MS = 50;

export interface ChatterState {
  readonly lastDownAt: number | null;
  readonly chatterCount: number;
  readonly lastIntervalMs: number | null;
}

export type ChatterAction =
  | { readonly type: 'mousedown'; readonly timestamp: number; readonly thresholdMs?: number }
  | { readonly type: 'reset' };

export function initialChatterState(): ChatterState {
  return {
    lastDownAt: null,
    chatterCount: 0,
    lastIntervalMs: null,
  };
}

export function isChatter(
  previousDownMs: number | null,
  currentDownMs: number,
  thresholdMs: number = DEFAULT_CHATTER_THRESHOLD_MS,
): boolean {
  if (previousDownMs === null) {
    return false;
  }
  const delta = currentDownMs - previousDownMs;
  if (delta < 0) {
    return false;
  }
  return delta < thresholdMs;
}

export function chatterReducer(state: ChatterState, action: ChatterAction): ChatterState {
  switch (action.type) {
    case 'reset':
      return initialChatterState();
    case 'mousedown': {
      const threshold = action.thresholdMs ?? DEFAULT_CHATTER_THRESHOLD_MS;
      const chatter = isChatter(state.lastDownAt, action.timestamp, threshold);
      return {
        lastDownAt: action.timestamp,
        chatterCount: chatter ? state.chatterCount + 1 : state.chatterCount,
        lastIntervalMs:
          state.lastDownAt === null ? null : action.timestamp - state.lastDownAt,
      };
    }
    default: {
      const exhaustive: never = action;
      void exhaustive;
      return state;
    }
  }
}

// ---------- Polling rate ----------

export const STANDARD_POLLING_RATES = [125, 250, 500, 1000, 2000, 4000, 8000] as const;

export type StandardPollingRate = (typeof STANDARD_POLLING_RATES)[number];

export interface PollingRateEstimate {
  readonly sampleCount: number;
  readonly acceptedCount: number;
  readonly rejectedCount: number;
  readonly medianIntervalMs: number | null;
  readonly estimatedHz: number | null;
  readonly nearestStandardHz: StandardPollingRate | null;
}

function median(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle] as number;
  }
  return ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
}

export function removeOutlierIntervals(intervals: readonly number[]): number[] {
  const valid = intervals.filter((value) => value > 0);
  if (valid.length < 3) {
    return [...valid];
  }
  const center = median(valid);
  const deviations = valid.map((value) => Math.abs(value - center)).sort((left, right) => left - right);
  const mad = median(deviations);
  let accepted: number[];
  if (mad > 0) {
    const threshold = (3.5 * mad) / 0.6745;
    accepted = valid.filter((value) => Math.abs(value - center) <= threshold);
  } else {
    const tolerance = Math.max(center * 0.1, 1);
    accepted = valid.filter((value) => Math.abs(value - center) <= tolerance);
  }
  return accepted.length > 0 ? accepted : [...valid];
}

export function intervalsFromTimestamps(timestamps: readonly number[]): number[] {
  const intervals: number[] = [];
  for (let i = 1; i < timestamps.length; i += 1) {
    const prev = timestamps[i - 1];
    const cur = timestamps[i];
    if (prev === undefined || cur === undefined) {
      continue;
    }
    const delta = cur - prev;
    if (delta > 0) {
      intervals.push(delta);
    }
  }
  return intervals;
}

export function estimatePollingRate(timestamps: readonly number[]): PollingRateEstimate {
  const intervals = intervalsFromTimestamps(timestamps);
  const valid = intervals.filter((value) => value > 0);
  const accepted = removeOutlierIntervals(valid);
  const medianIntervalMs = accepted.length > 0 ? median(accepted) : null;
  const estimatedHz =
    medianIntervalMs !== null && medianIntervalMs > 0 ? 1000 / medianIntervalMs : null;
  return {
    sampleCount: valid.length,
    acceptedCount: accepted.length,
    rejectedCount: valid.length - accepted.length,
    medianIntervalMs,
    estimatedHz,
    nearestStandardHz:
      estimatedHz === null ? null : nearestStandardPollingRate(estimatedHz),
  };
}

export function nearestStandardPollingRate(hz: number): StandardPollingRate | null {
  if (hz <= 0) {
    return null;
  }
  let nearest: StandardPollingRate = STANDARD_POLLING_RATES[0];
  let bestDistance = Math.abs(hz - nearest);
  for (const rate of STANDARD_POLLING_RATES) {
    const distance = Math.abs(hz - rate);
    if (distance < bestDistance) {
      bestDistance = distance;
      nearest = rate;
    }
  }
  return nearest;
}
