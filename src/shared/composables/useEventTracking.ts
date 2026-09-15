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
 * student_id to attribute it to. Delivery failures are swallowed — this is
 * fire-and-forget telemetry that must never block the practice flow.
 */
export function useEventTracking() {
  const { eventApi } = useApi()
  const currentUser = useCurrentUserStore()

  async function track(event: TrackableEvent): Promise<void> {
    const studentId = currentUser.profile?.user_id
    if (!studentId) return

    const envelope = {
      ...event,
      event_id: crypto.randomUUID(),
      student_id: studentId,
      session_id: currentSessionId(),
      occurred_at: new Date().toISOString(),
    } as SchemaTrackingEvent

    try {
      await eventApi.POST('/events', { body: envelope })
    } catch {
      // Delivery failure is not surfaced — see doc comment above.
    }
  }

  return { track }
}
