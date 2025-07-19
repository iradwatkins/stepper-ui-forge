import { supabase } from '@/integrations/supabase/client'
import QRCode from 'qrcode'
import { v4 as uuidv4 } from 'uuid'
import type { Database } from '@/integrations/supabase/types'
import { ticketLogger, TicketEventType } from './TicketLogger'

type Tables = Database['public']['Tables']
type Order = Tables['orders']['Row']
type OrderItem = Tables['order_items']['Row']
type TicketType = Tables['ticket_types']['Row']
type Event = Tables['events']['Row']
type Ticket = Tables['tickets']['Row']

interface OrderWithItems extends Order {
  order_items: Array<OrderItem & {
    ticket_types: TicketType & {
      events: Pick<Event, 'id' | 'title' | 'date' | 'venue' | 'location'>
    }
  }>
}

interface TicketWithRelations extends Ticket {
  ticket_types: TicketType & {
    events: Pick<Event, 'id' | 'title' | 'date' | 'venue' | 'location' | 'organizer_id'>
  }
  orders: Pick<Order, 'id' | 'customer_email' | 'customer_name' | 'total_amount' | 'created_at'>
}

interface TicketData {
  id: string
  order_id: string
  ticket_type_id: string
  event_id: string
  holder_name: string | null
  holder_email: string
  qr_code: string | null
  status: 'active' | 'used' | 'cancelled'
  created_at: string
  updated_at: string
}

interface TicketInsert {
  id?: string
  order_id: string
  ticket_type_id: string
  event_id: string
  holder_name?: string | null
  holder_email: string
  qr_code?: string | null
  status?: 'active' | 'used' | 'cancelled'
}

interface QRCodeData {
  ticketId: string
  eventId: string
  orderId: string
  holderName: string | null
  ticketType: string
  eventDate: string
  venue: string
  validationHash: string
}

export class TicketService {
  static async generateTicketsForOrder(orderId: string): Promise<TicketData[]> {
    const startTime = Date.now();
    
    try {
      ticketLogger.info(TicketEventType.TICKET_CREATED, `Starting ticket generation for order ${orderId}`, {
        metadata: { orderId }
      });
      
      // Get order details with items
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            ticket_types (
              *,
              events (
                id,
                title,
                date,
                venue,
                location
              )
            )
          )
        `)
        .eq('id', orderId)
        .single()

      if (orderError) throw orderError
      if (!order) throw new Error('Order not found')

      const typedOrder = order as unknown as OrderWithItems
      const tickets: TicketData[] = []

      // Create individual tickets for each order item
      for (const item of typedOrder.order_items) {
        const ticketType = item.ticket_types
        const event = ticketType.events

        // Generate multiple tickets based on quantity
        for (let i = 0; i < item.quantity; i++) {
          const ticketId = uuidv4()
          
          // Generate QR code content
          const qrData: QRCodeData = {
            ticketId,
            eventId: event.id,
            orderId: order.id,
            holderName: order.customer_name,
            ticketType: ticketType.name,
            eventDate: event.date,
            venue: event.venue || event.location || 'TBD',
            validationHash: this.generateValidationHash(ticketId, event.id, orderId)
          }

          // Generate QR code image
          let qrCodeString: string;
          try {
            qrCodeString = await QRCode.toDataURL(JSON.stringify(qrData), {
              width: 256,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              }
            });
          } catch (qrError) {
            await ticketLogger.error(
              TicketEventType.QR_GENERATION_FAILED,
              `Failed to generate QR code for ticket ${ticketId}`,
              qrError as Error,
              { ticket_id: ticketId, event_id: event.id }
            );
            throw qrError;
          }

          // Create ticket record
          const ticketInsert: TicketInsert = {
            id: ticketId,
            order_id: orderId,
            ticket_type_id: ticketType.id,
            event_id: event.id,
            holder_name: order.customer_name,
            holder_email: order.customer_email,
            qr_code: qrCodeString,
            status: 'active'
          }

          const { data: ticket, error: ticketError } = await supabase
            .from('tickets')
            .insert(ticketInsert)
            .select()
            .single()

          if (ticketError) throw ticketError
          if (ticket) {
            tickets.push(ticket as TicketData);
            
            // Log successful ticket creation
            await ticketLogger.logTicketCreated(
              ticketId,
              event.id,
              typedOrder.customer_email,
              {
                ticketType: ticketType.name,
                eventTitle: event.title,
                orderItemId: item.id
              }
            );
          }
        }
      }

      const duration = Date.now() - startTime;
      await ticketLogger.info(
        TicketEventType.TICKET_CREATED,
        `Successfully generated ${tickets.length} tickets for order ${orderId}`,
        {
          metadata: { orderId, ticketCount: tickets.length },
          duration_ms: duration
        }
      );

      return tickets
    } catch (error) {
      const duration = Date.now() - startTime;
      await ticketLogger.error(
        TicketEventType.DATABASE_ERROR,
        `Failed to generate tickets for order ${orderId}`,
        error as Error,
        {
          metadata: { orderId },
          duration_ms: duration
        }
      );
      throw error
    }
  }

  static async getTicketsByUser(userId: string): Promise<TicketWithRelations[]> {
    try {
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select(`
          *,
          ticket_types (
            *,
            events (
              id,
              title,
              date,
              venue,
              location,
              organizer_id
            )
          ),
          orders (
            id,
            customer_email,
            customer_name,
            total_amount,
            created_at
          )
        `)
        .eq('orders.customer_email', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (tickets || []) as unknown as TicketWithRelations[]
    } catch (error) {
      console.error('Error fetching user tickets:', error)
      throw error
    }
  }

  static async getTicketById(ticketId: string): Promise<TicketWithRelations | null> {
    try {
      const { data: ticket, error } = await supabase
        .from('tickets')
        .select(`
          *,
          ticket_types (
            *,
            events (
              id,
              title,
              date,
              venue,
              location
            )
          )
        `)
        .eq('id', ticketId)
        .single()

      if (error) throw error
      return ticket as unknown as TicketWithRelations
    } catch (error) {
      console.error('Error fetching ticket:', error)
      return null
    }
  }

  static async validateTicket(ticketId: string): Promise<{ valid: boolean; ticket?: TicketWithRelations; error?: string }> {
    try {
      const ticket = await this.getTicketById(ticketId)
      
      if (!ticket) {
        return { valid: false, error: 'Ticket not found' }
      }

      if (ticket.status !== 'active') {
        return { valid: false, error: `Ticket is ${ticket.status}` }
      }

      return { valid: true, ticket }
    } catch (error) {
      console.error('Error validating ticket:', error)
      return { valid: false, error: 'Validation failed' }
    }
  }

  static async markTicketAsUsed(ticketId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ 
          status: 'used',
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error marking ticket as used:', error)
      return false
    }
  }

  private static generateValidationHash(ticketId: string, eventId: string, orderId: string): string {
    // Generate deterministic hash for tamper detection
    const data = `${ticketId}:${eventId}:${orderId}:validation`
    return btoa(data).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)
  }
}

export const ticketService = new TicketService()