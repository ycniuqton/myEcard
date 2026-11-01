import { useMemo } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { Status } from '@wordmap/shared'
import { ButtonVariant, Flame, Icon, IconName, LegendSwatch, PrimaryButton, ProgressBar, Surface, WordChip } from '../../design/primitives'
import { LearnStatus } from '../../design/status'
import { Typo } from '../../design/typography'
import { RoutePath } from '../../app/routes'
import { selectNextWords, StoreConfig, useAppStore } from '../../store'
import { TodayCopy } from './TodayCopy'
import { TodayTestId } from './TodayTestId'
import { FontSize, FontWeight, Gap, Inset, Leading, Radius, Size } from '../../design/scale'
import { Border, IconSize, Shadow } from '../../design/styleValues'

const ENTER = 'wmIn 220ms ease-out'
const RISE = 'wmUp 300ms ease-out'

const SCREEN: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: Gap.G16,
  padding: Inset.I12_20_20,
  animation: ENTER,
}

const MUTED_LINE: CSSProperties = { font: Typo.sans(FontWeight.Regular, FontSize.F14, Leading.L20), color: 'var(--muted)' }
const LEGEND: CSSProperties = { display: 'flex', gap: Gap.G14, font: Typo.sans(FontWeight.Regular, FontSize.F13), color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }
const LEGEND_ITEM: CSSProperties = { display: 'flex', alignItems: 'center', gap: Gap.G6 }
const ACTIVATE_KEYS: readonly string[] = ['Enter', ' ']
const SPACER: CSSProperties = { flex: 1 }

function useTodayData() {
  const s = useAppStore(
    useShallow(state => ({
      streak: state.progress.streak.current,
      counts: state.progress.counts,
      total: state.words.length,
      todayDone: state.todayDone,
      canLearnMore: state.canLearnMore,
      due: state.plan.due.length,
      fresh: state.plan.fresh.length,
      settled: state.sync.lastSyncAt !== null || !state.sync.online || state.sync.lastError !== null,
    })),
  )
  const nextWords = useAppStore(useShallow(state => selectNextWords(state, StoreConfig.NEXT_CHIPS).map(w => w.rank)))
  const startSession = useAppStore(state => state.startSession)
  const learnMore = useAppStore(state => state.learnMore)
  return { ...s, nextWords, startSession, learnMore }
}

function StreakPill({ count, lit }: { count: number; lit: boolean }) {
  const style: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: Gap.G6,
    height: Size.S36,
    padding: Inset.I0_12_0_10,
    borderRadius: Radius.Pill,
    background: 'var(--surface)',
    boxShadow: Shadow.S_shadow,
    border: Border.B_1px_solid_line,
    font: Typo.sans(FontWeight.Semibold, FontSize.F15),
    fontVariantNumeric: 'tabular-nums',
  }
  const title = lit ? TodayCopy.STREAK_KEPT : TodayCopy.STREAK_OPEN
  return (
    <div style={style} title={title} data-testid={TodayTestId.Streak} data-lit={lit}>
      <span data-testid={TodayTestId.Flame} style={{ display: 'flex' }}>
        <Flame lit={lit} />
      </span>
      {count}
    </div>
  )
}

function Header({ streak, lit }: { streak: number; lit: boolean }) {
  const now = useMemo(() => new Date(), [])
  const name = useAppStore(state => state.settings.learnerName ?? '')
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: Gap.G4 }}>
        <div style={MUTED_LINE}>{TodayCopy.dateLine(now)}</div>
        <div style={{ font: Typo.sans(FontWeight.Semibold, FontSize.F22, Leading.L28) }} data-testid={TodayTestId.Greeting}>{TodayCopy.greeting(now, name)}</div>
      </div>
      <StreakPill count={streak} lit={lit} />
    </div>
  )
}

function LegendRow({ counts }: { counts: Record<Status, number> }) {
  const item = (status: LearnStatus, n: number, label: string) => (
    <span style={LEGEND_ITEM}>
      <LegendSwatch status={status} size={10} />
      {TodayCopy.fmt(n)} {label}
    </span>
  )
  return (
    <div style={LEGEND}>
      {item(LearnStatus.Mastered, counts[Status.Mastered], 'mastered')}
      {item(LearnStatus.Known, counts[Status.Known], 'known')}
      {item(LearnStatus.Learning, counts[Status.Learning], 'learning')}
    </div>
  )
}

interface KnowledgeCardProps {
  counts: Record<Status, number>
  total: number
}

