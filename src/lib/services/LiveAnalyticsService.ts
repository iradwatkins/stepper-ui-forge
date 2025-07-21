import { supabase } from '@/lib/supabase'

export interface LiveAnalyticsStats {
  total_attempts: number
  successful_checkins: number
  duplicate_attempts: number
  invalid_tickets: number
  error_rate: number
  current_rate: number
  peak_time: string | null
  last_updated: string
}

export interface DuplicateAlert {
  id: string
  ticket_id: string
  duplicate_attempts: string[]
  alert_level: 'low' | 'medium' | 'high'
  resolved: boolean
  created_at: string
}

export interface StaffPerformance {
  staff_id: string
  staff_name: string
  total_scans: number
  successful_scans: number
  duplicate_detections: number
  success_rate: number
}

export interface CheckInAttempt {
  id: string
  event_id: string
  ticket_id: string
  staff_id: string
  success: boolean
  reason?: string
  created_at: string
}

export class LiveAnalyticsService {
  static async getEventAnalytics(eventId: string): Promise<LiveAnalyticsStats> {
    try {
      // Get check-in attempts from last 24 hours
      const since = new Date()
      since.setHours(since.getHours() - 24)

      // Get all check-in attempts
      const { data: attempts, error: attemptsError } = await supabase
        .from('ticket_logs')
        .select('*')
        .eq('event_id', eventId)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })

      if (attemptsError) throw attemptsError

      const checkIns = attempts || []
      
      // Calculate metrics
      const total = checkIns.length
      const successful = checkIns.filter(c => c.action === 'checked_in').length
      const duplicates = checkIns.filter(c => c.action === 'duplicate_attempt').length
      const invalid = checkIns.filter(c => c.action === 'invalid_ticket').length
      
