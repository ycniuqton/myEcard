import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { knownOverTime, reviewsPerDay, Status } from '@wordmap/shared'
import type { KnownPoint, ReviewDayPoint } from '@wordmap/shared'
import { ApiClient } from '../../api'
import { IconButton, IconName, LegendSwatch, Surface } from '../../design/primitives'
import { LearnStatus, StatusPalette } from '../../design/status'
import { Typo } from '../../design/typography'
import { RoutePath } from '../../app/routes'
import { selectKnownCount, useAppStore } from '../../store'
import { TodayCopy } from '../today/TodayCopy'
import { ProgressSeries } from './ProgressSeries'
import { ProgressTestId } from './ProgressTestId'
import { FontSize, FontWeight, Gap, Inset, Leading, Radius, Size } from '../../design/scale'
import { Motion } from '../../design/styleValues'
import { ProgressCopy } from './ProgressCopy'

const SCREEN: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: Gap.G16,
  padding: Inset.I8_20_24,
  animation: Motion.A_wmIn_220ms_ease_out,
}

const CARD_HEAD: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }
const CARD_TITLE: CSSProperties = { font: Typo.sans(FontWeight.Semibold, FontSize.F15) }
const CARD_NOTE: CSSProperties = { font: Typo.sans(FontWeight.Regular, FontSize.F13), color: 'var(--muted)' }

const STATUS_ROWS: ReadonlyArray<{ status: LearnStatus; key: Status; label: string }> = [
  { status: LearnStatus.Mastered, key: Status.Mastered, label: StatusPalette.label(LearnStatus.Mastered) },
  { status: LearnStatus.Known, key: Status.Known, label: StatusPalette.label(LearnStatus.Known) },
  { status: LearnStatus.Learning, key: Status.Learning, label: StatusPalette.label(LearnStatus.Learning) },
  { status: LearnStatus.Unknown, key: Status.Unknown, label: StatusPalette.label(LearnStatus.Unknown) },
]

type RemoteStats = { known: KnownPoint[]; reviews: ReviewDayPoint[] }

function useRemoteStats(today: string, refreshKey: unknown): RemoteStats | null {
  const [remote, setRemote] = useState<RemoteStats | null>(null)
  useEffect(() => {
    let live = true
    new ApiClient()
      .stats(today)
      .then(r => live && setRemote({ known: r.knownOverTime, reviews: r.reviewsPerDay }))
      .catch(() => live && setRemote(null))
    return () => {
      live = false
    }
  }, [today, refreshKey])
  return remote
}

function useProgressData() {
  const base = useAppStore(
    useShallow(state => ({
      streak: state.progress.streak,
      counts: state.progress.counts,
      dueTomorrow: state.progress.dueTomorrow,
      today: state.today,
      knownNow: selectKnownCount(state),
    })),
  )
  const logs = useAppStore(state => state.reviewLogs)
  const syncedAt = useAppStore(state => state.sync.lastSyncAt)
  const remote = useRemoteStats(base.today, syncedAt)
  const known = useMemo(
    () => ProgressSeries.knownSeries(remote?.known ?? knownOverTime(logs), base.knownNow, base.today),
    [remote, logs, base.knownNow, base.today],
  )
  const bars = useMemo(
    () => ProgressSeries.bars(remote?.reviews ?? reviewsPerDay(logs, base.today)),
    [remote, logs, base.today],
  )
  return { ...base, known, bars }
}

function StreakCard({ label, days, testId }: { label: string; days: number; testId: string }) {
  return (
    <Surface gap={4}>
      <span style={CARD_NOTE}>{label}</span>
      <span style={{ font: Typo.serif(FontWeight.Semibold, FontSize.F28, Leading.L34) }} data-testid={testId}>
        {ProgressSeries.daysLabel(days)}
      </span>
    </Surface>
  )
}

