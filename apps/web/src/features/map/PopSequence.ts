import { useEffect, useRef, useState } from 'react'
import type { Status } from '@wordmap/shared'

/** Timing and limits of the staggered tile pop shown when the map is revisited. */
export class PopConfig {
  static readonly MAX_POPS = 40
  static readonly START_DELAY_MS = 350
  static readonly STEP_MS = 160
  static readonly POP_MS = 600
}

/** Remembers the statuses the user last saw on the map so changes can be replayed. */
export class MapMemory {
  private static lastSeen: readonly Status[] | null = null

  static read(): readonly Status[] | null {
    return MapMemory.lastSeen
  }

  static write(statuses: readonly Status[]): void {
    MapMemory.lastSeen = statuses
  }

  static reset(): void {
    MapMemory.lastSeen = null
  }
}

/** Finds the ranks whose status differs between two snapshots (index = rank). */
export class StatusDiff {
  static ranks(prev: readonly Status[] | null, next: readonly Status[], max: number = PopConfig.MAX_POPS): number[] {
    if (!prev) return []
    const out: number[] = []
    for (let rank = 1; rank < next.length && out.length <= max; rank++) {
      if (prev[rank] !== undefined && prev[rank] !== next[rank]) out.push(rank)
    }
    return out.length > max ? [] : out
  }
}

export type PopHooks = { reveal: (rank: number) => void; clear: (rank: number) => void }

/** Reveals changed ranks one after another, each followed by a timed pop clear. */
export class PopScheduler {
  constructor(private readonly ranks: readonly number[], private readonly hooks: PopHooks) {}

  start(): () => void {
    const timers: ReturnType<typeof setTimeout>[] = []
    this.ranks.forEach((rank, i) => {
      timers.push(setTimeout(() => this.pop(rank, timers), PopConfig.START_DELAY_MS + i * PopConfig.STEP_MS))
    })
    return () => timers.forEach(clearTimeout)
  }

  private pop(rank: number, timers: ReturnType<typeof setTimeout>[]): void {
    this.hooks.reveal(rank)
    timers.push(setTimeout(() => this.hooks.clear(rank), PopConfig.POP_MS))
  }
}

export type PopState = { held: ReadonlyMap<number, Status>; pops: ReadonlySet<number> }

/** Holds changed tiles at their old status, then reveals them with a pop animation. */
export function usePopSequence(current: readonly Status[]): PopState {
  const ranks = useRef<number[] | null>(null)
  if (ranks.current === null) ranks.current = StatusDiff.ranks(MapMemory.read(), current)
  const [held, setHeld] = useState<ReadonlyMap<number, Status>>(() => PopSequenceInit.held(ranks.current ?? []))
  const [pops, setPops] = useState<ReadonlySet<number>>(new Set())
  const latest = useRef(current)
  latest.current = current

  useEffect(() => {
    const hooks: PopHooks = {
      reveal: (rank) => {
        setHeld((m) => PopSets.without(m, rank))
        setPops((s) => PopSets.add(s, rank))
      },
      clear: (rank) => setPops((s) => PopSets.remove(s, rank)),
    }
    const cancel = new PopScheduler(ranks.current ?? [], hooks).start()
    return () => {
      cancel()
      MapMemory.write(latest.current)
    }
  }, [])

  return { held, pops }
}

class PopSequenceInit {
  static held(ranks: readonly number[]): ReadonlyMap<number, Status> {
    const prev = MapMemory.read()
    const map = new Map<number, Status>()
    ranks.forEach((rank) => prev && map.set(rank, prev[rank]))
    return map
  }
}

class PopSets {
  static without(m: ReadonlyMap<number, Status>, rank: number): ReadonlyMap<number, Status> {
    const next = new Map(m)
    next.delete(rank)
    return next
  }

  static add(s: ReadonlySet<number>, rank: number): ReadonlySet<number> {
    return new Set(s).add(rank)
  }

  static remove(s: ReadonlySet<number>, rank: number): ReadonlySet<number> {
    const next = new Set(s)
    next.delete(rank)
    return next
  }
}
