import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabase'
import { SeatingService, AvailableSeat, SeatHold, SeatPurchase, SeatAvailabilitySummary } from '../services/SeatingService'

export interface RealTimeSeatStatus {
  [seatId: string]: {
    status: 'available' | 'held' | 'sold'
    holdExpiresAt?: Date
    lastUpdated: Date
  }
}

export interface UseRealTimeSeatingOptions {
  eventId: string
  seatingChartId: string
  pollInterval?: number // milliseconds
  enableRealTimeUpdates?: boolean
  onSeatStatusChange?: (seatId: string, status: string) => void
  onHoldExpired?: (seatId: string) => void
}

export interface UseRealTimeSeatingReturn {
  availableSeats: AvailableSeat[]
  seatStatus: RealTimeSeatStatus
  activeHolds: SeatHold[]
  availabilitySummary: SeatAvailabilitySummary | null
  loading: boolean
  error: string | null
  refreshSeating: () => Promise<void>
  subscribeToUpdates: () => void
  unsubscribeFromUpdates: () => void
  holdSeats: (seatIds: string[], holdDurationMinutes?: number) => Promise<{ success: boolean; holdId?: string; error?: string }>
  releaseHolds: (holdIds?: string[]) => Promise<number>
  extendHold: (holdId: string, additionalMinutes?: number) => Promise<boolean>
}

