import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import {
  Confetti,
  FilterChip,
  Flame,
  GradeButton,
  Icon,
  IconName,
  LegendSwatch,
  PrimaryButton,
  ButtonVariant,
  ProgressBar,
  Segmented,
  SessionProgress,
  StatusChip,
  Stepper,
  Surface,
  TabBar,
  TabId,
  TileGrid,
  Toggle,
  TopBar,
  WordChip,
} from '../../design/primitives'
import { GradeTone, LearnStatus, TileScale } from '../../design/status'
import { Typo } from '../../design/typography'
import { ResolvedTheme } from '../theme/themeResolver'
import { FontSize, FontWeight, Gap, Inset, Leading, Size } from '../../design/scale'
import { Grid, IconSize } from '../../design/styleValues'

const STATUSES = [LearnStatus.Unknown, LearnStatus.Learning, LearnStatus.Known, LearnStatus.Mastered]
const BAND: LearnStatus[] = Array.from({ length: 100 }, (_, i) => {
  const r = (i * 37) % 10
  if (r < 3) return LearnStatus.Mastered
  if (r < 6) return LearnStatus.Known
  return r < 8 ? LearnStatus.Learning : LearnStatus.Unknown
})
const PREVIEW_TOTAL = 10000
const POPS: ReadonlySet<number> = new Set([57])

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: Gap.G10 }}>
      <h3 style={{ margin: 0, font: Typo.sans(FontWeight.Semibold, FontSize.F12), letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
        {title}
      </h3>
      {children}
    </section>
  )
}

function Row({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: Gap.G8, alignItems: 'center' }}>{children}</div>
}

function IconsBlock() {
  return (
    <Block title="Icons">
      <Row>
        {Object.values(IconName).map((n) => (
          <Icon key={n} name={n} size={IconSize.S24} />
        ))}
        <Flame lit={false} />
        <Flame lit />
        <Flame lit size={IconSize.S22} />
      </Row>
    </Block>
  )
}

function ChipsBlock() {
  const [filter, setFilter] = useState('All')
  return (
    <Block title="Chips">
      <Row>
        {STATUSES.map((s) => (
          <StatusChip key={s} status={s} />
        ))}
      </Row>
      <Row>
        <WordChip>decide</WordChip>
        <WordChip status={LearnStatus.Known}>effort</WordChip>
        <WordChip status={LearnStatus.Unknown}>rural</WordChip>
      </Row>
      <Row>
        {['All', 'Unknown', 'Learning', 'Known'].map((f) => (
          <FilterChip key={f} label={f} active={f === filter} onClick={() => setFilter(f)} />
        ))}
      </Row>
    </Block>
  )
}

function TilesBlock() {
  return (
    <Block title="Tiles">
      <Surface padding="12px" gap={10}>
        <TileGrid statuses={BAND} hereIndex={42} popIndexes={POPS} />
      </Surface>
      <TileGrid statuses={BAND} scale={TileScale.Compact} hereIndex={42} />
      <Row>
        {STATUSES.map((s) => (
          <LegendSwatch key={s} status={s} />
        ))}
      </Row>
    </Block>
  )
}

function ControlsBlock() {
  const [seg, setSeg] = useState('light')
  const [count, setCount] = useState(5)
  const [on, setOn] = useState(true)
  const opts = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ]
  return (
    <Block title="Controls">
      <Row>
        <Segmented options={opts} value={seg} onChange={setSeg} />
        <Stepper value={count} min={3} max={20} onChange={setCount} />
        <Toggle checked={on} onChange={setOn} label="Demo toggle" />
      </Row>
      <ProgressBar mastered={900} known={600} learning={300} total={PREVIEW_TOTAL} />
      <ProgressBar mastered={30} known={30} learning={10} total={100} height={8} />
      <div style={{ display: 'flex' }}>
        <SessionProgress fraction={0.4} />
      </div>
    </Block>
  )
}

function ButtonsBlock() {
  return (
    <Block title="Buttons">
      <PrimaryButton>Start</PrimaryButton>
      <PrimaryButton variant={ButtonVariant.Outline}>Learn 5 more</PrimaryButton>
      <div style={{ display: 'grid', gridTemplateColumns: Grid.C_repeat_4_minmax_0_1fr, gap: Gap.G8 }}>
        <GradeButton tone={GradeTone.Again} label="Again" interval="&lt;10m" />
        <GradeButton tone={GradeTone.Hard} label="Hard" interval="2d" />
        <GradeButton tone={GradeTone.Good} label="Good" interval="4d" />
        <GradeButton tone={GradeTone.Easy} label="Easy" interval="9d" />
      </div>
      <TopBar backLabel="Map" onBack={() => undefined} />
    </Block>
  )
}

function Panel({ theme }: { theme: ResolvedTheme }) {
  const style: CSSProperties = {
    width: Size.S390,
    background: 'var(--bg)',
    color: 'var(--text)',
    padding: Inset.I20_20_0,
    display: 'flex',
    flexDirection: 'column',
    gap: Gap.G22,
    position: 'relative',
    overflow: 'hidden',
    font: Typo.sans(FontWeight.Regular, FontSize.F14),
  }
  return (
    <div data-theme={theme} style={style}>
      <h2 style={{ margin: 0, font: Typo.sans(FontWeight.Semibold, FontSize.F22, Leading.L28) }}>{theme === ResolvedTheme.Dark ? 'Dark' : 'Light'}</h2>
      <IconsBlock />
      <ChipsBlock />
      <TilesBlock />
      <ControlsBlock />
      <ButtonsBlock />
      <div style={{ position: 'relative', height: Size.S60 }}>
        <Confetti />
      </div>
      <div style={{ margin: Inset.I0_n20 }}>
        <TabBar active={TabId.Map} onSelect={() => undefined} />
      </div>
    </div>
  )
}

/** Dev-only gallery of every design primitive in light and dark. */
export default function DesignPreview() {
  return (
    <div id="design-preview" style={{ display: 'flex', gap: Gap.G24, padding: Size.S24, background: 'var(--desk)', alignItems: 'flex-start' }}>
      <Panel theme={ResolvedTheme.Light} />
      <Panel theme={ResolvedTheme.Dark} />
    </div>
  )
}
