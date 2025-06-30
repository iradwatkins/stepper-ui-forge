/**
 * Email Service for sending ticket confirmations and notifications
 * 
 * This service provides email functionality for the ticket generation system.
 * Currently implements a mock service for development, but can be extended
 * to work with actual email providers like SendGrid, Mailgun, or Supabase Edge Functions.
 */

export interface EmailTemplate {
  subject: string
  htmlContent: string
  textContent: string
}

export interface TicketEmailData {
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

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export class EmailService {
  /**
   * Send ticket confirmation email to customer
   */
  static async sendTicketConfirmation(data: TicketEmailData): Promise<EmailResult> {
    try {
      // Generate email template
      const template = this.generateTicketEmailTemplate(data)
      
      // For now, this is a mock implementation
      // In production, this would integrate with an actual email service
      console.log('📧 Email Service - Sending ticket confirmation:')
      console.log(`To: ${data.customerEmail}`)
      console.log(`Subject: ${template.subject}`)
      console.log(`Tickets: ${data.tickets.length}`)
      console.log('Template generated successfully')
      
      // Simulate email sending with a small delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Mock success response
      return {
        success: true,
        messageId: `mock_email_${Date.now()}`,
      }
      
    } catch (error) {
      console.error('EmailService.sendTicketConfirmation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown email error',
      }
    }
  }

  /**
   * Generate ticket confirmation email template
   */
  private static generateTicketEmailTemplate(data: TicketEmailData): EmailTemplate {
    const { customerName, eventTitle, eventDate, eventTime, eventLocation, tickets, orderTotal, orderId } = data
    
    const subject = `Your tickets for ${eventTitle} are ready!`
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Event Tickets</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .ticket { background: white; margin: 15px 0; padding: 15px; border-radius: 8px; border-left: 4px solid #4F46E5; }
        .qr-code { text-align: center; margin: 15px 0; }
        .qr-code img { max-width: 200px; height: auto; }
        .event-details { background: #E5E7EB; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .total { text-align: right; font-weight: bold; font-size: 18px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎫 Your Event Tickets</h1>
            <p>Thanks for your purchase, ${customerName}!</p>
        </div>
        
        <div class="content">
            <h2>Event Details</h2>
            <div class="event-details">
                <h3>${eventTitle}</h3>
                <p><strong>📅 Date:</strong> ${eventDate}</p>
                <p><strong>🕐 Time:</strong> ${eventTime}</p>
                <p><strong>📍 Location:</strong> ${eventLocation}</p>
            </div>
            
            <h2>Your Tickets</h2>
            ${tickets.map(ticket => `
                <div class="ticket">
                    <h4>${ticket.ticketType}</h4>
                    <p><strong>Ticket Holder:</strong> ${ticket.holderName}</p>
                    <p><strong>Ticket ID:</strong> ${ticket.id}</p>
                    <div class="qr-code">
                        <p><strong>QR Code for Entry:</strong></p>
                        ${ticket.qrCode.startsWith('data:') 
                          ? `<img src="${ticket.qrCode}" alt="QR Code for ${ticket.id}" />`
                          : `<p>QR Code: ${ticket.qrCode}</p>`
                        }
                        <p><em>Show this QR code at the event entrance</em></p>
                    </div>
                </div>
            `).join('')}
            
            <div class="total">
                <p>Order Total: $${orderTotal.toFixed(2)}</p>
                <p>Order ID: ${orderId}</p>
            </div>
        </div>
        
        <div class="footer">
            <p>Important: Please save this email and bring your QR codes to the event.</p>
            <p>If you have any questions, please contact event support.</p>
            <p>Thank you for your purchase!</p>
        </div>
    </div>
</body>
</html>
    `.trim()
    
    const textContent = `
Your Event Tickets - ${eventTitle}

Hi ${customerName},

Thank you for your purchase! Your tickets for ${eventTitle} are ready.

Event Details:
- Event: ${eventTitle}
- Date: ${eventDate}
- Time: ${eventTime}
- Location: ${eventLocation}

Your Tickets:
${tickets.map(ticket => `
- ${ticket.ticketType}
  Ticket Holder: ${ticket.holderName}
  Ticket ID: ${ticket.id}
  QR Code: ${ticket.qrCode}
`).join('')}

Order Summary:
Total: $${orderTotal.toFixed(2)}
Order ID: ${orderId}

Important: Please save this email and bring your QR codes to the event.

If you have any questions, please contact event support.

Thank you for your purchase!
    `.trim()
    
    return {
      subject,
      htmlContent,
      textContent,
    }
  }

  /**
   * Send order confirmation email (simpler version without QR codes)
   */
  static async sendOrderConfirmation(
    customerEmail: string, 
    customerName: string, 
    orderId: string, 
    orderTotal: number
  ): Promise<EmailResult> {
    try {
      const subject = `Order Confirmation - Order #${orderId}`
      
      console.log('📧 Email Service - Sending order confirmation:')
      console.log(`To: ${customerEmail}`)
      console.log(`Subject: ${subject}`)
      console.log(`Order ID: ${orderId}`)
      console.log(`Total: $${orderTotal.toFixed(2)}`)
      
      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 300))
      
      return {
        success: true,
        messageId: `mock_order_email_${Date.now()}`,
      }
      
    } catch (error) {
      console.error('EmailService.sendOrderConfirmation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown email error',
      }
    }
  }

  /**
   * Send ticket transfer email (for future feature)
   */
  static async sendTicketTransfer(
    fromEmail: string,
    toEmail: string,
    toName: string,
    ticketDetails: any
  ): Promise<EmailResult> {
    try {
      console.log('📧 Email Service - Sending ticket transfer:')
      console.log(`From: ${fromEmail} To: ${toEmail}`)
      
      // Mock implementation for future feature
      await new Promise(resolve => setTimeout(resolve, 400))
      
      return {
        success: true,
        messageId: `mock_transfer_email_${Date.now()}`,
      }
      
    } catch (error) {
      console.error('EmailService.sendTicketTransfer failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown email error',
      }
    }
  }

  /**
   * Test email service connectivity
   */
  static async testConnection(): Promise<EmailResult> {
    try {
      console.log('📧 Email Service - Testing connection...')
      
      // Mock test
      await new Promise(resolve => setTimeout(resolve, 200))
      
      return {
        success: true,
        messageId: 'test_connection_ok',
      }
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      }
    }
  }
}

/**
 * Email Provider Configuration
 * 
 * This object defines the configuration for different email providers.
 * Uncomment and configure the provider you want to use in production.
 */
export const EmailProviderConfig = {
  // Development/Mock provider (current)
  provider: 'mock',
  
  // SendGrid configuration (example)
  // provider: 'sendgrid',
  // sendgrid: {
  //   apiKey: process.env.SENDGRID_API_KEY,
  //   fromEmail: 'tickets@yourdomain.com',
  //   fromName: 'Your Event Platform',
  // },
  
  // Supabase Edge Functions (example)
  // provider: 'supabase',
  // supabase: {
  //   functionUrl: 'https://your-project.supabase.co/functions/v1/send-email',
  //   apiKey: process.env.SUPABASE_ANON_KEY,
  // },
  
  // Mailgun configuration (example)
  // provider: 'mailgun',
  // mailgun: {
  //   apiKey: process.env.MAILGUN_API_KEY,
  //   domain: process.env.MAILGUN_DOMAIN,
  //   fromEmail: 'tickets@yourdomain.com',
  // },
}