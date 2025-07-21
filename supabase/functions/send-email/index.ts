// supabase/functions/send-email/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

interface EmailRequest {
  to: string
  subject: string
  html: string
  text?: string
  type: 'ticket_confirmation' | 'order_confirmation' | 'generic'
  data?: any
}

interface TicketEmailData {
  customerName: string
  customerEmail: string
  eventTitle: string
  eventDate: string
  eventTime: string
  eventLocation: string
  tickets: Array<{
    id: string
    ticketType: string
    qrCode: string
    holderName: string
  }>
  orderTotal: number
  orderId: string
}

// Using SendGrid as the email provider
async function sendEmailViaSendGrid(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
  const SENDGRID_FROM_EMAIL = Deno.env.get('SENDGRID_FROM_EMAIL') || 'tickets@stepperslife.com'
  const SENDGRID_FROM_NAME = Deno.env.get('SENDGRID_FROM_NAME') || 'Steppers Life'
  
  if (!SENDGRID_API_KEY) {
    console.error('SENDGRID_API_KEY not configured')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: to }],
          }
        ],
        from: {
          email: SENDGRID_FROM_EMAIL,
          name: SENDGRID_FROM_NAME
        },
        subject: subject,
        content: [
          {
            type: 'text/plain',
            value: text || stripHtml(html)
          },
          {
            type: 'text/html',
            value: html
          }
        ]
      }),
    })

    // SendGrid returns 202 Accepted for successful sends
    if (response.status === 202) {
      // SendGrid returns message ID in headers
      const messageId = response.headers.get('x-message-id') || `sendgrid_${Date.now()}`
      return { success: true, messageId }
    } else {
      const errorData = await response.json()
      console.error('SendGrid API error:', errorData)
      return { 
        success: false, 
        error: errorData.errors?.[0]?.message || 'Failed to send email' 
      }
    }
  } catch (error) {
    console.error('Email sending error:', error)
    return { success: false, error: error.message }
  }
}

