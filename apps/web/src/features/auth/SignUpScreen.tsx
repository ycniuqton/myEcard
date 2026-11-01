import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PrimaryButton, TextField } from '../../design/primitives'
import { RoutePath } from '../../app/routes'
import { AuthRules } from '../../auth/AuthRules'
import { useAuth } from '../../auth/AuthProvider'
import { AuthCopy } from './AuthCopy'
import { AuthForm, AuthLinks, AuthPage, useSubmit } from './AuthLayout'
import { AuthTestId } from './AuthTestId'

const LINKS = [{ to: RoutePath.Login, testId: AuthTestId.ToLogin, children: AuthCopy.LOGIN_LINK }] as const

function CheckEmail({ email }: { email: string }) {
  const navigate = useNavigate()
  const sub = (
    <span data-testid={AuthTestId.CheckEmailText}>{AuthCopy.CONFIRM_SENT} <strong>{email}</strong>. {AuthCopy.CONFIRM_NEXT}</span>
  )
  return (
    <AuthPage testId={AuthTestId.CheckEmail} title={AuthCopy.CHECK_TITLE} sub={sub}>
      <PrimaryButton data-testid={AuthTestId.ToLogin} onClick={() => navigate(RoutePath.Login)}>{AuthCopy.BACK_TO_LOGIN}</PrimaryButton>
    </AuthPage>
  )
}

/** Account creation; shows a "check your email" state when the provider requires confirmation. */
export function SignUpScreen() {
  const { manager } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [shown, setShown] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const form = useSubmit()
  const problems = {
    email: AuthCopy.problem(AuthRules.email(email)),
    password: AuthCopy.problem(AuthRules.password(password)),
    confirm: AuthCopy.problem(AuthRules.confirm(password, confirm)),
  }
  const submit = () => {
    setShown(true)
    if (problems.email || problems.password || problems.confirm || !manager) return
    void form.run(async () => {
      const result = await manager.signUp(email.trim(), password)
      if (result.needsConfirmation) setSentTo(email.trim())
    })
  }
  if (sentTo) return <CheckEmail email={sentTo} />
  return (
    <AuthPage testId={AuthTestId.SignUpScreen} title={AuthCopy.SIGNUP_TITLE} sub={AuthCopy.SIGNUP_SUB}>
      <AuthForm submitLabel={AuthCopy.SIGNUP_SUBMIT} busy={form.busy} error={form.error} onSubmit={submit}>
        <TextField id="signup-email" testId={AuthTestId.Email} label={AuthCopy.EMAIL} type="email" autoComplete="email" inputMode="email"
          value={email} onChange={e => setEmail(e.target.value)} disabled={form.busy} error={shown ? problems.email : null} />
        <TextField id="signup-password" testId={AuthTestId.Password} label={AuthCopy.PASSWORD} type="password" autoComplete="new-password"
          value={password} onChange={e => setPassword(e.target.value)} disabled={form.busy} error={shown ? problems.password : null} />
        <TextField id="signup-confirm" testId={AuthTestId.Confirm} label={AuthCopy.CONFIRM} type="password" autoComplete="new-password"
          value={confirm} onChange={e => setConfirm(e.target.value)} disabled={form.busy} error={shown ? problems.confirm : null} />
      </AuthForm>
      <AuthLinks links={LINKS} />
    </AuthPage>
  )
}
