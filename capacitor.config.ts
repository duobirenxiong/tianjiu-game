import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tianjiu.game',
  appName: '天九扑克牌',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  android: {
    buildOptions: {
      keystorePath: '',
      keystoreAlias: '',
    },
  },
};

export default config;
