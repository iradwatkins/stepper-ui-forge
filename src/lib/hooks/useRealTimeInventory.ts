import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabase'
import { InventoryService, TicketTypeWithAvailability } from '../services/InventoryService'

export interface InventoryStatus {
  [ticketTypeId: string]: {
    available: number
    total: number
    sold: number
    version: number
    lastUpdated: Date
  }
}

export interface UseRealTimeInventoryOptions {
  eventId?: string
  ticketTypeIds?: string[]
  pollInterval?: number // milliseconds
  enableRealTimeUpdates?: boolean
}

export interface UseRealTimeInventoryReturn {
  inventory: InventoryStatus
  loading: boolean
  error: string | null
  refreshInventory: () => Promise<void>
  getAvailability: (ticketTypeId: string) => number
  isAvailable: (ticketTypeId: string, quantity: number) => boolean
  subscribeToUpdates: (ticketTypeIds: string[]) => void
  unsubscribeFromUpdates: () => void
}

export function useRealTimeInventory(
  options: UseRealTimeInventoryOptions = {}
): UseRealTimeInventoryReturn {
  const {
    eventId,
    ticketTypeIds = [],
    pollInterval = 30000, // 30 seconds default
    enableRealTimeUpdates = true
  } = options

  const [inventory, setInventory] = useState<InventoryStatus>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const subscriptionRef = useRef<any>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      unsubscribeFromUpdates()
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  /**
   * Fetch inventory data for specified ticket types
   */
  const fetchInventoryData = useCallback(async (ids: string[]) => {
    if (!ids.length) return

    try {
      const results = await Promise.all(
        ids.map(async (id) => {
          const ticketType = await InventoryService.getTicketTypeWithAvailability(id)
          return { id, ticketType }
        })
      )

      const newInventory: InventoryStatus = {}
      
      results.forEach(({ id, ticketType }) => {
        if (ticketType) {
          newInventory[id] = {
            available: ticketType.available_quantity,
            total: ticketType.quantity,
            sold: ticketType.sold_quantity,
            version: ticketType.version,
            lastUpdated: new Date()
          }
        }
      })

      if (mountedRef.current) {
        setInventory(prev => ({ ...prev, ...newInventory }))
        setError(null)
      }
    } catch (err) {
      console.error('Error fetching inventory data:', err)
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch inventory')
      }
    }
  }, [])

  /**
   * Fetch inventory for event-based lookup
   */
  const fetchEventInventory = useCallback(async (eventId: string) => {
    try {
      const { data: ticketTypes, error } = await supabase
        .from('ticket_types')
        .select('id')
        .eq('event_id', eventId)

      if (error) throw error

      const ids = ticketTypes?.map(tt => tt.id) || []
      if (ids.length > 0) {
        await fetchInventoryData(ids)
      }
    } catch (err) {
      console.error('Error fetching event inventory:', err)
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch event inventory')
      }
    }
  }, [fetchInventoryData])

  /**
   * Refresh inventory data
   */
  const refreshInventory = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      if (eventId) {
        await fetchEventInventory(eventId)
      } else if (ticketTypeIds.length > 0) {
        await fetchInventoryData(ticketTypeIds)
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [eventId, ticketTypeIds, fetchEventInventory, fetchInventoryData])

  /**
   * Set up real-time subscription for ticket type changes
   */
  const subscribeToUpdates = useCallback((ids: string[]) => {
    if (!enableRealTimeUpdates || !ids.length) return

    // Unsubscribe from previous subscription
    unsubscribeFromUpdates()

    // Subscribe to ticket_types changes
    subscriptionRef.current = supabase
      .channel('inventory_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ticket_types',
          filter: `id=in.(${ids.join(',')})`
        },
        (payload) => {
          console.log('Real-time inventory update:', payload)
          
          const updatedTicketType = payload.new
          if (updatedTicketType && mountedRef.current) {
            setInventory(prev => ({
              ...prev,
              [updatedTicketType.id]: {
                available: Math.max(0, updatedTicketType.quantity - updatedTicketType.sold_quantity),
                total: updatedTicketType.quantity,
                sold: updatedTicketType.sold_quantity,
                version: updatedTicketType.version || 0,
                lastUpdated: new Date()
              }
            }))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_reservations'
        },
        () => {
          // Refresh inventory when reservations change
          if (mountedRef.current) {
            refreshInventory()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ticket_reservations'
        },
        () => {
          // Refresh inventory when reservations change
          if (mountedRef.current) {
            refreshInventory()
          }
        }
      )
      .subscribe()

  }, [enableRealTimeUpdates, refreshInventory])

  /**
   * Unsubscribe from real-time updates
   */
  const unsubscribeFromUpdates = useCallback(() => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current)
      subscriptionRef.current = null
    }
  }, [])

  /**
   * Set up polling for inventory updates
   */
  useEffect(() => {
    if (pollInterval > 0) {
      pollIntervalRef.current = setInterval(() => {
        if (mountedRef.current) {
          refreshInventory()
        }
      }, pollInterval)

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
        }
      }
    }
  }, [pollInterval, refreshInventory])

  /**
   * Initial load and subscription setup
   */
  useEffect(() => {
    refreshInventory()

    const idsToSubscribe = eventId ? [] : ticketTypeIds
    if (idsToSubscribe.length > 0) {
      subscribeToUpdates(idsToSubscribe)
    }

    // If eventId is provided, subscribe after fetching ticket types
    if (eventId) {
      fetchEventInventory(eventId).then(() => {
        const currentIds = Object.keys(inventory)
        if (currentIds.length > 0) {
          subscribeToUpdates(currentIds)
        }
      })
    }
  }, [eventId, ticketTypeIds, subscribeToUpdates])

  /**
   * Get available quantity for a ticket type
   */
  const getAvailability = useCallback((ticketTypeId: string): number => {
    return inventory[ticketTypeId]?.available || 0
  }, [inventory])

  /**
   * Check if a specific quantity is available for a ticket type
   */
  const isAvailable = useCallback((ticketTypeId: string, quantity: number): boolean => {
    const available = getAvailability(ticketTypeId)
    return available >= quantity
  }, [getAvailability])

  return {
    inventory,
    loading,
    error,
    refreshInventory,
    getAvailability,
    isAvailable,
    subscribeToUpdates,
    unsubscribeFromUpdates
  }
}

