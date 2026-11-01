import type { CSSProperties } from 'react'
import { Grade } from '@wordmap/shared'
import { Typo } from '../../design/typography'
import type { GradeOption } from './GradePreview'
import { SessionCopy } from './SessionCopy'
import { FontSize, FontWeight, Gap, Radius, Size } from '../../design/scale'
import { Border, Grid, Motion } from '../../design/styleValues'

const PRESS_SCALE = '.95'
const TINT_PERCENT = 16
const TOP_BAR = 3

const LABEL: Record<Grade, string> = {
  [Grade.Again]: 'Again',
  [Grade.Hard]: 'Hard',
  [Grade.Good]: 'Good',
  [Grade.Easy]: 'Easy',
}

const GRID: CSSProperties = {
  display: 'grid', gridTemplateColumns: Grid.C_repeat_4_minmax_0_1fr, gap: Gap.G8, flex: 'none', animation: Motion.A_wmIn_200ms_ease_out,
}
const BUTTON: CSSProperties = {
  height: Size.S66, borderRadius: Radius.R12, border: Border.B_1px_solid_line, display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', gap: 2, position: 'relative', overflow: 'hidden', color: 'var(--text)',
  ['--wm-press' as string]: PRESS_SCALE,
}
const NAME: CSSProperties = { font: Typo.sans(FontWeight.Semibold, FontSize.F16) }
const INTERVAL: CSSProperties = { font: Typo.sans(FontWeight.Medium, FontSize.F12), color: 'var(--muted)' }

export interface GradeButtonsProps {
  options: GradeOption[]
  onGrade: (grade: Grade) => void
}

/** Four coloured grade buttons with the scheduler's next-interval labels. */
export function GradeButtons({ options, onGrade }: GradeButtonsProps) {
  return (
    <div style={GRID} className="wm-anim">
      {options.map(({ grade, interval }) => {
        const color = `var(--${grade})`
        const style = { ...BUTTON, background: `color-mix(in srgb,${color} ${TINT_PERCENT}%,var(--surface))` }
        const bar: CSSProperties = { position: 'absolute', top: 0, left: 0, right: 0, height: TOP_BAR, background: color }
        return (
          <button
            key={grade} type="button" className="wm-press" style={style}
            data-testid={`${SessionCopy.GRADE_TEST_ID_PREFIX}${grade}`} onClick={() => onGrade(grade)}
          >
            <span style={bar} />
            <span style={NAME}>{LABEL[grade]}</span>
            <span style={INTERVAL} data-testid={`${SessionCopy.GRADE_TEST_ID_PREFIX}${grade}-interval`}>{interval}</span>
          </button>
        )
      })}
    </div>
  )
}
