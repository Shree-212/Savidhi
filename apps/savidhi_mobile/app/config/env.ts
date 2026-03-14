export const ENV = {
  API_URL: __DEV__ ? 'http://localhost:4000' : 'https://api.savidhi.in',
  APP_ENV: __DEV__ ? 'development' : 'production',
} as const;
