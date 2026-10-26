/**
 * Inside the app shell, fetch and XHR are replaced by versions that carry each request over the
 * native network stack, and the WebView's own versions are kept on the window under these names.
 * Native requests copy the whole body across the bridge in one piece and report no upload
 * progress, so large uploads go through the WebView's own versions instead.
 */
const WEBVIEW_FETCH = 'CapacitorWebFetch'
const WEBVIEW_XHR = 'CapacitorWebXMLHttpRequest'

/** The WebView's own XHR `open`, when native HTTP has replaced it. */
function webViewXhrOpen(): unknown {
  const originals: unknown = Reflect.get(window, WEBVIEW_XHR)
  return typeof originals === 'object' && originals !== null ? Reflect.get(originals, 'open') : undefined
}

/**
 * Sends a request through the WebView's own network stack, in the browser and in the app shell
 * alike.
 */
export function fetchInWebView(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const original: unknown = Reflect.get(window, WEBVIEW_FETCH)
  if (typeof original !== 'function') return fetch(input, init)
  // The WebView's fetch throws "Illegal invocation" unless it is called on the window.
  return Reflect.apply(original, window, [input, init])
}

/**
 * Opens `request` on the WebView's own network stack. The rest of the request's calls (headers,
 * send, abort) then stay on the WebView too.
 */
export function openInWebView(request: XMLHttpRequest, method: string, url: string): void {
  const original = webViewXhrOpen()
  if (typeof original === 'function') Reflect.apply(original, request, [method, url])
  else request.open(method, url)
}
