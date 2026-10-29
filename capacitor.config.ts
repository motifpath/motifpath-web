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
    // The launch screen stays until the first screen can render; the app hides it.
    SplashScreen: { launchAutoHide: false },
    // The page draws edge to edge and pads by the safe-area insets. Android also gets them as
    // --safe-area-inset-* custom properties, which older WebViews don't expose through env().
    SystemBars: { insetsHandling: 'css', initialViewportFitValueHint: 'cover' },
    // The phone's own Google account picker. Only Google is bundled; the other providers' SDKs stay
    // out of the app.
    SocialLogin: {
      providers: { google: true, apple: false, facebook: false, twitter: false },
      logLevel: 1,
    },
  },
}

export default config
