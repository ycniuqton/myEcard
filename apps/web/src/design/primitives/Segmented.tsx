import type { CSSProperties } from 'react'
import { Typo } from '../typography'
import { FontSize, FontWeight, Inset, Radius, Size } from '../scale'
import { Motion } from '../styleValues'

export interface SegmentOption<T extends string> {
  value: T
  label: string
}

export interface SegmentedProps<T extends string> {
  options: readonly SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  itemPadding?: string
  label?: string
  itemTestId?: (value: T) => string
}

/** Segmented control: tinted track, raised surface on the active option. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  itemPadding = '6px 10px',
  label,
  itemTestId,
}: SegmentedProps<T>) {
  const track: CSSProperties = {
    display: 'flex',
    padding: Size.S3,
    borderRadius: Radius.R10,
    background: 'var(--tint)',
    font: Typo.sans(FontWeight.Medium, FontSize.F13),
  }
  return (
    <div style={track} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <SegmentItem key={o.value} option={o} active={o.value === value} padding={itemPadding} onPick={onChange} testId={itemTestId?.(o.value)} />
      ))}
    </div>
  )
}

interface SegmentItemProps<T extends string> {
  option: SegmentOption<T>
  active: boolean
  padding: string
  onPick: (value: T) => void
  testId?: string
}

function SegmentItem<T extends string>({ option, active, padding, onPick, testId }: SegmentItemProps<T>) {
  const hit: CSSProperties = { display: 'flex', alignItems: 'center', minHeight: Size.S44, margin: Inset.In8_0 }
  const style: CSSProperties = {
    padding,
    borderRadius: Radius.R7,
    background: active ? 'var(--surface)' : 'transparent',
    boxShadow: active ? 'var(--shadow)' : 'none',
    color: active ? 'var(--text)' : 'var(--muted)',
    transition: Motion.T_all_200ms_ease_out,
  }
  return (
    <button type="button" className="wm-motion" role="radio" aria-checked={active} style={hit} onClick={() => onPick(option.value)} data-testid={testId}>
      <span style={style}>{option.label}</span>
    </button>
  )
}
