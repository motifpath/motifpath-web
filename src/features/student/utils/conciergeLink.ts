/**
 * Builds the "Send to your teacher" WhatsApp link: the typed short reference
 * that tells the concierge what a student is looking at, and the wa.me URL
 * that opens the conversation with the message already written.
 *
 * A reference is a kind letter and the first 8 characters of an id — short
 * enough to read on a phone, and resolved by an id prefix search. Kind letters
 * are never reused, so every reference ever sent stays resolvable ("S" is kept
 * for practice sessions).
 */

const PREFIX_LENGTH = 8

function idPrefix(id: string): string {
  return id.slice(0, PREFIX_LENGTH).toLowerCase()
}

/** The lesson screen's reference: `L-<content node>`. */
export function lessonReference(contentNodeId: string): string {
  return `L-${idPrefix(contentNodeId)}`
}

/** The practice screen's reference: `X-<content node>/<exercise on screen>`. */
export function practiceReference(contentNodeId: string, exerciseId: string): string {
  return `X-${idPrefix(contentNodeId)}/${idPrefix(exerciseId)}`
}

/**
 * The concierge's WhatsApp number this build was given, or null when none is
 * configured — the feature is off then. Read on each call, not at module
 * load, so it always reflects the running build's environment.
 */
export function conciergeNumber(): string | null {
  const number = import.meta.env.VITE_CONCIERGE_WHATSAPP_NUMBER ?? ''
  return /\d/.test(number) ? number : null
}

/**
 * The wa.me link to `number` with `message` prefilled, or null when `number`
 * holds no digits — wa.me takes the international number as digits only, so
 * any formatting ("+55 11 91234-5678") is dropped.
 */
export function conciergeWhatsAppUrl(number: string | null | undefined, message: string): string | null {
  const digits = (number ?? '').replace(/\D/g, '')
  if (!digits) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
