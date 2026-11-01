import { Route, Routes } from 'react-router-dom'
import { Shell } from '../../app/Shell'
import { RoutePath } from '../../app/routes'
import { ForgotScreen } from './ForgotScreen'
import { LoginScreen } from './LoginScreen'
import { ResetScreen } from './ResetScreen'
import { SignUpScreen } from './SignUpScreen'

/** Screens reachable without a session (and the reset screen after a recovery link). */
export function AuthRoutes() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path={RoutePath.Login} element={<LoginScreen />} />
        <Route path={RoutePath.SignUp} element={<SignUpScreen />} />
        <Route path={RoutePath.Forgot} element={<ForgotScreen />} />
        <Route path={RoutePath.Reset} element={<ResetScreen />} />
      </Route>
    </Routes>
  )
}