function KnownChart({ series }: { series: ReturnType<typeof useProgressData>['known'] }) {
  return (
    <Surface gap={10} data-testid={ProgressTestId.KnownChart}>
      <div style={CARD_HEAD}>
        <span style={CARD_TITLE}>{ProgressCopy.WORDS_KNOWN}</span>
        <span style={CARD_NOTE}>
          Last 30 days ·{' '}
          <span style={{ color: 'var(--good)', fontWeight: FontWeight.Semibold }} data-testid={ProgressTestId.Gain}>
            +{TodayCopy.fmt(Math.max(0, series.gain))}
          </span>
        </span>
      </div>
      <svg width="100%" height={ProgressSeries.VIEW_HEIGHT} viewBox={`0 0 ${ProgressSeries.VIEW_WIDTH} ${ProgressSeries.VIEW_HEIGHT}`} preserveAspectRatio="none" role="img" aria-label={ProgressCopy.WORDS_KNOWN_ARIA}>
        <polyline points={series.points} fill="none" stroke="var(--brand)" strokeWidth={2.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" data-testid={ProgressTestId.Line} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', font: Typo.sans(FontWeight.Regular, FontSize.F12), color: 'var(--muted)' }}>
        <span>{ProgressSeries.dayLabel(series.startDate)}</span>
        <span>{ProgressSeries.dayLabel(series.endDate)}</span>
      </div>
    </Surface>
  )
}

function ReviewBars({ bars, dueTomorrow }: { bars: ReturnType<typeof ProgressSeries.bars>; dueTomorrow: number }) {
  return (
    <Surface gap={12} data-testid={ProgressTestId.Reviews}>
      <div style={CARD_HEAD}>
        <span style={CARD_TITLE}>{ProgressCopy.REVIEWS_PER_DAY}</span>
        <span style={CARD_NOTE} data-testid={ProgressTestId.DueTomorrow}>
          Due tomorrow: {dueTomorrow}
        </span>
      </div>
      <div style={{ height: Size.S80, display: 'flex', alignItems: 'flex-end', gap: Gap.G4 }}>
        {bars.map(b => (
          <div
            key={b.date}
            data-testid={ProgressTestId.bar(b.date)}
            title={`${b.date}: ${b.count}`}
            style={{ flex: 1, height: `${b.heightPct}%`, borderRadius: Radius.R3, background: b.current ? 'var(--brand)' : 'var(--tint)' }}
          />
        ))}
      </div>
    </Surface>
  )
}

function StatusList({ counts }: { counts: Record<Status, number> }) {
  return (
    <Surface padding="4px 16px">
      {STATUS_ROWS.map((row, i) => {
        const last = i === STATUS_ROWS.length - 1
        const style: CSSProperties = {
          height: Size.S48,
          display: 'flex',
          alignItems: 'center',
          gap: Gap.G10,
          borderBottom: last ? undefined : '1px solid var(--border)',
        }
        return (
          <div key={row.label} style={style}>
            <LegendSwatch status={row.status} size={12} />
            <span style={{ flex: 1, font: Typo.sans(FontWeight.Regular, FontSize.F16) }}>{row.label}</span>
            <span style={{ font: Typo.sans(FontWeight.Semibold, FontSize.F16), fontVariantNumeric: 'tabular-nums' }} data-testid={ProgressTestId.count(row.key)}>
              {TodayCopy.fmt(counts[row.key])}
            </span>
          </div>
        )
      })}
    </Surface>
  )
}

/** Progress tab: streaks, known-words line, review bars and status counts. */
export function ProgressScreen() {
  const navigate = useNavigate()
  const d = useProgressData()
  return (
    <div style={SCREEN} className="wm-anim" data-testid={ProgressTestId.Screen}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ font: Typo.sans(FontWeight.Semibold, FontSize.F22, Leading.L28) }}>{ProgressCopy.TITLE}</span>
        <span style={{ marginRight: Size.SN10, display: 'flex' }}>
          <IconButton icon={IconName.Gear} label={ProgressCopy.SETTINGS} onClick={() => navigate(RoutePath.Settings)} />
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: Gap.G12 }}>
        <StreakCard label={ProgressCopy.CURRENT_STREAK} days={d.streak.current} testId={ProgressTestId.CurrentStreak} />
        <StreakCard label={ProgressCopy.BEST_STREAK} days={d.streak.best} testId={ProgressTestId.BestStreak} />
      </div>
      <KnownChart series={d.known} />
      <ReviewBars bars={d.bars} dueTomorrow={d.dueTomorrow} />
      <StatusList counts={d.counts} />
    </div>
  )
}
