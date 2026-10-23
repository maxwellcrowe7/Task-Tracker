import { describe, it, expect } from 'vitest'
import { resolveTheme } from '../src/lib/themeRules.js'

const at = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return new Date(2026, 9, 22, h, m)
}

describe('resolveTheme', () => {
  it('light and dark ignore the time', () => {
    expect(resolveTheme({ mode: 'light' }, at('23:00'))).toBe('light')
    expect(resolveTheme({ mode: 'dark' }, at('12:00'))).toBe('dark')
  })

  it('auto defaults to dark 7pm to 7am', () => {
    expect(resolveTheme({}, at('18:59'))).toBe('light')
    expect(resolveTheme({}, at('19:00'))).toBe('dark')
    expect(resolveTheme({}, at('02:30'))).toBe('dark')
    expect(resolveTheme({}, at('07:00'))).toBe('light')
  })

  it('auto with a window inside one day', () => {
    const s = { mode: 'auto', darkFrom: '13:00', darkUntil: '15:00' }
    expect(resolveTheme(s, at('14:00'))).toBe('dark')
    expect(resolveTheme(s, at('16:00'))).toBe('light')
  })

  it('identical times mean always light', () => {
    expect(resolveTheme({ mode: 'auto', darkFrom: '08:00', darkUntil: '08:00' }, at('08:00'))).toBe('light')
  })
})
