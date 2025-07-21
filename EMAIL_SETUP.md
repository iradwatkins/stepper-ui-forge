# Email Service Setup Guide

## Overview

The ticketing system now includes a full email service that sends ticket receipts with QR codes to customers after purchase. The implementation uses a Supabase Edge Function with SendGrid as the email provider.

## Current Implementation

### 1. **Edge Function** (`supabase/functions/send-email/index.ts`)
- Handles email sending via SendGrid API
- Supports ticket confirmation emails with embedded QR codes
- Professional HTML email templates
- Fallback text version for all emails

### 2. **EmailService** (`src/lib/services/EmailService.ts`)
- Updated to call the edge function
- Falls back to console logging in development
- Maintains backward compatibility

### 3. **Email Features**
- ✅ Professional HTML email design
- ✅ Embedded QR codes for each ticket
- ✅ Event details (date, time, location)
- ✅ Order summary with total amount
- ✅ Direct link to My Tickets page
- ✅ Mobile-responsive design

## Setup Instructions

### 1. Deploy the Edge Function

```bash
# Deploy the send-email function
npx supabase functions deploy send-email
```

### 2. Configure SendGrid

1. Log in to your SendGrid account
2. Get your API key from Settings → API Keys
3. Add the API key and sender details to Supabase:

```bash
# Set the SendGrid API key in Supabase
npx supabase secrets set SENDGRID_API_KEY=SG.xxxxxxxxxxxx

# Optional: Set custom from email and name
npx supabase secrets set SENDGRID_FROM_EMAIL=tickets@stepperslife.com
npx supabase secrets set SENDGRID_FROM_NAME="Steppers Life"
```

### 3. Configure Sender Authentication

In SendGrid:
1. Go to Settings → Sender Authentication
2. Verify a single sender or authenticate your domain
3. For domain authentication:
   - Add the required DNS records
   - Wait for verification (usually within minutes)
4. This improves deliverability and allows custom from addresses

### 4. Alternative Email Providers

The edge function is currently configured for SendGrid. If you need to use a different provider:

**Resend:**
```typescript
async function sendEmailViaResend(to: string, subject: string, html: string, text?: string) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Steppers Life <tickets@stepperslife.com>',
      to: [to],
      subject,
      html,
      text: text || stripHtml(html),
    }),
  })
  
  return response.ok
}
```

**Mailgun:**
```typescript
async function sendEmailViaMailgun(to: string, subject: string, html: string, text?: string) {
  const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY')
  const MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN')
  
  const form = new FormData()
  form.append('from', 'Steppers Life <tickets@stepperslife.com>')
  form.append('to', to)
  form.append('subject', subject)
  form.append('html', html)
  form.append('text', text || '')
  
  const response = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`,
    },
    body: form,
  })
  
  return response.ok
}
```

## Testing

### 1. Test in Development

The system will fall back to console logging if the edge function isn't available:

1. Make a test purchase
2. Check browser console for email preview
3. Verify QR codes and content are correct

### 2. Test with Real Emails

After deploying the edge function:

1. Set up Resend API key
2. Make a test purchase
3. Check your email inbox
4. Verify:
   - Email arrives within seconds
   - QR codes display properly
   - All ticket information is correct
   - Links work properly

### 3. Test Email Deliverability

Use [mail-tester.com](https://www.mail-tester.com) to check:
- SPF/DKIM/DMARC configuration
- Spam score
- Content analysis

## Email Template

The email includes:

```
Subject: Your tickets for [Event Name] are ready!

Content:
- Professional header with gradient
- Event details box
- Individual ticket cards with:
  - Ticket type and ID
  - Holder name
  - QR code for entry
- Order total
- Link to My Tickets page
- Footer with support info
```

## Troubleshooting

### Emails Not Sending

1. **Check Edge Function Logs:**
   ```bash
   npx supabase functions logs send-email
   ```

2. **Verify API Key:**
   ```bash
   npx supabase secrets list
   ```

3. **Check CORS:**
   Ensure your domain is allowed in the edge function

### QR Codes Not Displaying

1. QR codes are embedded as base64 images
2. Some email clients may block images by default
3. Include instructions for users to "Show Images"

### Email Going to Spam

1. Verify domain DNS records
2. Use a reputable "from" address
3. Avoid spam trigger words
4. Include unsubscribe link (for marketing emails)

## Production Checklist

- [ ] Deploy edge function to production
- [ ] Set production API keys
- [ ] Verify domain in email provider
- [ ] Test with real purchases
- [ ] Monitor email delivery rates
- [ ] Set up email bounce handling
- [ ] Configure rate limiting if needed

## Cost Considerations

- **SendGrid**: 100 emails/day free forever (3,000/month), paid plans start at $19.95/month
- **Resend**: 3,000 emails/month free, then $20/month for 50,000
- **Mailgun**: 5,000 emails/month free for 3 months
- **Supabase Edge Functions**: Free tier includes 500,000 invocations/month

SendGrid is ideal for this use case as it provides reliable delivery with good free tier limits.