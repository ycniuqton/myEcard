import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Grade } from '@wordmap/shared'
import { PrimaryButton } from '../../design/primitives'
import { RoutePath } from '../../app/routes'
import { selectCurrentCard, useAppStore, SessionItemKind } from '../../store'
import type { CurrentCard } from '../../store'
import { GradeButtons } from './GradeButtons'
import { GradePreview } from './GradePreview'
import { NewWordCard } from './NewWordCard'
import { ReviewCard } from './ReviewCard'
import { FrontMode, SessionCopy, SessionTestId } from './SessionCopy'
import { SessionHeader } from './SessionHeader'
import { StatusAdapter } from './StatusAdapter'
import { useReducedMotion } from './useReducedMotion'
import { useSessionKeys } from './useSessionKeys'
import { useSpeech } from './useSpeech'
import { Gap, Inset, Layer } from '../../design/scale'
import { Motion } from '../../design/styleValues'

const PAGE: CSSProperties = {
  position: 'absolute', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column',
  animation: Motion.A_wmUp_260ms_ease_out, zIndex: Layer.L5,
}
const REVIEW_BODY: CSSProperties = {
  flex: 1, minHeight: 0, padding: Inset.I16_20_20, display: 'flex', flexDirection: 'column', gap: Gap.G16,
}
const SHOW_ANSWER_HEIGHT = 64
const preview = new GradePreview()

function parseFront(raw: string | null): FrontMode {
  return raw === FrontMode.Cloze ? FrontMode.Cloze : FrontMode.Word
}

/** Review body: flip card plus Show answer or the four grade buttons. */
function ReviewStage({ card, revealed, onReveal }: { card: CurrentCard; revealed: boolean; onReveal: () => void }) {
  const [params] = useSearchParams()
  const reducedMotion = useReducedMotion()
  const voice = useAppStore(s => s.settings.voice)
  const userWord = useAppStore(s => s.userWords.get(card.word.id))
  const grade = useAppStore(s => s.grade)
  const speech = useSpeech(voice)
  const options = useMemo(() => preview.options(userWord, new Date()), [userWord])
  useSessionKeys({ revealed, onReveal, onGrade: (g: Grade) => void grade(g), options })
  return (
    <div style={REVIEW_BODY} data-testid="review-stage" data-revealed={revealed}>
      <ReviewCard
        key={card.item.rank + (card.item.requeued ? 'r' : '')} word={card.word} status={StatusAdapter.toLearn(card.status)} revealed={revealed}
        reducedMotion={reducedMotion} front={parseFront(params.get(SessionCopy.FRONT_PARAM))}
        speech={speech} onReveal={onReveal}
      />
      {revealed ? (
        <GradeButtons options={options} onGrade={g => void grade(g)} />
      ) : (
        <PrimaryButton height={SHOW_ANSWER_HEIGHT} data-testid={SessionTestId.ShowAnswer} onClick={onReveal}>
          {SessionCopy.SHOW_ANSWER}
        </PrimaryButton>
      )}
    </div>
  )
}

/** Session route: queue progress with a review card or a new-word card. */
export function SessionScreen() {
  const navigate = useNavigate()
  const session = useAppStore(s => s.session)
  const card = useAppStore(selectCurrentCard)
  const voice = useAppStore(s => s.settings.voice)
  const know = useAppStore(s => s.know)
  const learn = useAppStore(s => s.learn)
  const closeSession = useAppStore(s => s.closeSession)
  const speech = useSpeech(voice)
  const [revealedAt, setRevealedAt] = useState(-1)
  if (!session) return <Navigate to={RoutePath.Today} replace />
  if (session.summary || !card) return <Navigate to={RoutePath.Summary} replace />
  const isNew = card.item.kind === SessionItemKind.New
  const close = () => {
    closeSession()
    navigate(RoutePath.Today)
  }
  return (
    <div style={PAGE} className="wm-anim">
      <SessionHeader index={session.index} total={session.queue.length} halfStep={isNew || revealedAt === session.index} onClose={close} />
      {isNew ? (
        <NewWordCard key={session.index} word={card.word} speech={speech} onKnow={() => void know()} onLearn={() => void learn()} />
      ) : (
        <ReviewStage card={card} revealed={revealedAt === session.index} onReveal={() => setRevealedAt(session.index)} />
      )}
    </div>
  )
}
