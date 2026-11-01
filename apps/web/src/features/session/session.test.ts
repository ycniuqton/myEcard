import { describe, expect, it } from 'vitest'
import { CardFactory, Grade, SchedulerManager, Status, type UserWord } from '@wordmap/shared'
import { ExampleSplitter } from './ExampleSplitter'
import { GradePreview } from './GradePreview'
import { progressPercent } from './SessionHeader'
import { SessionCopy } from './SessionCopy'
import { SummaryFormat } from './SummaryFormat'

const NOW = new Date(2026, 0, 10)

function userWord(patch: Partial<UserWord>): UserWord {
  return { wordId: 'w', ...CardFactory.learning(NOW), updatedAt: NOW.toISOString(), ...patch }
}

describe('ExampleSplitter', () => {
  it('splits around the lemma case-insensitively', () => {
    const parts = ExampleSplitter.split('Effort is rewarded.', 'effort')
    expect(parts).toEqual({ before: '', match: 'Effort', after: ' is rewarded.' })
  })

  it('matches inflected forms and ignores partial words', () => {
    expect(ExampleSplitter.split('She walked home', 'walk', ['walked']).match).toBe('walked')
    expect(ExampleSplitter.hasMatch(ExampleSplitter.split('Sidewalks are wet', 'walk'))).toBe(false)
  })

  it('returns the whole text when nothing matches', () => {
    expect(ExampleSplitter.split('Nothing here', 'zebra')).toEqual({ before: 'Nothing here', match: '', after: '' })
  })
})

describe('GradePreview', () => {
  const preview = new GradePreview()

  it('labels every grade from the real scheduler', () => {
    const card = userWord({ reps: 2, interval: 4, ease: 2.5, status: Status.Learning })
    const scheduler = new SchedulerManager()
    const options = preview.options(card, NOW)
    const expected = (g: Grade) => preview.format(scheduler.schedule(card, g, NOW, () => 0.5).interval)
    expect(options.map(o => o.grade)).toEqual([Grade.Again, Grade.Hard, Grade.Good, Grade.Easy])
    expect(options[0].interval).toBe(SessionCopy.AGAIN_LABEL)
    expect(options[1].interval).toBe(expected(Grade.Hard))
    expect(options[2].interval).toBe(expected(Grade.Good))
    expect(options[3].interval).toBe(expected(Grade.Easy))
  })

  it('shows 1d for a first Good and grows with reps', () => {
    expect(preview.options(userWord({}), NOW)[2].interval).toBe('1d')
    expect(preview.options(userWord({ reps: 1, interval: 1 }), NOW)[2].interval).toBe('3d')
  })

  it('formats days, months and years', () => {
    expect(preview.format(9)).toBe('9d')
    expect(preview.format(60)).toBe('2mo')
    expect(preview.format(400)).toBe('1.1y')
  })
})

describe('summary helpers', () => {
  it('formats accuracy and the streak note', () => {
    expect(SummaryFormat.accuracy(null)).toBe('—')
    expect(SummaryFormat.accuracy(80)).toBe('80%')
    expect(SummaryFormat.streakNote(true)).toBe('day streak · +1')
    expect(SummaryFormat.streakNote(false)).toBe('day streak')
  })

  it('computes progress with a half step', () => {
    expect(progressPercent(1, 4, false)).toBe(25)
    expect(progressPercent(1, 4, true)).toBe(37.5)
    expect(progressPercent(0, 0, true)).toBe(0)
  })
})
