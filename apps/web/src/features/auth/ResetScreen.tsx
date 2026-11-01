import { useState } from 'react'
import { TextField } from '../../design/primitives'
import { AuthRules } from '../../auth/AuthRules'
import { useAuth } from '../../auth/AuthProvider'
import { AuthCopy } from './AuthCopy'
import { AuthForm, AuthPage, useSubmit } from './AuthLayout'
import { AuthTestId } from './AuthTestId'

/** Sets a new password after the recovery link; success signs the user in and the gate moves on. */
export function ResetScreen() {
  const { manager } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [shown, setShown] = useState(false)
  const form = useSubmit()
  const passwordProblem = AuthCopy.problem(AuthRules.password(password))
  const confirmProblem = AuthCopy.problem(AuthRules.confirm(password, confirm))
  const submit = () => {
    setShown(true)
    if (passwordProblem || confirmProblem || !manager) return
    void form.run(() => manager.updatePassword(password))
  }
  return (
    <AuthPage testId={AuthTestId.ResetScreen} title={AuthCopy.RESET_TITLE} sub={AuthCopy.RESET_SUB}>
      <AuthForm submitLabel={AuthCopy.RESET_SUBMIT} busy={form.busy} error={form.error} onSubmit={submit}>
        <TextField id="reset-password" testId={AuthTestId.Password} label={AuthCopy.NEW_PASSWORD} type="password" autoComplete="new-password"
          value={password} onChange={e => setPassword(e.target.value)} disabled={form.busy} error={shown ? passwordProblem : null} />
        <TextField id="reset-confirm" testId={AuthTestId.Confirm} label={AuthCopy.CONFIRM} type="password" autoComplete="new-password"
          value={confirm} onChange={e => setConfirm(e.target.value)} disabled={form.busy} error={shown ? confirmProblem : null} />
      </AuthForm>
    </AuthPage>
  )
}
