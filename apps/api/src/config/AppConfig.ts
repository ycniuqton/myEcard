import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export enum EnvKey {
  Port = 'PORT',
  Host = 'HOST',
  DbPath = 'DB_PATH',
  WebDist = 'WEB_DIST',
  ContentDir = 'CONTENT_DIR',
  CorsOrigin = 'CORS_ORIGIN',
}

export class ConfigDefaults {
  static readonly PORT = 3001
  static readonly HOST = '0.0.0.0'
  static readonly MEMORY_DB = ':memory:'
  static readonly CORS_ANY = '*'
  static readonly DB_FILE = 'wordmap.db'
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

export type AppConfigValues = {
  port: number
  host: string
  dbPath: string
  webDist: string
  contentDir: string
  seedFile: string
  corsOrigin: string
}

/** Runtime configuration resolved from environment variables with repo-relative defaults. */
export class AppConfig implements AppConfigValues {
  readonly port!: number
  readonly host!: string
  readonly dbPath!: string
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

  static fromEnv(env: NodeJS.ProcessEnv = process.env, overrides: Partial<AppConfigValues> = {}): AppConfig {
    const root = AppConfig.apiRoot()
    return new AppConfig({
      port: Number(env[EnvKey.Port] ?? ConfigDefaults.PORT),
      host: env[EnvKey.Host] ?? ConfigDefaults.HOST,
      dbPath: env[EnvKey.DbPath] ?? join(root, StoragePaths.STORAGE, ConfigDefaults.DB_FILE),
      webDist: env[EnvKey.WebDist] ?? join(root, StoragePaths.PARENT, StoragePaths.WEB, StoragePaths.WEB_DIST),
      contentDir: env[EnvKey.ContentDir] ?? join(root, StoragePaths.CONTENT),
      seedFile: join(root, StoragePaths.DATA, StoragePaths.RAW, StoragePaths.SEED_FILE),
      corsOrigin: env[EnvKey.CorsOrigin] ?? ConfigDefaults.CORS_ANY,
      ...overrides,
    })
  }
}
