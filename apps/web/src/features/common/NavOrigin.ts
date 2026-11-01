import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export enum NavOrigin {
  Today = 'today',
  Map = 'map',
  Band = 'band',
  Search = 'search',
  Summary = 'summary',
  Progress = 'progress',
}

export type OriginState = { from: NavOrigin }

/** Maps where a screen was opened from to its back label and link state. */
export class BackNavigation {
  private static readonly BACK_LABEL: Record<NavOrigin, string> = {
    [NavOrigin.Today]: 'Today',
    [NavOrigin.Map]: 'Map',
    [NavOrigin.Band]: 'Band',
    [NavOrigin.Search]: 'Search',
    [NavOrigin.Summary]: 'Summary',
    [NavOrigin.Progress]: 'Progress',
  }

  private static readonly KNOWN_ORIGINS: ReadonlySet<string> = new Set(Object.values(NavOrigin))
  private static readonly FIRST_HISTORY_INDEX = 0

  static state(from: NavOrigin): OriginState {
    return { from }
  }

  static origin(state: unknown): NavOrigin {
    const from = (state as Partial<OriginState> | null)?.from
    return from && BackNavigation.KNOWN_ORIGINS.has(from) ? from : NavOrigin.Today
  }

  static label(origin: NavOrigin): string {
    return BackNavigation.BACK_LABEL[origin]
  }

  static hasHistory(): boolean {
    const idx = (window.history.state as { idx?: number } | null)?.idx
    return typeof idx === 'number' && idx > BackNavigation.FIRST_HISTORY_INDEX
  }
}

/** Returns the origin of the current route plus a back handler with a fallback path. */
export function useBack(fallbackPath: string) {
  const navigate = useNavigate()
  const { state } = useLocation()
  const origin = BackNavigation.origin(state)
  const back = useCallback(() => {
    if (BackNavigation.hasHistory()) navigate(-1)
    else navigate(fallbackPath, { replace: true })
  }, [navigate, fallbackPath])
  return { origin, label: BackNavigation.label(origin), back }
}
