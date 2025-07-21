// supabase/functions/payments-square/index.ts
// FIXED VERSION - Handles GET health checks and POST payments

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Handle GET requests (health checks)
  if (req.method === 'GET') {
    const url = new URL(req.url)
    
    // Health check endpoint
    if (url.pathname.includes('health') || url.searchParams.has('health')) {
      const hasToken = !!Deno.env.get('SQUARE_ACCESS_TOKEN')
      const hasLocation = !!Deno.env.get('SQUARE_LOCATION_ID')
      
      return new Response(
        JSON.stringify({
          status: 'healthy',
          gateway: 'square',
          timestamp: new Date().toISOString(),
          environment: Deno.env.get('SQUARE_ENVIRONMENT') || 'production',
          configured: hasToken && hasLocation,
          details: {
            hasAccessToken: hasToken,
            hasLocationId: hasLocation
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }
    
    // Default GET response for health check
    return new Response(
      JSON.stringify({
        status: 'healthy',
        gateway: 'square',
        message: 'Square payment gateway is operational'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  }

  // Handle POST requests (payments)
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST for payments or GET for health check.' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405
      }
    )
  }

  console.log('Payment request received')

  try {
    // Parse request body
    const body = await req.json()
    console.log('Request body:', { ...body, sourceId: body.sourceId?.substring(0, 10) + '...' })

    // Handle the action-based request format from frontend
    let sourceId, amount, currency = 'USD'
    
    if (body.action === 'create_payment') {
      sourceId = body.sourceId
      amount = body.amount
      currency = body.currency || 'USD'
    } else {
      // Direct format
      sourceId = body.sourceId
      amount = body.amount
      currency = body.currency || 'USD'
    }

    // Validate required fields
    if (!sourceId) {
      throw new Error('Missing required field: sourceId')
    }
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount')
    }

    // Ensure amount is an integer (Square requires cents as integer)
    const amountInCents = Math.round(amount)
    console.log('Amount processing:', { original: amount, rounded: amountInCents })

    // Get environment variables
    const SQUARE_ACCESS_TOKEN = Deno.env.get('SQUARE_ACCESS_TOKEN')
    const SQUARE_LOCATION_ID = Deno.env.get('SQUARE_LOCATION_ID')
    const SQUARE_ENVIRONMENT = Deno.env.get('SQUARE_ENVIRONMENT') || 'production'

    console.log('Environment check:', {
      hasToken: !!SQUARE_ACCESS_TOKEN,
      tokenLength: SQUARE_ACCESS_TOKEN?.length,
      locationId: SQUARE_LOCATION_ID,
      environment: SQUARE_ENVIRONMENT
    })

    if (!SQUARE_ACCESS_TOKEN) {
      console.error('Missing SQUARE_ACCESS_TOKEN')
      throw new Error('Payment service not configured properly (missing token)')
    }

    if (!SQUARE_LOCATION_ID) {
      console.error('Missing SQUARE_LOCATION_ID')
      throw new Error('Payment service not configured properly (missing location)')
    }

    // Make the Square API request directly (no SDK needed in edge functions)
    const squareResponse = await fetch('https://connect.squareup.com/v2/payments', {
      method: 'POST',
      headers: {
        'Square-Version': '2023-12-13',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_id: sourceId,
        idempotency_key: crypto.randomUUID(),
        amount_money: {
          amount: amountInCents,
          currency: currency
        },
        location_id: SQUARE_LOCATION_ID,
        autocomplete: true
      })
    })

    const squareData = await squareResponse.json()
    console.log('Square API response status:', squareResponse.status)

    if (!squareResponse.ok) {
      console.error('Square API error:', squareData)
      throw new Error(squareData.errors?.[0]?.detail || 'Payment failed')
    }

    console.log('Payment successful:', squareData.payment?.id)

    // Return success response (compatible with frontend expectations)
    return new Response(
      JSON.stringify({
        success: true,
        payment: squareData.payment,
        paymentId: squareData.payment.id,
        status: squareData.payment.status,
        amount: squareData.payment.amount_money,
        receiptUrl: squareData.payment.receipt_url,
        createdAt: squareData.payment.created_at
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Function error:', error.message)
    console.error('Full error:', error)

    // Return user-friendly error
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Payment processing failed',
        code: 'PAYMENT_FAILED',
        retryable: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})