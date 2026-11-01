import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export enum EnvKey {
  Port = 'PORT',
  Host = 'HOST',
  PgliteDir = 'PGLITE_DIR',
  AuthMode = 'AUTH_MODE',
  SupabaseUrl = 'SUPABASE_URL',
  DatabaseUrl = 'DATABASE_URL',
  DevUserId = 'DEV_USER_ID',
  WebDist = 'WEB_DIST',
  ContentDir = 'CONTENT_DIR',
  CorsOrigin = 'CORS_ORIGIN',
}

export class ConfigDefaults {
  static readonly PORT = 3001
  static readonly HOST = '0.0.0.0'
  static readonly MEMORY_DB = ':memory:'
  static readonly CORS_ANY = '*'
  static readonly PGLITE_FOLDER = 'pglite'
  static readonly DEV_USER_ID = '00000000-0000-4000-8000-000000000001'
}

/** Directory and file names under the api root and the web workspace. */
export class StoragePaths {
  static readonly STORAGE = 'storage'
  static readonly CONTENT = 'content'
  static readonly DATA = 'data'
  static readonly RAW = 'raw'
  static readonly SEED_FILE = 'seed.txt'
  static readonly WEB = 'web'
  static readonly WEB_DIST = 'dist'
  static readonly PARENT = '..'
}

export enum AuthMode {
  Supabase = 'supabase',
  None = 'none',
}

export type AppConfigValues = {
  port: number
  host: string
  pgliteDir: string
  databaseUrl: string
  authMode: AuthMode
  supabaseUrl: string
  devUserId: string
  webDist: string
  contentDir: string
  seedFile: string
  corsOrigin: string
}

/** Runtime configuration from env vars; AUTH_MODE defaults to supabase when DATABASE_URL is set, else none. */
export class AppConfig implements AppConfigValues {
  readonly port!: number
  readonly host!: string
  readonly pgliteDir!: string
  readonly databaseUrl!: string
  readonly authMode!: AuthMode
  readonly supabaseUrl!: string
  readonly devUserId!: string
  readonly webDist!: string
  readonly contentDir!: string
  readonly seedFile!: string
  readonly corsOrigin!: string

  constructor(values: AppConfigValues) {
    Object.assign(this, values)
  }

  static apiRoot(): string {
    return join(dirname(fileURLToPath(import.meta.url)), StoragePaths.PARENT, StoragePaths.PARENT)
  }

  private static authMode(env: NodeJS.ProcessEnv): AuthMode {
    const fallback = env[EnvKey.DatabaseUrl] ? AuthMode.Supabase : AuthMode.None
    const value = env[EnvKey.AuthMode] ?? fallback
    if (!Object.values(AuthMode).includes(value as AuthMode)) throw new Error(`Invalid ${EnvKey.AuthMode}: ${value}`)
    return value as AuthMode
  }

  static fromEnv(env: NodeJS.ProcessEnv = process.env, overrides: Partial<AppConfigValues> = {}): AppConfig {
    const root = AppConfig.apiRoot()
    return new AppConfig({
      port: Number(env[EnvKey.Port] ?? ConfigDefaults.PORT),
      host: env[EnvKey.Host] ?? ConfigDefaults.HOST,
      pgliteDir: env[EnvKey.PgliteDir] ?? join(root, StoragePaths.STORAGE, ConfigDefaults.PGLITE_FOLDER),
      databaseUrl: env[EnvKey.DatabaseUrl] ?? '',
      authMode: AppConfig.authMode(env),
      supabaseUrl: env[EnvKey.SupabaseUrl] ?? '',
      devUserId: env[EnvKey.DevUserId] ?? ConfigDefaults.DEV_USER_ID,
      webDist: env[EnvKey.WebDist] ?? join(root, StoragePaths.PARENT, StoragePaths.WEB, StoragePaths.WEB_DIST),
      contentDir: env[EnvKey.ContentDir] ?? join(root, StoragePaths.CONTENT),
      seedFile: join(root, StoragePaths.DATA, StoragePaths.RAW, StoragePaths.SEED_FILE),
      corsOrigin: env[EnvKey.CorsOrigin] ?? ConfigDefaults.CORS_ANY,
      ...overrides,
    })
  }
}
