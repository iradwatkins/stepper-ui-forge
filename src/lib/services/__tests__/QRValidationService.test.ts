import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { QRValidationService } from '../QRValidationService'
import { TicketService } from '../TicketService'

// Mock TicketService
jest.mock('../TicketService', () => ({
  TicketService: {
    validateTicket: jest.fn(),
    getTicketById: jest.fn(),
    checkInTicket: jest.fn(),
  }
}))

const mockTicketService = TicketService as jest.Mocked<typeof TicketService>

describe('QRValidationService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('validateQRCode', () => {
    it('should handle empty QR code data', async () => {
      const result = await QRValidationService.validateQRCode('')
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Empty QR code data')
      expect(result.message).toBe('Please scan a valid ticket QR code')
    })

    it('should handle valid QR code', async () => {
      const mockTicket = {
        id: 'ticket-123',
        ticket_type_id: 'type-123',
        event_id: 'event-456',
        holder_email: 'test@example.com',
        holder_name: 'John Doe',
        holder_phone: null,
        status: 'active' as const,
        qr_code: 'qr-data-url',
        checked_in_at: null,
        checked_in_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ticket_types: {
          name: 'General Admission',
          description: 'General admission ticket',
          price: 50
        },
        events: {
          title: 'Test Event',
          date: '2024-12-31',
          time: '19:00',
          location: 'Test Venue',
          organization_name: 'Test Org'
        }
      }

      mockTicketService.validateTicket.mockResolvedValue({
        valid: true,
        ticket: mockTicket
      })

      const result = await QRValidationService.validateQRCode('valid-qr-data')
      
      expect(result.valid).toBe(true)
      expect(result.ticket).toEqual(mockTicket)
      expect(result.message).toBe('Valid ticket - ready for check-in')
    })

    it('should handle invalid QR code', async () => {
      mockTicketService.validateTicket.mockResolvedValue({
        valid: false,
        error: 'Ticket not found'
      })

      const result = await QRValidationService.validateQRCode('invalid-qr-data')
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Ticket not found')
      expect(result.message).toBe('Ticket not found in system')
    })

    it('should handle validation errors', async () => {
      mockTicketService.validateTicket.mockRejectedValue(new Error('Network error'))

      const result = await QRValidationService.validateQRCode('qr-data')
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Network error')
      expect(result.message).toBe('Unable to validate ticket. Please try again.')
    })
  })

  describe('checkInTicket', () => {
    const mockTicket = {
      id: 'ticket-123',
      ticket_type_id: 'type-123',
      event_id: 'event-456',
      holder_email: 'test@example.com',
      holder_name: 'John Doe',
      holder_phone: null,
      status: 'active' as const,
      qr_code: 'qr-data-url',
      checked_in_at: null,
      checked_in_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    it('should successfully check in an active ticket', async () => {
      mockTicketService.getTicketById.mockResolvedValue(mockTicket)
      mockTicketService.checkInTicket.mockResolvedValue({ success: true })
      
      const updatedTicket = {
        ...mockTicket,
        status: 'used' as const,
        checked_in_at: new Date().toISOString(),
        checked_in_by: 'admin@example.com'
      }
      mockTicketService.getTicketById.mockResolvedValueOnce(mockTicket)
        .mockResolvedValueOnce(updatedTicket)

      const result = await QRValidationService.checkInTicket('ticket-123', 'admin@example.com')
      
      expect(result.success).toBe(true)
      expect(result.message).toBe('Successfully checked in')
      expect(result.ticket?.status).toBe('used')
    })

    it('should reject check-in for non-existent ticket', async () => {
      mockTicketService.getTicketById.mockResolvedValue(null)

      const result = await QRValidationService.checkInTicket('nonexistent-ticket')
      
      expect(result.success).toBe(false)
      expect(result.message).toBe('Ticket not found')
      expect(result.error).toBe('Ticket ID does not exist')
    })

    it('should reject check-in for already used ticket', async () => {
      const usedTicket = {
        ...mockTicket,
        status: 'used' as const,
        checked_in_at: '2024-01-01T10:00:00Z'
      }
      mockTicketService.getTicketById.mockResolvedValue(usedTicket)

      const result = await QRValidationService.checkInTicket('ticket-123')
      
      expect(result.success).toBe(false)
      expect(result.message).toBe('Cannot check in: ticket is used')
    })

    it('should reject check-in for cancelled ticket', async () => {
      const cancelledTicket = {
        ...mockTicket,
        status: 'cancelled' as const
      }
      mockTicketService.getTicketById.mockResolvedValue(cancelledTicket)

      const result = await QRValidationService.checkInTicket('ticket-123')
      
      expect(result.success).toBe(false)
      expect(result.message).toBe('Cannot check in: ticket is cancelled')
    })
  })

  describe('validateAndCheckIn', () => {
    it('should validate and check in a valid ticket', async () => {
      const mockTicket = {
        id: 'ticket-123',
        ticket_type_id: 'type-123',
        event_id: 'event-456',
        holder_email: 'test@example.com',
        holder_name: 'John Doe',
        holder_phone: null,
        status: 'active' as const,
        qr_code: 'qr-data-url',
        checked_in_at: null,
        checked_in_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Mock validation
      mockTicketService.validateTicket.mockResolvedValue({
        valid: true,
        ticket: mockTicket
      })

      // Mock check-in
      mockTicketService.getTicketById.mockResolvedValue(mockTicket)
      mockTicketService.checkInTicket.mockResolvedValue({ success: true })
      
      const updatedTicket = {
        ...mockTicket,
        status: 'used' as const,
        checked_in_at: new Date().toISOString()
      }
      mockTicketService.getTicketById.mockResolvedValueOnce(mockTicket)
        .mockResolvedValueOnce(updatedTicket)

      const result = await QRValidationService.validateAndCheckIn('valid-qr-data', 'admin@example.com')
      
      expect(result.success).toBe(true)
      expect(result.message).toBe('Successfully checked in')
    })

    it('should fail if validation fails', async () => {
      mockTicketService.validateTicket.mockResolvedValue({
        valid: false,
        error: 'Invalid ticket'
      })

      const result = await QRValidationService.validateAndCheckIn('invalid-qr-data')
      
      expect(result.success).toBe(false)
      expect(result.message).toBe('Unable to validate ticket')
      expect(result.error).toBe('Invalid ticket')
    })
  })

  describe('bulkValidate', () => {
    it('should validate multiple QR codes', async () => {
      const qrCodes = ['qr1', 'qr2', 'qr3']
      
      mockTicketService.validateTicket
        .mockResolvedValueOnce({ valid: true, ticket: { id: 'ticket-1' } as any })
        .mockResolvedValueOnce({ valid: false, error: 'Invalid' })
        .mockResolvedValueOnce({ valid: true, ticket: { id: 'ticket-3' } as any })

      const result = await QRValidationService.bulkValidate(qrCodes)
      
      expect(result.results).toHaveLength(3)
      expect(result.summary.total).toBe(3)
      expect(result.summary.valid).toBe(2)
      expect(result.summary.invalid).toBe(0)
      expect(result.summary.errors).toBe(1)
    })

    it('should handle errors in bulk validation', async () => {
      const qrCodes = ['qr1']
      
      mockTicketService.validateTicket.mockRejectedValue(new Error('Network error'))

      const result = await QRValidationService.bulkValidate(qrCodes)
      
      expect(result.results).toHaveLength(1)
      expect(result.summary.errors).toBe(1)
    })
  })

  describe('formatTicketForDisplay', () => {
    it('should format ticket data for UI display', () => {
      const ticket = {
        id: 'ticket-123',
        ticket_type_id: 'type-123',
        event_id: 'event-456',
        holder_email: 'test@example.com',
        holder_name: 'John Doe',
        holder_phone: null,
        status: 'active' as const,
        qr_code: 'qr-data-url',
        checked_in_at: null,
        checked_in_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ticket_types: {
          name: 'VIP',
          description: 'VIP ticket',
          price: 100
        },
        events: {
          title: 'Concert Night',
          date: '2024-12-31',
          time: '20:00',
          location: 'Music Hall',
          organization_name: 'Event Co'
        }
      }

      const formatted = QRValidationService.formatTicketForDisplay(ticket)
      
      expect(formatted).toEqual({
        id: 'ticket-123',
        holderName: 'John Doe',
        holderEmail: 'test@example.com',
        ticketType: 'VIP',
        eventTitle: 'Concert Night',
        eventDate: '12/30/2024',
        eventTime: '20:00',
        venue: 'Music Hall',
        organization: 'Event Co',
        status: 'active',
        checkedInAt: null,
        checkedInBy: null,
        price: 100
      })
    })

    it('should handle null ticket', () => {
      const formatted = QRValidationService.formatTicketForDisplay(null)
      expect(formatted).toBeNull()
    })

    it('should provide defaults for missing data', () => {
      const ticket = {
        id: 'ticket-123',
        ticket_type_id: 'type-123',
        event_id: 'event-456',
        holder_email: 'test@example.com',
        holder_name: null,
        holder_phone: null,
        status: 'active' as const,
        qr_code: 'qr-data-url',
        checked_in_at: null,
        checked_in_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const formatted = QRValidationService.formatTicketForDisplay(ticket)
      
      expect(formatted?.holderName).toBe('Guest')
      expect(formatted?.ticketType).toBe('General Admission')
      expect(formatted?.eventTitle).toBe('Unknown Event')
      expect(formatted?.price).toBe(0)
    })
  })
})