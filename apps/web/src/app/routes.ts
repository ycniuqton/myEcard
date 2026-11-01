import { TabId } from '../design/primitives'

export enum RoutePath {
  Today = '/',
  Map = '/map',
  Search = '/search',
  Progress = '/progress',
  Band = '/band/:index',
  Word = '/word/:rank',
  Session = '/session',
  Summary = '/summary',
  Settings = '/settings',
  Placement = '/placement',
  Welcome = '/welcome',
  Credits = '/credits',
  DesignPreview = '/design-preview',
  Login = '/login',
  SignUp = '/signup',
  Forgot = '/forgot',
  Reset = '/reset',
}

/** Decides tab bar visibility and which tab a pathname belongs to. */
export class TabPolicy {
  private static readonly TAB_PATH: Record<TabId, string> = {
    [TabId.Today]: RoutePath.Today,
    [TabId.Map]: RoutePath.Map,
    [TabId.Search]: RoutePath.Search,
    [TabId.Progress]: RoutePath.Progress,
  }

  private static readonly TAB_PREFIXES: ReadonlyArray<readonly [string, TabId]> = [
    ['/map', TabId.Map],
    ['/band', TabId.Map],
    ['/search', TabId.Search],
    ['/progress', TabId.Progress],
    ['/settings', TabId.Progress],
    ['/credits', TabId.Progress],
  ]

  private static readonly TABLESS_PREFIXES: readonly string[] = [
    RoutePath.Session, RoutePath.Summary, RoutePath.Placement, RoutePath.Welcome,
    RoutePath.Login, RoutePath.SignUp, RoutePath.Forgot, RoutePath.Reset,
  ]

  static hidesTabs(pathname: string): boolean {
    return TabPolicy.TABLESS_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  }

  static activeTab(pathname: string): TabId | undefined {
    if (pathname === RoutePath.Today) return TabId.Today
    const hit = TabPolicy.TAB_PREFIXES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))
    return hit?.[1]
  }

  static pathFor(tab: TabId): string {
    return TabPolicy.TAB_PATH[tab]
  }
}
