import { useCallback, useEffect, useReducer, useState } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { RoutePath } from '../../app/routes'
import { useAppStore } from '../../store'
import { OnboardingTestId, PlacementPhase } from './OnboardingCopy'
import { PlacementHeader } from './PlacementHeader'
import { PlacementIntro } from './PlacementIntro'
import { PlacementResult } from './PlacementResult'
import { PlacementRun } from './PlacementRun'
import { QuestionCard } from './QuestionCard'

const KEY_KNOW = 'ArrowRight'
const KEY_SKIP = 'ArrowLeft'
const SCREEN: CSSProperties = { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }

function useAnswerKeys(active: boolean, answer: (known: boolean) => void) {
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === KEY_KNOW) answer(true)
      if (e.key === KEY_SKIP) answer(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, answer])
}

function usePlacementFlow() {
  const navigate = useNavigate()
  const words = useAppStore(s => s.words)
  const submit = useAppStore(s => s.submitPlacement)
  const retake = useState(() => useAppStore.getState().settings.placementDone)[0]
  const [phase, setPhase] = useState(retake ? PlacementPhase.Intro : PlacementPhase.Asking)
  const [run, setRun] = useState(() => new PlacementRun(words))
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const [, rerender] = useReducer((n: number) => n + 1, 0)

  const advance = useCallback(() => {
    if (run.finished) setPhase(PlacementPhase.Result)
    else rerender()
  }, [run])
  const answer = useCallback((known: boolean) => {
    run.answer(known)
    advance()
  }, [run, advance])
  const finishNow = () => {
    run.finishNow()
    advance()
  }
  const begin = () => {
    setRun(new PlacementRun(words))
    setFailed(false)
    setPhase(PlacementPhase.Asking)
  }
  const accept = async (level: number) => {
    setSaving(true)
    setFailed(false)
    try {
      await submit(run.submission(level))
      navigate(RoutePath.Today, { replace: true })
    } catch {
      setFailed(true)
      setSaving(false)
    }
  }
  const leave = () => navigate(retake ? RoutePath.Settings : RoutePath.Welcome, { replace: true })
  return { phase, run, retake, saving, failed, answer, finishNow, begin, accept, leave }
}

/** Placement route: mounts the flow only once the store is hydrated. */
export function PlacementScreen() {
  const ready = useAppStore(s => s.ready)
  return ready ? <PlacementFlow /> : null
}

/** Intro (retake only), the probe loop, then the adjustable result. */
function PlacementFlow() {
  const flow = usePlacementFlow()
  const { run } = flow
  useAnswerKeys(flow.phase === PlacementPhase.Asking, flow.answer)
  if (flow.phase === PlacementPhase.Intro) return <PlacementIntro retake={flow.retake} onBegin={flow.begin} onCancel={flow.leave} />
  if (flow.phase === PlacementPhase.Result) {
    return <PlacementResult run={run} saving={flow.saving} failed={flow.failed} onAccept={l => void flow.accept(l)} onRetake={flow.begin} />
  }
  const item = run.current
  return (
    <div style={SCREEN} data-testid={OnboardingTestId.Screen}>
      <PlacementHeader done={run.probesDone} total={run.probeCount} canFinish={run.canFinishNow} onFinish={flow.finishNow} onClose={flow.leave} />
      {item ? <QuestionCard item={item} position={run.itemNumber} count={run.itemCount} onAnswer={flow.answer} /> : null}
    </div>
  )
}
