import createClient, { type Client, type Middleware } from 'openapi-fetch'

export interface ApiClientOptions {
  /** Service base URL, e.g. `http://localhost:8080`. */
  baseUrl: string
  /**
   * Resolves the current Clerk JWT, or `null` when the session is not
   * authenticated. Called once per request so a refreshed token is always used.
   */
  getToken: () => Promise<string | null>
  /** Fetch implementation override — used in tests. Defaults to global `fetch`. */
  fetch?: (input: Request) => Promise<Response>
}

/**
 * Builds a typed `openapi-fetch` client for one MotifPath service. Every request
 * is sent to `baseUrl` and carries `Authorization: Bearer <token>` when a token
 * is available.
 */
export function createApiClient<Paths extends object>({
  baseUrl,
  getToken,
  fetch,
}: ApiClientOptions): Client<Paths> {
  const client = createClient<Paths>({ baseUrl, fetch })

  const authMiddleware: Middleware = {
    async onRequest({ request }) {
      const token = await getToken()
      if (token) {
        request.headers.set('Authorization', `Bearer ${token}`)
      }
      return request
    },
  }

  client.use(authMiddleware)

  return client
}
