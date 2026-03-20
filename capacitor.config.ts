import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nutrisync.app',
  appName: 'NutriSync',
  webDir: 'public',
  server: {
    url: 'https://nutri-sync-rho.vercel.app',
    cleartext: true,
    allowNavigation: ['nutri-sync-rho.vercel.app']
  }
};

export default config;
