import type { CSSProperties } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import type { Word } from '@wordmap/shared'
import { Confetti, Flame, PrimaryButton, ButtonVariant, WordChip } from '../../design/primitives'
import { Typo } from '../../design/typography'
import { RoutePath } from '../../app/routes'
import { useAppStore } from '../../store'
import { SessionCopy, SessionTestId } from './SessionCopy'
import { StatusAdapter } from './StatusAdapter'
import { SummaryFormat } from './SummaryFormat'
import { useReducedMotion } from './useReducedMotion'
import { FontSize, FontWeight, Gap, Inset, Layer, Leading, Radius, Size } from '../../design/scale'
import { Border, IconSize, Motion, Shadow } from '../../design/styleValues'

const PAGE: CSSProperties = {
  position: 'absolute', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column',
  padding: Inset.I12_20_20, gap: Gap.G20, zIndex: Layer.L5, animation: Motion.A_wmIn_300ms_ease_out, overflow: 'hidden',
}
const HEAD: CSSProperties = { display: 'flex', flexDirection: 'column', gap: Gap.G6, paddingTop: Size.S56, position: 'relative' }
const KICKER: CSSProperties = { font: Typo.sans(FontWeight.Semibold, FontSize.F12), letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }
const TITLE: CSSProperties = { font: Typo.serif(FontWeight.Semibold, FontSize.F34, Leading.L40) }
const GRID: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: Gap.G12, position: 'relative' }
const STAT: CSSProperties = {
  background: 'var(--surface)', borderRadius: Radius.R16, boxShadow: Shadow.S_shadow, border: Border.B_1px_solid_line,
  padding: Size.S16, display: 'flex', flexDirection: 'column', gap: 2,
}
const STAT_VALUE: CSSProperties = { font: Typo.serif(FontWeight.Semibold, FontSize.F30, Leading.L36) }
const STAT_LABEL: CSSProperties = { font: Typo.sans(FontWeight.Regular, FontSize.F14), color: 'var(--muted)' }
const WORDS: CSSProperties = { display: 'flex', flexDirection: 'column', gap: Gap.G10, position: 'relative' }
const WORDS_TITLE: CSSProperties = { font: Typo.sans(FontWeight.Semibold, FontSize.F15) }
const WORD_WRAP: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: Gap.G8 }
const ACTIONS: CSSProperties = { display: 'flex', flexDirection: 'column', gap: Gap.G10, position: 'relative' }
const DONE_BUTTON: CSSProperties = { border: 'none', background: 'transparent' }

interface StatProps {
  value: string
  label: string
  valueId: string
  labelId?: string
  icon?: boolean
}

/** One summary tile: big serif number with a caption. */
function Stat({ value, label, valueId, labelId, icon }: StatProps) {
  const valueStyle: CSSProperties = icon ? { ...STAT_VALUE, display: 'flex', alignItems: 'center', gap: Gap.G6 } : STAT_VALUE
  return (
    <div style={STAT}>
      <span style={valueStyle} data-testid={valueId}>
        {icon ? <Flame size={IconSize.S22} lit /> : null}
        {value}
      </span>
      <span style={STAT_LABEL} data-testid={labelId}>{label}</span>
    </div>
  )
}

/** Today's new words as status chips that open the word detail. */
function NewWordsSection({ words }: { words: Word[] }) {
  const navigate = useNavigate()
  const statusByRank = useAppStore(s => s.progress.statusByRank)
  if (!words.length) return null
  return (
    <div style={WORDS}>
      <span style={WORDS_TITLE}>{SessionCopy.TODAY_WORDS}</span>
      <div style={WORD_WRAP}>
        {words.map(w => (
          <WordChip
            key={w.id} status={StatusAdapter.toLearn(statusByRank[w.rank])} data-testid={SessionTestId.SummaryWord}
            onClick={() => navigate(`/word/${w.rank}`)}
          >
            {w.lemma}
          </WordChip>
        ))}
      </div>
    </div>
  )
}

/** See my map and Done buttons; both close the finished session. */
function SummaryActions() {
  const navigate = useNavigate()
  const closeSession = useAppStore(s => s.closeSession)
  const leave = (to: RoutePath) => {
    closeSession()
    navigate(to)
  }
  return (
    <div style={ACTIONS}>
      <PrimaryButton data-testid={SessionTestId.SeeMap} onClick={() => leave(RoutePath.Map)}>{SessionCopy.SEE_MAP}</PrimaryButton>
      <PrimaryButton
        variant={ButtonVariant.Outline} style={DONE_BUTTON} data-testid={SessionTestId.Done}
        onClick={() => leave(RoutePath.Today)}
      >
        {SessionCopy.DONE}
      </PrimaryButton>
    </div>
  )
}

/** Summary route: counts, accuracy, streak note and today's new words. */
export function SummaryScreen() {
  const summary = useAppStore(s => s.session?.summary ?? null)
  const byId = useAppStore(s => s.byId)
  const name = useAppStore(s => s.settings.learnerName ?? '')
  const reducedMotion = useReducedMotion()
  if (!summary) return <Navigate to={RoutePath.Today} replace />
  const words = summary.newWordIds.map(id => byId.get(id)).filter((w): w is Word => !!w)
  return (
    <div style={PAGE} className="wm-anim">
      <Confetti reducedMotion={reducedMotion} />
      <div style={HEAD}>
        <span style={KICKER}>{SessionCopy.SUMMARY_KICKER}</span>
        <span style={TITLE} data-testid={SessionTestId.SummaryTitle}>{SessionCopy.summaryTitle(name)}</span>
      </div>
      <div style={GRID}>
        <Stat value={String(summary.newLearned)} label={SessionCopy.NEW_WORDS} valueId={SessionTestId.SummaryNew} />
        <Stat value={String(summary.reviewed)} label={SessionCopy.REVIEWS_DONE} valueId={SessionTestId.SummaryReviews} />
        <Stat value={SummaryFormat.accuracy(summary.accuracy)} label={SessionCopy.ACCURACY} valueId={SessionTestId.SummaryAccuracy} />
        <Stat
          icon value={String(summary.streak)} label={SummaryFormat.streakNote(summary.streakIncreased)}
          valueId={SessionTestId.SummaryStreak} labelId={SessionTestId.SummaryStreakNote}
        />
      </div>
      <NewWordsSection words={words} />
      <div style={{ flex: 1 }} />
      <SummaryActions />
    </div>
  )
}
