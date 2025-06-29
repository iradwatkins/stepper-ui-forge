export type EventType = 'simple' | 'ticketed' | 'premium'
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed'
export type TicketStatus = 'active' | 'used' | 'refunded' | 'cancelled'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

export interface ImageMetadata {
  url: string
  alt?: string
  size?: number
  filename?: string
}

export interface TeamPermissions {
  canEdit: boolean
  canManageTickets: boolean
  canViewAnalytics: boolean
  canManageTeam: boolean
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          website: string | null
          phone: string | null
          location: string | null
          organization: string | null
          social_links: Record<string, string>
          notification_preferences: {
            emailMarketing: boolean
            emailUpdates: boolean
            emailTickets: boolean
            pushNotifications: boolean
            smsNotifications: boolean
          }
          privacy_settings: {
            profileVisible: boolean
            showEmail: boolean
            showPhone: boolean
            showEvents: boolean
          }
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          website?: string | null
          phone?: string | null
          location?: string | null
          organization?: string | null
          social_links?: Record<string, string>
          notification_preferences?: {
            emailMarketing?: boolean
            emailUpdates?: boolean
            emailTickets?: boolean
            pushNotifications?: boolean
            smsNotifications?: boolean
          }
          privacy_settings?: {
            profileVisible?: boolean
            showEmail?: boolean
            showPhone?: boolean
            showEvents?: boolean
          }
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          website?: string | null
          phone?: string | null
          location?: string | null
          organization?: string | null
          social_links?: Record<string, string>
          notification_preferences?: {
            emailMarketing?: boolean
            emailUpdates?: boolean
            emailTickets?: boolean
            pushNotifications?: boolean
            smsNotifications?: boolean
          }
          privacy_settings?: {
            profileVisible?: boolean
            showEmail?: boolean
            showPhone?: boolean
            showEvents?: boolean
          }
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          owner_id: string
          title: string
          description: string | null
          organization_name: string | null
          date: string
          time: string
          location: string
          categories: string[]
          event_type: EventType
          status: EventStatus
          images: Record<string, ImageMetadata>
          is_public: boolean
          max_attendees: number | null
          registration_deadline: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          description?: string | null
          organization_name?: string | null
          date: string
          time: string
          location: string
          categories?: string[]
          event_type?: EventType
          status?: EventStatus
          images?: Record<string, ImageMetadata>
          is_public?: boolean
          max_attendees?: number | null
          registration_deadline?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          description?: string | null
          organization_name?: string | null
          date?: string
          time?: string
          location?: string
          categories?: string[]
          event_type?: EventType
          status?: EventStatus
          images?: Record<string, ImageMetadata>
          is_public?: boolean
          max_attendees?: number | null
          registration_deadline?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      ticket_types: {
        Row: {
          id: string
          event_id: string
          name: string
          description: string | null
          price: number
          quantity: number
          sold_quantity: number
          max_per_person: number
          sale_start: string | null
          sale_end: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          name: string
          description?: string | null
          price?: number
          quantity: number
          sold_quantity?: number
          max_per_person?: number
          sale_start?: string | null
          sale_end?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          name?: string
          description?: string | null
          price?: number
          quantity?: number
          sold_quantity?: number
          max_per_person?: number
          sale_start?: string | null
          sale_end?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      tickets: {
        Row: {
          id: string
          ticket_type_id: string
          event_id: string
          holder_email: string
          holder_name: string | null
          holder_phone: string | null
          status: TicketStatus
          qr_code: string
          checked_in_at: string | null
          checked_in_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ticket_type_id: string
          event_id: string
          holder_email: string
          holder_name?: string | null
          holder_phone?: string | null
          status?: TicketStatus
          qr_code?: string
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ticket_type_id?: string
          event_id?: string
          holder_email?: string
          holder_name?: string | null
          holder_phone?: string | null
          status?: TicketStatus
          qr_code?: string
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          event_id: string
          customer_email: string
          customer_name: string | null
          customer_phone: string | null
          total_amount: number
          payment_status: PaymentStatus
          payment_intent_id: string | null
          payment_method: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          customer_email: string
          customer_name?: string | null
          customer_phone?: string | null
          total_amount: number
          payment_status?: PaymentStatus
          payment_intent_id?: string | null
          payment_method?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          customer_email?: string
          customer_name?: string | null
          customer_phone?: string | null
          total_amount?: number
          payment_status?: PaymentStatus
          payment_intent_id?: string | null
          payment_method?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          ticket_type_id: string
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          ticket_type_id: string
          quantity: number
          unit_price: number
          total_price: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          ticket_type_id?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          created_at?: string
        }
      }
      team_members: {
        Row: {
          id: string
          event_id: string
          user_id: string
          role: string
          permissions: TeamPermissions
          invited_by: string | null
          invited_at: string
          accepted_at: string | null
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          role?: string
          permissions?: TeamPermissions
          invited_by?: string | null
          invited_at?: string
          accepted_at?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          role?: string
          permissions?: TeamPermissions
          invited_by?: string | null
          invited_at?: string
          accepted_at?: string | null
        }
      }
      event_analytics: {
        Row: {
          id: string
          event_id: string
          metric_name: string
          metric_value: number
          recorded_date: string
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          metric_name: string
          metric_value: number
          recorded_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          metric_name?: string
          metric_value?: number
          recorded_date?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      event_type: EventType
      event_status: EventStatus
      ticket_status: TicketStatus
      payment_status: PaymentStatus
    }
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Event = Database['public']['Tables']['events']['Row']
export type EventInsert = Database['public']['Tables']['events']['Insert']
export type EventUpdate = Database['public']['Tables']['events']['Update']

export type TicketType = Database['public']['Tables']['ticket_types']['Row']
export type TicketTypeInsert = Database['public']['Tables']['ticket_types']['Insert']
export type TicketTypeUpdate = Database['public']['Tables']['ticket_types']['Update']

export type Ticket = Database['public']['Tables']['tickets']['Row']
export type TicketInsert = Database['public']['Tables']['tickets']['Insert']
export type TicketUpdate = Database['public']['Tables']['tickets']['Update']

export type Order = Database['public']['Tables']['orders']['Row']
export type OrderInsert = Database['public']['Tables']['orders']['Insert']
export type OrderUpdate = Database['public']['Tables']['orders']['Update']

export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type OrderItemInsert = Database['public']['Tables']['order_items']['Insert']
export type OrderItemUpdate = Database['public']['Tables']['order_items']['Update']

export type TeamMember = Database['public']['Tables']['team_members']['Row']
export type TeamMemberInsert = Database['public']['Tables']['team_members']['Insert']
export type TeamMemberUpdate = Database['public']['Tables']['team_members']['Update']

export type EventAnalytics = Database['public']['Tables']['event_analytics']['Row']
export type EventAnalyticsInsert = Database['public']['Tables']['event_analytics']['Insert']
export type EventAnalyticsUpdate = Database['public']['Tables']['event_analytics']['Update']

// Extended types with relations
export type EventWithStats = Event & {
  ticket_types?: TicketType[]
  tickets_sold?: number
  total_revenue?: number
  attendee_count?: number
}

export type ProfileWithEvents = Profile & {
  events?: Event[]
  event_count?: number
}