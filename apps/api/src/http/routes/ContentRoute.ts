import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { BaseRoute } from '../BaseRoute'
import { HttpStatus } from '../../services/AppError'

export class ContentHeaders {
  static readonly CACHE = 'public, max-age=0, must-revalidate'
  static readonly GZIP = 'gzip'
  static readonly JSON_TYPE = 'application/json; charset=utf-8'
  static readonly ETAG = 'ETag'
  static readonly CACHE_CONTROL = 'Cache-Control'
  static readonly VARY = 'Vary'
  static readonly ACCEPT_ENCODING = 'Accept-Encoding'
  static readonly CONTENT_ENCODING = 'Content-Encoding'
  static readonly IF_NONE_MATCH = 'if-none-match'
  static readonly ACCEPT_ENCODING_LOWER = 'accept-encoding'
}

export class ContentPaths {
  static readonly WORDS = '/content/words'
  static readonly CREDITS = '/content/credits'
}

/** GET /content/words (ETag + gzip) and GET /content/credits. */
export class ContentRoute extends BaseRoute {
  register(api: FastifyInstance): void {
    api.get(ContentPaths.WORDS, async (req, reply) => this.words(req, reply))
    api.get(ContentPaths.CREDITS, async () => this.c.content.credits)
  }

  private words(req: FastifyRequest, reply: FastifyReply): FastifyReply {
    const payload = this.c.content.wordsPayload
    reply.header(ContentHeaders.ETAG, payload.etag).header(ContentHeaders.CACHE_CONTROL, ContentHeaders.CACHE)
      .header(ContentHeaders.VARY, ContentHeaders.ACCEPT_ENCODING)
    if (req.headers[ContentHeaders.IF_NONE_MATCH] === payload.etag) return reply.status(HttpStatus.NOT_MODIFIED).send()
    reply.type(ContentHeaders.JSON_TYPE)
    const acceptsGzip = String(req.headers[ContentHeaders.ACCEPT_ENCODING_LOWER] ?? '').includes(ContentHeaders.GZIP)
    if (!acceptsGzip) return reply.send(payload.json)
    return reply.header(ContentHeaders.CONTENT_ENCODING, ContentHeaders.GZIP).send(payload.gzip)
  }
}
