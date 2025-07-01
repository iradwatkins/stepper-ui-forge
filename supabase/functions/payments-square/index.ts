import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Square API configuration
const SQUARE_APPLICATION_ID = Deno.env.get('SQUARE_APPLICATION_ID');
const SQUARE_ACCESS_TOKEN = Deno.env.get('SQUARE_ACCESS_TOKEN');
const SQUARE_LOCATION_ID = Deno.env.get('SQUARE_LOCATION_ID');
const SQUARE_ENVIRONMENT = Deno.env.get('SQUARE_ENVIRONMENT') || 'sandbox';

const SQUARE_BASE_URL = SQUARE_ENVIRONMENT === 'production' 
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Generate UUID for idempotency
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Create Square payment
async function createSquarePayment(sourceId: string, amount: number, currency: string = 'USD') {
  const paymentData = {
    source_id: sourceId,
    idempotency_key: generateUUID(),
    amount_money: {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency,
    },
    location_id: SQUARE_LOCATION_ID,
  };

  const response = await fetch(`${SQUARE_BASE_URL}/v2/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
      'Square-Version': '2023-10-18',
    },
    body: JSON.stringify(paymentData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Square payment failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}

// Get Square payment details
async function getSquarePayment(paymentId: string) {
  const response = await fetch(`${SQUARE_BASE_URL}/v2/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
      'Square-Version': '2023-10-18',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get Square payment');
  }

  return response.json();
}

// Refund Square payment
async function refundSquarePayment(paymentId: string, amount?: number, reason?: string) {
  const refundData = {
    idempotency_key: generateUUID(),
    payment_id: paymentId,
    ...(amount && {
      amount_money: {
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'USD',
      }
    }),
    ...(reason && { reason }),
  };

  const response = await fetch(`${SQUARE_BASE_URL}/v2/refunds`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
      'Square-Version': '2023-10-18',
    },
    body: JSON.stringify(refundData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Square refund failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}

// Verify Square webhook signature
function verifySquareWebhook(signature: string, body: string, webhookSignatureKey: string): boolean {
  // In production, implement proper webhook signature verification
  // This would use HMAC-SHA256 with the webhook signature key
  // For now, return true - but this should be implemented for security
  return true;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const method = req.method;

    // Health check for GET requests
    if (method === 'GET') {
      return new Response(
        JSON.stringify({ 
          status: 'ok', 
          environment: SQUARE_ENVIRONMENT,
          configured: !!(SQUARE_APPLICATION_ID && SQUARE_ACCESS_TOKEN && SQUARE_LOCATION_ID)
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (method === 'POST') {
      const { action, ...payload } = await req.json();

      switch (action) {
        case 'create_payment':
          const { sourceId, amount, currency } = payload;
          
          if (!sourceId || !amount || amount <= 0) {
            return new Response(
              JSON.stringify({ error: 'Invalid payment parameters' }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }

          const payment = await createSquarePayment(sourceId, amount, currency);
          return new Response(
            JSON.stringify({ payment }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );

        case 'get_payment':
          const { paymentId } = payload;
          
          if (!paymentId) {
            return new Response(
              JSON.stringify({ error: 'Payment ID is required' }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }

          const paymentDetails = await getSquarePayment(paymentId);
          return new Response(
            JSON.stringify({ payment: paymentDetails }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );

        case 'refund_payment':
          const { paymentId: refundPaymentId, amount: refundAmount, reason } = payload;
          
          if (!refundPaymentId) {
            return new Response(
              JSON.stringify({ error: 'Payment ID is required for refund' }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }

          const refund = await refundSquarePayment(refundPaymentId, refundAmount, reason);
          return new Response(
            JSON.stringify({ refund }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );

        case 'webhook':
          const body = await req.text();
          const signature = req.headers.get('x-square-signature') || '';
          const webhookSignatureKey = Deno.env.get('SQUARE_WEBHOOK_SIGNATURE_KEY') || '';
          
          if (!verifySquareWebhook(signature, body, webhookSignatureKey)) {
            return new Response(
              JSON.stringify({ error: 'Invalid webhook signature' }),
              { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }

          // Process webhook payload
          const webhookData = JSON.parse(body);
          console.log('Square webhook received:', webhookData.type);
          
          return new Response(
            JSON.stringify({ success: true }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );

        default:
          return new Response(
            JSON.stringify({ error: 'Invalid action' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Square API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});