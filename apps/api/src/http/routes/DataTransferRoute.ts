import type { FastifyInstance } from 'fastify'
import type { ImportRequest } from '@wordmap/shared'
import { BaseRoute } from '../BaseRoute'
import { Schemas } from '../Schemas'

export class ExportHeaders {
  static readonly DISPOSITION = 'attachment; filename="wordmap-export.json"'
}

export class TransferPaths {
  static readonly EXPORT = '/export'
  static readonly IMPORT = '/import'
  static readonly PROGRESS = '/progress'
  static readonly DISPOSITION_HEADER = 'Content-Disposition'
}

/** GET /export, POST /import, DELETE /progress. */
export class DataTransferRoute extends BaseRoute {
  register(api: FastifyInstance): void {
    api.get(TransferPaths.EXPORT, async (_req, reply) => {
      reply.header(TransferPaths.DISPOSITION_HEADER, ExportHeaders.DISPOSITION)
      return this.c.transfer.export()
    })
    api.post(TransferPaths.IMPORT, async req => this.c.transfer.import(this.parse(Schemas.snapshot, req.body) as ImportRequest))
    api.delete(TransferPaths.PROGRESS, async () => this.c.transfer.reset())
  }
}
