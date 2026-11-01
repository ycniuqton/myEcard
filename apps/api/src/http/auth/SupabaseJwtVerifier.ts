import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose'
import { AppError } from '../../services/AppError'
import { AuthVerifier } from './AuthVerifier'

export class SupabaseAuth {
  static readonly AUDIENCE = 'authenticated'
  static readonly JWKS_PATH = '/auth/v1/.well-known/jwks.json'
  static readonly ISSUER_PATH = '/auth/v1'
  static readonly TRAILING_SLASH = /\/+$/
  static readonly UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
}

export class AuthMessages {
  static readonly MISSING = 'Missing bearer token'
  static readonly INVALID = 'Invalid or expired token'
}

export type SupabaseVerifierOptions = { keySet?: JWTVerifyGetKey }

/** Verifies a Supabase access token (signature via JWKS, audience, issuer, expiry) and returns its sub. */
export class SupabaseJwtVerifier extends AuthVerifier {
  private readonly keySet: JWTVerifyGetKey
  private readonly issuer: string

  constructor(supabaseUrl: string, options: SupabaseVerifierOptions = {}) {
    super()
    const base = supabaseUrl.replace(SupabaseAuth.TRAILING_SLASH, '')
    this.issuer = `${base}${SupabaseAuth.ISSUER_PATH}`
    this.keySet = options.keySet ?? createRemoteJWKSet(new URL(`${base}${SupabaseAuth.JWKS_PATH}`))
  }

  async verify(token: string | undefined): Promise<string> {
    if (!token) throw AppError.unauthenticated(AuthMessages.MISSING)
    try {
      const { payload } = await jwtVerify(token, this.keySet, { audience: SupabaseAuth.AUDIENCE, issuer: this.issuer })
      if (typeof payload.sub === 'string' && SupabaseAuth.UUID.test(payload.sub)) return payload.sub
    } catch {
      throw AppError.unauthenticated(AuthMessages.INVALID)
    }
    throw AppError.unauthenticated(AuthMessages.INVALID)
  }
}
