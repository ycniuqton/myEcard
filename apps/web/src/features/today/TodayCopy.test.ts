import { describe, expect, it } from 'vitest'
import { TodayCopy } from './TodayCopy'

describe('TodayCopy', () => {
  it('greets by part of day', () => {
    expect(TodayCopy.greeting(new Date(2026, 9, 30, 8), 'Linh')).toBe('Good morning, Linh')
    expect(TodayCopy.greeting(new Date(2026, 9, 30, 14), 'Linh')).toBe('Good afternoon, Linh')
    expect(TodayCopy.greeting(new Date(2026, 9, 30, 20), 'Linh')).toBe('Good evening, Linh')
  })

  it('drops the comma when the learner name is empty', () => {
    expect(TodayCopy.greeting(new Date(2026, 9, 30, 14))).toBe('Good afternoon')
    expect(TodayCopy.greeting(new Date(2026, 9, 30, 14), '')).toBe('Good afternoon')
  })

  it('formats the date line like the design', () => {
    expect(TodayCopy.dateLine(new Date(2026, 9, 30))).toBe('Friday, 30 October')
  })

  it('builds the due line with pluralisation', () => {
    expect(TodayCopy.dueLine(5, 3)).toBe('5 reviews · 3 new words')
    expect(TodayCopy.dueLine(1, 1)).toBe('1 review · 1 new word')
    expect(TodayCopy.dueLine(0, 4)).toBe('4 new words')
    expect(TodayCopy.dueLine(0, 0)).toBe('Nothing due')
  })

  it('rounds the known percentage and guards zero totals', () => {
    expect(TodayCopy.percent(5000, 10000)).toBe(50)
    expect(TodayCopy.percent(1716, 10000)).toBe(17)
    expect(TodayCopy.percent(0, 0)).toBe(0)
  })
})