// Simple HTML to text converter
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Generate ticket confirmation email template
function generateTicketEmailTemplate(data: TicketEmailData) {
  const subject = `Your tickets for ${data.eventTitle} are ready!`
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Event Tickets</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
        }
        .header { 
            background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
            color: white; 
            padding: 40px 20px; 
            text-align: center; 
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
        }
        .content { 
            padding: 30px 20px;
        }
        .event-details { 
            background: #F9FAFB; 
            padding: 20px; 
            border-radius: 12px; 
            margin: 20px 0;
            border: 1px solid #E5E7EB;
        }
        .event-details h3 {
            margin: 0 0 15px 0;
            color: #1F2937;
            font-size: 20px;
        }
        .event-details p {
            margin: 8px 0;
            color: #4B5563;
        }
        .event-details strong {
            color: #1F2937;
        }
        .ticket { 
            background: white; 
            margin: 20px 0; 
            padding: 20px; 
            border-radius: 12px; 
            border: 1px solid #E5E7EB;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .ticket-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .ticket-type {
            font-size: 18px;
            font-weight: 600;
            color: #1F2937;
        }
        .ticket-id {
            font-size: 12px;
            color: #6B7280;
            font-family: monospace;
        }
        .qr-code { 
            text-align: center; 
            margin: 20px 0;
            padding: 20px;
            background: #F9FAFB;
            border-radius: 8px;
        }
        .qr-code img { 
            max-width: 200px; 
            height: auto;
            border: 2px solid #E5E7EB;
            border-radius: 8px;
            padding: 10px;
            background: white;
        }
        .qr-instruction {
            margin-top: 10px;
            font-size: 14px;
            color: #6B7280;
        }
        .total { 
            text-align: right; 
            font-size: 20px; 
            margin: 30px 0;
            padding-top: 20px;
            border-top: 2px solid #E5E7EB;
        }
        .total-label {
            color: #4B5563;
            font-weight: normal;
        }
        .total-amount {
            color: #1F2937;
            font-weight: 600;
        }
        .footer { 
            background: #F9FAFB;
            padding: 30px 20px;
            text-align: center; 
            color: #6B7280; 
            font-size: 14px;
            border-top: 1px solid #E5E7EB;
        }
        .footer p {
            margin: 5px 0;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background: #4F46E5;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            margin: 20px 0;
            font-weight: 500;
        }
        .important-notice {
            background: #FEF3C7;
            border: 1px solid #F59E0B;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .important-notice p {
            margin: 0;
            color: #92400E;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎫 Your Tickets Are Ready!</h1>
            <p>Thank you for your purchase, ${data.customerName}!</p>
        </div>
        
        <div class="content">
            <div class="event-details">
                <h3>${data.eventTitle}</h3>
                <p><strong>📅 Date:</strong> ${data.eventDate}</p>
                <p><strong>🕐 Time:</strong> ${data.eventTime}</p>
                <p><strong>📍 Location:</strong> ${data.eventLocation}</p>
            </div>
            
            <h2 style="color: #1F2937; margin: 30px 0 20px 0;">Your Tickets</h2>
            
            ${data.tickets.map(ticket => `
                <div class="ticket">
                    <div class="ticket-header">
                        <span class="ticket-type">${ticket.ticketType}</span>
                        <span class="ticket-id">ID: ${ticket.id.substring(0, 8).toUpperCase()}</span>
                    </div>
                    <p style="margin: 10px 0; color: #4B5563;">
                        <strong>Ticket Holder:</strong> ${ticket.holderName}
                    </p>
                    <div class="qr-code">
                        <img src="${ticket.qrCode}" alt="QR Code for ${ticket.id}" />
                        <p class="qr-instruction">Show this QR code at the event entrance</p>
                    </div>
                </div>
            `).join('')}
            
            <div class="important-notice">
                <p>⚠️ <strong>Important:</strong> Please save this email or take screenshots of your QR codes. You'll need to show them at the event entrance.</p>
            </div>
            
            <div class="total">
                <span class="total-label">Order Total: </span>
                <span class="total-amount">$${(data.orderTotal / 100).toFixed(2)}</span>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://www.stepperslife.com/my-tickets" class="button">View My Tickets</a>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Order ID:</strong> ${data.orderId}</strong></p>
            <p>If you have any questions about your tickets, please contact event support.</p>
            <p>© ${new Date().getFullYear()} Steppers Life. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `.trim()
    
  const text = `
Your Event Tickets - ${data.eventTitle}

Hi ${data.customerName},

Thank you for your purchase! Your tickets are ready.

Event Details:
- Event: ${data.eventTitle}
- Date: ${data.eventDate}
- Time: ${data.eventTime}
- Location: ${data.eventLocation}

Your Tickets:
${data.tickets.map(ticket => `
- ${ticket.ticketType}
  Ticket Holder: ${ticket.holderName}
  Ticket ID: ${ticket.id}
`).join('')}

Order Summary:
Total: $${(data.orderTotal / 100).toFixed(2)}
Order ID: ${data.orderId}

IMPORTANT: Please save this email and bring your QR codes to the event.

View your tickets online: https://www.stepperslife.com/my-tickets

If you have any questions, please contact event support.

© ${new Date().getFullYear()} Steppers Life. All rights reserved.
    `.trim()
    
  return { subject, html, text }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    const { to, subject, html, text, type, data } = await req.json() as EmailRequest

    // Validate required fields
    if (!to || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, type' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    let emailSubject = subject
    let emailHtml = html
    let emailText = text

    // Generate template based on type
    if (type === 'ticket_confirmation' && data) {
      const template = generateTicketEmailTemplate(data as TicketEmailData)
      emailSubject = template.subject
      emailHtml = template.html
      emailText = template.text
    }

    // Send email
    const result = await sendEmailViaSendGrid(to, emailSubject, emailHtml, emailText)

    if (result.success) {
      console.log(`Email sent successfully to ${to} (${type})`)
      return new Response(
        JSON.stringify({ 
          success: true, 
          messageId: result.messageId,
          message: 'Email sent successfully'
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else {
      console.error('Failed to send email:', result.error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error || 'Failed to send email'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})