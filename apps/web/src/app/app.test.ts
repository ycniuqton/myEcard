import { describe, expect, it } from 'vitest'
import { TabId } from '../design/primitives'
import { TabPolicy } from './routes'
import { ResolvedTheme, ThemePreference, ThemeResolver } from './theme/themeResolver'

describe('ThemeResolver', () => {
  it('follows the system only in System mode', () => {
    expect(ThemeResolver.resolve(ThemePreference.System, true)).toBe(ResolvedTheme.Dark)
    expect(ThemeResolver.resolve(ThemePreference.System, false)).toBe(ResolvedTheme.Light)
    expect(ThemeResolver.resolve(ThemePreference.Light, true)).toBe(ResolvedTheme.Light)
    expect(ThemeResolver.resolve(ThemePreference.Dark, false)).toBe(ResolvedTheme.Dark)
  })

  it('falls back to System for unknown stored values', () => {
    expect(ThemeResolver.parse('purple')).toBe(ThemePreference.System)
    expect(ThemeResolver.parse('dark')).toBe(ThemePreference.Dark)
  })
})

describe('TabPolicy', () => {
  it('hides tabs in session, summary and placement', () => {
    expect(TabPolicy.hidesTabs('/session')).toBe(true)
    expect(TabPolicy.hidesTabs('/summary')).toBe(true)
    expect(TabPolicy.hidesTabs('/map')).toBe(false)
    expect(TabPolicy.hidesTabs('/word/412')).toBe(false)
  })

  it('maps pathnames to tabs', () => {
    expect(TabPolicy.activeTab('/')).toBe(TabId.Today)
    expect(TabPolicy.activeTab('/band/13')).toBe(TabId.Map)
    expect(TabPolicy.activeTab('/settings')).toBe(TabId.Progress)
    expect(TabPolicy.activeTab('/word/1')).toBeUndefined()
  })
})
