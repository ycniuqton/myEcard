import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair, type JWTVerifyGetKey } from 'jose'

export type SigningKey = Awaited<ReturnType<typeof generateKeyPair>>['privateKey']

export type TokenOptions = { audience?: string; issuer?: string; expiresIn?: string; key?: SigningKey }

export class KitDefaults {
  static readonly ALG = 'ES256'
  static readonly KID = 'test-key'
  static readonly AUDIENCE = 'authenticated'
  static readonly EXPIRES_IN = '1h'
  static readonly EXPIRED = '-1h'
}

/** Local signing key plus matching JWKS, standing in for Supabase's published key set. */
export class AuthTestKit {
  static readonly SUPABASE_URL = 'https://test-project.supabase.co'
  static readonly ISSUER = `${AuthTestKit.SUPABASE_URL}/auth/v1`

  private constructor(private readonly privateKey: SigningKey, readonly keySet: JWTVerifyGetKey) {}

  static async create(): Promise<AuthTestKit> {
    const { publicKey, privateKey } = await generateKeyPair(KitDefaults.ALG)
    const jwk = { ...(await exportJWK(publicKey)), kid: KitDefaults.KID, alg: KitDefaults.ALG }
    return new AuthTestKit(privateKey, createLocalJWKSet({ keys: [jwk] }))
  }

  static async foreignKey(): Promise<SigningKey> {
    return (await generateKeyPair(KitDefaults.ALG)).privateKey
  }

  sign(sub: string, options: TokenOptions = {}): Promise<string> {
    return new SignJWT({})
      .setProtectedHeader({ alg: KitDefaults.ALG, kid: KitDefaults.KID })
      .setSubject(sub)
      .setAudience(options.audience ?? KitDefaults.AUDIENCE)
      .setIssuer(options.issuer ?? AuthTestKit.ISSUER)
      .setIssuedAt()
      .setExpirationTime(options.expiresIn ?? KitDefaults.EXPIRES_IN)
      .sign(options.key ?? this.privateKey)
  }

  async bearer(sub: string, options: TokenOptions = {}): Promise<Record<string, string>> {
    return { authorization: `Bearer ${await this.sign(sub, options)}` }
  }
}
