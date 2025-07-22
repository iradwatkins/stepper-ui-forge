import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts"

// Cash App uses Square's infrastructure
const SQUARE_APPLICATION_ID = Deno.env.get('SQUARE_APPLICATION_ID');
const SQUARE_ACCESS_TOKEN = Deno.env.get('SQUARE_ACCESS_TOKEN');
const SQUARE_LOCATION_ID = Deno.env.get('SQUARE_LOCATION_ID');
const SQUARE_ENVIRONMENT = Deno.env.get('SQUARE_ENVIRONMENT') || 'sandbox';

const SQUARE_BASE_URL = SQUARE_ENVIRONMENT === 'production' 
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com';

// Generate UUID for idempotency
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Create Cash App payment using Square API
async function createCashAppPayment(sourceId: string, amount: number, currency: string = 'USD') {
  // Cash App Pay uses the payment token from Web SDK
  const paymentData = {
    source_id: sourceId, // Payment token from Web SDK
    idempotency_key: generateUUID(),
    amount_money: {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency,
    },
    location_id: SQUARE_LOCATION_ID,
    autocomplete: true,
    accept_partial_authorization: false,
    note: 'Cash App Pay transaction'
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
    throw new Error(`Cash App payment failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}

// Get Cash App payment details (same as Square)
async function getCashAppPayment(paymentId: string) {
  const response = await fetch(`${SQUARE_BASE_URL}/v2/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
      'Square-Version': '2023-10-18',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get Cash App payment');
  }

  return response.json();
}

// Refund Cash App payment (same as Square)
async function refundCashAppPayment(paymentId: string, amount?: number, reason?: string) {
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
    throw new Error(`Cash App refund failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return corsResponse(origin);
  }

  try {
    const url = new URL(req.url);
    const method = req.method;

    // Health check for GET requests
    if (method === 'GET') {
      const startTime = Date.now();
      let apiStatus = 'unknown';
      let apiResponseTime = 0;
      
      // Test API connectivity if configured
      if (SQUARE_APPLICATION_ID && SQUARE_ACCESS_TOKEN && SQUARE_LOCATION_ID) {
        try {
          const apiStart = Date.now();
          // Test with locations endpoint as it's lightweight
          const response = await fetch(`${SQUARE_BASE_URL}/v2/locations/${SQUARE_LOCATION_ID}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
              'Square-Version': '2023-10-18',
            },
          });
          
          apiResponseTime = Date.now() - apiStart;
          apiStatus = response.ok ? 'healthy' : 'unhealthy';
        } catch (error) {
          apiStatus = 'unhealthy';
          console.error('Cash App health check failed:', error);
        }
      }
      
      return new Response(
        JSON.stringify({ 
          status: 'ok',
          gateway: 'cashapp',
          environment: SQUARE_ENVIRONMENT,
          configured: !!(SQUARE_APPLICATION_ID && SQUARE_ACCESS_TOKEN && SQUARE_LOCATION_ID),
          apiStatus,
          apiResponseTime,
          totalResponseTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
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
        case 'create_payment': {
          const { sourceId, amount, currency } = payload;
          
          if (!sourceId || !amount || amount <= 0) {
            return new Response(
              JSON.stringify({ error: 'Invalid payment parameters - missing sourceId or invalid amount' }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }

          // Use the payment token from Web SDK to create payment
          const payment = await createCashAppPayment(sourceId, amount, currency);
          
          return new Response(
            JSON.stringify({ 
              payment: payment.payment,
              success: true
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        case 'get_payment': {
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

          const paymentDetails = await getCashAppPayment(paymentId);
          return new Response(
            JSON.stringify({ payment: paymentDetails }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        case 'refund_payment': {
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

          const refund = await refundCashAppPayment(refundPaymentId, refundAmount, reason);
          return new Response(
            JSON.stringify({ refund }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        case 'webhook': {
          // Cash App webhooks are handled through Square's webhook system
          const body = await req.text();
          const webhookData = JSON.parse(body);
          
          console.log('Cash App webhook received:', webhookData.type);
          
          // Handle specific webhook events
          switch (webhookData.type) {
            case 'payment.created':
              console.log('Cash App payment created:', webhookData.data.object.payment?.id);
              break;
            case 'payment.updated':
              const payment = webhookData.data.object.payment;
              console.log('Cash App payment updated:', payment?.id, 'Status:', payment?.status);
              break;
            case 'refund.created':
              console.log('Cash App refund created:', webhookData.data.object.refund?.id);
              break;
            default:
              console.log('Unhandled webhook event:', webhookData.type);
          }
          
          return new Response(
            JSON.stringify({ success: true }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

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
    console.error('Cash App API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});