export function useRealTimeSeating(
  options: UseRealTimeSeatingOptions
): UseRealTimeSeatingReturn {
  const {
    eventId,
    seatingChartId,
    pollInterval = 30000, // 30 seconds default
    enableRealTimeUpdates = true,
    onSeatStatusChange,
    onHoldExpired
  } = options

  const [availableSeats, setAvailableSeats] = useState<AvailableSeat[]>([])
  const [seatStatus, setSeatStatus] = useState<RealTimeSeatStatus>({})
  const [activeHolds, setActiveHolds] = useState<SeatHold[]>([])
  const [availabilitySummary, setAvailabilitySummary] = useState<SeatAvailabilitySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const subscriptionRef = useRef<any>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const holdTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
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
      // Clear all hold timers
      holdTimersRef.current.forEach(timer => clearTimeout(timer))
      holdTimersRef.current.clear()
    }
  }, [])

  /**
   * Fetch available seats for the event
   */
  const fetchAvailableSeats = useCallback(async () => {
    try {
      const seats = await SeatingService.getAvailableSeats(eventId, seatingChartId)
      if (mountedRef.current) {
        setAvailableSeats(seats)
        
        // Update seat status map
        const newSeatStatus: RealTimeSeatStatus = {}
        seats.forEach(seat => {
          newSeatStatus[seat.seat_id] = {
            status: 'available',
            lastUpdated: new Date()
          }
        })
        setSeatStatus(prev => ({ ...prev, ...newSeatStatus }))
      }
    } catch (err) {
      console.error('Error fetching available seats:', err)
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch available seats')
      }
    }
  }, [eventId, seatingChartId])

  /**
   * Fetch active holds for the current session
   */
  const fetchActiveHolds = useCallback(async () => {
    try {
      const sessionId = SeatingService.getSessionId()
      const holds = await SeatingService.getSessionSeatHolds(sessionId, eventId)
      
      if (mountedRef.current) {
        setActiveHolds(holds)
        
        // Update seat status for held seats
        setSeatStatus(prev => {
          const updated = { ...prev }
          
          holds.forEach(hold => {
            if (hold.status === 'active' && new Date(hold.expires_at) > new Date()) {
              updated[hold.seat_id] = {
                status: 'held',
                holdExpiresAt: new Date(hold.expires_at),
                lastUpdated: new Date()
              }
              
              // Set up expiration timer
              setupHoldExpirationTimer(hold.seat_id, new Date(hold.expires_at))
            }
          })
          
          return updated
        })
      }
    } catch (err) {
      console.error('Error fetching active holds:', err)
    }
  }, [eventId])

  /**
   * Fetch availability summary
   */
  const fetchAvailabilitySummary = useCallback(async () => {
    try {
      const summary = await SeatingService.getSeatAvailabilitySummary(eventId)
      if (mountedRef.current) {
        setAvailabilitySummary(summary)
      }
    } catch (err) {
      console.error('Error fetching availability summary:', err)
    }
  }, [eventId])

  /**
   * Set up hold expiration timer
   */
  const setupHoldExpirationTimer = useCallback((seatId: string, expiresAt: Date) => {
    // Clear existing timer for this seat
    const existingTimer = holdTimersRef.current.get(seatId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    const timeUntilExpiration = expiresAt.getTime() - Date.now()
    
    if (timeUntilExpiration > 0) {
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          // Update seat status to available
          setSeatStatus(prev => ({
            ...prev,
            [seatId]: {
              status: 'available',
              lastUpdated: new Date()
            }
          }))

          // Notify callback
          if (onHoldExpired) {
            onHoldExpired(seatId)
          }

          // Remove timer from map
          holdTimersRef.current.delete(seatId)
        }
      }, timeUntilExpiration)

      holdTimersRef.current.set(seatId, timer)
    }
  }, [onHoldExpired])

  /**
   * Refresh all seating data
   */
  const refreshSeating = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      await Promise.all([
        fetchAvailableSeats(),
        fetchActiveHolds(),
        fetchAvailabilitySummary()
      ])
    } catch (err) {
      console.error('Error refreshing seating data:', err)
      if (mountedRef.current) {
        setError('Failed to refresh seating data')
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [fetchAvailableSeats, fetchActiveHolds, fetchAvailabilitySummary])

  /**
   * Set up real-time subscription for seat updates
   */
  const subscribeToUpdates = useCallback(() => {
    if (!enableRealTimeUpdates) return

    // Unsubscribe from previous subscription
    unsubscribeFromUpdates()

    // Subscribe to seat holds changes
    subscriptionRef.current = supabase
      .channel('seating_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seat_holds',
          filter: `event_id=eq.${eventId}`
        },
        (payload) => {
          console.log('Seat hold update:', payload)
          
          if (mountedRef.current) {
            const hold = payload.new as SeatHold
            
            if (payload.eventType === 'INSERT' && hold.status === 'active') {
              // New hold created
              setSeatStatus(prev => ({
                ...prev,
                [hold.seat_id]: {
                  status: 'held',
                  holdExpiresAt: new Date(hold.expires_at),
                  lastUpdated: new Date()
                }
              }))
              
              setupHoldExpirationTimer(hold.seat_id, new Date(hold.expires_at))
              
              if (onSeatStatusChange) {
                onSeatStatusChange(hold.seat_id, 'held')
              }
              
            } else if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
              // Hold updated or cancelled
              if (hold.status !== 'active') {
                setSeatStatus(prev => ({
                  ...prev,
                  [hold.seat_id]: {
                    status: 'available',
                    lastUpdated: new Date()
                  }
                }))
                
                // Clear expiration timer
                const timer = holdTimersRef.current.get(hold.seat_id)
                if (timer) {
                  clearTimeout(timer)
                  holdTimersRef.current.delete(hold.seat_id)
                }
                
                if (onSeatStatusChange) {
                  onSeatStatusChange(hold.seat_id, 'available')
                }
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'seat_purchases',
          filter: `event_id=eq.${eventId}`
        },
        (payload) => {
          console.log('Seat purchase update:', payload)
          
          if (mountedRef.current) {
            const purchase = payload.new as SeatPurchase
            
            // Mark seat as sold
            setSeatStatus(prev => ({
              ...prev,
              [purchase.seat_id]: {
                status: 'sold',
                lastUpdated: new Date()
              }
            }))
            
            // Remove from available seats
            setAvailableSeats(prev => 
              prev.filter(seat => seat.seat_id !== purchase.seat_id)
            )
            
            if (onSeatStatusChange) {
              onSeatStatusChange(purchase.seat_id, 'sold')
            }
          }
        }
      )
      .subscribe()

  }, [eventId, enableRealTimeUpdates, onSeatStatusChange, setupHoldExpirationTimer])

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
   * Hold seats
   */
  const holdSeats = useCallback(async (
    seatIds: string[],
    holdDurationMinutes: number = 15
  ): Promise<{ success: boolean; holdId?: string; error?: string }> => {
    try {
      const sessionId = SeatingService.getSessionId()
      const result = await SeatingService.holdSeats({
        seatIds,
        eventId,
        sessionId,
        holdDurationMinutes
      })

      if (result.success && result.holdId) {
        // Update local state immediately
        const expiresAt = new Date(Date.now() + holdDurationMinutes * 60 * 1000)
        
        setSeatStatus(prev => {
          const updated = { ...prev }
          seatIds.forEach(seatId => {
            updated[seatId] = {
              status: 'held',
              holdExpiresAt: expiresAt,
              lastUpdated: new Date()
            }
            setupHoldExpirationTimer(seatId, expiresAt)
          })
          return updated
        })

        // Refresh holds
        await fetchActiveHolds()
      }

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }, [eventId, fetchActiveHolds, setupHoldExpirationTimer])

  /**
   * Release holds
   */
  const releaseHolds = useCallback(async (holdIds?: string[]): Promise<number> => {
    try {
      const sessionId = SeatingService.getSessionId()
      const count = await SeatingService.releaseSeatHolds({
        holdIds,
        sessionId: holdIds ? undefined : sessionId,
        eventId: holdIds ? undefined : eventId
      })

      // Refresh data after releasing holds
      await refreshSeating()

      return count
    } catch (error) {
      console.error('Error releasing holds:', error)
      return 0
    }
  }, [eventId, refreshSeating])

  /**
   * Extend hold
   */
  const extendHold = useCallback(async (
    holdId: string,
    additionalMinutes: number = 15
  ): Promise<boolean> => {
    try {
      const success = await SeatingService.extendSeatHold(holdId, additionalMinutes)
      
      if (success) {
        // Refresh holds to get updated expiration times
        await fetchActiveHolds()
      }

      return success
    } catch (error) {
      console.error('Error extending hold:', error)
      return false
    }
  }, [fetchActiveHolds])

  /**
   * Set up polling for seat updates
   */
  useEffect(() => {
    if (pollInterval > 0) {
      pollIntervalRef.current = setInterval(() => {
        if (mountedRef.current) {
          refreshSeating()
        }
      }, pollInterval)

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
        }
      }
    }
  }, [pollInterval, refreshSeating])

  /**
   * Initial load and subscription setup
   */
  useEffect(() => {
    refreshSeating()
    subscribeToUpdates()
  }, [refreshSeating, subscribeToUpdates])

  /**
   * Cleanup expired hold timers when holds change
   */
  useEffect(() => {
    // Remove timers for holds that are no longer active
    const activeSeatIds = new Set(
      activeHolds
        .filter(hold => hold.status === 'active' && new Date(hold.expires_at) > new Date())
        .map(hold => hold.seat_id)
    )

    holdTimersRef.current.forEach((timer, seatId) => {
      if (!activeSeatIds.has(seatId)) {
        clearTimeout(timer)
        holdTimersRef.current.delete(seatId)
      }
    })
  }, [activeHolds])

  return {
    availableSeats,
    seatStatus,
    activeHolds,
    availabilitySummary,
    loading,
    error,
    refreshSeating,
    subscribeToUpdates,
    unsubscribeFromUpdates,
    holdSeats,
    releaseHolds,
    extendHold
  }
}

