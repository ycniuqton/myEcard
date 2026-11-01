import { describe, expect, it, vi } from 'vitest'
import { MeaningLanguage, MeaningLanguageStore } from './MeaningLanguage'

describe('MeaningLanguageStore', () => {
  it('defaults to Vietnamese + English when storage is unavailable', () => {
    expect(MeaningLanguageStore.get()).toBe(MeaningLanguage.Both)
  })

  it('notifies subscribers on change, keeps the value and stops after unsubscribe', () => {
    const listener = vi.fn()
    const stop = MeaningLanguageStore.subscribe(listener)
    MeaningLanguageStore.set(MeaningLanguage.English)
    expect(MeaningLanguageStore.get()).toBe(MeaningLanguage.English)
    expect(listener).toHaveBeenCalledTimes(1)
    stop()
    MeaningLanguageStore.set(MeaningLanguage.Both)
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
