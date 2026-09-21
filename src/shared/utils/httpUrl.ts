/**
 * Whether `raw` is an absolute http or https URL with a host. Mirrors the
 * backend rule for a video's media URL: a value that merely parses as a URI
 * (javascript:, ftp:, a bare path) is not acceptable for a player to load.
 */
export function isHttpUrl(raw: string): boolean {
  try {
    const url = new URL(raw)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.host !== ''
  } catch {
    return false
  }
}
