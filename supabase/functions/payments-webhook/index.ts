import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Unified payment webhook handler for all payment gateways
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const provider = url.searchParams.get('provider');
    const method = req.method;

    // Health check for GET requests
    if (method === 'GET') {
      return new Response(
        JSON.stringify({ 
          status: 'ok',
          timestamp: new Date().toISOString(),
          endpoints: {
            paypal: '/payments-webhook?provider=paypal',
            square: '/payments-webhook?provider=square',
            cashapp: '/payments-webhook?provider=cashapp',
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (method === 'POST') {
      const body = await req.text();
      const headers = Object.fromEntries(req.headers.entries());

      console.log(`Webhook received from ${provider}:`, {
        headers: Object.keys(headers),
        bodySize: body.length,
        timestamp: new Date().toISOString(),
      });

      let result;
      switch (provider) {
        case 'paypal':
          result = await handlePayPalWebhook(body, headers);
          break;
        
        case 'square':
          result = await handleSquareWebhook(body, headers);
          break;
        
        case 'cashapp':
          // Cash App uses Square's webhook system
          result = await handleSquareWebhook(body, headers);
          break;
        
        default:
          // Try to auto-detect provider from headers
          if (headers['paypal-transmission-id']) {
            result = await handlePayPalWebhook(body, headers);
          } else if (headers['x-square-signature']) {
            result = await handleSquareWebhook(body, headers);
          } else {
            console.error('Unknown webhook provider');
            return new Response(
              JSON.stringify({ error: 'Unknown webhook provider' }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
      }

      return new Response(
        JSON.stringify(result),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function handlePayPalWebhook(body: string, headers: any) {
  try {
    // Verify PayPal webhook signature
    if (!verifyPayPalWebhookSignature(body, headers)) {
      console.error('PayPal webhook signature verification failed');
      return { error: 'Invalid signature', status: 401 };
    }

    const webhookData = JSON.parse(body);
    const eventType = webhookData.event_type;

    console.log('PayPal webhook event:', eventType);

    switch (eventType) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handlePaymentCompleted('paypal', webhookData);
        break;
      
      case 'PAYMENT.CAPTURE.DENIED':
        await handlePaymentFailed('paypal', webhookData);
        break;
      
      case 'PAYMENT.CAPTURE.REFUNDED':
        await handlePaymentRefunded('paypal', webhookData);
        break;
      
      default:
        console.log('Unhandled PayPal event:', eventType);
    }

    return { success: true };
  } catch (error) {
    console.error('PayPal webhook error:', error);
    return { error: 'PayPal webhook processing failed', status: 500 };
  }
}

async function handleSquareWebhook(body: string, headers: any) {
  try {
    // Verify Square webhook signature
    if (!verifySquareWebhookSignature(body, headers)) {
      console.error('Square webhook signature verification failed');
      return { error: 'Invalid signature', status: 401 };
    }

    const webhookData = JSON.parse(body);
    const eventType = webhookData.type;

    console.log('Square webhook event:', eventType);

    switch (eventType) {
      case 'payment.created':
        await handlePaymentCreated('square', webhookData);
        break;
      
      case 'payment.updated':
        await handlePaymentUpdated('square', webhookData);
        break;
      
      case 'refund.created':
        await handlePaymentRefunded('square', webhookData);
        break;
      
      default:
        console.log('Unhandled Square event:', eventType);
    }

    return { success: true };
  } catch (error) {
    console.error('Square webhook error:', error);
    return { error: 'Square webhook processing failed', status: 500 };
  }
}

// Webhook signature verification functions
function verifyPayPalWebhookSignature(body: string, headers: any): boolean {
  // In production, implement proper PayPal webhook signature verification
  // This would use PayPal's webhook verification API or HMAC verification
  // For now, return true - but this MUST be implemented for security
  const transmissionId = headers['paypal-transmission-id'];
  return !!transmissionId;
}

function verifySquareWebhookSignature(body: string, headers: any): boolean {
  // In production, implement proper Square webhook signature verification
  // This would use HMAC-SHA256 with the webhook signature key
  // For now, return true - but this MUST be implemented for security
  const signature = headers['x-square-signature'];
  return !!signature;
}

// Payment event handlers
async function handlePaymentCompleted(provider: string, webhookData: any) {
  console.log(`Payment completed via ${provider}:`, {
    provider,
    paymentId: webhookData.resource?.id || webhookData.data?.object?.payment?.id,
    amount: webhookData.resource?.amount || webhookData.data?.object?.amount_money,
  });

  // TODO: Update database with successful payment
  // TODO: Generate and send tickets
  // TODO: Send confirmation email
  // TODO: Update inventory
}

async function handlePaymentFailed(provider: string, webhookData: any) {
  console.log(`Payment failed via ${provider}:`, {
    provider,
    paymentId: webhookData.resource?.id || webhookData.data?.object?.payment?.id,
    reason: webhookData.resource?.reason_code || webhookData.data?.object?.status,
  });

  // TODO: Update database with failed payment
  // TODO: Release reserved inventory
  // TODO: Send failure notification
}

async function handlePaymentRefunded(provider: string, webhookData: any) {
  console.log(`Payment refunded via ${provider}:`, {
    provider,
    paymentId: webhookData.resource?.id || webhookData.data?.object?.payment?.id,
    refundAmount: webhookData.resource?.amount || webhookData.data?.object?.amount_money,
  });

  // TODO: Update database with refund information
  // TODO: Cancel tickets if applicable
  // TODO: Update inventory
  // TODO: Send refund confirmation
}

async function handlePaymentCreated(provider: string, webhookData: any) {
  console.log(`Payment created via ${provider}:`, {
    provider,
    paymentId: webhookData.data?.object?.payment?.id,
    status: webhookData.data?.object?.payment?.status,
  });

  // TODO: Log payment creation for tracking
}

async function handlePaymentUpdated(provider: string, webhookData: any) {
  console.log(`Payment updated via ${provider}:`, {
    provider,
    paymentId: webhookData.data?.object?.payment?.id,
    status: webhookData.data?.object?.payment?.status,
  });

  // Check if payment was completed
  const status = webhookData.data?.object?.payment?.status;
  if (status === 'COMPLETED') {
    await handlePaymentCompleted(provider, webhookData);
  } else if (status === 'FAILED' || status === 'CANCELED') {
    await handlePaymentFailed(provider, webhookData);
  }
}