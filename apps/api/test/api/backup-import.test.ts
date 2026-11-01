import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ExportSnapshot, StateResponse } from '@wordmap/shared'
import { AppConfig, StoragePaths } from '../../src/config/AppConfig'
import { AuthTestKit } from '../support/AuthTestKit'
import { TestApp, TestPaths, UserFixtures } from './TestApp'

const SAMPLE = join(TestPaths.FIXTURES, 'backup-sample.json')
const FULL = join(AppConfig.apiRoot(), StoragePaths.STORAGE, 'backup-pre-supabase.json')
const ENCODING = 'utf8'

let app: FastifyInstance
let kit: AuthTestKit
const load = (file: string): ExportSnapshot => JSON.parse(readFileSync(file, ENCODING)) as ExportSnapshot

beforeEach(async () => {
  kit = await AuthTestKit.create()
  app = await TestApp.createAuthenticated(kit)
})
afterEach(async () => {
  await app.close()
})

async function importFor(sub: string, snapshot: ExportSnapshot) {
  const headers = await kit.bearer(sub)
  const res = await TestApp.json<StateResponse>(app, 'POST', '/api/import', snapshot, headers)
  const exported = await TestApp.json<ExportSnapshot>(app, 'GET', '/api/export', undefined, headers)
  return { res, exported: exported.body }
}

describe('importing the owner backup into a fresh account', () => {
  it('imports the trimmed backup sample and exports the same rows', async () => {
    const snapshot = load(SAMPLE)
    const { res, exported } = await importFor(UserFixtures.ALICE, snapshot)
    expect(res.status).toBe(200)
    expect(exported.userWords).toEqual(snapshot.userWords)
    expect(exported.dayStats).toEqual(snapshot.dayStats)
    expect(exported.reviewLogs).toHaveLength(snapshot.reviewLogs.length)
    expect(exported.settings).toEqual(snapshot.settings)
  })

  it('leaves other accounts untouched', async () => {
    await importFor(UserFixtures.ALICE, load(SAMPLE))
    const other = await TestApp.json<StateResponse>(app, 'GET', '/api/state', undefined, await kit.bearer(UserFixtures.BOB))
    expect(other.body.userWords).toEqual([])
  })

  it.runIf(existsSync(FULL))('imports the full local backup file when present', async () => {
    const snapshot = load(FULL)
    const { res, exported } = await importFor(UserFixtures.ALICE, snapshot)
    expect(res.status).toBe(200)
    expect(exported.userWords).toHaveLength(snapshot.userWords.length)
    expect(exported.reviewLogs).toHaveLength(snapshot.reviewLogs.length)
    expect(exported.dayStats).toHaveLength(snapshot.dayStats.length)
  })
})
