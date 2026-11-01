import { useState } from 'react'
import type { CSSProperties, FormEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PrimaryButton } from '../../design/primitives'
import { Typo } from '../../design/typography'
import { FontSize, FontWeight, Gap, Inset, Leading } from '../../design/scale'
import { Motion } from '../../design/styleValues'
import { AuthCopy } from './AuthCopy'
import { AuthTestId } from './AuthTestId'

const PAGE: CSSProperties = {
  flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: Gap.G20, padding: Inset.I12_20_20,
  animation: Motion.A_wmIn_300ms_ease_out,
}
const HEAD: CSSProperties = { display: 'flex', flexDirection: 'column', gap: Gap.G8, paddingTop: Gap.G24 }
const KICKER: CSSProperties = { font: Typo.sans(FontWeight.Semibold, FontSize.F12), letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--brand)' }
const TITLE: CSSProperties = { font: Typo.serif(FontWeight.Semibold, FontSize.F34, Leading.L40), textWrap: 'balance' }
const SUB: CSSProperties = { font: Typo.sans(FontWeight.Regular, FontSize.F17, Leading.L26), color: 'var(--muted)', textWrap: 'pretty' }
const FORM: CSSProperties = { display: 'flex', flexDirection: 'column', gap: Gap.G16 }
const LINKS: CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Gap.G12, font: Typo.sans(FontWeight.Medium, FontSize.F15) }
const ERROR: CSSProperties = { font: Typo.sans(FontWeight.Regular, FontSize.F14), color: 'var(--again)' }

export interface AuthPageProps {
  testId: string
  title: string
  sub?: ReactNode
  children: ReactNode
}

/** Shared chrome of the account screens: brand kicker, title, subtitle and body. */
export function AuthPage({ testId, title, sub, children }: AuthPageProps) {
  return (
    <div style={PAGE} data-testid={testId}>
      <div style={HEAD}>
        <span style={KICKER}>{AuthCopy.BRAND}</span>
        <h1 style={{ ...TITLE, margin: 0 }}>{title}</h1>
        {sub ? <span style={SUB}>{sub}</span> : null}
      </div>
      {children}
    </div>
  )
}

export interface AuthFormProps {
  submitLabel: string
  busy: boolean
  error: string | null
  onSubmit: () => void
  children: ReactNode
}

/** Form with fields, an error line and the primary submit button (disabled while busy). */
export function AuthForm({ submitLabel, busy, error, onSubmit, children }: AuthFormProps) {
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!busy) onSubmit()
  }
  return (
    <form style={FORM} onSubmit={submit} noValidate>
      {children}
      {error ? <span role="alert" data-testid={AuthTestId.FormError} style={ERROR}>{error}</span> : null}
      <PrimaryButton type="submit" disabled={busy} aria-busy={busy} data-testid={AuthTestId.Submit} style={busy ? { opacity: 0.6 } : undefined}>
        {submitLabel}
      </PrimaryButton>
    </form>
  )
}

export interface AuthLinkProps {
  to: string
  testId: string
  children: ReactNode
}

export function AuthLinks({ links }: { links: readonly AuthLinkProps[] }) {
  return (
    <div style={LINKS}>
      {links.map(l => (
        <Link key={l.testId} to={l.to} data-testid={l.testId}>{l.children}</Link>
      ))}
    </div>
  )
}

/** Tracks the busy and error state of one form submission. */
export function useSubmit() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = async (task: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await task()
    } catch (failure) {
      setError(AuthCopy.errorText(failure))
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, setError, run }
}
