/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Clerk publishable key for the frontend SDK. */
  readonly VITE_CLERK_PUBLISHABLE_KEY: string
  /** Base URL of the Core Domain Service (e.g. http://localhost:8080). */
  readonly VITE_CORE_API_URL: string
  /** Base URL of the Event Ingestion Service (e.g. http://localhost:8081). */
  readonly VITE_EVENTS_API_URL: string
  /**
   * The concierge's WhatsApp number, international format (e.g. +55 11 91234-5678).
   * Unset or empty hides the "Send to your teacher" button.
   */
  readonly VITE_CONCIERGE_WHATSAPP_NUMBER?: string
  /** Google Web OAuth client ID — the audience of native Google sign-in ID tokens. */
  readonly VITE_GOOGLE_WEB_CLIENT_ID?: string
  /** Google iOS OAuth client ID, used only by the iOS app. */
  readonly VITE_GOOGLE_IOS_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
