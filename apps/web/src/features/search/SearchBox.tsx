import { useEffect, useRef } from 'react'
import type { CSSProperties, RefObject } from 'react'
import { Icon, IconName } from '../../design/primitives'
import { Typo } from '../../design/typography'
import { FontSize, FontWeight, Gap, Inset, Radius, Size } from '../../design/scale'
import { Border, IconSize } from '../../design/styleValues'
import { SearchCopy } from './SearchCopy'

const BOX_STYLE: CSSProperties = {
  height: Size.S48,
  borderRadius: Radius.R12,
  background: 'var(--surface)',
  border: Border.B_1px_solid_border,
  display: 'flex',
  alignItems: 'center',
  gap: Gap.G10,
  padding: Inset.I0_14,
  color: 'var(--muted)',
}

const FIELD_STYLE: CSSProperties = {
  flex: 1,
  border: 0,
  outline: 0,
  background: 'transparent',
  font: Typo.sans(FontWeight.Regular, FontSize.F17),
  color: 'var(--text)',
  minWidth: 0,
}

const CLEAR_STYLE: CSSProperties = {
  font: Typo.sans(FontWeight.Medium, FontSize.F14),
  color: 'var(--brand)',
  minWidth: Size.S44,
  height: Size.S44,
  margin: Inset.I0_n14_0_0,
  padding: Inset.I0_14,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

type BoxProps = { query: string; onChange: (q: string) => void }

type BoxFocus = { input: RefObject<HTMLInputElement>; focus: () => void; clear: () => void }

/** Autofocus handling and clear action for the search field. */
function useBoxFocus(onChange: (q: string) => void): BoxFocus {
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => input.current?.focus(), [])
  const focus = () => input.current?.focus()
  const clear = () => {
    onChange('')
    focus()
  }
  return { input, focus, clear }
}

function SearchField({ query, onChange, input }: BoxProps & { input: RefObject<HTMLInputElement> }) {
  return (
    <input
      ref={input}
      value={query}
      placeholder={SearchCopy.PLACEHOLDER}
      style={FIELD_STYLE}
      data-testid="search-input"
      autoComplete="off"
      autoCapitalize="none"
      spellCheck={false}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function ClearButton({ onClear }: { onClear: () => void }) {
  return (
    <button type="button" style={CLEAR_STYLE} data-testid="search-clear" onClick={onClear}>
      {SearchCopy.CLEAR}
    </button>
  )
}

/** Search input row with leading icon and clear button. */
export function SearchBox({ query, onChange }: BoxProps) {
  const { input, focus, clear } = useBoxFocus(onChange)
  return (
    <div style={BOX_STYLE} onClick={focus}>
      <Icon name={IconName.Search} size={IconSize.S20} />
      <SearchField query={query} onChange={onChange} input={input} />
      {query ? <ClearButton onClear={clear} /> : null}
    </div>
  )
}
