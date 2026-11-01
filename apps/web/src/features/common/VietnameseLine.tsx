import { useSyncExternalStore } from 'react'
import type { CSSProperties } from 'react'
import type { Word } from '@wordmap/shared'
import { Typo } from '../../design/typography'
import { FontSize, FontWeight, Leading } from '../../design/scale'
import { MeaningCopy, MeaningLanguage, MeaningLanguageStore } from './MeaningLanguage'

const LINE: CSSProperties = {
  font: Typo.sans(FontWeight.Semibold, FontSize.F20, Leading.L28), color: 'var(--brand)', textWrap: 'pretty',
}

/** The current meaning language, re-rendering when the Settings choice changes. */
export function useMeaningLanguage(): MeaningLanguage {
  return useSyncExternalStore(MeaningLanguageStore.subscribe, MeaningLanguageStore.get)
}

/** Vietnamese meaning shown above the English definition; renders nothing when absent or switched off. */
export function VietnameseLine({ word }: { word: Pick<Word, 'vi'> }) {
  const language = useMeaningLanguage()
  if (!word.vi || language !== MeaningLanguage.Both) return null
  return <div style={LINE} lang={MeaningCopy.LANG_ATTR} data-testid={MeaningCopy.TEST_ID}>{word.vi}</div>
}
