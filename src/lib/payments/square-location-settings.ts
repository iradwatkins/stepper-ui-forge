// Square Location Settings API
// Retrieves location-specific checkout settings

interface SquareLocationSettings {
  location_id: string;
  enabled_payment_methods?: {
    apple_pay?: boolean;
    google_pay?: boolean;
    cash_app_pay?: boolean;
    afterpay_clearpay?: boolean;
  };
  accepted_payment_methods?: {
    card?: boolean;
    square_gift_card?: boolean;
    bank_account?: boolean;
    buy_now_pay_later?: boolean;
  };
  branding?: {
    header_image_url?: string;
    color_scheme?: string;
  };
}

export async function getSquareLocationSettings(
  locationId: string,
  accessToken: string
): Promise<SquareLocationSettings> {
  const url = `https://connect.squareup.com/v2/online-checkout/location-settings/${locationId}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Square-Version': '2025-07-16',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Square API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch Square location settings:', error);
    throw error;
  }
}

// Example usage in a component or service
export async function checkLocationPaymentMethods(locationId: string): Promise<{
  cashAppEnabled: boolean;
  cardEnabled: boolean;
  googlePayEnabled: boolean;
  applePayEnabled: boolean;
}> {
  // In production, get this from your secure backend
  const accessToken = import.meta.env.VITE_SQUARE_ACCESS_TOKEN || '';
  
  if (!accessToken) {
    console.warn('Square access token not configured');
    return {
      cashAppEnabled: false,
      cardEnabled: true, // Default to true
      googlePayEnabled: false,
      applePayEnabled: false
    };
  }

  try {
    const settings = await getSquareLocationSettings(locationId, accessToken);
    
    return {
      cashAppEnabled: settings.enabled_payment_methods?.cash_app_pay || false,
      cardEnabled: settings.accepted_payment_methods?.card !== false,
      googlePayEnabled: settings.enabled_payment_methods?.google_pay || false,
      applePayEnabled: settings.enabled_payment_methods?.apple_pay || false
    };
  } catch (error) {
    console.error('Error checking location payment methods:', error);
    // Return defaults on error
    return {
      cashAppEnabled: false,
      cardEnabled: true,
      googlePayEnabled: false,
      applePayEnabled: false
    };
  }
}