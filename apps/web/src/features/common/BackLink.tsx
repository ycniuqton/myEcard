import type { CSSProperties } from 'react'
import { Icon, IconName } from '../../design/primitives'
import { Typo } from '../../design/typography'
import { FontSize, FontWeight, Size } from '../../design/scale'
import { IconSize } from '../../design/styleValues'

export type BackLinkProps = { label: string; onBack: () => void }

/** Brand back chevron with label, 44px tall, for headers that already pad their sides. */
export function BackLink({ label, onBack }: BackLinkProps) {
  const style: CSSProperties = {
    height: Size.S44,
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    marginLeft: Size.SN10,
    color: 'var(--brand)',
    font: Typo.sans(FontWeight.Medium, FontSize.F16),
    width: 'max-content',
  }
  return (
    <button type="button" style={style} onClick={onBack} data-testid="back">
      <Icon name={IconName.ChevronLeft} size={IconSize.S24} />
      {label}
    </button>
  )
}
