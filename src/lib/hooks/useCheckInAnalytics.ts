/**
 * Check-in Analytics Hook for real-time statistics and duplicate detection
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { CheckInAnalyticsService, RealTimeStats, DuplicateAlert, FraudPattern, StaffPerformance } from '@/lib/services/CheckInAnalyticsService'

export interface UseCheckInAnalyticsOptions {
  eventId: string
  autoRefresh?: boolean
  refreshInterval?: number
  enableDuplicateAlerts?: boolean
  enableFraudDetection?: boolean
}

export interface CheckInAnalyticsState {
  stats: RealTimeStats | null
  staffPerformance: StaffPerformance[]
  duplicateAlerts: DuplicateAlert[]
  fraudPatterns: FraudPattern[]
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

export function useCheckInAnalytics({
  eventId,
  autoRefresh = true,
  refreshInterval = 10000, // 10 seconds
  enableDuplicateAlerts = true,
  enableFraudDetection = true
}: UseCheckInAnalyticsOptions) {
  const [state, setState] = useState<CheckInAnalyticsState>({
    stats: null,
    staffPerformance: [],
    duplicateAlerts: [],
    fraudPatterns: [],
    loading: true,
    error: null,
    lastUpdated: null
  })

  const refreshIntervalRef = useRef<NodeJS.Timeout>()
  const isUnmountedRef = useRef(false)

  const loadAnalytics = useCallback(async () => {
    if (isUnmountedRef.current) return

    try {
      setState(prev => ({ ...prev, error: null }))

      const [stats, staffPerformance, fraudPatterns] = await Promise.all([
        CheckInAnalyticsService.getRealTimeStats(eventId),
        CheckInAnalyticsService.getStaffPerformance(eventId),
        enableFraudDetection 
          ? CheckInAnalyticsService.detectFraudPatterns(eventId)
          : Promise.resolve([])
      ])

      if (isUnmountedRef.current) return

      setState(prev => ({
        ...prev,
        stats,
        staffPerformance,
        fraudPatterns,
        loading: false,
        lastUpdated: new Date()
      }))

    } catch (error) {
      if (isUnmountedRef.current) return

      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load analytics',
        loading: false
      }))
      console.error('useCheckInAnalytics.loadAnalytics failed:', error)
    }
  }, [eventId, enableFraudDetection])

  // Initial load
  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return

    refreshIntervalRef.current = setInterval(loadAnalytics, refreshInterval)

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [autoRefresh, refreshInterval, loadAnalytics])

  // Duplicate alerts subscription
  useEffect(() => {
    if (!enableDuplicateAlerts) return

    const unsubscribe = CheckInAnalyticsService.subscribeToDuplicateAlerts((alert) => {
      setState(prev => ({
        ...prev,
        duplicateAlerts: [alert, ...prev.duplicateAlerts].slice(0, 50) // Keep last 50 alerts
      }))
    })

    return unsubscribe
  }, [enableDuplicateAlerts])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [])

  const markDuplicateResolved = useCallback((alertId: string) => {
    setState(prev => ({
      ...prev,
      duplicateAlerts: prev.duplicateAlerts.map(alert =>
        alert.id === alertId ? { ...alert, resolved: true } : alert
      )
    }))
  }, [])

  const clearDuplicateAlerts = useCallback(() => {
    setState(prev => ({
      ...prev,
      duplicateAlerts: []
    }))
  }, [])

  const refreshAnalytics = useCallback(() => {
    setState(prev => ({ ...prev, loading: true }))
    loadAnalytics()
  }, [loadAnalytics])

  return {
    ...state,
    markDuplicateResolved,
    clearDuplicateAlerts,
    refreshAnalytics,
    isRefreshing: state.loading && state.stats !== null
  }
}

/**
 * Hook for real-time check-in rate monitoring
 */
export function useCheckInRate(eventId: string, timeframe: 'hour' | 'day' | 'week' = 'hour') {
  const [rateData, setRateData] = useState<{ timestamp: string, count: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadRateData = async () => {
      try {
        setError(null)
        const data = await CheckInAnalyticsService.getCheckInRateOverTime(eventId, timeframe)
        setRateData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load rate data')
      } finally {
        setLoading(false)
      }
    }

    loadRateData()
  }, [eventId, timeframe])

  return { rateData, loading, error }
}

/**
 * Hook for duplicate detection alerts only
 */
export function useDuplicateAlerts(eventId: string) {
  const [alerts, setAlerts] = useState<DuplicateAlert[]>([])
  const [newAlertCount, setNewAlertCount] = useState(0)

  useEffect(() => {
    const unsubscribe = CheckInAnalyticsService.subscribeToDuplicateAlerts((alert) => {
      setAlerts(prev => [alert, ...prev])
      setNewAlertCount(prev => prev + 1)
    })

    return unsubscribe
  }, [])

  const markAllRead = useCallback(() => {
    setNewAlertCount(0)
  }, [])

  const resolveAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ))
  }, [])

  return {
    alerts,
    newAlertCount,
    markAllRead,
    resolveAlert,
    unresolvedAlerts: alerts.filter(alert => !alert.resolved)
  }
}

/**
 * Hook for staff performance monitoring
 */
export function useStaffPerformance(eventId: string) {
  const [performance, setPerformance] = useState<StaffPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPerformance = useCallback(async () => {
    try {
      setError(null)
      const data = await CheckInAnalyticsService.getStaffPerformance(eventId)
      setPerformance(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load staff performance')
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    loadPerformance()
  }, [loadPerformance])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadPerformance, 30000)
    return () => clearInterval(interval)
  }, [loadPerformance])

  const getTopPerformer = useCallback(() => {
    return performance.reduce((top, current) => {
      const currentScore = current.successful_scans / Math.max(current.total_scans, 1)
      const topScore = top.successful_scans / Math.max(top.total_scans, 1)
      return currentScore > topScore ? current : top
    }, performance[0] || null)
  }, [performance])

  const getAveragePerformance = useCallback(() => {
    if (performance.length === 0) return null

    const totals = performance.reduce(
      (acc, staff) => ({
        totalScans: acc.totalScans + staff.total_scans,
        successfulScans: acc.successfulScans + staff.successful_scans,
        duplicateDetections: acc.duplicateDetections + staff.duplicate_detections,
        errorCount: acc.errorCount + staff.error_count
      }),
      { totalScans: 0, successfulScans: 0, duplicateDetections: 0, errorCount: 0 }
    )

    return {
      averageScans: totals.totalScans / performance.length,
      averageSuccessRate: totals.successfulScans / Math.max(totals.totalScans, 1),
      averageDuplicateDetections: totals.duplicateDetections / performance.length,
      averageErrors: totals.errorCount / performance.length
    }
  }, [performance])

  return {
    performance,
    loading,
    error,
    refreshPerformance: loadPerformance,
    topPerformer: getTopPerformer(),
    averagePerformance: getAveragePerformance()
  }
}