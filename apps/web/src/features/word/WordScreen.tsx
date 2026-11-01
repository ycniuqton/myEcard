import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Status } from '@wordmap/shared'
import type { Voice } from '@wordmap/shared'
import { useShallow } from 'zustand/react/shallow'
import { RoutePath } from '../../app/routes'
import { PrimaryButton, TopBar } from '../../design/primitives'
import { Typo } from '../../design/typography'
import { selectWordView, useAppStore } from '../../store'
import type { WordView } from '../../store'
import { useBack } from '../common/NavOrigin'
import { Speaker } from '../common/Speaker'
import { StatusMap } from '../common/StatusMap'
import { HistoryDots, NextReviewLabel } from './WordLogic'
import { WordCopy } from './WordCopy'
import { SpeakKey, WordChips, WordExamples, WordHeader, WordInfoCard } from './WordParts'
import { FontSize, FontWeight, Gap, Inset, Leading, Radius, Size } from '../../design/scale'
import { Border, Motion } from '../../design/styleValues'

const WORD_KEY: SpeakKey = 'word'
const SECONDARY_PRESS = '.97'

function SecondaryButton(props: { label: string; testId: string; tone?: string; onClick: () => void }) {
  const style: CSSProperties = {
    height: Size.S52,
    borderRadius: Radius.R12,
    border: Border.B_1px_solid_border,
    background: 'var(--surface)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    font: Typo.sans(FontWeight.Semibold, FontSize.F15),
    color: props.tone,
    ['--wm-press' as string]: SECONDARY_PRESS,
  }
  return (
    <button type="button" className="wm-press" style={style} data-testid={props.testId} onClick={props.onClick}>
      {props.label}
    </button>
  )
}

function useSpeech(voice: Voice) {
  const [key, setKey] = useState<SpeakKey | null>(null)
  useEffect(() => Speaker.stop, [])
  const say = useCallback(
    (next: SpeakKey, text: string) => {
      if (Speaker.speak(text, voice, () => setKey(null))) setKey(next)
    },
    [voice],
  )
  return { key, say }
}

function useWordActions(view: WordView) {
  const navigate = useNavigate()
  const markKnown = useAppStore((s) => s.markKnown)
  const resetWord = useAppStore((s) => s.resetWord)
  const startLearning = useAppStore((s) => s.startLearning)
  const startReview = useAppStore((s) => s.startWordReview)
  const { id } = view.word
  const learn = useCallback(async () => {
    if (view.status === Status.Unknown) return startLearning(id)
    startReview(id)
    navigate(RoutePath.Session)
  }, [view.status, id, startLearning, startReview, navigate])
  return { learn, known: () => markKnown(id), reset: () => resetWord(id) }
}

function WordActions({ view }: { view: WordView }) {
  const actions = useWordActions(view)
  const label = view.status === Status.Unknown ? WordCopy.START_LEARNING : WordCopy.REVIEW_NOW
  return (
    <div style={{ flex: 'none', padding: Inset.I0_20_20, display: 'flex', flexDirection: 'column', gap: Gap.G10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: Gap.G10 }}>
        <SecondaryButton label={WordCopy.MARK_KNOWN} testId="word-known" onClick={actions.known} />
        <SecondaryButton label={WordCopy.RESET} testId="word-reset" tone="var(--again)" onClick={actions.reset} />
      </div>
      <PrimaryButton data-testid="word-learn" onClick={actions.learn}>
        {label}
      </PrimaryButton>
    </div>
  )
}

function WordBody({ view }: { view: WordView }) {
  const { word } = view
  const voice = useAppStore((s) => s.settings.voice)
  const today = useAppStore((s) => s.today)
  const logs = useAppStore((s) => s.reviewLogs)
  const speech = useSpeech(voice)
  const history = useMemo(() => HistoryDots.colors(logs, word.id), [logs, word.id])
  const next = NextReviewLabel.of(view.status, view.userWordDue, today)
  const body: CSSProperties = {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: Inset.I12_20_16,
    display: 'flex',
    flexDirection: 'column',
    gap: Gap.G14,
  }
  return (
    <div style={body}>
      <WordHeader word={word} speaking={speech.key === WORD_KEY} onSay={() => speech.say(WORD_KEY, word.lemma)} />
      <WordChips word={word} status={StatusMap.toLearn(view.status)} />
      <div style={{ font: Typo.sans(FontWeight.Regular, FontSize.F17, Leading.L26), textWrap: 'pretty' }} data-testid="word-definition">
        {word.definitions[0]?.text ?? WordCopy.NO_DEFINITION}
      </div>
      <WordExamples word={word} speakingKey={speech.key} onSay={speech.say} />
      <WordInfoCard next={next} history={history} />
    </div>
  )
}

/** Word detail: pronunciation, definition, examples, schedule info and learning actions. */
export function WordScreen() {
  const { rank } = useParams()
  const view = useAppStore(useShallow((s) => selectWordView(s, Number(rank))))
  const { label, back } = useBack(RoutePath.Map)
  const style: CSSProperties = {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg)',
    animation: Motion.A_wmIn_220ms_ease_out,
  }
  return (
    <div style={style} data-testid="word-screen">
      <TopBar backLabel={label} onBack={back} />
      {view ? <WordBody view={view} /> : <div style={{ flex: 1 }} />}
      {view ? <WordActions view={view} /> : null}
    </div>
  )
}
