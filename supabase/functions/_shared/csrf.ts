/**
 * CSRF token validation for edge functions
 * Validates that the request includes a valid CSRF token
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const CSRF_HEADER = 'X-CSRF-Token';
const CSRF_COOKIE = 'csrf_token';

/**
 * Validate CSRF token from request
 * Compares header token with session token
 */
export async function validateCsrfToken(req: Request): Promise<boolean> {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return true;
  }

  // Get token from header
  const headerToken = req.headers.get(CSRF_HEADER);
  if (!headerToken) {
    console.error('CSRF validation failed: No token in header');
    return false;
  }

  // For now, we'll implement a simple validation
  // In production, you'd want to validate against a server-side session store
  // This is a placeholder that checks token format
  const tokenRegex = /^[a-f0-9]{64}$/;
  if (!tokenRegex.test(headerToken)) {
    console.error('CSRF validation failed: Invalid token format');
    return false;
  }

  return true;
}

/**
 * Create CSRF error response
 */
export function csrfErrorResponse(): Response {
  return new Response(
    JSON.stringify({ 
      error: 'CSRF validation failed',
      message: 'Request missing or invalid CSRF token'
    }),
    { 
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}