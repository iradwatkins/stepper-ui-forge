// Secure CORS configuration for Supabase Edge Functions

const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  // Add your production domains here
  // 'https://yourdomain.com',
  // 'https://www.yourdomain.com'
];

export function getCorsHeaders(origin: string | null): HeadersInit {
  // In production, always validate the origin
  const isAllowedOrigin = origin && ALLOWED_ORIGINS.includes(origin);
  
  // For development, you might want to be more permissive
  // but in production, ALWAYS validate origins
  const allowedOrigin = isAllowedOrigin ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

export function corsResponse(origin: string | null): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}