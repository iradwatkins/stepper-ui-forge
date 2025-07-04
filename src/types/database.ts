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
          display_price: { amount?: number; label?: string } | null
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
          display_price?: { amount?: number; label?: string } | null
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
          display_price?: { amount?: number; label?: string } | null
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
          early_bird_price: number | null
          early_bird_until: string | null
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
          early_bird_price?: number | null
          early_bird_until?: string | null
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
          early_bird_price?: number | null
          early_bird_until?: string | null
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
      cart_items: {
        Row: {
          id: string
          user_id: string | null
          session_id: string | null
          ticket_type_id: string
          event_id: string
          quantity: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          session_id?: string | null
          ticket_type_id: string
          event_id: string
          quantity: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          session_id?: string | null
          ticket_type_id?: string
          event_id?: string
          quantity?: number
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
          referred_by_code: string | null
          commission_amount: number
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
          referred_by_code?: string | null
          commission_amount?: number
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
          referred_by_code?: string | null
          commission_amount?: number
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
      user_follows: {
        Row: {
          id: string
          follower_id: string
          organizer_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          organizer_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          organizer_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      follower_promotions: {
        Row: {
          id: string
          follow_id: string
          organizer_id: string
          follower_id: string
          can_sell_tickets: boolean
          can_work_events: boolean
          is_co_organizer: boolean
          commission_rate: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          follow_id: string
          organizer_id: string
          follower_id: string
          can_sell_tickets?: boolean
          can_work_events?: boolean
          is_co_organizer?: boolean
          commission_rate?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          follow_id?: string
          organizer_id?: string
          follower_id?: string
          can_sell_tickets?: boolean
          can_work_events?: boolean
          is_co_organizer?: boolean
          commission_rate?: number
          created_at?: string
          updated_at?: string
        }
      }
      referral_codes: {
        Row: {
          id: string
          promotion_id: string
          event_id: string | null
          code: string
          qr_code_url: string | null
          referral_url: string | null
          is_active: boolean
          clicks_count: number
          conversions_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          promotion_id: string
          event_id?: string | null
          code: string
          qr_code_url?: string | null
          referral_url?: string | null
          is_active?: boolean
          clicks_count?: number
          conversions_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          promotion_id?: string
          event_id?: string | null
          code?: string
          qr_code_url?: string | null
          referral_url?: string | null
          is_active?: boolean
          clicks_count?: number
          conversions_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      commission_earnings: {
        Row: {
          id: string
          referral_code_id: string
          order_id: string
          follower_id: string
          organizer_id: string
          event_id: string
          sale_amount: number
          commission_rate: number
          commission_amount: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          referral_code_id: string
          order_id: string
          follower_id: string
          organizer_id: string
          event_id: string
          sale_amount: number
          commission_rate: number
          commission_amount: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          referral_code_id?: string
          order_id?: string
          follower_id?: string
          organizer_id?: string
          event_id?: string
          sale_amount?: number
          commission_rate?: number
          commission_amount?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      organizer_banking_info: {
        Row: {
          id: string
          organizer_id: string
          payout_method: string
          payout_details_encrypted: string
          is_verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organizer_id: string
          payout_method: string
          payout_details_encrypted: string
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organizer_id?: string
          payout_method?: string
          payout_details_encrypted?: string
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      payout_requests: {
        Row: {
          id: string
          organizer_id: string
          amount: number
          payout_method: string
          status: string
          platform_fees: number
          net_amount: number
          commission_deductions: number
          requested_at: string
          processed_at: string | null
          completed_at: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          organizer_id: string
          amount: number
          payout_method: string
          status?: string
          platform_fees?: number
          net_amount: number
          commission_deductions?: number
          requested_at?: string
          processed_at?: string | null
          completed_at?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          organizer_id?: string
          amount?: number
          payout_method?: string
          status?: string
          platform_fees?: number
          net_amount?: number
          commission_deductions?: number
          requested_at?: string
          processed_at?: string | null
          completed_at?: string | null
          notes?: string | null
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

export type CartItem = Database['public']['Tables']['cart_items']['Row']
export type CartItemInsert = Database['public']['Tables']['cart_items']['Insert']
export type CartItemUpdate = Database['public']['Tables']['cart_items']['Update']

export type UserFollow = Database['public']['Tables']['user_follows']['Row']
export type UserFollowInsert = Database['public']['Tables']['user_follows']['Insert']
export type UserFollowUpdate = Database['public']['Tables']['user_follows']['Update']

export type FollowerPromotion = Database['public']['Tables']['follower_promotions']['Row']
export type FollowerPromotionInsert = Database['public']['Tables']['follower_promotions']['Insert']
export type FollowerPromotionUpdate = Database['public']['Tables']['follower_promotions']['Update']

export type ReferralCode = Database['public']['Tables']['referral_codes']['Row']
export type ReferralCodeInsert = Database['public']['Tables']['referral_codes']['Insert']
export type ReferralCodeUpdate = Database['public']['Tables']['referral_codes']['Update']

export type CommissionEarning = Database['public']['Tables']['commission_earnings']['Row']
export type CommissionEarningInsert = Database['public']['Tables']['commission_earnings']['Insert']
export type CommissionEarningUpdate = Database['public']['Tables']['commission_earnings']['Update']

export type OrganizerBankingInfo = Database['public']['Tables']['organizer_banking_info']['Row']
export type OrganizerBankingInfoInsert = Database['public']['Tables']['organizer_banking_info']['Insert']
export type OrganizerBankingInfoUpdate = Database['public']['Tables']['organizer_banking_info']['Update']

export type PayoutRequest = Database['public']['Tables']['payout_requests']['Row']
export type PayoutRequestInsert = Database['public']['Tables']['payout_requests']['Insert']
export type PayoutRequestUpdate = Database['public']['Tables']['payout_requests']['Update']

// Extended types with relations
export type EventWithStats = Event & {
  ticket_types?: TicketType[]
  tickets_sold?: number
  total_revenue?: number
  attendee_count?: number
  follower_count?: number
}

export type ProfileWithEvents = Profile & {
  events?: Event[]
  event_count?: number
}