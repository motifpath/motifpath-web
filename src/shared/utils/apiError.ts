function isFieldErrorList(value: unknown): value is { field: string; reason: string }[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === 'object' && entry !== null && 'field' in entry && 'reason' in entry)
  )
}

function capitalize(message: string): string {
  return message.charAt(0).toUpperCase() + message.slice(1)
}

/**
 * The backend sends lowercase, unpunctuated strings (e.g. "request failed
 * validation") and, for ValidationError, one {field, reason} entry per
 * failing field — display formatting is entirely this function's job.
 * Each field gets its own bulleted line rather than a run-on sentence, so
 * "title: must not be empty" doesn't visually fuse with "prompt: must not
 * be empty" into one confusing clause.
 */
export function describeApiError(error: unknown, fallback: string): string {
  if (typeof error !== 'object' || error === null || !('message' in error) || typeof error.message !== 'string') {
    return fallback
  }

  const fieldErrors = 'errors' in error && isFieldErrorList(error.errors) ? error.errors : []
  const summary = capitalize(error.message)
  if (fieldErrors.length === 0) return summary

  const details = fieldErrors.map(({ field, reason }) => `• ${field}: ${reason}`).join('\n')
  return `${summary}:\n${details}`
}
