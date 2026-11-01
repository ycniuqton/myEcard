import { spawn } from 'node:child_process'
import { createWriteStream, existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { Endpoints, type PipelinePaths, StreamEvent } from './PipelineConfig'

/** Makes sure the English Tatoeba TSV exists locally (download then bzip2 extraction). */
export class TatoebaSource {
  static readonly BZIP_COMMAND = 'bzip2'
  static readonly BZIP_ARGS = ['-dck']
  static readonly HTTP_OK_MAX = 299

  constructor(private readonly paths: PipelinePaths) {}

  async ensureExtracted(): Promise<string> {
    if (existsSync(this.paths.tatoebaTsv)) return this.paths.tatoebaTsv
    if (!existsSync(this.paths.tatoebaArchive)) await this.download()
    mkdirSync(dirname(this.paths.tatoebaTsv), { recursive: true })
    await this.extract()
    return this.paths.tatoebaTsv
  }

  private async download(): Promise<void> {
    const res = await fetch(Endpoints.TatoebaEnglish)
    if (!res.body || res.status > TatoebaSource.HTTP_OK_MAX) throw new Error(`Tatoeba download failed: ${res.status}`)
    await pipeline(Readable.fromWeb(res.body as never), createWriteStream(this.paths.tatoebaArchive))
  }

  private extract(): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(TatoebaSource.BZIP_COMMAND, [...TatoebaSource.BZIP_ARGS, this.paths.tatoebaArchive])
      const out = createWriteStream(this.paths.tatoebaTsv)
      child.stdout.pipe(out)
      child.on(StreamEvent.Error, reject)
      out.on(StreamEvent.Finish, resolve)
      child.on(StreamEvent.Close, code => (code === 0 ? undefined : reject(new Error(`bzip2 exited ${code}`))))
    })
  }
}
