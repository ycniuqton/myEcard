import { StorageKeys } from '../../features/common/StorageKeys'

export enum ThemePreference {
  System = 'system',
  Light = 'light',
  Dark = 'dark',
}

export enum ResolvedTheme {
  Light = 'light',
  Dark = 'dark',
}

/** DOM attribute that carries the resolved theme. */
export class ThemeDom {
  static readonly ATTRIBUTE = 'data-theme'
}

/** Turns a theme preference plus the OS setting into a concrete theme. */
export class ThemeResolver {
  static resolve(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
    if (preference === ThemePreference.Dark) return ResolvedTheme.Dark
    if (preference === ThemePreference.Light) return ResolvedTheme.Light
    return systemDark ? ResolvedTheme.Dark : ResolvedTheme.Light
  }

  static parse(raw: string | null | undefined): ThemePreference {
    const all = Object.values(ThemePreference) as string[]
    return raw && all.includes(raw) ? (raw as ThemePreference) : ThemePreference.System
  }
}

/** Best-effort local persistence of the theme preference. */
export class ThemeStorage {
  static read(): ThemePreference {
    try {
      return ThemeResolver.parse(window.localStorage.getItem(StorageKeys.THEME))
    } catch {
      return ThemePreference.System
    }
  }

  static write(preference: ThemePreference): void {
    try {
      window.localStorage.setItem(StorageKeys.THEME, preference)
    } catch {
      return
    }
  }
}
