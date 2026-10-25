import type { CapacitorConfig } from '@capacitor/cli'

// The app id becomes permanent once a build is uploaded to either store, so it
// must be confirmed before any store submission.
const config: CapacitorConfig = {
  appId: 'com.motifpath.app',
  appName: 'MotifPath',
  webDir: 'dist',
  plugins: {
    // Sends the page's fetch and XHR through the native network stack. Native requests carry no
    // Origin header, which the auth provider requires whenever the client token travels in the
    // Authorization header.
    CapacitorHttp: { enabled: true },
    SocialLogin: {
      // Only the sign-ins the app offers are bundled into the native builds.
      providers: { google: true, apple: true, facebook: false, twitter: false },
      logLevel: 1,
    },
  },
}

export default config