/**
 * Hook for monitoring seat availability changes for specific seats
 */
export function useSeatAvailabilityMonitor(
  eventId: string,
  seatingChartId: string,
  seatIds: string[]
) {
  const [seatAvailability, setSeatAvailability] = useState<Map<string, boolean>>(new Map())
  const [loading, setLoading] = useState(true)

  const { seatStatus, availableSeats, refreshSeating } = useRealTimeSeating({
    eventId,
    seatingChartId,
    pollInterval: 10000, // More frequent updates
    enableRealTimeUpdates: true
  })

  useEffect(() => {
    const availability = new Map<string, boolean>()
    
    seatIds.forEach(seatId => {
      const status = seatStatus[seatId]
      const isAvailable = status?.status === 'available' || 
                         availableSeats.some(seat => seat.seat_id === seatId)
      availability.set(seatId, isAvailable)
    })

    setSeatAvailability(availability)
    setLoading(false)
  }, [seatStatus, availableSeats, seatIds])

  return {
    seatAvailability,
    loading,
    refresh: refreshSeating
  }
}

/**
 * Hook for tracking hold expiration countdown
 */
export function useHoldCountdown(holdExpiresAt: Date | null) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    if (!holdExpiresAt) {
      setTimeRemaining(0)
      setIsExpired(false)
      return
    }

    const updateCountdown = () => {
      const remaining = holdExpiresAt.getTime() - Date.now()
      setTimeRemaining(Math.max(0, remaining))
      setIsExpired(remaining <= 0)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [holdExpiresAt])

  const formatTime = useCallback((ms: number): string => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [])

  return {
    timeRemaining,
    isExpired,
    formattedTime: formatTime(timeRemaining)
  }
}