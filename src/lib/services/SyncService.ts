/**
 * Sync Service for handling online/offline data synchronization
 * 
 * This service manages the synchronization between offline cached data
 * and the online Supabase database for Epic 4.0 team check-in system
 */

import { OfflineStorageService, QueuedCheckIn } from './OfflineStorageService'
import { QRValidationService } from './QRValidationService'
import { TeamService } from './TeamService'

export interface SyncResult {
  success: boolean
  synced_count: number
  failed_count: number
  errors: string[]
}

export interface SyncStatus {
  is_syncing: boolean
  last_sync: string | null
  pending_items: number
  network_status: 'online' | 'offline'
}

export class SyncService {
  private static syncInProgress = false
  private static lastSyncTime: string | null = null
  private static syncListeners: ((status: SyncStatus) => void)[] = []

  /**
   * Initialize the sync service
   */
  static async initialize(): Promise<void> {
    await OfflineStorageService.initialize()
    
    // Listen for network status changes
    window.addEventListener('online', this.handleNetworkOnline.bind(this))
    window.addEventListener('offline', this.handleNetworkOffline.bind(this))
    
    // Auto-sync when coming online
    if (navigator.onLine) {
      await this.autoSync()
    }
  }

  /**
   * Add a sync status listener
   */
  static addSyncListener(listener: (status: SyncStatus) => void): void {
    this.syncListeners.push(listener)
  }

  /**
   * Remove a sync status listener
   */
  static removeSyncListener(listener: (status: SyncStatus) => void): void {
    const index = this.syncListeners.indexOf(listener)
    if (index > -1) {
      this.syncListeners.splice(index, 1)
    }
  }

  /**
   * Notify all listeners of sync status change
   */
  private static notifyListeners(): void {
    const status = this.getSyncStatus()
    this.syncListeners.forEach(listener => listener(status))
  }

  /**
   * Get current sync status
   */
  static getSyncStatus(): SyncStatus {
    return {
      is_syncing: this.syncInProgress,
      last_sync: this.lastSyncTime,
      pending_items: 0, // Will be updated with actual count
      network_status: navigator.onLine ? 'online' : 'offline'
    }
  }

  /**
   * Handle network coming online
   */
  private static async handleNetworkOnline(): Promise<void> {
    console.log('🌐 Network online - starting auto-sync')
    await this.autoSync()
    this.notifyListeners()
  }

  /**
   * Handle network going offline
   */
  private static handleNetworkOffline(): void {
    console.log('📴 Network offline - sync paused')
    this.notifyListeners()
  }

  /**
   * Perform automatic sync when conditions are met
   */
  static async autoSync(): Promise<void> {
    if (!navigator.onLine || this.syncInProgress) return

    try {
      const pendingItems = await OfflineStorageService.getUnsyncedCheckIns()
      if (pendingItems.length > 0) {
        console.log(`🔄 Auto-syncing ${pendingItems.length} pending check-ins`)
        await this.syncAll()
      }
    } catch (error) {
      console.error('Auto-sync failed:', error)
    }
  }

