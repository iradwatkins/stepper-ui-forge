import { supabase } from '@/integrations/supabase/client';

export interface PaymentConfiguration {
  id: string;
  gateway_name: string;
  environment: 'sandbox' | 'production';
  is_active: boolean;
  configuration: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface PayPalConfig {
  client_id: string;
  client_secret: string;
  webhook_id?: string;
}

export interface SquareConfig {
  application_id: string;
  access_token: string;
  location_id: string;
}

export interface CashAppConfig {
  client_id: string;
}

export class PaymentConfigurationService {
  /**
   * Get all active payment configurations for the current environment
   */
  static async getActiveConfigurations(): Promise<PaymentConfiguration[]> {
    const { data, error } = await supabase
      .from('payment_configurations')
      .select('*')
      .eq('is_active', true)
      .order('gateway_name');

    if (error) {
      console.error('Error fetching payment configurations:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get configuration for a specific payment gateway
   */
  static async getGatewayConfiguration(
    gatewayName: string,
    environment: 'sandbox' | 'production' = 'sandbox'
  ): Promise<PaymentConfiguration | null> {
    const { data, error } = await supabase
      .from('payment_configurations')
      .select('*')
      .eq('gateway_name', gatewayName)
      .eq('environment', environment)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error(`Error fetching ${gatewayName} configuration:`, error);
      throw error;
    }

    return data;
  }

  /**
   * Get PayPal configuration
   */
  static async getPayPalConfig(
    environment: 'sandbox' | 'production' = 'sandbox'
  ): Promise<PayPalConfig | null> {
    const config = await this.getGatewayConfiguration('paypal', environment);
    return config?.configuration as PayPalConfig || null;
  }

  /**
   * Get Square configuration
   */
  static async getSquareConfig(
    environment: 'sandbox' | 'production' = 'sandbox'
  ): Promise<SquareConfig | null> {
    const config = await this.getGatewayConfiguration('square', environment);
    return config?.configuration as SquareConfig || null;
  }

  /**
   * Get Cash App configuration
   */
  static async getCashAppConfig(
    environment: 'sandbox' | 'production' = 'sandbox'
  ): Promise<CashAppConfig | null> {
    const config = await this.getGatewayConfiguration('cashapp', environment);
    return config?.configuration as CashAppConfig || null;
  }

  /**
   * Update payment gateway configuration (Admin only)
   */
  static async updateGatewayConfiguration(
    gatewayName: string,
    environment: 'sandbox' | 'production',
    configuration: Record<string, any>,
    isActive: boolean = true
  ): Promise<PaymentConfiguration> {
    const { data, error } = await supabase
      .from('payment_configurations')
      .upsert({
        gateway_name: gatewayName,
        environment,
        configuration,
        is_active: isActive,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'gateway_name,environment'
      })
      .select()
      .single();

    if (error) {
      console.error(`Error updating ${gatewayName} configuration:`, error);
      throw error;
    }

    return data;
  }

  /**
   * Toggle gateway active status
   */
  static async toggleGatewayStatus(
    gatewayName: string,
    environment: 'sandbox' | 'production',
    isActive: boolean
  ): Promise<void> {
    const { error } = await supabase
      .from('payment_configurations')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('gateway_name', gatewayName)
      .eq('environment', environment);

    if (error) {
      console.error(`Error toggling ${gatewayName} status:`, error);
      throw error;
    }
  }

  /**
   * Get available payment methods for checkout
   */
  static async getAvailablePaymentMethods(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    available: boolean;
  }>> {
    try {
      const configurations = await this.getActiveConfigurations();
      
      const methods = [
        {
          id: 'paypal',
          name: 'PayPal',
          description: 'Pay with PayPal account or credit card',
          available: false
        },
        {
          id: 'square',
          name: 'Credit/Debit Card',
          description: 'Pay with credit or debit card via Square',
          available: false
        },
        {
          id: 'cashapp',
          name: 'Cash App Pay',
          description: 'Pay with Cash App',
          available: false
        }
      ];

      // Mark methods as available based on active configurations
      configurations.forEach(config => {
        const method = methods.find(m => m.id === config.gateway_name);
        if (method) {
          method.available = true;
        }
      });

      // Filter to only return available methods
      const availableMethods = methods.filter(method => method.available);
      
      // If no methods are configured, return all methods for development/testing
      if (availableMethods.length === 0 && import.meta.env.DEV) {
        console.warn('No payment methods configured. Returning all methods for development.');
        return methods.map(m => ({ ...m, available: true }));
      }
      
      return availableMethods;
    } catch (error) {
      console.error('Error loading payment configurations:', error);
      
      // Return all methods in development mode if there's an error
      if (import.meta.env.DEV) {
        return [
          {
            id: 'paypal',
            name: 'PayPal',
            description: 'Pay with PayPal account or credit card',
            available: true
          },
          {
            id: 'square',
            name: 'Credit/Debit Card',
            description: 'Pay with credit or debit card via Square',
            available: true
          },
          {
            id: 'cashapp',
            name: 'Cash App Pay',
            description: 'Pay with Cash App',
            available: true
          }
        ];
      }
      
      throw error;
    }
  }

  /**
   * Validate configuration completeness
   */
  static validateConfiguration(gatewayName: string, configuration: Record<string, any>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    switch (gatewayName) {
      case 'paypal':
        if (!configuration.client_id) errors.push('PayPal Client ID is required');
        if (!configuration.client_secret) errors.push('PayPal Client Secret is required');
        break;
      
      case 'square':
        if (!configuration.application_id) errors.push('Square Application ID is required');
        if (!configuration.access_token) errors.push('Square Access Token is required');
        if (!configuration.location_id) errors.push('Square Location ID is required');
        break;
      
      case 'cashapp':
        if (!configuration.client_id) errors.push('Cash App Client ID is required');
        break;
      
      default:
        errors.push('Unknown payment gateway');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}