export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validatePaymentAmount = (amount: number): ValidationResult => {
  const errors: string[] = [];

  if (!amount || amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  if (amount < 0.5) {
    errors.push('Minimum payment amount is $0.50');
  }

  if (amount > 999999.99) {
    errors.push('Maximum payment amount is $999,999.99');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateSquareConfig = (config: any): ValidationResult => {
  const errors: string[] = [];

  if (!config.appId) {
    errors.push('Square App ID is required');
  }

  if (!config.locationId) {
    errors.push('Square Location ID is required');
  }

  if (!['sandbox', 'production'].includes(config.environment)) {
    errors.push('Environment must be "sandbox" or "production"');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};