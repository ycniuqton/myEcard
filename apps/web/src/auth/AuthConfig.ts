import { AuthMode } from './AuthTypes'

/**
 * Build-time auth configuration. VITE_AUTH_MODE: none (no auth, legacy db), fake (in-browser users for e2e),
 * supabase (default). Keys come from VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.
 */
export class AuthConfig {
  static readonly LEGACY_DB = 'wordmap'
  static readonly USER_DB_PREFIX = 'wordmap-'

  static mode(raw: string | undefined = import.meta.env?.VITE_AUTH_MODE as string | undefined): AuthMode {
    if (raw === AuthMode.None || raw === AuthMode.Fake) return raw
    return AuthMode.Supabase
  }

  static usesAuth(mode: AuthMode = AuthConfig.mode()): boolean {
    return mode !== AuthMode.None
  }

  static supabaseUrl(): string {
    return (import.meta.env?.VITE_SUPABASE_URL as string | undefined) ?? ''
  }

  static supabaseKey(): string {
    return (import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ?? ''
  }

  static dbNameFor(userId: string | null): string | null {
    return userId ? `${AuthConfig.USER_DB_PREFIX}${userId}` : null
  }
}
