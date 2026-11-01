import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { SessionScreen, SummaryScreen } from '../features/session'
import { RoutePath } from './routes'
import { Shell } from './Shell'
import { CreditsScreen } from '../features/credits/CreditsScreen'
import { ProgressScreen } from '../features/progress/ProgressScreen'
import { SettingsScreen } from '../features/settings/SettingsScreen'
import { MapScreen } from '../features/map/MapScreen'
import { BandScreen } from '../features/band/BandScreen'
import { WordScreen } from '../features/word/WordScreen'
import { SearchScreen } from '../features/search/SearchScreen'
import { TodayScreen } from '../features/today/TodayScreen'
import { FirstRunGate, PlacementScreen, WelcomeScreen } from '../features/onboarding'
import { AppCopy } from './AppCopy'

const DesignPreview = lazy(() => import('./pages/DesignPreview'))

interface ScreenRoute {
  path: RoutePath
  title: string
  element?: ReactNode
}

const SCREENS: readonly ScreenRoute[] = [
  { path: RoutePath.Map, title: 'Map', element: <MapScreen /> },
  { path: RoutePath.Search, title: 'Search', element: <SearchScreen /> },
  { path: RoutePath.Band, title: 'Band', element: <BandScreen /> },
  { path: RoutePath.Word, title: 'Word', element: <WordScreen /> },
  { path: RoutePath.Session, title: 'Session', element: <SessionScreen /> },
  { path: RoutePath.Summary, title: 'Summary', element: <SummaryScreen /> },
  { path: RoutePath.Placement, title: 'Placement', element: <PlacementScreen /> },
  { path: RoutePath.Welcome, title: 'Welcome', element: <WelcomeScreen /> },
]

/** Route table; later phases swap the placeholder elements for real screens. */
export function App() {
  return (
    <>
    <FirstRunGate />
    <Routes>
      <Route element={<Shell />}>
        <Route path={RoutePath.Today} element={<TodayScreen />} />
        <Route path={RoutePath.Progress} element={<ProgressScreen />} />
        <Route path={RoutePath.Settings} element={<SettingsScreen />} />
        <Route path={RoutePath.Credits} element={<CreditsScreen />} />
        {SCREENS.map((s) => (
          <Route key={s.path} path={s.path} element={s.element ?? <PlaceholderPage title={s.title} />} />
        ))}
        <Route path="*" element={<PlaceholderPage title={AppCopy.NOT_FOUND} />} />
      </Route>
      {import.meta.env.DEV ? (
        <Route
          path={RoutePath.DesignPreview}
          element={
            <Suspense fallback={null}>
              <DesignPreview />
            </Suspense>
          }
        />
      ) : null}
    </Routes>
    </>
  )
}

export default App
