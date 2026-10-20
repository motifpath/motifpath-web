import { useApi } from '@/shared/composables/useApi'
import { useCurrentUserStore } from '@/stores/currentUser'
import type { components } from '@/api/generated/event-ingestion'

type SchemaTrackingEvent = components['schemas']['TrackingEvent']

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never

/**
 * What a caller supplies — every TrackingEvent field except the envelope
 * fields this composable fills in itself. event_type stays (it's the
 * discriminator a caller must still pick), unlike the rest of
 * TrackingEventBase.
 */
export type TrackableEvent = DistributiveOmit<
  SchemaTrackingEvent,
  'event_id' | 'student_id' | 'session_id' | 'occurred_at'
>

// Generated once per SPA load, held for the page's lifetime — matches the
// event schema's own session_id doc comment ("until the page is reloaded").
let sessionId: string | undefined

function currentSessionId(): string {
  sessionId ??= crypto.randomUUID()
  return sessionId
}

// Waits before each resend of an event that failed to send. Kept short: a
// caller may await delivery (a lesson's completion, before the path shows the
// step done), so the whole retry window stays under four seconds.
const RETRY_DELAYS_MS = [500, 1000, 2000]

/**
 * Whether an HTTP error is worth sending again: a server error, a timeout or
 * rate limiting. Any other 4xx means the envelope itself was refused, and
 * sending it again would only repeat that.
 */
function isRetryable(status: number): boolean {
  return status >= 500 || status === 408 || status === 429
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Posts student tracking events to the Event Ingestion Service. A no-op
 * until the student's profile has resolved, since every event requires a
 * student_id to attribute it to.
 *
 * A send that fails on the network, a server error, a timeout or rate limiting
 * is repeated a few times with growing waits. Every attempt carries the same
 * envelope (event_id, occurred_at), and ingestion stores an event_id only
 * once, so a resend after a lost response never double-counts. An event still
 * pending when the page closes is lost.
 *
 * Delivery failures never throw — this is telemetry that must never block the
 * practice flow — but they are logged: a rejected envelope (any other 4xx) at
 * once, since openapi-fetch resolves an HTTP error as `{ error }` rather than
 * throwing and silence would hide a schema mismatch with the backend contract
 * forever; an event that never got through, after the last attempt.
 *
 * Pass `{ keepalive: true }` for an event sent as the page closes: the browser
 * then finishes the request after the page is gone.
 */
export function useEventTracking() {
  const { eventApi } = useApi()
  const currentUser = useCurrentUserStore()

  async function track(event: TrackableEvent, options: { keepalive?: boolean } = {}): Promise<void> {
    const studentId = currentUser.profile?.user_id
    if (!studentId) return

    const envelope: SchemaTrackingEvent = {
      ...event,
      event_id: crypto.randomUUID(),
      student_id: studentId,
      session_id: currentSessionId(),
      occurred_at: new Date().toISOString(),
    }

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      if (attempt > 0) await wait(RETRY_DELAYS_MS[attempt - 1]!)

      try {
        const { error, response } = await eventApi.POST('/events', {
          body: envelope,
          ...(options.keepalive ? { keepalive: true } : {}),
        })
        if (!error) return
        if (!isRetryable(response.status)) {
          console.warn('Tracking event rejected by the Event Ingestion Service:', event.event_type, error)
          return
        }
      } catch {
        // Network/transport failure: worth another attempt.
      }
    }

    console.warn('Tracking event not delivered after retrying:', event.event_type)
  }

  return { track }
}
