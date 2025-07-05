// QR Validation Service for Production
// Simplified version for production deployment

import { supabase } from '@/integrations/supabase/client'

export interface QRValidationResult {
  valid: boolean
  message: string
  ticket?: any
  error?: string
}

export interface CheckInResult {
  success: boolean
  message: string
  ticketId?: string
  error?: string
}

export interface BulkValidationSummary {
  total: number
  valid: number
  invalid: number
  already_checked_in: number
}

export class QRValidationService {
  static async validateQRCode(qrCodeData: string): Promise<QRValidationResult> {
    try {
      let ticketId: string;
      let validationHash: string | null = null;
      
      // Handle both legacy format (QR_<ticketId>) and new JSON format
      if (qrCodeData.startsWith('QR_')) {
        // Legacy format
        ticketId = qrCodeData.replace('QR_', '');
      } else {
        try {
          // New JSON format from TicketService
          const qrData = JSON.parse(qrCodeData);
          ticketId = qrData.ticketId;
          validationHash = qrData.validationHash;
          
          // Verify validation hash if present
          if (validationHash) {
            const expectedHash = this.generateValidationHash(ticketId, qrData.eventId, qrData.orderId);
            if (validationHash !== expectedHash) {
              return {
                valid: false,
                message: 'Invalid QR code - tampered data detected',
                error: 'Validation hash mismatch'
              };
            }
          }
        } catch (parseError) {
          // If JSON parsing fails, treat as raw ticket ID
          ticketId = qrCodeData;
        }
      }
      
      const { data: ticket, error } = await supabase
        .from('tickets')
        .select(`
          *,
          ticket_types (name, event_id),
          events (title, date, time, location)
        `)
        .eq('id', ticketId)
        .single()

      if (error || !ticket) {
        return {
          valid: false,
          message: 'Invalid ticket code',
          error: 'Ticket not found'
        }
      }

      if (ticket.status === 'used') {
        return {
          valid: false,
          message: 'Ticket already used',
          ticket,
          error: 'Ticket has already been checked in'
        }
      }

      if (ticket.status !== 'active') {
        return {
          valid: false,
          message: 'Ticket is not active',
          ticket,
          error: 'Ticket status is not active'
        }
      }

      return {
        valid: true,
        message: 'Valid ticket',
        ticket
      }
    } catch (error) {
      return {
        valid: false,
        message: 'Validation failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  static async checkInTicket(ticketId: string, checkedInBy?: string): Promise<CheckInResult> {
    try {
      const { data: ticket, error } = await supabase
        .from('tickets')
        .update({
          status: 'used',
          checked_in_at: new Date().toISOString(),
          checked_in_by: checkedInBy || null
        })
        .eq('id', ticketId)
        .eq('status', 'active') // Only check in active tickets
        .select()
        .single()

      if (error || !ticket) {
        return {
          success: false,
          message: 'Check-in failed',
          error: 'Could not update ticket status'
        }
      }

      return {
        success: true,
        message: 'Ticket checked in successfully',
        ticketId
      }
    } catch (error) {
      return {
        success: false,
        message: 'Check-in failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  static async validateAndCheckIn(qrCodeData: string, checkedInBy?: string): Promise<CheckInResult> {
    try {
      const validation = await this.validateQRCode(qrCodeData)
      
      if (!validation.valid || !validation.ticket) {
        return {
          success: false,
          message: validation.message,
          error: validation.error
        }
      }

      return await this.checkInTicket(validation.ticket.id, checkedInBy)
    } catch (error) {
      return {
        success: false,
        message: 'Operation failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  static async bulkValidate(qrCodes: string[]): Promise<{ results: QRValidationResult[], summary: BulkValidationSummary }> {
    const results: QRValidationResult[] = []
    const summary: BulkValidationSummary = {
      total: qrCodes.length,
      valid: 0,
      invalid: 0,
      already_checked_in: 0
    }

    for (const qrCode of qrCodes) {
      const result = await this.validateQRCode(qrCode)
      results.push(result)
      
      if (result.valid) {
        summary.valid++
      } else if (result.ticket?.status === 'used') {
        summary.already_checked_in++
      } else {
        summary.invalid++
      }
    }

    return { results, summary }
  }

  static formatTicketForDisplay(ticket: any) {
    if (!ticket) return null

    return {
      id: ticket.id,
      holderName: ticket.holder_name || 'Guest',
      holderEmail: ticket.holder_email,
      eventTitle: ticket.events?.title || 'Unknown Event',
      eventDate: ticket.events?.date || 'Unknown Date',
      eventTime: ticket.events?.time || 'Unknown Time',
      venue: ticket.events?.location || 'Unknown Venue',
      ticketType: ticket.ticket_types?.name || 'General',
      status: ticket.status,
      checkedInAt: ticket.checked_in_at ? new Date(ticket.checked_in_at).toLocaleString() : null
    }
  }

  private static generateValidationHash(ticketId: string, eventId: string, orderId: string): string {
    // Generate deterministic hash for validation
    // Note: This should match the TicketService implementation but be deterministic
    const data = `${ticketId}:${eventId}:${orderId}:validation`
    return btoa(data).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)
  }
}