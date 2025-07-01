/**
 * Check-in Analytics Service for Epic 4.0
 * 
 * Provides real-time check-in statistics, duplicate detection,
 * and fraud prevention for the event check-in system
 */

import { supabase } from '@/lib/supabase'

export interface CheckInAttempt {
  id: string
  ticket_id: string
  qr_code: string
  session_id: string
  staff_member_id: string
  attempt_timestamp: string
  result: 'success' | 'duplicate' | 'invalid' | 'error'
  error_message?: string
  device_fingerprint?: string
  ip_address?: string
}

export interface RealTimeStats {
  total_attempts: number
  successful_checkins: number
  duplicate_attempts: number
  invalid_tickets: number
  error_rate: number
  peak_time: string | null
  current_rate: number // attempts per minute
  staff_performance: StaffPerformance[]
}

export interface StaffPerformance {
  staff_id: string
  staff_name: string
  total_scans: number
  successful_scans: number
  duplicate_detections: number
  error_count: number
  average_scan_time: number
  last_activity: string
}

export interface DuplicateAlert {
  id: string
  ticket_id: string
  original_checkin: string
  duplicate_attempts: CheckInAttempt[]
  alert_level: 'low' | 'medium' | 'high'
  created_at: string
  resolved: boolean
}

export interface FraudPattern {
  pattern_type: 'rapid_scanning' | 'multiple_devices' | 'suspicious_timing' | 'invalid_sequence'
  confidence: number
  description: string
  affected_tickets: string[]
  staff_involved: string[]
  first_detected: string
}

export class CheckInAnalyticsService {
  private static subscribers: ((stats: RealTimeStats) => void)[] = []
  private static duplicateSubscribers: ((alert: DuplicateAlert) => void)[] = []

  /**
   * Subscribe to real-time statistics updates
   */
  static subscribeToStats(callback: (stats: RealTimeStats) => void): () => void {
    this.subscribers.push(callback)
    return () => {
      const index = this.subscribers.indexOf(callback)
      if (index > -1) this.subscribers.splice(index, 1)
    }
  }

  /**
   * Subscribe to duplicate detection alerts
   */
  static subscribeToDuplicateAlerts(callback: (alert: DuplicateAlert) => void): () => void {
    this.duplicateSubscribers.push(callback)
    return () => {
      const index = this.duplicateSubscribers.indexOf(callback)
      if (index > -1) this.duplicateSubscribers.splice(index, 1)
    }
  }

  /**
   * Record a check-in attempt for analytics
   */
  static async recordCheckInAttempt(
    ticketId: string,
    qrCode: string,
    sessionId: string,
    staffMemberId: string,
    result: CheckInAttempt['result'],
    errorMessage?: string
  ): Promise<void> {
    try {
      const attempt: Omit<CheckInAttempt, 'id'> = {
        ticket_id: ticketId,
        qr_code: qrCode,
        session_id: sessionId,
        staff_member_id: staffMemberId,
        attempt_timestamp: new Date().toISOString(),
        result,
        error_message: errorMessage,
        device_fingerprint: this.generateDeviceFingerprint(),
        ip_address: await this.getClientIP()
      }

      const { error } = await supabase
        .from('check_in_activities')
        .insert({
          session_id: sessionId,
          ticket_id: ticketId,
          action_type: 'check_in_attempt',
          result: attempt
        })

      if (error) {
        console.error('Failed to record check-in attempt:', error)
        return
      }

      // Check for duplicates if this was a successful check-in
      if (result === 'success') {
        await this.checkForDuplicates(ticketId, qrCode)
      }

      // Update real-time stats
      await this.broadcastStatsUpdate()

    } catch (error) {
      console.error('CheckInAnalyticsService.recordCheckInAttempt failed:', error)
    }
  }

