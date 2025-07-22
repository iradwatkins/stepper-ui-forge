import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts"

// PayPal API configuration
const PAYPAL_CLIENT_ID = Deno.env.get('PAYPAL_CLIENT_ID');
const PAYPAL_CLIENT_SECRET = Deno.env.get('PAYPAL_CLIENT_SECRET');
const PAYPAL_WEBHOOK_ID = Deno.env.get('PAYPAL_WEBHOOK_ID');
const PAYPAL_ENVIRONMENT = Deno.env.get('PAYPAL_ENVIRONMENT') || 'sandbox';

const PAYPAL_BASE_URL = PAYPAL_ENVIRONMENT === 'production' 
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// Get PayPal access token
async function getPayPalAccessToken(): Promise<string> {
  const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);
  
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Failed to get PayPal access token');
  }

  const data = await response.json();
  return data.access_token;
}

// Create PayPal order
async function createPayPalOrder(amount: number, currency: string = 'USD') {
  const accessToken = await getPayPalAccessToken();
  
  const orderData = {
    intent: 'CAPTURE',
    purchase_units: [{
      amount: {
        currency_code: currency,
        value: amount.toFixed(2),
      },
    }],
  };

  const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    throw new Error('Failed to create PayPal order');
  }

  return response.json();
}

// Capture PayPal order
async function capturePayPalOrder(orderId: string) {
  const accessToken = await getPayPalAccessToken();
  
  const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to capture PayPal order');
  }

  return response.json();
}

// Verify PayPal webhook signature
async function verifyPayPalWebhook(headers: Headers, body: string): Promise<boolean> {
  try {
    // PayPal webhook headers
    const transmissionId = headers.get('paypal-transmission-id');
    const transmissionTime = headers.get('paypal-transmission-time');
    const certUrl = headers.get('paypal-cert-url');
    const authAlgo = headers.get('paypal-auth-algo');
    const transmissionSig = headers.get('paypal-transmission-sig');
    
    // Check if webhook ID is configured
    if (!PAYPAL_WEBHOOK_ID) {
      console.error('PAYPAL_WEBHOOK_ID not configured');
      return false;
    }
    
    // Check if all required headers are present
    if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
      console.error('Missing required PayPal webhook headers');
      return false;
    }
    
    // Get access token for verification
    const accessToken = await getPayPalAccessToken();
    
    // Prepare verification request
    const verificationRequest = {
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: PAYPAL_WEBHOOK_ID,
      webhook_event: JSON.parse(body)
    };
    
    // Call PayPal verification endpoint
    const response = await fetch(`${PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(verificationRequest),
    });
    
    if (!response.ok) {
      console.error('PayPal webhook verification failed:', await response.text());
      return false;
    }
    
    const result = await response.json();
    return result.verification_status === 'SUCCESS';
    
  } catch (error) {
    console.error('Error verifying PayPal webhook:', error);
    return false;
  }
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
      if (PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET) {
        try {
          const tokenStart = Date.now();
          await getPayPalAccessToken();
          apiResponseTime = Date.now() - tokenStart;
          apiStatus = 'healthy';
        } catch (error) {
          apiStatus = 'unhealthy';
          console.error('PayPal health check failed:', error);
        }
      }
      
      return new Response(
        JSON.stringify({ 
          status: 'ok',
          gateway: 'paypal',
          environment: PAYPAL_ENVIRONMENT,
          configured: !!(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET),
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
        case 'create_order': {
          const { amount, currency } = payload;
          
          if (!amount || amount <= 0) {
            return new Response(
              JSON.stringify({ error: 'Invalid amount' }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }

          const order = await createPayPalOrder(amount, currency);
          return new Response(
            JSON.stringify({ order }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        case 'capture_order': {
          const { orderId } = payload;
          
          if (!orderId) {
            return new Response(
              JSON.stringify({ error: 'Order ID is required' }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }

          const captureResult = await capturePayPalOrder(orderId);
          return new Response(
            JSON.stringify({ capture: captureResult }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        case 'webhook': {
          const body = await req.text();
          
          // Verify webhook signature
          const isValid = await verifyPayPalWebhook(req.headers, body);
          if (!isValid) {
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
          console.log('PayPal webhook received:', webhookData.event_type);
          
          // Handle specific webhook events
          switch (webhookData.event_type) {
            case 'PAYMENT.CAPTURE.COMPLETED':
              console.log('Payment captured:', webhookData.resource.id);
              // TODO: Update order status in database
              break;
            case 'PAYMENT.CAPTURE.DENIED':
              console.log('Payment denied:', webhookData.resource.id);
              // TODO: Handle payment failure
              break;
            case 'PAYMENT.CAPTURE.REFUNDED':
              console.log('Payment refunded:', webhookData.resource.id);
              // TODO: Handle refund
              break;
            default:
              console.log('Unhandled webhook event:', webhookData.event_type);
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
    console.error('PayPal API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});