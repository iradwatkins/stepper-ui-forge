export const PAYMENT_CONFIG = {
  square: {
    production: {
      appId: process.env.VITE_SQUARE_APP_ID || '',
      locationId: process.env.VITE_SQUARE_LOCATION_ID || '',
      environment: 'production' as const
    },
    sandbox: {
      appId: process.env.VITE_SQUARE_SANDBOX_APP_ID || 'sandbox-sq0idb-A5J5J5J5J5J5J5J5J5J5JA',
      locationId: process.env.VITE_SQUARE_SANDBOX_LOCATION_ID || 'LH2G2G2G2G2G2G2G2G2G2G2G2G',
      environment: 'sandbox' as const
    }
  },
  sdkUrl: 'https://web.squarecdn.com/v1/square.js',
  retryOptions: {
    maxAttempts: 3,
    delay: 1000
  }
};

export const getSquareConfig = (environment: 'sandbox' | 'production' = 'sandbox') => {
  return PAYMENT_CONFIG.square[environment];
};