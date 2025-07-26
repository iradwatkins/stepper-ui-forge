import { supabase } from '@/lib/supabase'
import type { VenueLayoutRow } from '@/types/database'

export interface PriceCategory {
  id: string
  name: string
  price: number
  color: string
}

export interface Seat {
  id: string
  x: number
  y: number
  seatNumber: string
  priceCategory: string
  isADA: boolean
  price: number
}

export interface VenueLayout {
  id: string
  user_id?: string
  name: string
  description: string
  venueType: 'theater' | 'stadium' | 'arena' | 'table-service' | 'general-admission'
  imageUrl: string
  capacity: number
  priceCategories: PriceCategory[]
  seats: Seat[]
  isTemplate: boolean
  tags: string[]
  createdAt: Date
  updatedAt: Date
  eventCount?: number
}

export interface VenueLayoutInsert {
  name: string
  description: string
  layout_data: {
    venueType: string
    imageUrl: string
    capacity: number
    priceCategories: PriceCategory[]
    seats: Seat[]
    isTemplate: boolean
    tags: string[]
  }
  is_active?: boolean
}

export interface VenueLayoutUpdate {
  name?: string
  description?: string
  layout_data?: {
    venueType: string
    imageUrl: string
    capacity: number
    priceCategories: PriceCategory[]
    seats: Seat[]
    isTemplate: boolean
    tags: string[]
  }
  is_active?: boolean
}

export class VenueService {
  static async getUserVenues(userId: string): Promise<VenueLayout[]> {
    try {
      const { data, error } = await supabase
        .from('venue_layouts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Count events using each venue
      const venuesWithCounts = await Promise.all(
        (data || []).map(async (venue) => {
          const { count } = await supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('venue_layout_id', venue.id)

          return this.mapDbToVenueLayout(venue, count || 0)
        })
      )

      return venuesWithCounts
    } catch (error) {
      console.error('Failed to get user venues:', error)
      return []
    }
  }

  static async getVenueById(venueId: string): Promise<VenueLayout | null> {
    try {
      const { data, error } = await supabase
        .from('venue_layouts')
        .select('*')
        .eq('id', venueId)
        .single()

      if (error) throw error

      // Count events using this venue
      const { count } = await supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('venue_layout_id', venueId)

      return this.mapDbToVenueLayout(data, count || 0)
    } catch (error) {
      console.error('Failed to get venue by id:', error)
      return null
    }
  }

  static async createVenue(venue: VenueLayoutInsert): Promise<VenueLayout | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('venue_layouts')
        .insert({
          user_id: user.id,
          name: venue.name,
          description: venue.description,
          layout_data: venue.layout_data,
          is_active: venue.is_active ?? true
        })
        .select()
        .single()

      if (error) throw error

      return this.mapDbToVenueLayout(data, 0)
    } catch (error) {
      console.error('Failed to create venue:', error)
      return null
    }
  }

  static async updateVenue(venueId: string, updates: VenueLayoutUpdate): Promise<VenueLayout | null> {
    try {
      const { data, error } = await supabase
        .from('venue_layouts')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', venueId)
        .select()
        .single()

      if (error) throw error

      // Get event count
      const { count } = await supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('venue_layout_id', venueId)

      return this.mapDbToVenueLayout(data, count || 0)
    } catch (error) {
      console.error('Failed to update venue:', error)
      return null
    }
  }

  static async deleteVenue(venueId: string): Promise<boolean> {
    try {
      // Check if venue is being used by any events
      const { count } = await supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('venue_layout_id', venueId)

      if (count && count > 0) {
        throw new Error(`Cannot delete venue. It's being used by ${count} event(s).`)
      }

      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('venue_layouts')
        .update({ is_active: false })
        .eq('id', venueId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Failed to delete venue:', error)
      throw error
    }
  }

  static async duplicateVenue(venueId: string, newName: string): Promise<VenueLayout | null> {
    try {
      const original = await this.getVenueById(venueId)
      if (!original) throw new Error('Original venue not found')

      const duplicate: VenueLayoutInsert = {
        name: newName,
        description: original.description,
        layout_data: {
          venueType: original.venueType,
          imageUrl: original.imageUrl,
          capacity: original.capacity,
          priceCategories: original.priceCategories,
          seats: original.seats,
          isTemplate: original.isTemplate,
          tags: original.tags
        }
      }

      return await this.createVenue(duplicate)
    } catch (error) {
      console.error('Failed to duplicate venue:', error)
      return null
    }
  }

  static async searchVenues(searchTerm: string, venueType?: string): Promise<VenueLayout[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      let query = supabase
        .from('venue_layouts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)

      // Add search conditions
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      }

      if (venueType && venueType !== 'all') {
        query = query.filter('layout_data->venueType', 'eq', venueType)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      return (data || []).map(venue => this.mapDbToVenueLayout(venue, 0))
    } catch (error) {
      console.error('Failed to search venues:', error)
      return []
    }
  }

  static async isVenueAvailable(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('venue_layouts')
        .select('id')
        .limit(1)

      return !error
    } catch {
      return false
    }
  }

  // Map database record to VenueLayout interface
  private static mapDbToVenueLayout(dbRecord: VenueLayoutRow, eventCount: number): VenueLayout {
    const layoutData = dbRecord.layout_data
    
    return {
      id: dbRecord.id,
      user_id: dbRecord.user_id,
      name: dbRecord.name,
      description: dbRecord.description || '',
      venueType: layoutData.venueType as 'theater' | 'stadium' | 'arena' | 'table-service' | 'general-admission',
      imageUrl: layoutData.imageUrl,
      capacity: layoutData.capacity,
      priceCategories: layoutData.priceCategories,
      seats: layoutData.seats,
      isTemplate: layoutData.isTemplate,
      tags: layoutData.tags,
      createdAt: new Date(dbRecord.created_at),
      updatedAt: new Date(dbRecord.updated_at),
      eventCount
    }
  }

  // Export venue layout as JSON
  static exportVenueLayout(venue: VenueLayout): string {
    const exportData = {
      name: venue.name,
      description: venue.description,
      venueType: venue.venueType,
      imageUrl: venue.imageUrl,
      capacity: venue.capacity,
      priceCategories: venue.priceCategories,
      seats: venue.seats,
      isTemplate: venue.isTemplate,
      tags: venue.tags,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    }

    return JSON.stringify(exportData, null, 2)
  }

  // Import venue layout from JSON
  static async importVenueLayout(jsonData: string, name?: string): Promise<VenueLayout | null> {
    try {
      const importData = JSON.parse(jsonData)
      
      const venueInsert: VenueLayoutInsert = {
        name: name || `${importData.name} (Imported)`,
        description: importData.description || '',
        layout_data: {
          venueType: importData.venueType || 'general-admission',
          imageUrl: importData.imageUrl || '',
          capacity: importData.capacity || 0,
          priceCategories: importData.priceCategories || [],
          seats: importData.seats || [],
          isTemplate: false, // Imported venues are not templates by default
          tags: importData.tags || []
        }
      }

      return await this.createVenue(venueInsert)
    } catch (error) {
      console.error('Failed to import venue layout:', error)
      throw error
    }
  }
}