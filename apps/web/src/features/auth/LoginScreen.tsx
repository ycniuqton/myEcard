import { useState } from 'react'
import { TextField } from '../../design/primitives'
import { RoutePath } from '../../app/routes'
import { AuthRules } from '../../auth/AuthRules'
import { useAuth } from '../../auth/AuthProvider'
import { AuthCopy } from './AuthCopy'
import { AuthForm, AuthLinks, AuthPage, useSubmit } from './AuthLayout'
import { AuthTestId } from './AuthTestId'

const LINKS = [
  { to: RoutePath.Forgot, testId: AuthTestId.ToForgot, children: AuthCopy.FORGOT_LINK },
  { to: RoutePath.SignUp, testId: AuthTestId.ToSignUp, children: AuthCopy.SIGNUP_LINK },
] as const

/** Email and password log in. */
export function LoginScreen() {
  const { manager } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [shown, setShown] = useState(false)
  const form = useSubmit()
  const emailProblem = AuthCopy.problem(AuthRules.email(email))
  const passwordProblem = AuthCopy.problem(AuthRules.passwordPresent(password))
  const submit = () => {
    setShown(true)
    if (emailProblem || passwordProblem) return
    void form.run(() => manager?.signIn(email.trim(), password) ?? Promise.resolve())
  }
  return (
    <AuthPage testId={AuthTestId.LoginScreen} title={AuthCopy.LOGIN_TITLE} sub={AuthCopy.LOGIN_SUB}>
      <AuthForm submitLabel={AuthCopy.LOGIN_SUBMIT} busy={form.busy} error={form.error} onSubmit={submit}>
        <TextField id="login-email" testId={AuthTestId.Email} label={AuthCopy.EMAIL} type="email" autoComplete="email" inputMode="email"
          value={email} onChange={e => setEmail(e.target.value)} disabled={form.busy} error={shown ? emailProblem : null} />
        <TextField id="login-password" testId={AuthTestId.Password} label={AuthCopy.PASSWORD} type="password" autoComplete="current-password"
          value={password} onChange={e => setPassword(e.target.value)} disabled={form.busy} error={shown ? passwordProblem : null} />
      </AuthForm>
      <AuthLinks links={LINKS} />
    </AuthPage>
  )
}
