import { createApiClient } from '@/api/createApiClient'
import type { paths as CorePaths } from '@/api/generated/core-domain'
import type { paths as EventPaths } from '@/api/generated/event-ingestion'
import { getAuthToken } from '@/features/auth/authBridge'

/** Typed client for the Core Domain Service (identity, content, learning paths). */
export const coreApi = createApiClient<CorePaths>({
  baseUrl: import.meta.env.VITE_CORE_API_URL ?? 'http://localhost:8080',
  getToken: getAuthToken,
})

/** Typed client for the Event Ingestion Service (student tracking events). */
export const eventApi = createApiClient<EventPaths>({
  baseUrl: import.meta.env.VITE_EVENTS_API_URL ?? 'http://localhost:8081',
  getToken: getAuthToken,
})
