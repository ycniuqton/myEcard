import { Encoding } from './PipelineConfig'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** JSON file cache keyed by name; makes fetch steps resumable. */
export class DiskCache {
  constructor(private readonly dir: string) {
    mkdirSync(dir, { recursive: true })
  }

  has(key: string): boolean {
    return existsSync(this.fileOf(key))
  }

  read<T>(key: string): T | undefined {
    if (!this.has(key)) return undefined
    return JSON.parse(readFileSync(this.fileOf(key), Encoding.Utf8)) as T
  }

  write(key: string, value: unknown): void {
    writeFileSync(this.fileOf(key), JSON.stringify(value))
  }

  private fileOf(key: string): string {
    return join(this.dir, `${encodeURIComponent(key)}.json`)
  }
}
