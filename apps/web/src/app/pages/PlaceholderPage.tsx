import { useParams } from 'react-router-dom'
import { Typo } from '../../design/typography'
import { FontSize, FontWeight, Gap, Inset, Leading } from '../../design/scale'
import { Motion } from '../../design/styleValues'
import { AppCopy } from '../AppCopy'

export interface PlaceholderPageProps {
  title: string
}

/** Temporary screen body; replaced by the real feature screens in later phases. */
export function PlaceholderPage({ title }: PlaceholderPageProps) {
  const params = useParams()
  const detail = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ')
  return (
    <div style={{ flex: 1, padding: Inset.I12_20, display: 'flex', flexDirection: 'column', gap: Gap.G6, animation: Motion.A_wmIn_220ms_ease_out }}>
      <span style={{ font: Typo.sans(FontWeight.Semibold, FontSize.F22, Leading.L28) }}>{title}</span>
      <span style={{ font: Typo.sans(FontWeight.Regular, FontSize.F14), color: 'var(--muted)' }}>{detail || AppCopy.COMING_SOON}</span>
    </div>
  )
}
