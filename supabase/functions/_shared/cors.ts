// CORS configuration with domain restriction
const ALLOWED_ORIGINS = [
  'https://2c95fd08-586c-4e21-9ff9-bea6ea888afc.lovableproject.com',
  'https://2c95fd08-586c-4e21-9ff9-bea6ea888afc-dev.lovableproject.com',
  'https://www.stylo.se',
];

export const getCorsHeaders = (origin?: string): Record<string, string> => {
  // Check if origin is allowed
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-forwarded-for',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Max-Age': '86400',
  };
};

export const handleCorsPreFlight = (origin?: string): Response => {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
};

// Default CORS headers for simple usage
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-forwarded-for',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};