/**
 * Hook specifically for monitoring a single ticket type
 */
export function useTicketTypeInventory(ticketTypeId: string) {
  const { inventory, loading, error, refreshInventory, getAvailability, isAvailable } = 
    useRealTimeInventory({
      ticketTypeIds: [ticketTypeId],
      pollInterval: 10000, // More frequent updates for single ticket type
      enableRealTimeUpdates: true
    })

  return {
    available: getAvailability(ticketTypeId),
    total: inventory[ticketTypeId]?.total || 0,
    sold: inventory[ticketTypeId]?.sold || 0,
    version: inventory[ticketTypeId]?.version || 0,
    lastUpdated: inventory[ticketTypeId]?.lastUpdated,
    loading,
    error,
    refresh: refreshInventory,
    isAvailable: (quantity: number) => isAvailable(ticketTypeId, quantity)
  }
}

/**
 * Hook for cart validation with real-time inventory
 */
export function useCartInventoryValidation(cartItems: Array<{ ticket_type_id: string; quantity: number }>) {
  const ticketTypeIds = cartItems.map(item => item.ticket_type_id)
  const { inventory, loading, error, refreshInventory } = useRealTimeInventory({
    ticketTypeIds,
    pollInterval: 5000, // Frequent updates for cart validation
    enableRealTimeUpdates: true
  })

  const validationErrors = cartItems.reduce((errors, item) => {
    const available = inventory[item.ticket_type_id]?.available || 0
    if (item.quantity > available) {
      errors.push({
        ticketTypeId: item.ticket_type_id,
        requested: item.quantity,
        available,
        error: `Only ${available} tickets available`
      })
    }
    return errors
  }, [] as Array<{ ticketTypeId: string; requested: number; available: number; error: string }>)

  return {
    inventory,
    validationErrors,
    isValid: validationErrors.length === 0,
    loading,
    error,
    refresh: refreshInventory
  }
}