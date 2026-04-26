import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thekennethy.blazeycc',
  appName: 'Blazeycc',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1a2e'
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1a1a2e'
    }
  }
};

export default config;
