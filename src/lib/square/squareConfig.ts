// ==========================================
// EMERGENCY FIX: Square Application ID Error
// ==========================================

// HARDCODED PRODUCTION CREDENTIALS - NO ENV VARS
export const SQUARE_PRODUCTION_CONFIG = {
  applicationId: 'sq0idp-XG8irNWHf98C62-iqOwH6Q',
  locationId: 'L0Q2YC1SPBGD8',
  environment: 'production'
} as const;

// Validate the config
export function validateSquareConfig() {
  const { applicationId, locationId } = SQUARE_PRODUCTION_CONFIG;
  
  // Check format
  if (!applicationId || typeof applicationId !== 'string') {
    throw new Error('Square applicationId is not defined');
  }
  
  if (!applicationId.startsWith('sq0idp-')) {
    throw new Error(`Invalid Square applicationId format. Production IDs must start with 'sq0idp-'. Got: ${applicationId}`);
  }
  
  if (applicationId.length !== 29) {
    throw new Error(`Invalid Square applicationId length. Expected 29, got ${applicationId.length}`);
  }
  
  if (!locationId || locationId.length !== 13) {
    throw new Error('Invalid Square locationId');
  }
  
  return true;
}