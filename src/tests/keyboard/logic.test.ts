import { describe, expect, it } from 'vitest'
import {
  createKeyboardState,
  pressKey,
  releaseKey,
  testedCount,
  totalCount,
  shouldPreventDefault,
  KEYBOARD_LAYOUT,
} from '@/tests/keyboard/logic'

describe('keyboard logic', () => {
  it('total count matches layout', () => {
    let n = 0
    for (const row of KEYBOARD_LAYOUT) n += row.length
    expect(totalCount()).toBe(n)
    expect(totalCount()).toBeGreaterThan(0)
  })

  it('press marks tested and tracks pressed', () => {
    let s = createKeyboardState()
    s = pressKey(s, 'KeyA', 1)
    expect(s.pressed.has('KeyA')).toBe(true)
    expect(s.tested.has('KeyA')).toBe(true)
    expect(testedCount(s)).toBe(1)
  })

  it('release removes from pressed but keeps tested', () => {
    let s = createKeyboardState()
    s = pressKey(s, 'KeyA', 1)
    s = releaseKey(s, 'KeyA', 2)
    expect(s.pressed.has('KeyA')).toBe(false)
    expect(s.tested.has('KeyA')).toBe(true)
  })

  it('tracks max simultaneous', () => {
    let s = createKeyboardState()
    s = pressKey(s, 'KeyA', 1)
    s = pressKey(s, 'KeyB', 2)
    expect(s.maxSimultaneous).toBe(2)
    s = releaseKey(s, 'KeyA', 3)
    expect(s.maxSimultaneous).toBe(2)
  })

  it('records recent events capped', () => {
    let s = createKeyboardState()
    for (let i = 0; i < 25; i++) s = pressKey(s, `Key${i}`, i)
    expect(s.recentEvents.length).toBe(20)
  })

  it('shouldPreventDefault for space and arrows', () => {
    expect(shouldPreventDefault('Space')).toBe(true)
    expect(shouldPreventDefault('ArrowDown')).toBe(true)
    expect(shouldPreventDefault('KeyA')).toBe(false)
  })
})
