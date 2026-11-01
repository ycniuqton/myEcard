import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { useAppStore } from '../store'
import { AccountController } from './AccountController'
import { AuthConfig } from './AuthConfig'
import type { AuthManager } from './AuthManager'
import { AuthRuntime } from './AuthRuntime'
import { AuthStatus, type AuthState } from './AuthTypes'

export type AuthContextValue = {
  state: AuthState
  manager: AuthManager | null
  account: AccountController | null
  bound: boolean
}

const SIGNED_IN_NO_AUTH: AuthState = { status: AuthStatus.SignedIn, session: null }
const NOT_BOUND = false

const AuthContext = createContext<AuthContextValue>({ state: SIGNED_IN_NO_AUTH, manager: null, account: null, bound: NOT_BOUND })

export const useAuth = (): AuthContextValue => useContext(AuthContext)

function useManagerState(manager: AuthManager | null): AuthState {
  const subscribe = (cb: () => void) => (manager ? manager.subscribe(cb) : () => undefined)
  const snapshot = () => manager?.snapshot() ?? SIGNED_IN_NO_AUTH
  return useSyncExternalStore(subscribe, snapshot)
}

function useBoundDatabase(name: string | null): boolean {
  const [boundName, setBoundName] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    void useAppStore.getState().bindDatabase(name).then(() => alive && setBoundName(name))
    return () => {
      alive = false
    }
  }, [name])
  return name !== null && boundName === name
}

/** Starts auth, keeps the store bound to the signed-in account's database, and exposes both to the tree. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const manager = useMemo(() => AuthRuntime.manager(), [])
  const state = useManagerState(manager)
  useEffect(() => {
    void manager?.start()
  }, [manager])
  const signedIn = state.status === AuthStatus.SignedIn
  const dbName = manager ? (signedIn ? AuthConfig.dbNameFor(state.session?.userId ?? null) : null) : AuthConfig.LEGACY_DB
  const bound = useBoundDatabase(dbName)
  const account = useMemo(() => (manager ? new AccountController(manager, () => useAppStore.getState()) : null), [manager])
  const value = useMemo(() => ({ state, manager, account, bound }), [state, manager, account, bound])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
