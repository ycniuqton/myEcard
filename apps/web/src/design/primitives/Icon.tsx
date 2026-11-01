import type { ReactNode } from 'react'
import { Stroke } from '../scale'

export enum IconName {
  Flame = 'flame',
  Search = 'search',
  Gear = 'gear',
  Volume = 'volume',
  ChevronLeft = 'chevron-left',
  ChevronDown = 'chevron-down',
  Close = 'close',
  Check = 'check',
  Clock = 'clock',
  Today = 'today',
  Map = 'map',
  Progress = 'progress',
}

export const FLAME_COLOR = '#F08A24'

interface IconSpec {
  strokeWidth: number
  round?: 'cap' | 'join' | 'both'
  body: ReactNode
}

const FLAME_PATH = 'M12 2.5c1.2 3.2 6 5.6 6 11a6 6 0 0 1-12 0c0-2.6 1.3-4.4 2.6-5.6 0 2.3 1 3.6 2.4 3.6 0-3.4-1.3-5.6 1-9z'

const SPECS: Record<IconName, IconSpec> = {
  [IconName.Flame]: { strokeWidth: Stroke.W1_6, body: <path d={FLAME_PATH} /> },
  [IconName.Search]: { strokeWidth: Stroke.W1_9, body: (<><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></>) },
  [IconName.Gear]: {
    strokeWidth: Stroke.W1_8,
    body: (<><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" /></>),
  },
  [IconName.Volume]: {
    strokeWidth: Stroke.W1_9,
    round: 'join',
    body: (<><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16.5 9a4 4 0 0 1 0 6" /></>),
  },
  [IconName.ChevronLeft]: { strokeWidth: 2, body: <path d="M15 6l-6 6 6 6" /> },
  [IconName.ChevronDown]: { strokeWidth: 2, body: <path d="M6 9l6 6 6-6" /> },
  [IconName.Close]: { strokeWidth: 2, round: 'cap', body: <path d="M6 6l12 12M18 6L6 18" /> },
  [IconName.Check]: { strokeWidth: Stroke.W2_4, round: 'both', body: <path d="M5 12.5l4.5 4.5L19 7.5" /> },
  [IconName.Clock]: { strokeWidth: Stroke.W1_8, body: (<><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>) },
  [IconName.Today]: { strokeWidth: Stroke.W1_8, body: (<><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M4 10h16M9 3v4M15 3v4" /></>) },
  [IconName.Map]: {
    strokeWidth: Stroke.W1_8,
    body: (<><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>),
  },
  [IconName.Progress]: { strokeWidth: Stroke.W1_8, body: <path d="M5 20v-7M12 20V5M19 20v-10" /> },
}

export interface IconProps {
  name: IconName
  size?: number
  fill?: string
  stroke?: string
  className?: string
}

const DEFAULT_SIZE = 20

/** Inline SVG icon from the design set; strokes follow currentColor. */
export function Icon({ name, size = DEFAULT_SIZE, fill = 'none', stroke = 'currentColor', className }: IconProps) {
  const spec = SPECS[name]
  const cap = spec.round === 'cap' || spec.round === 'both' ? 'round' : undefined
  const join = spec.round === 'join' || spec.round === 'both' ? 'round' : undefined
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={stroke}
      strokeWidth={spec.strokeWidth}
      strokeLinecap={cap}
      strokeLinejoin={join}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {spec.body}
    </svg>
  )
}

export interface FlameProps {
  size?: number
  lit: boolean
}

/** Streak flame: outlined when idle, filled once today is done; large size is always solid. */
export function Flame({ size = 18, lit }: FlameProps) {
  const solid = size > 18
  const fill = lit || solid ? FLAME_COLOR : 'none'
  const stroke = solid ? 'none' : FLAME_COLOR
  return <Icon name={IconName.Flame} size={size} fill={fill} stroke={stroke} />
}
