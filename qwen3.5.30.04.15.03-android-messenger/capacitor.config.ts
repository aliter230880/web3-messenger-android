import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'space.aliterra.messenger',
  appName: 'Web3 Messenger',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // wallet.aliterra.space must load inside the WebView (not Chrome) so that
    // after unlock it can redirect back to https://localhost/?w3g_addr=ADDRESS
    // and the WebView receives the address — without this, Capacitor opens
    // wallet.aliterra.space in Chrome, which cannot reach https://localhost.
    allowNavigation: ['wallet.aliterra.space'],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#3390ec",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      spinnerColor: "#ffffff",
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    AppBar: {
      backgroundColor: "#3390ec",
      show: false,
    },
  },
  android: {
    buildOptions: {
      keystorePath: process.env.KEYSTORE_PATH,
      keystorePassword: process.env.KEYSTORE_PASSWORD,
      keystoreAlias: process.env.KEYSTORE_ALIAS,
    },
  },
};

export default config;
