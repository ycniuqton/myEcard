import { Grade, Status } from '@wordmap/shared'
import type { ReviewLog } from '@wordmap/shared'
import { describe, expect, it } from 'vitest'
import { ExampleSplitter, HistoryDots, NextReviewLabel } from './WordLogic'

const TODAY = '2026-03-10'

describe('ExampleSplitter', () => {
  it('splits around the lemma ignoring case', () => {
    expect(ExampleSplitter.split('Decide quickly.', 'decide')).toEqual({ before: '', match: 'Decide', after: ' quickly.' })
  })

  it('prefers a longer inflected form', () => {
    const parts = ExampleSplitter.split('She decided to go.', 'decide', ['decided'])
    expect(parts).toEqual({ before: 'She ', match: 'decided', after: ' to go.' })
  })

  it('returns the whole text when nothing matches', () => {
    expect(ExampleSplitter.split('No hit here', 'zebra')).toEqual({ before: 'No hit here', match: '', after: '' })
  })
})

describe('NextReviewLabel', () => {
  it('labels unknown and unscheduled words', () => {
    expect(NextReviewLabel.of(Status.Unknown, null, TODAY)).toBe('Not started')
    expect(NextReviewLabel.of(Status.Known, null, TODAY)).toBe('Not scheduled')
  })

  it('uses relative day, week and month labels', () => {
    expect(NextReviewLabel.of(Status.Learning, '2026-03-10', TODAY)).toBe('Today')
    expect(NextReviewLabel.of(Status.Learning, '2026-03-11', TODAY)).toBe('Tomorrow')
    expect(NextReviewLabel.of(Status.Known, '2026-03-14', TODAY)).toBe('In 4 days')
    expect(NextReviewLabel.of(Status.Mastered, '2026-03-31', TODAY)).toBe('In 3 weeks')
    expect(NextReviewLabel.of(Status.Known, '2026-06-10', TODAY)).toBe('In 3 months')
  })
})

describe('HistoryDots', () => {
  it('keeps the latest grades of one word in time order', () => {
    const log = (id: string, wordId: string, at: string, grade: Grade): ReviewLog => ({ id, wordId, at, grade, mode: 'flashcard' } as ReviewLog)
    const logs = [log('2', 'a', '2026-03-02', Grade.Good), log('1', 'a', '2026-03-01', Grade.Again), log('3', 'b', '2026-03-03', Grade.Easy)]
    expect(HistoryDots.colors(logs, 'a')).toEqual(['var(--again)', 'var(--good)'])
  })
})
