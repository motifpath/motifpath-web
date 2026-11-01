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

  // The client takes "Content-Length: 0" as an empty body without reading it. Android's WebView puts
  // that header on every streamed response from the native network stack, bodies included, so a
  // response claiming to be empty is read before the claim is trusted.
  const contentLengthMiddleware: Middleware = {
    async onResponse({ response }) {
      if (response.headers.get('Content-Length') !== '0') return undefined
      const body = await response.clone().text()
      if (!body) return undefined
      const headers = new Headers(response.headers)
      headers.delete('Content-Length')
      return new Response(body, { status: response.status, statusText: response.statusText, headers })
    },
  }

  client.use(authMiddleware, contentLengthMiddleware)

  return client
}
