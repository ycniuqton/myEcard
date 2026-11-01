import { AuthVerifier } from './AuthVerifier'

/** AUTH_MODE=none: every request acts as the fixed development user. */
export class DevUserVerifier extends AuthVerifier {
  constructor(private readonly userId: string) {
    super()
  }

  async verify(): Promise<string> {
    return this.userId
  }
}
