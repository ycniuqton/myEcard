/** What ApiClient needs from the auth layer: a token, one refresh attempt, and a hook for a dead session. */
export interface AuthTokenProvider {
  accessToken(): Promise<string | null>
  refresh(): Promise<boolean>
  onUnauthenticated(): void
}
