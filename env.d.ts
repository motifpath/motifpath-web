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
  /**
   * Google's Web OAuth client ID: the audience of the ID token the app shell's Google sign-in hands
   * to Clerk. It must be the client Clerk's Google connection uses. Only the app shell reads it.
   */
  readonly VITE_GOOGLE_WEB_CLIENT_ID: string
  /** Google's iOS OAuth client ID, for the iOS app's Google sign-in. Only the app shell reads it. */
  readonly VITE_GOOGLE_IOS_CLIENT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
