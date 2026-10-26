import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // Permanent once a build is uploaded to either store.
  appId: 'com.motifpath.app',
  appName: 'MotifPath',
  webDir: 'dist',
  // Debug builds only: the native console can print sign-in tokens, so release builds log nothing.
  loggingBehavior: 'debug',
  plugins: {
    // Sends the page's fetch and XHR through the native network stack. Native requests carry no
    // Origin header, which the auth provider requires whenever its client token travels in the
    // Authorization header, and they are not subject to CORS.
    CapacitorHttp: { enabled: true },
  },
}

export default config