  /**
   * Sync all pending data
   */
  static async syncAll(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        synced_count: 0,
        failed_count: 0,
        errors: ['Sync already in progress']
      }
    }

    if (!navigator.onLine) {
      return {
        success: false,
        synced_count: 0,
        failed_count: 0,
        errors: ['No network connection']
      }
    }

    this.syncInProgress = true
    this.notifyListeners()

    try {
      const result = await this.syncQueuedCheckIns()
      this.lastSyncTime = new Date().toISOString()
      
      // Clean up old data after successful sync
      if (result.success && result.failed_count === 0) {
        await OfflineStorageService.cleanup()
      }

      return result
    } catch (error) {
      console.error('Sync failed:', error)
      return {
        success: false,
        synced_count: 0,
        failed_count: 0,
        errors: [error instanceof Error ? error.message : 'Unknown sync error']
      }
    } finally {
      this.syncInProgress = false
      this.notifyListeners()
    }
  }

  /**
   * Sync queued check-ins to the server
   */
  private static async syncQueuedCheckIns(): Promise<SyncResult> {
    const queuedCheckIns = await OfflineStorageService.getUnsyncedCheckIns()
    let syncedCount = 0
    let failedCount = 0
    const errors: string[] = []

    console.log(`🔄 Syncing ${queuedCheckIns.length} queued check-ins`)

    for (const queuedCheckIn of queuedCheckIns) {
      try {
        // Attempt to validate and check in the ticket
        const result = await QRValidationService.validateAndCheckIn(
          queuedCheckIn.qr_code,
          queuedCheckIn.checked_in_by || undefined
        )

        if (result.success) {
          // Mark as synced in offline storage
          await OfflineStorageService.markCheckInSynced(queuedCheckIn.id)
          syncedCount++
          console.log(`✅ Synced check-in for ticket ${queuedCheckIn.ticket_id}`)
        } else {
          failedCount++
          errors.push(`Failed to sync ticket ${queuedCheckIn.ticket_id}: ${result.message}`)
          console.error(`❌ Failed to sync check-in for ticket ${queuedCheckIn.ticket_id}:`, result.message)
        }
      } catch (error) {
        failedCount++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Error syncing ticket ${queuedCheckIn.ticket_id}: ${errorMessage}`)
        console.error(`💥 Error syncing check-in for ticket ${queuedCheckIn.ticket_id}:`, error)
      }
    }

    return {
      success: errors.length === 0,
      synced_count: syncedCount,
      failed_count: failedCount,
      errors
    }
  }

  /**
   * Preload event data for offline use
   */
  static async preloadEventData(eventId: string): Promise<void> {
    if (!navigator.onLine) {
      throw new Error('Cannot preload data while offline')
    }

    try {
      console.log(`📥 Preloading data for event ${eventId}`)

      // Load and cache team members
      const teamResult = await TeamService.getEventTeamMembers(eventId)
      if (teamResult.success && teamResult.data) {
        await OfflineStorageService.cacheTeamMembers(eventId, teamResult.data)
        console.log(`✅ Cached ${teamResult.data.length} team members`)
      }

      // Note: In a real implementation, you would also load and cache:
      // - Event tickets for validation
      // - Event details
      // - Any other necessary offline data

      console.log(`✅ Preload completed for event ${eventId}`)
    } catch (error) {
      console.error('Failed to preload event data:', error)
      throw error
    }
  }

  /**
   * Force sync a specific queued check-in
   */
  static async forceSyncCheckIn(queuedId: string): Promise<boolean> {
    if (!navigator.onLine) return false

    try {
      const queuedCheckIns = await OfflineStorageService.getUnsyncedCheckIns()
      const checkIn = queuedCheckIns.find(c => c.id === queuedId)
      
      if (!checkIn) return false

      const result = await QRValidationService.validateAndCheckIn(
        checkIn.qr_code,
        checkIn.checked_in_by || undefined
      )

      if (result.success) {
        await OfflineStorageService.markCheckInSynced(checkIn.id)
        return true
      }

      return false
    } catch (error) {
      console.error('Force sync failed:', error)
      return false
    }
  }

  /**
   * Get detailed sync statistics
   */
  static async getSyncStats(): Promise<{
    network_status: 'online' | 'offline'
    last_sync: string | null
    pending_checkins: number
    storage_stats: any
    sync_in_progress: boolean
  }> {
    const [unsyncedCheckIns, storageStats] = await Promise.all([
      OfflineStorageService.getUnsyncedCheckIns(),
      OfflineStorageService.getStorageStats()
    ])

    return {
      network_status: navigator.onLine ? 'online' : 'offline',
      last_sync: this.lastSyncTime,
      pending_checkins: unsyncedCheckIns.length,
      storage_stats: storageStats,
      sync_in_progress: this.syncInProgress
    }
  }

  /**
   * Validate offline ticket (for offline validation)
   */
  static async validateOfflineTicket(qrCode: string): Promise<{
    valid: boolean
    ticket?: any
    cached: boolean
    message?: string
  }> {
    try {
      const cachedTicket = await OfflineStorageService.getCachedTicketByQR(qrCode)
      
      if (!cachedTicket) {
        return {
          valid: false,
          cached: false,
          message: 'Ticket not found in offline cache'
        }
      }

      // Check ticket status
      if (cachedTicket.status !== 'active') {
        return {
          valid: false,
          cached: true,
          ticket: cachedTicket,
          message: `Ticket is ${cachedTicket.status}`
        }
      }

      return {
        valid: true,
        cached: true,
        ticket: cachedTicket,
        message: 'Valid ticket (offline validation)'
      }
    } catch (error) {
      console.error('Offline validation failed:', error)
      return {
        valid: false,
        cached: false,
        message: 'Offline validation error'
      }
    }
  }

  /**
   * Queue a check-in for later sync (offline mode)
   */
  static async queueOfflineCheckIn(
    ticketId: string,
    qrCode: string,
    checkedInBy: string | null,
    sessionId?: string
  ): Promise<string> {
    const queuedId = await OfflineStorageService.queueCheckIn({
      ticket_id: ticketId,
      qr_code: qrCode,
      checked_in_by: checkedInBy,
      checked_in_at: new Date().toISOString(),
      session_id: sessionId || null
    })

    console.log(`📝 Queued check-in for offline sync: ${queuedId}`)
    this.notifyListeners()
    
    return queuedId
  }

  /**
   * Clear all offline data (for debugging/reset)
   */
  static async clearOfflineData(): Promise<void> {
    await OfflineStorageService.clearAllData()
    this.lastSyncTime = null
    this.notifyListeners()
    console.log('🗑️ All offline data cleared')
  }
}