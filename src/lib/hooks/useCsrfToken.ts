import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook to manage CSRF tokens for form submissions
 * Generates a unique token per session and validates it server-side
 */
export const useCsrfToken = () => {
  const [csrfToken, setCsrfToken] = useState<string>('');

  useEffect(() => {
    // Generate CSRF token on mount
    const generateToken = () => {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      
      // Store in session storage (not localStorage - more secure)
      sessionStorage.setItem('csrf_token', token);
      setCsrfToken(token);
    };

    // Check if token already exists
    const existingToken = sessionStorage.getItem('csrf_token');
    if (existingToken) {
      setCsrfToken(existingToken);
    } else {
      generateToken();
    }
  }, []);

  /**
   * Get headers with CSRF token included
   */
  const getCsrfHeaders = (): HeadersInit => {
    return {
      'X-CSRF-Token': csrfToken,
    };
  };

  /**
   * Validate CSRF token for a request
   * This should be called server-side
   */
  const validateCsrfToken = (requestToken: string): boolean => {
    const sessionToken = sessionStorage.getItem('csrf_token');
    return !!sessionToken && sessionToken === requestToken;
  };

  return {
    csrfToken,
    getCsrfHeaders,
    validateCsrfToken,
  };
};

/**
 * Higher-order component to add CSRF protection to forms
 */
export const withCsrfProtection = <T extends { onSubmit?: (data: any) => void }>(
  Component: React.ComponentType<T>
) => {
  return (props: T) => {
    const { csrfToken, getCsrfHeaders } = useCsrfToken();

    const enhancedOnSubmit = async (data: any) => {
      // Add CSRF token to form data
      const enhancedData = {
        ...data,
        _csrf: csrfToken,
      };

      // Call original onSubmit if it exists
      if (props.onSubmit) {
        await props.onSubmit(enhancedData);
      }
    };

    return <Component {...props} onSubmit={enhancedOnSubmit} />;
  };
};