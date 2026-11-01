import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { RoutePath } from '../../app/routes'
import { useAppStore } from '../../store'

const ONBOARDING_PATHS: readonly string[] = [RoutePath.Welcome, RoutePath.Placement, RoutePath.DesignPreview]

/** Sends a first-time user (placementDone false) to welcome once words and server settings have loaded. */
export function FirstRunGate() {
  const ready = useAppStore(s => s.ready)
  const placementDone = useAppStore(s => s.settings.placementDone)
  const synced = useAppStore(s => s.sync.lastSyncAt !== null)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const needsOnboarding = ready && synced && !placementDone && !ONBOARDING_PATHS.includes(pathname)
  useEffect(() => {
    if (needsOnboarding) navigate(RoutePath.Welcome, { replace: true })
  }, [needsOnboarding, navigate])
  return null
}
