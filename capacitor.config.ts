import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nutrisync.app',
  appName: 'NutriSync',
  webDir: 'public',
  bundledWebRuntime: false,
  server: {
    url: 'http://192.168.1.107:3000',
    cleartext: true
  }
};

export default config;
