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

/**
 * Posts student tracking events to the Event Ingestion Service. A no-op
 * until the student's profile has resolved, since every event requires a
 * student_id to attribute it to. Delivery failures never throw — this is
 * fire-and-forget telemetry that must never block the practice flow — but a
 * rejected envelope (4xx) is still logged: openapi-fetch resolves an HTTP
 * error as `{ error }` rather than throwing, so silence here would otherwise
 * hide a systemic schema mismatch between TrackableEvent and the backend
 * contract forever.
 */
export function useEventTracking() {
  const { eventApi } = useApi()
  const currentUser = useCurrentUserStore()

  async function track(event: TrackableEvent): Promise<void> {
    const studentId = currentUser.profile?.user_id
    if (!studentId) return

    const envelope: SchemaTrackingEvent = {
      ...event,
      event_id: crypto.randomUUID(),
      student_id: studentId,
      session_id: currentSessionId(),
      occurred_at: new Date().toISOString(),
    }

    try {
      const { error } = await eventApi.POST('/events', { body: envelope })
      if (error) {
        console.warn('Tracking event rejected by the Event Ingestion Service:', event.event_type, error)
      }
    } catch {
      // Network/transport failure — not surfaced, see doc comment above.
    }
  }

  return { track }
}
