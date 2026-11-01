import type { CSSProperties, ReactNode } from 'react'
import { Typo } from '../typography'
import { Icon, IconName } from './Icon'
import { FontSize, FontWeight, Inset, Size } from '../scale'
import { IconSize } from '../styleValues'

export interface TopBarProps {
  backLabel: string
  onBack: () => void
  trailing?: ReactNode
  backTestId?: string
}

const DEFAULT_BACK_TEST_ID = 'back'

/** 44px top bar with a brand back chevron and label. */
export function TopBar({ backLabel, onBack, trailing, backTestId = DEFAULT_BACK_TEST_ID }: TopBarProps) {
  const row: CSSProperties = {
    flex: 'none',
    padding: Inset.I0_20,
    height: Size.S44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  }
  const back: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    marginLeft: Size.SN10,
    minHeight: Size.S44,
    color: 'var(--brand)',
    font: Typo.sans(FontWeight.Medium, FontSize.F16),
  }
  return (
    <div style={row}>
      <button type="button" style={back} onClick={onBack} data-testid={backTestId}>
        <Icon name={IconName.ChevronLeft} size={IconSize.S24} />
        {backLabel}
      </button>
      {trailing}
    </div>
  )
}

export interface IconButtonProps {
  icon: IconName
  label: string
  onClick: () => void
  size?: number
  tone?: string
  testId?: string
}

/** 44px square tap target around an icon (close, settings). */
export function IconButton({ icon, label, onClick, size = 22, tone = 'var(--muted)', testId }: IconButtonProps) {
  const style: CSSProperties = {
    width: Size.S44,
    height: Size.S44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: tone,
  }
  return (
    <button type="button" style={style} aria-label={label} onClick={onClick} data-testid={testId}>
      <Icon name={icon} size={size} />
    </button>
  )
}
