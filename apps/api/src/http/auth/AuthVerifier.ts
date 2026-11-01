/** Turns a request's bearer token (or lack of one) into a user id, or throws UNAUTHENTICATED. */
export abstract class AuthVerifier {
  abstract verify(token: string | undefined): Promise<string>
}
