import { Status } from '@wordmap/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PopScheduler, StatusDiff } from './PopSequence'

const U = Status.Unknown
const K = Status.Known

describe('StatusDiff', () => {
  it('lists changed ranks and ignores the first visit', () => {
    expect(StatusDiff.ranks(null, [U, U, K])).toEqual([])
    expect(StatusDiff.ranks([U, U, U, U], [U, K, U, K])).toEqual([1, 3])
  })

  it('skips animation for bulk changes', () => {
    const prev = Array.from({ length: 101 }, () => U)
    const next = Array.from({ length: 101 }, () => K)
    expect(StatusDiff.ranks(prev, next, 5)).toEqual([])
  })
})

describe('PopScheduler', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('reveals ranks in a staggered order then clears the pop', () => {
    const events: string[] = []
    const hooks = { reveal: (r: number) => events.push(`r${r}`), clear: (r: number) => events.push(`c${r}`) }
    new PopScheduler([4, 9], hooks).start()
    vi.advanceTimersByTime(350)
    expect(events).toEqual(['r4'])
    vi.advanceTimersByTime(160)
    expect(events).toEqual(['r4', 'r9'])
    vi.advanceTimersByTime(700)
    expect(events).toEqual(['r4', 'r9', 'c4', 'c9'])
  })

  it('cancels pending reveals', () => {
    const reveal = vi.fn()
    const cancel = new PopScheduler([1], { reveal, clear: vi.fn() }).start()
    cancel()
    vi.advanceTimersByTime(2000)
    expect(reveal).not.toHaveBeenCalled()
  })
})
