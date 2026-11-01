import { StorageKeys } from '../common/StorageKeys'

export enum MapMode {
  Bands = 'bands',
  Compact = 'compact',
}

/** Copy used by the map screen. */
export class MapCopy {
  static readonly MODE_LABEL = 'Map mode'
  static readonly LIST_NAME = 'General English'
  static readonly BANDS = 'Bands'
  static readonly COMPACT = 'Compact'
  static readonly YOU_ARE_HERE = 'You are here'
  static readonly HERE_SHORT = 'Here'
  static readonly COMPACT_HINT = 'Tap a band to see its 100 words'
}

/** Remembers the chosen map mode per browser; storage failures are ignored. */
export class MapModeStore {
  private static readonly VALID_MODES: ReadonlySet<string> = new Set(Object.values(MapMode))

  static load(): MapMode {
    try {
      const raw = localStorage.getItem(StorageKeys.MAP_MODE)
      return raw && MapModeStore.VALID_MODES.has(raw) ? (raw as MapMode) : MapMode.Bands
    } catch {
      return MapMode.Bands
    }
  }

  static save(mode: MapMode): void {
    try {
      localStorage.setItem(StorageKeys.MAP_MODE, mode)
    } catch {
      return
    }
  }
}