      // Calculate current rate (last 10 minutes)
      const tenMinutesAgo = new Date()
      tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10)
      const recentCheckins = checkIns.filter(c => new Date(c.created_at) > tenMinutesAgo).length
      const currentRate = Math.round(recentCheckins / 10) // per minute

      // Find peak hour
      const hourCounts: Record<string, number> = {}
      checkIns.forEach(c => {
        const hour = new Date(c.created_at).getHours()
        const hourKey = `${hour}:00`
        hourCounts[hourKey] = (hourCounts[hourKey] || 0) + 1
      })
      
      const peakHour = Object.entries(hourCounts).sort(([,a], [,b]) => b - a)[0]
      const peakTime = peakHour ? peakHour[0] : null

      return {
        total_attempts: total,
        successful_checkins: successful,
        duplicate_attempts: duplicates,
        invalid_tickets: invalid,
        error_rate: total > 0 ? ((duplicates + invalid) / total) * 100 : 0,
        current_rate: currentRate,
        peak_time: peakTime,
        last_updated: new Date().toISOString()
      }
    } catch (error) {
      console.error('Failed to get event analytics:', error)
      // Return default stats if error
      return {
        total_attempts: 0,
        successful_checkins: 0,
        duplicate_attempts: 0,
        invalid_tickets: 0,
        error_rate: 0,
        current_rate: 0,
        peak_time: null,
        last_updated: new Date().toISOString()
      }
    }
  }

  static async getDuplicateAlerts(eventId: string): Promise<DuplicateAlert[]> {
    try {
      // Get duplicate attempts from ticket logs
      const { data: duplicates, error } = await supabase
        .from('ticket_logs')
        .select('*')
        .eq('event_id', eventId)
        .eq('action', 'duplicate_attempt')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      // Group by ticket_id to create alerts
      const alertMap: Record<string, DuplicateAlert> = {}
      
      duplicates?.forEach(log => {
        const ticketId = log.ticket_id
        if (!alertMap[ticketId]) {
          alertMap[ticketId] = {
            id: `alert_${ticketId}`,
            ticket_id: ticketId,
            duplicate_attempts: [],
            alert_level: 'low',
            resolved: false,
            created_at: log.created_at
          }
        }
        
        alertMap[ticketId].duplicate_attempts.push(log.id)
        
        // Escalate alert level based on attempt count
        const attemptCount = alertMap[ticketId].duplicate_attempts.length
        if (attemptCount >= 5) {
          alertMap[ticketId].alert_level = 'high'
        } else if (attemptCount >= 3) {
          alertMap[ticketId].alert_level = 'medium'
        }
      })

      return Object.values(alertMap)
    } catch (error) {
      console.error('Failed to get duplicate alerts:', error)
      return []
    }
  }

  static async getStaffPerformance(eventId: string): Promise<StaffPerformance[]> {
    try {
      // Get all staff check-ins for this event
      const { data: staffLogs, error } = await supabase
        .from('ticket_logs')
        .select(`
          staff_id,
          action,
          profiles!staff_id (
            full_name
          )
        `)
        .eq('event_id', eventId)
        .not('staff_id', 'is', null)

      if (error) throw error

      // Aggregate by staff member
      const staffMap: Record<string, StaffPerformance> = {}

      staffLogs?.forEach(log => {
        const staffId = log.staff_id
        if (!staffId) return

        if (!staffMap[staffId]) {
          staffMap[staffId] = {
            staff_id: staffId,
            staff_name: log.profiles?.full_name || 'Unknown Staff',
            total_scans: 0,
            successful_scans: 0,
            duplicate_detections: 0,
            success_rate: 0
          }
        }

        staffMap[staffId].total_scans++
        
        if (log.action === 'checked_in') {
          staffMap[staffId].successful_scans++
        } else if (log.action === 'duplicate_attempt') {
          staffMap[staffId].duplicate_detections++
        }
      })

      // Calculate success rates
      Object.values(staffMap).forEach(staff => {
        staff.success_rate = staff.total_scans > 0 
          ? (staff.successful_scans / staff.total_scans) * 100 
          : 0
      })

      return Object.values(staffMap).sort((a, b) => b.total_scans - a.total_scans)
    } catch (error) {
      console.error('Failed to get staff performance:', error)
      return []
    }
  }

  static async createLiveSession(eventId: string, sessionType: 'check_in' | 'sales' | 'engagement'): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('live_analytics_sessions')
        .insert({
          event_id: eventId,
          session_type: sessionType,
          metrics: {
            started_at: new Date().toISOString(),
            initial_stats: await this.getEventAnalytics(eventId)
          },
          active: true
        })
        .select('id')
        .single()

      if (error) throw error
      return data?.id || null
    } catch (error) {
      console.error('Failed to create live session:', error)
      return null
    }
  }

  static async updateLiveSession(sessionId: string, metrics: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('live_analytics_sessions')
        .update({
          metrics,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      return !error
    } catch (error) {
      console.error('Failed to update live session:', error)
      return false
    }
  }

  static async endLiveSession(sessionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('live_analytics_sessions')
        .update({
          active: false,
          ended_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      return !error
    } catch (error) {
      console.error('Failed to end live session:', error)
      return false
    }
  }

  static async getRecentCheckIns(eventId: string, limit: number = 50): Promise<CheckInAttempt[]> {
    try {
      const { data, error } = await supabase
        .from('ticket_logs')
        .select(`
          *,
          profiles!staff_id (
            full_name
          ),
          tickets (
            ticket_number
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return (data || []).map(log => ({
        id: log.id,
        event_id: log.event_id,
        ticket_id: log.ticket_id,
        staff_id: log.staff_id,
        success: log.action === 'checked_in',
        reason: log.details?.reason || log.action,
        created_at: log.created_at
      }))
    } catch (error) {
      console.error('Failed to get recent check-ins:', error)
      return []
    }
  }

  // Real-time subscription for live updates
  static subscribeToCheckIns(eventId: string, callback: (checkIn: CheckInAttempt) => void) {
    return supabase
      .channel(`checkins:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_logs',
          filter: `event_id=eq.${eventId}`
        },
        (payload) => {
          const log = payload.new
          callback({
            id: log.id,
            event_id: log.event_id,
            ticket_id: log.ticket_id,
            staff_id: log.staff_id,
            success: log.action === 'checked_in',
            reason: log.details?.reason || log.action,
            created_at: log.created_at
          })
        }
      )
      .subscribe()
  }

  // Check if analytics tables exist
  static async isAnalyticsAvailable(): Promise<boolean> {
    try {
      // Try to query the table to see if it exists
      const { error } = await supabase
        .from('ticket_logs')
        .select('id')
        .limit(1)

      return !error
    } catch {
      return false
    }
  }
}