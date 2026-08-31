/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Clerk publishable key for the frontend SDK. */
  readonly VITE_CLERK_PUBLISHABLE_KEY: string
  /** Base URL of the Core Domain Service (e.g. http://localhost:8080). */
  readonly VITE_CORE_API_URL: string
  /** Base URL of the Event Ingestion Service (e.g. http://localhost:8081). */
  readonly VITE_EVENTS_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
