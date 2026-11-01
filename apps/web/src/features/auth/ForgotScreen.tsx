import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PrimaryButton, TextField } from '../../design/primitives'
import { RoutePath } from '../../app/routes'
import { AuthRules } from '../../auth/AuthRules'
import { useAuth } from '../../auth/AuthProvider'
import { AuthCopy } from './AuthCopy'
import { AuthForm, AuthLinks, AuthPage, useSubmit } from './AuthLayout'
import { AuthTestId } from './AuthTestId'

const LINKS = [{ to: RoutePath.Login, testId: AuthTestId.ToLogin, children: AuthCopy.BACK_TO_LOGIN }] as const

function Sent({ email }: { email: string }) {
  const navigate = useNavigate()
  const sub = (
    <span data-testid={AuthTestId.ResetSentText}>{AuthCopy.RESET_SENT_PREFIX} <strong>{email}</strong>, {AuthCopy.RESET_SENT_SUFFIX}</span>
  )
  return (
    <AuthPage testId={AuthTestId.ResetSent} title={AuthCopy.CHECK_TITLE} sub={sub}>
      <PrimaryButton data-testid={AuthTestId.ToLogin} onClick={() => navigate(RoutePath.Login)}>{AuthCopy.BACK_TO_LOGIN}</PrimaryButton>
    </AuthPage>
  )
}

/** Asks for an email and sends the reset link; the confirmation never reveals whether the account exists. */
export function ForgotScreen() {
  const { manager } = useAuth()
  const [email, setEmail] = useState('')
  const [shown, setShown] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const form = useSubmit()
  const problem = AuthCopy.problem(AuthRules.email(email))
  const submit = () => {
    setShown(true)
    if (problem || !manager) return
    void form.run(async () => {
      await manager.sendResetEmail(email.trim())
      setSentTo(email.trim())
    })
  }
  if (sentTo) return <Sent email={sentTo} />
  return (
    <AuthPage testId={AuthTestId.ForgotScreen} title={AuthCopy.FORGOT_TITLE} sub={AuthCopy.FORGOT_SUB}>
      <AuthForm submitLabel={AuthCopy.FORGOT_SUBMIT} busy={form.busy} error={form.error} onSubmit={submit}>
        <TextField id="forgot-email" testId={AuthTestId.Email} label={AuthCopy.EMAIL} type="email" autoComplete="email" inputMode="email"
          value={email} onChange={e => setEmail(e.target.value)} disabled={form.busy} error={shown ? problem : null} />
      </AuthForm>
      <AuthLinks links={LINKS} />
    </AuthPage>
  )
}
