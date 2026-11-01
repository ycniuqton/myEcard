import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { MediaQueries } from '../../features/common/MediaQueries'
import { ResolvedTheme, ThemeDom, ThemePreference, ThemeResolver, ThemeStorage } from './themeResolver'

export interface ThemeContextValue {
  preference: ThemePreference
  resolved: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readSystemDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(MediaQueries.DARK).matches
}

/** Applies data-theme on the document root and follows the OS in System mode. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => ThemeStorage.read())
  const [systemDark, setSystemDark] = useState<boolean>(readSystemDark)

  useEffect(() => {
    const query = window.matchMedia(MediaQueries.DARK)
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const resolved = ThemeResolver.resolve(preference, systemDark)

  useEffect(() => {
    document.documentElement.setAttribute(ThemeDom.ATTRIBUTE, resolved)
  }, [resolved])

  const setPreference = useCallback((next: ThemePreference) => {
    ThemeStorage.write(next)
    setPreferenceState(next)
  }, [])

  const value = useMemo(() => ({ preference, resolved, setPreference }), [preference, resolved, setPreference])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/** Reads the current theme and its setter; must sit under ThemeProvider. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
