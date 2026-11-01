import type { FastifyReply, FastifyRequest } from 'fastify'
import { AuthMode, type AppConfig } from '../../config/AppConfig'
import type { AuthVerifier } from './AuthVerifier'
import { DevUserVerifier } from './DevUserVerifier'
import { SupabaseJwtVerifier, type SupabaseVerifierOptions } from './SupabaseJwtVerifier'

export class AuthHeaders {
  static readonly SCHEME = /^Bearer\s+(.+)$/i
}

/** Routes that never need a token: health, word content and credits. */
export class PublicRoutes {
  static readonly GET = 'GET'
  static readonly URLS: ReadonlySet<string> = new Set(['/api/health', '/api/content/words', '/api/content/credits'])
}

declare module 'fastify' {
  interface FastifyRequest {
    userId: string
  }
}

/** preHandler for the /api scope: skips public routes, otherwise sets request.userId from the verifier. */
export class AuthGuard {
  private readonly verifier: AuthVerifier

  constructor(config: AppConfig, options: SupabaseVerifierOptions = {}) {
    this.verifier = config.authMode === AuthMode.Supabase
      ? new SupabaseJwtVerifier(config.supabaseUrl, options)
      : new DevUserVerifier(config.devUserId)
  }

  handle = async (req: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (this.isPublic(req)) return
    req.userId = await this.verifier.verify(this.token(req))
  }

  private isPublic(req: FastifyRequest): boolean {
    return req.method === PublicRoutes.GET && PublicRoutes.URLS.has(req.routeOptions.url ?? '')
  }

  private token(req: FastifyRequest): string | undefined {
    return AuthHeaders.SCHEME.exec(req.headers.authorization ?? '')?.[1]
  }
}