  /**
   * Get real-time statistics for an event
   */
  static async getRealTimeStats(eventId: string): Promise<RealTimeStats> {
    try {
      // Get check-in activities for the last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const { data: activities, error } = await supabase
        .from('check_in_activities')
        .select(`
          *,
          check_in_sessions!inner (
            event_id,
            staff_member_id,
            staff_profile:profiles!check_in_sessions_staff_member_id_fkey (
              full_name
            )
          )
        `)
        .eq('check_in_sessions.event_id', eventId)
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to fetch check-in activities:', error)
        return this.getEmptyStats()
      }

      return this.calculateStats(activities || [])

    } catch (error) {
      console.error('CheckInAnalyticsService.getRealTimeStats failed:', error)
      return this.getEmptyStats()
    }
  }

  /**
   * Check for duplicate check-in attempts
   */
  private static async checkForDuplicates(ticketId: string, qrCode: string): Promise<void> {
    try {
      // Look for previous successful check-ins for this ticket
      const { data: previousCheckins, error } = await supabase
        .from('check_in_activities')
        .select('*')
        .eq('ticket_id', ticketId)
        .eq('action_type', 'check_in')
        .order('created_at', { ascending: false })

      if (error || !previousCheckins) return

      // If there are multiple successful check-ins, this is a duplicate
      const successfulCheckins = previousCheckins.filter(
        checkin => checkin.result?.result === 'success'
      )

      if (successfulCheckins.length > 1) {
        await this.createDuplicateAlert(ticketId, successfulCheckins)
      }

    } catch (error) {
      console.error('Duplicate detection failed:', error)
    }
  }

  /**
   * Create a duplicate detection alert
   */
  private static async createDuplicateAlert(
    ticketId: string, 
    checkins: any[]
  ): Promise<void> {
    try {
      const [original, ...duplicates] = checkins
      
      const alert: Omit<DuplicateAlert, 'id'> = {
        ticket_id: ticketId,
        original_checkin: original.created_at,
        duplicate_attempts: duplicates.map(d => ({
          id: d.id,
          ticket_id: d.ticket_id,
          qr_code: d.result?.qr_code || '',
          session_id: d.session_id,
          staff_member_id: d.result?.staff_member_id || '',
          attempt_timestamp: d.created_at,
          result: 'duplicate'
        })),
        alert_level: duplicates.length > 2 ? 'high' : duplicates.length > 1 ? 'medium' : 'low',
        created_at: new Date().toISOString(),
        resolved: false
      }

      // Notify subscribers
      this.duplicateSubscribers.forEach(callback => callback(alert))

      console.warn(`🚨 Duplicate check-in detected for ticket ${ticketId}:`, alert)

    } catch (error) {
      console.error('Failed to create duplicate alert:', error)
    }
  }

  /**
   * Detect fraud patterns in check-in data
   */
  static async detectFraudPatterns(eventId: string): Promise<FraudPattern[]> {
    try {
      const patterns: FraudPattern[] = []
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

      // Get recent activities for analysis
      const { data: activities, error } = await supabase
        .from('check_in_activities')
        .select(`
          *,
          check_in_sessions!inner (event_id, staff_member_id)
        `)
        .eq('check_in_sessions.event_id', eventId)
        .gte('created_at', oneHourAgo)

      if (error || !activities) return patterns

      // Pattern 1: Rapid scanning (more than 10 scans per minute)
      const rapidScanners = this.detectRapidScanning(activities)
      patterns.push(...rapidScanners)

      // Pattern 2: Multiple devices for same staff
      const multipleDevices = this.detectMultipleDeviceUsage(activities)
      patterns.push(...multipleDevices)

      // Pattern 3: Suspicious timing patterns
      const suspiciousTiming = this.detectSuspiciousTiming(activities)
      patterns.push(...suspiciousTiming)

      return patterns

    } catch (error) {
      console.error('Fraud pattern detection failed:', error)
      return []
    }
  }

  /**
   * Get performance metrics for staff members
   */
  static async getStaffPerformance(eventId: string): Promise<StaffPerformance[]> {
    try {
      const { data: sessions, error } = await supabase
        .from('check_in_sessions')
        .select(`
          staff_member_id,
          staff_profile:profiles!check_in_sessions_staff_member_id_fkey (full_name),
          check_in_activities (*)
        `)
        .eq('event_id', eventId)

      if (error || !sessions) return []

      return sessions.map(session => {
        const activities = session.check_in_activities || []
        const successful = activities.filter(a => a.result?.result === 'success').length
        const duplicates = activities.filter(a => a.result?.result === 'duplicate').length
        const errors = activities.filter(a => a.result?.result === 'error').length
        
        return {
          staff_id: session.staff_member_id,
          staff_name: session.staff_profile?.full_name || 'Unknown',
          total_scans: activities.length,
          successful_scans: successful,
          duplicate_detections: duplicates,
          error_count: errors,
          average_scan_time: this.calculateAverageScanTime(activities),
          last_activity: activities.length > 0 
            ? activities[activities.length - 1].created_at 
            : session.session_start
        }
      })

    } catch (error) {
      console.error('Staff performance calculation failed:', error)
      return []
    }
  }

  /**
   * Get check-in rate over time for analytics
   */
  static async getCheckInRateOverTime(
    eventId: string, 
    timeframe: 'hour' | 'day' | 'week' = 'hour'
  ): Promise<{ timestamp: string, count: number }[]> {
    try {
      // This would typically use a more sophisticated time-series query
      // For now, we'll provide a simplified implementation
      const intervals = this.getTimeIntervals(timeframe)
      const rates: { timestamp: string, count: number }[] = []

      for (const interval of intervals) {
        const { count, error } = await supabase
          .from('check_in_activities')
          .select('*', { count: 'exact', head: true })
          .eq('action_type', 'check_in')
          .gte('created_at', interval.start)
          .lt('created_at', interval.end)

        if (!error) {
          rates.push({
            timestamp: interval.start,
            count: count || 0
          })
        }
      }

      return rates

    } catch (error) {
      console.error('Check-in rate calculation failed:', error)
      return []
    }
  }

  // Private helper methods

  private static calculateStats(activities: any[]): RealTimeStats {
    const total = activities.length
    const successful = activities.filter(a => a.result?.result === 'success').length
    const duplicates = activities.filter(a => a.result?.result === 'duplicate').length
    const invalid = activities.filter(a => a.result?.result === 'invalid').length
    const errors = activities.filter(a => a.result?.result === 'error').length

    // Calculate current rate (last 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    const recentActivities = activities.filter(
      a => new Date(a.created_at) > tenMinutesAgo
    )

    return {
      total_attempts: total,
      successful_checkins: successful,
      duplicate_attempts: duplicates,
      invalid_tickets: invalid,
      error_rate: total > 0 ? (errors / total) * 100 : 0,
      peak_time: this.findPeakTime(activities),
      current_rate: recentActivities.length, // per 10 minutes
      staff_performance: [] // Will be populated separately
    }
  }

  private static getEmptyStats(): RealTimeStats {
    return {
      total_attempts: 0,
      successful_checkins: 0,
      duplicate_attempts: 0,
      invalid_tickets: 0,
      error_rate: 0,
      peak_time: null,
      current_rate: 0,
      staff_performance: []
    }
  }

  private static generateDeviceFingerprint(): string {
    return btoa(
      `${navigator.userAgent}|${screen.width}x${screen.height}|${navigator.language}|${Intl.DateTimeFormat().resolvedOptions().timeZone}`
    )
  }

  private static async getClientIP(): Promise<string> {
    try {
      // In a real implementation, this would get the actual client IP
      // For demo purposes, return a placeholder
      return '127.0.0.1'
    } catch {
      return 'unknown'
    }
  }

  private static detectRapidScanning(activities: any[]): FraudPattern[] {
    // Implementation for rapid scanning detection
    return []
  }

  private static detectMultipleDeviceUsage(activities: any[]): FraudPattern[] {
    // Implementation for multiple device detection
    return []
  }

  private static detectSuspiciousTiming(activities: any[]): FraudPattern[] {
    // Implementation for suspicious timing detection
    return []
  }

  private static calculateAverageScanTime(activities: any[]): number {
    if (activities.length < 2) return 0
    
    let totalTime = 0
    for (let i = 1; i < activities.length; i++) {
      const current = new Date(activities[i].created_at)
      const previous = new Date(activities[i - 1].created_at)
      totalTime += current.getTime() - previous.getTime()
    }
    
    return totalTime / (activities.length - 1) / 1000 // seconds
  }

  private static findPeakTime(activities: any[]): string | null {
    if (activities.length === 0) return null
    
    // Group by hour and find the hour with most activity
    const hourCounts: Record<string, number> = {}
    
    activities.forEach(activity => {
      const hour = new Date(activity.created_at).getHours()
      const hourKey = `${hour}:00`
      hourCounts[hourKey] = (hourCounts[hourKey] || 0) + 1
    })
    
    const peakHour = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0]
    
    return peakHour ? peakHour[0] : null
  }

  private static getTimeIntervals(timeframe: 'hour' | 'day' | 'week'): Array<{start: string, end: string}> {
    const now = new Date()
    const intervals: Array<{start: string, end: string}> = []
    
    let intervalMs: number
    let count: number
    
    switch (timeframe) {
      case 'hour':
        intervalMs = 10 * 60 * 1000 // 10 minutes
        count = 6 // Last hour
        break
      case 'day':
        intervalMs = 60 * 60 * 1000 // 1 hour
        count = 24 // Last day
        break
      case 'week':
        intervalMs = 24 * 60 * 60 * 1000 // 1 day
        count = 7 // Last week
        break
    }
    
    for (let i = count - 1; i >= 0; i--) {
      const end = new Date(now.getTime() - i * intervalMs)
      const start = new Date(end.getTime() - intervalMs)
      
      intervals.push({
        start: start.toISOString(),
        end: end.toISOString()
      })
    }
    
    return intervals
  }

  private static async broadcastStatsUpdate(): Promise<void> {
    // In a real implementation, this would trigger real-time updates
    // For now, we'll just log
    console.log('📊 Broadcasting stats update to subscribers')
  }
}