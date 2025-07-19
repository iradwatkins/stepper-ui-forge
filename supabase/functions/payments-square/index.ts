import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"

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

// Create Square payment with better error handling
async function createSquarePayment(sourceId: string, amount: number, currency: string = 'USD') {
  // Log the configuration for debugging
  console.log('Square Payment Request:', {
    environment: SQUARE_ENVIRONMENT,
    baseUrl: SQUARE_BASE_URL,
    hasAccessToken: !!SQUARE_ACCESS_TOKEN,
    hasApplicationId: !!SQUARE_APPLICATION_ID,
    hasLocationId: !!SQUARE_LOCATION_ID,
    locationId: SQUARE_LOCATION_ID,
    sourceId: sourceId,
    amount: amount
  });

  // Validate configuration
  if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
    throw new Error('Square configuration missing: Access token or Location ID not set');
  }

  const paymentData = {
    source_id: sourceId,
    idempotency_key: generateUUID(),
    amount_money: {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency,
    },
    location_id: SQUARE_LOCATION_ID,
  };

  try {
    const response = await fetch(`${SQUARE_BASE_URL}/v2/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Square-Version': '2023-10-18',
      },
      body: JSON.stringify(paymentData),
    });

    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse Square response:', responseText);
      throw new Error(`Square API returned invalid JSON: ${responseText.substring(0, 200)}`);
    }

    if (!response.ok) {
      console.error('Square API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        environment: SQUARE_ENVIRONMENT,
        baseUrl: SQUARE_BASE_URL
      });

      // Extract specific error details
      const errors = responseData.errors || [];
      const errorMessages = errors.map((e: any) => `${e.code}: ${e.detail}`).join(', ');
      
      throw new Error(`Square payment failed (${response.status}): ${errorMessages || JSON.stringify(responseData)}`);
    }

    return responseData;
  } catch (error) {
    console.error('Square payment creation error:', error);
    throw error;
  }
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
    const error = await response.json();
    throw new Error(`Failed to get Square payment: ${JSON.stringify(error)}`);
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
  try {
    if (!webhookSignatureKey) {
      console.error('SQUARE_WEBHOOK_SIGNATURE_KEY not configured');
      return false;
    }
    
    if (!signature) {
      console.error('Missing webhook signature header');
      return false;
    }
    
    // Square webhook signature format: base64(hmac-sha256(url + body))
    // Get the request URL from the webhook payload
    const webhookData = JSON.parse(body);
    const webhookUrl = webhookData.webhook?.endpoint_url || '';
    
    // Concatenate URL and body as Square does
    const stringToSign = webhookUrl + body;
    
    // Create HMAC-SHA256
    const hmac = createHmac('sha256', webhookSignatureKey);
    hmac.update(stringToSign);
    const computedSignature = hmac.digest('base64');
    
    // Compare signatures
    const isValid = computedSignature === signature;
    
    if (!isValid) {
      console.error('Webhook signature mismatch');
      console.error('Expected:', computedSignature);
      console.error('Received:', signature);
    }
    
    return isValid;
  } catch (error) {
    console.error('Error verifying Square webhook:', error);
    return false;
  }
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
      const startTime = Date.now();
      let apiStatus = 'unknown';
      let apiResponseTime = 0;
      let configStatus = {
        hasAccessToken: !!SQUARE_ACCESS_TOKEN,
        hasApplicationId: !!SQUARE_APPLICATION_ID,
        hasLocationId: !!SQUARE_LOCATION_ID,
        environment: SQUARE_ENVIRONMENT,
        baseUrl: SQUARE_BASE_URL,
      };
      
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
          
          if (response.ok) {
            apiStatus = 'healthy';
          } else {
            const errorData = await response.json();
            apiStatus = `unhealthy: ${response.status} - ${JSON.stringify(errorData)}`;
            console.error('Square health check failed:', errorData);
          }
        } catch (error) {
          apiStatus = `unhealthy: ${error.message}`;
          console.error('Square health check failed:', error);
        }
      }
      
      return new Response(
        JSON.stringify({ 
          status: 'ok',
          gateway: 'square',
          environment: SQUARE_ENVIRONMENT,
          configured: !!(SQUARE_APPLICATION_ID && SQUARE_ACCESS_TOKEN && SQUARE_LOCATION_ID),
          configStatus,
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
              JSON.stringify({ error: 'Invalid payment parameters' }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }

          try {
            const payment = await createSquarePayment(sourceId, amount, currency);
            return new Response(
              JSON.stringify({ payment }),
              { 
                status: 200, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          } catch (error) {
            console.error('Payment creation failed:', error);
            return new Response(
              JSON.stringify({ 
                error: error.message || 'Payment creation failed',
                details: {
                  environment: SQUARE_ENVIRONMENT,
                  baseUrl: SQUARE_BASE_URL,
                  hasCredentials: !!SQUARE_ACCESS_TOKEN && !!SQUARE_LOCATION_ID
                }
              }),
              { 
                status: 500, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
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

          const paymentDetails = await getSquarePayment(paymentId);
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

          const refund = await refundSquarePayment(refundPaymentId, refundAmount, reason);
          return new Response(
            JSON.stringify({ refund }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        case 'webhook': {
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
          
          // Handle specific webhook events
          switch (webhookData.type) {
            case 'payment.created':
              console.log('Payment created:', webhookData.data.object.payment?.id);
              // Payment is created but not yet completed
              break;
            case 'payment.updated': {
              const payment = webhookData.data.object.payment;
              console.log('Payment updated:', payment?.id, 'Status:', payment?.status);
              if (payment?.status === 'COMPLETED') {
                // TODO: Update order status in database
                console.log('Payment completed successfully');
              } else if (payment?.status === 'FAILED') {
                // TODO: Handle payment failure
                console.log('Payment failed');
              }
              break;
            }
            case 'refund.created':
              console.log('Refund created:', webhookData.data.object.refund?.id);
              // TODO: Update order/payment status
              break;
            case 'refund.updated': {
              const refund = webhookData.data.object.refund;
              console.log('Refund updated:', refund?.id, 'Status:', refund?.status);
              break;
            }
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
    console.error('Square API error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        stack: error.stack,
        environment: SQUARE_ENVIRONMENT,
        baseUrl: SQUARE_BASE_URL
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});// Version: 2025-01-19-v2 - Improved error handling
