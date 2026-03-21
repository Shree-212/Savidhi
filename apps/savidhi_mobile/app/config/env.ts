import { Platform } from 'react-native';

const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const ENV = {
  API_URL: __DEV__ ? `http://${DEV_HOST}:4000` : 'https://api.savidhi.in',
  APP_ENV: __DEV__ ? 'development' : 'production',
} as const;
