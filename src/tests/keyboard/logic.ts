export interface KeyboardKey {
  code: string
  label: string
}

export type KeyboardEventRecord = {
  code: string
  type: 'down' | 'up'
  timestamp: number
}

export interface KeyboardState {
  pressed: Set<string>
  tested: Set<string>
  maxSimultaneous: number
  recentEvents: KeyboardEventRecord[]
}

const ROW = (keys: KeyboardKey[]): KeyboardKey[] => keys

export const KEYBOARD_LAYOUT: KeyboardKey[][] = [
  ROW([
    { code: 'Escape', label: 'Esc' },
    { code: 'F1', label: 'F1' },
    { code: 'F2', label: 'F2' },
    { code: 'F3', label: 'F3' },
    { code: 'F4', label: 'F4' },
    { code: 'F5', label: 'F5' },
    { code: 'F6', label: 'F6' },
    { code: 'F7', label: 'F7' },
    { code: 'F8', label: 'F8' },
    { code: 'F9', label: 'F9' },
    { code: 'F10', label: 'F10' },
    { code: 'F11', label: 'F11' },
    { code: 'F12', label: 'F12' },
    { code: 'PrintScreen', label: 'PrtSc' },
    { code: 'ScrollLock', label: 'ScrLk' },
    { code: 'Pause', label: 'Pause' },
  ]),
  ROW([
    { code: 'Backquote', label: '`' },
    { code: 'Digit1', label: '1' },
    { code: 'Digit2', label: '2' },
    { code: 'Digit3', label: '3' },
    { code: 'Digit4', label: '4' },
    { code: 'Digit5', label: '5' },
    { code: 'Digit6', label: '6' },
    { code: 'Digit7', label: '7' },
    { code: 'Digit8', label: '8' },
    { code: 'Digit9', label: '9' },
    { code: 'Digit0', label: '0' },
    { code: 'Minus', label: '-' },
    { code: 'Equal', label: '=' },
    { code: 'Backspace', label: 'Backspace' },
  ]),
  ROW([
    { code: 'Tab', label: 'Tab' },
    { code: 'KeyQ', label: 'Q' },
    { code: 'KeyW', label: 'W' },
    { code: 'KeyE', label: 'E' },
    { code: 'KeyR', label: 'R' },
    { code: 'KeyT', label: 'T' },
    { code: 'KeyY', label: 'Y' },
    { code: 'KeyU', label: 'U' },
    { code: 'KeyI', label: 'I' },
    { code: 'KeyO', label: 'O' },
    { code: 'KeyP', label: 'P' },
    { code: 'BracketLeft', label: '[' },
    { code: 'BracketRight', label: ']' },
    { code: 'Backslash', label: '\\' },
  ]),
  ROW([
    { code: 'CapsLock', label: 'Caps' },
    { code: 'KeyA', label: 'A' },
    { code: 'KeyS', label: 'S' },
    { code: 'KeyD', label: 'D' },
    { code: 'KeyF', label: 'F' },
    { code: 'KeyG', label: 'G' },
    { code: 'KeyH', label: 'H' },
    { code: 'KeyJ', label: 'J' },
    { code: 'KeyK', label: 'K' },
    { code: 'KeyL', label: 'L' },
    { code: 'Semicolon', label: ';' },
    { code: 'Quote', label: "'" },
    { code: 'Enter', label: 'Enter' },
  ]),
  ROW([
    { code: 'ShiftLeft', label: 'Shift' },
    { code: 'KeyZ', label: 'Z' },
    { code: 'KeyX', label: 'X' },
    { code: 'KeyC', label: 'C' },
    { code: 'KeyV', label: 'V' },
    { code: 'KeyB', label: 'B' },
    { code: 'KeyN', label: 'N' },
    { code: 'KeyM', label: 'M' },
    { code: 'Comma', label: ',' },
    { code: 'Period', label: '.' },
    { code: 'Slash', label: '/' },
    { code: 'ShiftRight', label: 'Shift' },
  ]),
  ROW([
    { code: 'ControlLeft', label: 'Ctrl' },
    { code: 'MetaLeft', label: 'Win' },
    { code: 'AltLeft', label: 'Alt' },
    { code: 'Space', label: 'Space' },
    { code: 'AltRight', label: 'Alt' },
    { code: 'MetaRight', label: 'Win' },
    { code: 'ContextMenu', label: 'Menu' },
    { code: 'ControlRight', label: 'Ctrl' },
  ]),
  ROW([
    { code: 'Insert', label: 'Ins' },
    { code: 'Home', label: 'Home' },
    { code: 'PageUp', label: 'PgUp' },
  ]),
  ROW([
    { code: 'Delete', label: 'Del' },
    { code: 'End', label: 'End' },
    { code: 'PageDown', label: 'PgDn' },
  ]),
  ROW([
    { code: 'ArrowUp', label: '↑' },
  ]),
  ROW([
    { code: 'ArrowLeft', label: '←' },
    { code: 'ArrowDown', label: '↓' },
    { code: 'ArrowRight', label: '→' },
  ]),
]

export function createKeyboardState(): KeyboardState {
  return {
    pressed: new Set<string>(),
    tested: new Set<string>(),
    maxSimultaneous: 0,
    recentEvents: [],
  }
}

export function pressKey(
  state: KeyboardState,
  code: string,
  timestamp = Date.now(),
): KeyboardState {
  const pressed = new Set(state.pressed)
  pressed.add(code)
  const tested = new Set(state.tested)
  tested.add(code)
  const maxSimultaneous = Math.max(state.maxSimultaneous, pressed.size)
  const recentEvents = [{ code, type: 'down' as const, timestamp }, ...state.recentEvents].slice(0, 20)
  return { pressed, tested, maxSimultaneous, recentEvents }
}

export function releaseKey(
  state: KeyboardState,
  code: string,
  timestamp = Date.now(),
): KeyboardState {
  const pressed = new Set(state.pressed)
  pressed.delete(code)
  const recentEvents = [{ code, type: 'up' as const, timestamp }, ...state.recentEvents].slice(0, 20)
  return {
    pressed,
    tested: new Set(state.tested),
    maxSimultaneous: state.maxSimultaneous,
    recentEvents,
  }
}

export function testedCount(state: KeyboardState): number {
  return state.tested.size
}

export function totalCount(): number {
  let n = 0
  for (const row of KEYBOARD_LAYOUT) n += row.length
  return n
}

const PREVENT_DEFAULT_CODES = new Set<string>([
  'Space',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  'Tab',
])

export function shouldPreventDefault(code: string): boolean {
  return PREVENT_DEFAULT_CODES.has(code)
}
