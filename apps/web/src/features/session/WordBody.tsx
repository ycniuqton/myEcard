import type { CSSProperties } from 'react'
import type { Word } from '@wordmap/shared'
import { Icon, IconName, StatusChip } from '../../design/primitives'
import type { LearnStatus } from '../../design/status'
import { Typo } from '../../design/typography'
import { SessionTestId } from './SessionCopy'
import { IpaFormat } from '../common/IpaFormat'
import { ExampleSplitter } from './ExampleSplitter'
import { VietnameseLine } from '../common/VietnameseLine'
import type { SpeechControls } from './useSpeech'
import { FontSize, FontWeight, Gap, Inset, Leading, Radius, Size } from '../../design/scale'
import { Border, IconSize } from '../../design/styleValues'
import { A11yCopy } from '../../design/primitives/A11yCopy'

const RANK_LOCALE = 'en-US'
const EXAMPLE_KEY_PREFIX = 'example-'
const WORD_KEY_PREFIX = 'word-'

const SAY_WORD: CSSProperties = {
  width: Size.S44, height: Size.S44, borderRadius: Radius.Pill, background: 'var(--brandsoft)', color: 'var(--brand)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
}
const HEAD_ROW: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }
const HEAD_TEXT: CSSProperties = { display: 'flex', flexDirection: 'column', gap: Gap.G4 }
const LEMMA: CSSProperties = { font: Typo.serif(FontWeight.Semibold, FontSize.F40, Leading.L48), letterSpacing: '-.01em' }
const IPA: CSSProperties = { font: Typo.sans(FontWeight.Regular, FontSize.F14, Leading.L20), color: 'var(--muted)' }
const TAGS: CSSProperties = { display: 'flex', gap: Gap.G6, flexWrap: 'wrap' }
const TAG: CSSProperties = {
  height: Size.S26, display: 'flex', alignItems: 'center', padding: Inset.I0_10, borderRadius: Radius.Pill,
  border: Border.B_1px_solid_border, font: Typo.sans(FontWeight.Medium, FontSize.F13), color: 'var(--muted)', fontVariantNumeric: 'tabular-nums',
}
const DEFINITION: CSSProperties = { font: Typo.sans(FontWeight.Regular, FontSize.F17, Leading.L26), textWrap: 'pretty' }
const DIVIDER: CSSProperties = { height: 1, background: 'var(--border)', flex: 'none' }
const EXAMPLES: CSSProperties = { display: 'flex', flexDirection: 'column', gap: Gap.G12 }
const EXAMPLE_ROW: CSSProperties = { display: 'flex', gap: Gap.G10, alignItems: 'flex-start' }
const EXAMPLE_TEXT: CSSProperties = { flex: 1, font: Typo.serif(FontWeight.Regular, FontSize.F17, Leading.L26), textWrap: 'pretty' }
const EXAMPLE_MATCH: CSSProperties = { color: 'var(--brand)', fontWeight: FontWeight.Semibold }
const SAY_EXAMPLE: CSSProperties = {
  flex: 'none', width: Size.S32, height: Size.S32, margin: Inset.In3_n6_0_0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

export interface WordBodyProps {
  word: Word
  speech: SpeechControls
  exampleCount: number
  status?: LearnStatus
  lemmaTestId?: string
}

/** Pronunciation row: lemma, IPA and the speak button. */
function WordHeader({ word, speech, lemmaTestId }: Pick<WordBodyProps, 'word' | 'speech' | 'lemmaTestId'>) {
  const key = `${WORD_KEY_PREFIX}${word.id}`
  return (
    <div style={HEAD_ROW}>
      <div style={HEAD_TEXT}>
        <span style={LEMMA} data-testid={lemmaTestId}>{word.lemma}</span>
        <span style={IPA}>{IpaFormat.display(word.ipa)}</span>
      </div>
      <button
        type="button" style={SAY_WORD} aria-label={`Pronounce ${word.lemma}`}
        data-testid={SessionTestId.Say} onClick={() => speech.say(word.lemma, key)}
      >
        <Icon name={IconName.Volume} size={IconSize.S20} />
      </button>
    </div>
  )
}

/** Part of speech, rank and optional status chips. */
function WordTags({ word, status }: Pick<WordBodyProps, 'word' | 'status'>) {
  const pos = word.definitions[0]?.pos ?? word.pos[0]
  return (
    <div style={TAGS}>
      <span style={TAG}>{pos}</span>
      <span style={TAG}>#{word.rank.toLocaleString(RANK_LOCALE)}</span>
      {status ? <StatusChip status={status} /> : null}
    </div>
  )
}

/** Example sentences with the target word highlighted and an audio button each. */
function ExampleList({ word, speech, count }: { word: Word; speech: SpeechControls; count: number }) {
  return (
    <div style={EXAMPLES}>
      {word.examples.slice(0, count).map((ex, i) => {
        const parts = ExampleSplitter.split(ex.text, word.lemma, word.forms)
        const key = `${EXAMPLE_KEY_PREFIX}${word.id}-${i}`
        const color = speech.speakingKey === key ? 'var(--brand)' : 'var(--muted)'
        return (
          <div key={key} style={EXAMPLE_ROW}>
            <span style={EXAMPLE_TEXT}>
              {parts.before}<span style={EXAMPLE_MATCH}>{parts.match}</span>{parts.after}
            </span>
            <button
              type="button" style={{ ...SAY_EXAMPLE, color }} aria-label={A11yCopy.PLAY_EXAMPLE}
              data-testid={SessionTestId.SayExample} onClick={() => speech.say(ex.text, key)}
            >
              <Icon name={IconName.Volume} size={IconSize.S18} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

/** Shared answer body: pronunciation, tags, definition and examples. */
export function WordBody({ word, speech, exampleCount, status, lemmaTestId }: WordBodyProps) {
  return (
    <>
      <WordHeader word={word} speech={speech} lemmaTestId={lemmaTestId} />
      <WordTags word={word} status={status} />
      <VietnameseLine word={word} />
      <div style={DEFINITION}>{word.definitions[0]?.text}</div>
      <div style={DIVIDER} />
      <ExampleList word={word} speech={speech} count={exampleCount} />
    </>
  )
}
