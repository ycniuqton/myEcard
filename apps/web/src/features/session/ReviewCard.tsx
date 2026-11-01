import type { CSSProperties } from 'react'
import type { Word } from '@wordmap/shared'
import type { LearnStatus } from '../../design/status'
import { Typo } from '../../design/typography'
import { ExampleSplitter } from './ExampleSplitter'
import { FrontMode, SessionCopy, SessionTestId } from './SessionCopy'
import type { SpeechControls } from './useSpeech'
import { WordBody } from './WordBody'
import { FontSize, FontWeight, Gap, Inset, Leading, Radius, Size } from '../../design/scale'
import { Border, Shadow } from '../../design/styleValues'

const RANK_LOCALE = 'en-US'
const REVIEW_EXAMPLES = 3
const FLIP_DEGREES = 180

const STAGE: CSSProperties = { flex: 1, minHeight: 0, perspective: 1400, cursor: 'pointer' }
const FACE: CSSProperties = {
  position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
  background: 'var(--surface)', borderRadius: Radius.R16, boxShadow: Shadow.S_shadow, border: Border.B_1px_solid_line,
  display: 'flex', flexDirection: 'column',
}
const FRONT_FACE: CSSProperties = { ...FACE, alignItems: 'center', justifyContent: 'center', gap: Gap.G14, padding: Size.S24 }
const BACK_FACE: CSSProperties = {
  ...FACE, transform: `rotateY(${FLIP_DEGREES}deg)`, padding: Inset.I22_20, gap: Gap.G14, overflowY: 'auto', cursor: 'default',
}
const CORNER: CSSProperties = { position: 'absolute', top: Size.S16, font: Typo.sans(FontWeight.Medium, FontSize.F13), color: 'var(--muted)' }
const WORD_FRONT: CSSProperties = { font: Typo.serif(FontWeight.Semibold, FontSize.F48, Leading.L56), letterSpacing: '-.01em' }
const CLOZE_TEXT: CSSProperties = { font: Typo.serif(FontWeight.Regular, FontSize.F26, Leading.L38), textAlign: 'center', textWrap: 'pretty' }
const CLOZE_BLANK: CSSProperties = {
  display: 'inline-block', width: Size.S92, height: Size.S28, verticalAlign: -5, borderBottom: Border.B_2_5px_solid_brand,
}
const META: CSSProperties = { font: Typo.sans(FontWeight.Regular, FontSize.F14), color: 'var(--muted)' }
const HINT: CSSProperties = { font: Typo.sans(FontWeight.Regular, FontSize.F14, Leading.L20), color: 'var(--muted)' }

export interface ReviewCardProps {
  word: Word
  status: LearnStatus
  revealed: boolean
  reducedMotion: boolean
  front: FrontMode
  speech: SpeechControls
  onReveal: () => void
}

/** Front of the card in cloze form: example sentence with a blank, plus part of speech and length. */
function ClozeFront({ word }: { word: Word }) {
  const parts = ExampleSplitter.split(word.examples[0]?.text ?? '', word.lemma, word.forms)
  const pos = word.definitions[0]?.pos ?? word.pos[0]
  return (
    <>
      <span style={CLOZE_TEXT} data-testid={SessionTestId.FrontCloze}>
        {parts.before}<span style={CLOZE_BLANK} />{parts.after}
      </span>
      <span style={META}>{pos}{SessionCopy.SEPARATOR}{word.lemma.length} {SessionCopy.LETTERS}</span>
    </>
  )
}

/** Chooses cloze only when the first example really contains the word. */
function resolveFront(word: Word, requested: FrontMode): FrontMode {
  const sample = word.examples[0]?.text ?? ''
  const usable = ExampleSplitter.hasMatch(ExampleSplitter.split(sample, word.lemma, word.forms))
  return requested === FrontMode.Cloze && usable ? FrontMode.Cloze : FrontMode.Word
}

/** React 18 needs inert as an empty string attribute; absent when the face is active. */
function hiddenAttrs(hidden: boolean): Record<string, string | boolean | undefined> {
  return { 'aria-hidden': hidden, inert: hidden ? '' : undefined }
}

/** Question side of the flip card. */
function FrontFace({ word, front, hidden }: { word: Word; front: FrontMode; hidden: boolean }) {
  return (
    <div style={FRONT_FACE} {...hiddenAttrs(hidden)}>
      <span style={{ ...CORNER, left: Size.S16 }}>{SessionCopy.REVIEW_LABEL}</span>
      <span style={{ ...CORNER, right: Size.S16, fontVariantNumeric: 'tabular-nums' }}>#{word.rank.toLocaleString(RANK_LOCALE)}</span>
      {front === FrontMode.Cloze ? (
        <ClozeFront word={word} />
      ) : (
        <span style={WORD_FRONT} data-testid={SessionTestId.FrontWord}>{word.lemma}</span>
      )}
      <span style={HINT}>{SessionCopy.REVEAL_HINT}</span>
    </div>
  )
}

/** Review flip card: tap anywhere on the front to rotate and reveal the answer. */
export function ReviewCard(props: ReviewCardProps) {
  const { word, status, revealed, reducedMotion, front, speech, onReveal } = props
  const flip: CSSProperties = {
    position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d',
    transition: reducedMotion ? 'none' : SessionCopy.FLIP_EASING,
    transform: `rotateY(${revealed ? FLIP_DEGREES : 0}deg)`,
  }
  return (
    <div style={STAGE} onClick={revealed ? undefined : onReveal} data-testid={SessionTestId.FlipCard} data-revealed={revealed}>
      <div style={flip}>
        <FrontFace word={word} front={resolveFront(word, front)} hidden={revealed} />
        <div style={BACK_FACE} {...hiddenAttrs(!revealed)}>
          <WordBody word={word} speech={speech} status={status} exampleCount={REVIEW_EXAMPLES} lemmaTestId={SessionTestId.BackWord} />
        </div>
      </div>
    </div>
  )
}
