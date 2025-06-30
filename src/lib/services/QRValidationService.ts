import { TicketService } from './TicketService'

export interface QRValidationResult {
  valid: boolean
  ticket?: {
    id: string
    event_id: string
    holder_email: string
    holder_name: string | null
    status: 'active' | 'used' | 'refunded' | 'cancelled'
    checked_in_at: string | null
    checked_in_by: string | null
    created_at: string
    ticket_types?: {
      name: string
      description: string
      price: number
    }
    events?: {
      title: string
      date: string
      time: string
      location: string
      organization_name: string
    }
  }
  error?: string
  message?: string
}

export interface CheckInResult {
  success: boolean
  message: string
  error?: string
  ticket?: QRValidationResult['ticket']
}

export interface ValidationStats {
  totalValidated: number
  totalCheckedIn: number
  invalidCount: number
  duplicateAttempts: number
}

export class QRValidationService {
  /**
   * Validate QR code from scanner input
   */
  static async validateQRCode(qrCodeData: string): Promise<QRValidationResult> {
    try {
      if (!qrCodeData || qrCodeData.trim() === '') {
        return {
          valid: false,
          error: 'Empty QR code data',
          message: 'Please scan a valid ticket QR code'
        }
      }

      const validationResult = await TicketService.validateTicket(qrCodeData)
      
      if (!validationResult.valid) {
        return {
          valid: false,
          error: validationResult.error || 'Invalid ticket',
          message: this.getValidationMessage(validationResult.error)
        }
      }

      const ticket = validationResult.ticket
      if (!ticket) {
        return {
          valid: false,
          error: 'Ticket data not found',
          message: 'Ticket information is not available'
        }
      }

      return {
        valid: true,
        ticket: ticket,
        message: this.getTicketStatusMessage(ticket.status)
      }

    } catch (error) {
      console.error('QRValidationService.validateQRCode failed:', error)
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
        message: 'Unable to validate ticket. Please try again.'
      }
    }
  }

  /**
   * Check in a validated ticket
   */
  static async checkInTicket(
    ticketId: string, 
    checkedInBy?: string
  ): Promise<CheckInResult> {
    try {
      // First validate the ticket is still active
      const ticket = await TicketService.getTicketById(ticketId)
      if (!ticket) {
        return {
          success: false,
          message: 'Ticket not found',
          error: 'Ticket ID does not exist'
        }
      }

      if (ticket.status !== 'active') {
        return {
          success: false,
          message: `Cannot check in: ticket is ${ticket.status}`,
          error: `Ticket status is ${ticket.status}`,
          ticket: ticket
        }
      }

      if (ticket.checked_in_at) {
        return {
          success: false,
          message: 'Ticket already checked in',
          error: `Already checked in at ${new Date(ticket.checked_in_at).toLocaleString()}`,
          ticket: ticket
        }
      }

      const checkInResult = await TicketService.checkInTicket(ticketId, checkedInBy)
      
      if (!checkInResult.success) {
        return {
          success: false,
          message: 'Check-in failed',
          error: checkInResult.error || 'Unknown error during check-in'
        }
      }

      // Get updated ticket data
      const updatedTicket = await TicketService.getTicketById(ticketId)

      return {
        success: true,
        message: 'Successfully checked in',
        ticket: updatedTicket || ticket
      }

    } catch (error) {
      console.error('QRValidationService.checkInTicket failed:', error)
      return {
        success: false,
        message: 'Check-in failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Validate and check in a ticket in one operation
   */
  static async validateAndCheckIn(
    qrCodeData: string, 
    checkedInBy?: string
  ): Promise<CheckInResult> {
    try {
      // First validate the QR code
      const validationResult = await this.validateQRCode(qrCodeData)
      
      if (!validationResult.valid || !validationResult.ticket) {
        return {
          success: false,
          message: validationResult.message || 'Invalid ticket',
          error: validationResult.error
        }
      }

      // Then check in the ticket
      return await this.checkInTicket(validationResult.ticket.id, checkedInBy)

    } catch (error) {
      console.error('QRValidationService.validateAndCheckIn failed:', error)
      return {
        success: false,
        message: 'Validation and check-in failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get tickets for an event (for event organizers)
   */
  static async getEventTickets(eventId: string): Promise<{
    success: boolean
    tickets: any[]
    stats: ValidationStats
    error?: string
  }> {
    try {
      // This would require a new method in TicketService
      // For now, return empty structure
      return {
        success: true,
        tickets: [],
        stats: {
          totalValidated: 0,
          totalCheckedIn: 0,
          invalidCount: 0,
          duplicateAttempts: 0
        }
      }
    } catch (error) {
      console.error('QRValidationService.getEventTickets failed:', error)
      return {
        success: false,
        tickets: [],
        stats: {
          totalValidated: 0,
          totalCheckedIn: 0,
          invalidCount: 0,
          duplicateAttempts: 0
        },
        error: error instanceof Error ? error.message : 'Failed to fetch event tickets'
      }
    }
  }

  /**
   * Bulk validate multiple QR codes
   */
  static async bulkValidate(qrCodes: string[]): Promise<{
    results: QRValidationResult[]
    summary: {
      total: number
      valid: number
      invalid: number
      errors: number
    }
  }> {
    try {
      const results: QRValidationResult[] = []
      
      for (const qrCode of qrCodes) {
        const result = await this.validateQRCode(qrCode)
        results.push(result)
      }

      const summary = {
        total: results.length,
        valid: results.filter(r => r.valid).length,
        invalid: results.filter(r => !r.valid && !r.error).length,
        errors: results.filter(r => r.error).length
      }

      return { results, summary }

    } catch (error) {
      console.error('QRValidationService.bulkValidate failed:', error)
      return {
        results: [],
        summary: { total: 0, valid: 0, invalid: 0, errors: 1 }
      }
    }
  }

  /**
   * Private helper: Get user-friendly validation message
   */
  private static getValidationMessage(error?: string): string {
    if (!error) return 'Invalid ticket'
    
    if (error.includes('not found')) {
      return 'Ticket not found in system'
    }
    if (error.includes('security check failed')) {
      return 'Invalid ticket - security verification failed'
    }
    if (error.includes('cancelled')) {
      return 'This ticket has been cancelled'
    }
    if (error.includes('used')) {
      return 'This ticket has already been used'
    }
    if (error.includes('refunded')) {
      return 'This ticket has been refunded'
    }
    
    return 'Unable to validate ticket'
  }

  /**
   * Private helper: Get ticket status message
   */
  private static getTicketStatusMessage(status: string): string {
    switch (status) {
      case 'active':
        return 'Valid ticket - ready for check-in'
      case 'used':
        return 'Ticket has been used'
      case 'cancelled':
        return 'Ticket has been cancelled'
      case 'refunded':
        return 'Ticket has been refunded'
      default:
        return `Ticket status: ${status}`
    }
  }

  /**
   * Format ticket display data for UI components
   */
  static formatTicketForDisplay(ticket: QRValidationResult['ticket']) {
    if (!ticket) return null

    return {
      id: ticket.id,
      holderName: ticket.holder_name || 'Guest',
      holderEmail: ticket.holder_email,
      ticketType: ticket.ticket_types?.name || 'General Admission',
      eventTitle: ticket.events?.title || 'Unknown Event',
      eventDate: ticket.events?.date ? new Date(ticket.events.date).toLocaleDateString() : 'TBD',
      eventTime: ticket.events?.time || 'TBD',
      venue: ticket.events?.location || 'TBD',
      organization: ticket.events?.organization_name || 'Event Organizer',
      status: ticket.status,
      checkedInAt: ticket.checked_in_at ? new Date(ticket.checked_in_at).toLocaleString() : null,
      checkedInBy: ticket.checked_in_by,
      price: ticket.ticket_types?.price || 0
    }
  }
}