function KnowledgeCard({ counts, total }: KnowledgeCardProps) {
  const navigate = useNavigate()
  const known = counts[Status.Known] + counts[Status.Mastered]
  const open = () => navigate(RoutePath.Map)
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!ACTIVATE_KEYS.includes(e.key)) return
    e.preventDefault()
    open()
  }
  const head: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }
  return (
    <Surface
      padding="18px 18px 16px"
      gap={14}
      style={{ cursor: 'pointer' }}
      data-testid={TodayTestId.MapCard}
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={onKey}
    >
      <div style={head}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: Gap.G8 }}>
          <span style={{ font: Typo.serif(FontWeight.Semibold, FontSize.F34, Leading.L38) }} data-testid={TodayTestId.Percent}>
            {TodayCopy.percent(known, total)}%
          </span>
          <span style={MUTED_LINE}>{TodayCopy.MAP_KNOWN}</span>
        </div>
        <span style={{ font: Typo.sans(FontWeight.Medium, FontSize.F14), color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }} data-testid={TodayTestId.KnownCount}>
          {TodayCopy.fmt(known)} / {TodayCopy.fmt(total)}
        </span>
      </div>
      <ProgressBar mastered={counts[Status.Mastered]} known={counts[Status.Known]} learning={counts[Status.Learning]} total={total} />
      <LegendRow counts={counts} />
    </Surface>
  )
}

function NextWords({ ranks }: { ranks: number[] }) {
  const navigate = useNavigate()
  const byRank = useAppStore(state => state.byRank)
  if (ranks.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: Gap.G10, padding: Inset.I4_0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ font: Typo.sans(FontWeight.Semibold, FontSize.F15) }}>{TodayCopy.NEXT_WORDS}</span>
        <button type="button" data-testid={TodayTestId.SeeMap} style={{ font: Typo.sans(FontWeight.Medium, FontSize.F14), color: 'var(--brand)', minHeight: Size.S44, minWidth: Size.S44, margin: Inset.In14_0 }} onClick={() => navigate(RoutePath.Map)}>
          See map
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: Gap.G8 }}>
        {ranks.map(rank => (
          <WordChip key={rank} data-testid={TodayTestId.nextWord(rank)} onClick={() => navigate(`/word/${rank}`)}>
            {byRank.get(rank)?.lemma}
          </WordChip>
        ))}
      </div>
    </div>
  )
}

function PendingCard({ line, settled, onStart }: { line: string; settled: boolean; onStart: () => void }) {
  return (
    <Surface padding="20px 18px 18px" gap={16}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: Gap.G6 }}>
          <span style={{ font: Typo.sans(FontWeight.Semibold, FontSize.F12), letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>{TodayCopy.HEADER}</span>
          <span style={{ font: Typo.sans(FontWeight.Semibold, FontSize.F22, Leading.L28) }} data-testid={TodayTestId.DueLine}>
            {line}
          </span>
        </div>
        <span style={{ font: Typo.sans(FontWeight.Medium, FontSize.F14), color: 'var(--muted)', paddingTop: 2 }}>{TodayCopy.ESTIMATE}</span>
      </div>
      <PrimaryButton data-testid={TodayTestId.Start} disabled={!settled} onClick={onStart}>
        Start
      </PrimaryButton>
    </Surface>
  )
}

function DoneCard({ canMore, onMore }: { canMore: boolean; onMore: () => void }) {
  const badge: CSSProperties = {
    width: Size.S40,
    height: Size.S40,
    borderRadius: Radius.Pill,
    background: 'var(--brandsoft)',
    color: 'var(--brand)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
  return (
    <Surface padding="20px 18px 18px" gap={16} animation={RISE} data-testid={TodayTestId.Done}>
      <div style={{ display: 'flex', alignItems: 'center', gap: Gap.G12 }}>
        <div style={badge}>
          <Icon name={IconName.Check} size={IconSize.S20} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ font: Typo.sans(FontWeight.Semibold, FontSize.F20, Leading.L26) }}>{TodayCopy.DONE_TITLE}</span>
          <span style={{ font: Typo.sans(FontWeight.Regular, FontSize.F14), color: 'var(--muted)' }}>{TodayCopy.DONE_SUB}</span>
        </div>
      </div>
      {canMore ? (
        <PrimaryButton variant={ButtonVariant.Outline} data-testid={TodayTestId.LearnMore} onClick={onMore}>
          Learn {StoreConfig.LEARN_MORE_BATCH} more
        </PrimaryButton>
      ) : null}
    </Surface>
  )
}

/** Today tab: streak, knowledge summary, next new words and the daily session card. */
export function TodayScreen() {
  const navigate = useNavigate()
  const d = useTodayData()
  const begin = (action: () => void) => () => {
    action()
    navigate(RoutePath.Session)
  }
  return (
    <div style={SCREEN} className="wm-anim" data-testid={TodayTestId.Screen}>
      <Header streak={d.streak} lit={d.todayDone} />
      <KnowledgeCard counts={d.counts} total={d.total} />
      <NextWords ranks={d.nextWords} />
      <div style={SPACER} />
      {d.todayDone ? (
        <DoneCard canMore={d.canLearnMore} onMore={begin(d.learnMore)} />
      ) : (
        <PendingCard line={TodayCopy.dueLine(d.due, d.fresh)} settled={d.settled} onStart={begin(d.startSession)} />
      )}
    </div>
  )
}
