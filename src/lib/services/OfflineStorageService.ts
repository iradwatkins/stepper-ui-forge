/**
 * Offline Storage Service using IndexedDB for PWA offline functionality
 * 
 * This service provides offline data storage and synchronization capabilities
 * for Epic 4.0 team check-in system including:
 * - Offline ticket validation data caching
 * - Queued check-in operations for sync when online
 * - Event team member data caching
 * - Session persistence across app restarts
 */

export interface OfflineTicket {
  id: string
  qr_code: string
  holder_email: string
  holder_name: string | null
  status: 'active' | 'used' | 'refunded' | 'cancelled'
  event_id: string
  ticket_type_name: string
  cached_at: string
  expires_at: string
}

export interface QueuedCheckIn {
  id: string
  ticket_id: string
  qr_code: string
  checked_in_by: string | null
  checked_in_at: string
  session_id: string | null
  synced: boolean
  sync_attempts: number
  created_at: string
  error_message?: string
}

export interface CachedEvent {
  id: string
  title: string
  date: string
  time: string
  location: string
  cached_at: string
}

export interface CachedTeamMember {
  id: string
  event_id: string
  user_id: string
  role_type: string
  permissions: Record<string, boolean>
  user_profile: {
    email: string
    full_name: string | null
  }
  cached_at: string
}

export interface OfflineSession {
  id: string
  event_id: string
  staff_member_id: string
  device_info: Record<string, any>
  started_at: string
  ended_at: string | null
  is_active: boolean
  stats: {
    scanned: number
    validated: number
    checked_in: number
    errors: number
  }
}

export class OfflineStorageService {
  private static dbName = 'SteppersOfflineDB'
  private static dbVersion = 1
  private static db: IDBDatabase | null = null

  /**
   * Initialize the IndexedDB database
   */
  static async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Offline tickets store
        if (!db.objectStoreNames.contains('offline_tickets')) {
          const ticketsStore = db.createObjectStore('offline_tickets', { keyPath: 'id' })
          ticketsStore.createIndex('event_id', 'event_id', { unique: false })
          ticketsStore.createIndex('qr_code', 'qr_code', { unique: true })
          ticketsStore.createIndex('expires_at', 'expires_at', { unique: false })
        }

        // Queued check-ins store
        if (!db.objectStoreNames.contains('queued_checkins')) {
          const checkinsStore = db.createObjectStore('queued_checkins', { keyPath: 'id' })
          checkinsStore.createIndex('synced', 'synced', { unique: false })
          checkinsStore.createIndex('session_id', 'session_id', { unique: false })
          checkinsStore.createIndex('created_at', 'created_at', { unique: false })
        }

        // Cached events store
        if (!db.objectStoreNames.contains('cached_events')) {
          const eventsStore = db.createObjectStore('cached_events', { keyPath: 'id' })
          eventsStore.createIndex('cached_at', 'cached_at', { unique: false })
        }

        // Cached team members store
        if (!db.objectStoreNames.contains('cached_team_members')) {
          const teamStore = db.createObjectStore('cached_team_members', { keyPath: 'id' })
          teamStore.createIndex('event_id', 'event_id', { unique: false })
          teamStore.createIndex('user_id', 'user_id', { unique: false })
        }

        // Offline sessions store
        if (!db.objectStoreNames.contains('offline_sessions')) {
          const sessionsStore = db.createObjectStore('offline_sessions', { keyPath: 'id' })
          sessionsStore.createIndex('event_id', 'event_id', { unique: false })
          sessionsStore.createIndex('staff_member_id', 'staff_member_id', { unique: false })
          sessionsStore.createIndex('is_active', 'is_active', { unique: false })
        }
      }
    })
  }

  /**
   * Cache ticket data for offline validation
   */
  static async cacheTickets(eventId: string, tickets: any[]): Promise<void> {
    if (!this.db) await this.initialize()

    const transaction = this.db!.transaction(['offline_tickets'], 'readwrite')
    const store = transaction.objectStore('offline_tickets')

    for (const ticket of tickets) {
      const offlineTicket: OfflineTicket = {
        id: ticket.id,
        qr_code: ticket.qr_code,
        holder_email: ticket.holder_email,
        holder_name: ticket.holder_name,
        status: ticket.status,
        event_id: eventId,
        ticket_type_name: ticket.ticket_types?.name || 'General',
        cached_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      }
      store.put(offlineTicket)
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  /**
   * Get cached ticket by QR code for offline validation
   */
  static async getCachedTicketByQR(qrCode: string): Promise<OfflineTicket | null> {
    if (!this.db) await this.initialize()

    const transaction = this.db!.transaction(['offline_tickets'], 'readonly')
    const store = transaction.objectStore('offline_tickets')
    const index = store.index('qr_code')

    return new Promise((resolve, reject) => {
      const request = index.get(qrCode)
      request.onsuccess = () => {
        const ticket = request.result as OfflineTicket
        if (ticket && new Date(ticket.expires_at) > new Date()) {
          resolve(ticket)
        } else {
          resolve(null)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Queue a check-in for later sync
   */
  static async queueCheckIn(checkInData: Omit<QueuedCheckIn, 'id' | 'synced' | 'sync_attempts' | 'created_at'>): Promise<string> {
    if (!this.db) await this.initialize()

    const queuedCheckIn: QueuedCheckIn = {
      ...checkInData,
      id: `queued_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      synced: false,
      sync_attempts: 0,
      created_at: new Date().toISOString()
    }

    const transaction = this.db!.transaction(['queued_checkins'], 'readwrite')
    const store = transaction.objectStore('queued_checkins')

    return new Promise((resolve, reject) => {
      const request = store.add(queuedCheckIn)
      request.onsuccess = () => resolve(queuedCheckIn.id)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get all unsynced check-ins
   */
  static async getUnsyncedCheckIns(): Promise<QueuedCheckIn[]> {
    if (!this.db) await this.initialize()

    const transaction = this.db!.transaction(['queued_checkins'], 'readonly')
    const store = transaction.objectStore('queued_checkins')
    const index = store.index('synced')

    return new Promise((resolve, reject) => {
      const request = index.getAll(false)
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Mark a queued check-in as synced
   */
  static async markCheckInSynced(queuedId: string): Promise<void> {
    if (!this.db) await this.initialize()

    const transaction = this.db!.transaction(['queued_checkins'], 'readwrite')
    const store = transaction.objectStore('queued_checkins')

    return new Promise((resolve, reject) => {
      const getRequest = store.get(queuedId)
      getRequest.onsuccess = () => {
        const checkIn = getRequest.result as QueuedCheckIn
        if (checkIn) {
          checkIn.synced = true
          const putRequest = store.put(checkIn)
          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => reject(putRequest.error)
        } else {
          resolve()
        }
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  /**
   * Cache event data
   */
  static async cacheEvent(event: any): Promise<void> {
    if (!this.db) await this.initialize()

    const cachedEvent: CachedEvent = {
      id: event.id,
      title: event.title,
      date: event.date,
      time: event.time,
      location: event.location,
      cached_at: new Date().toISOString()
    }

    const transaction = this.db!.transaction(['cached_events'], 'readwrite')
    const store = transaction.objectStore('cached_events')

    return new Promise((resolve, reject) => {
      const request = store.put(cachedEvent)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get cached event
   */
  static async getCachedEvent(eventId: string): Promise<CachedEvent | null> {
    if (!this.db) await this.initialize()

    const transaction = this.db!.transaction(['cached_events'], 'readonly')
    const store = transaction.objectStore('cached_events')

    return new Promise((resolve, reject) => {
      const request = store.get(eventId)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Cache team members data
   */
  static async cacheTeamMembers(eventId: string, teamMembers: any[]): Promise<void> {
    if (!this.db) await this.initialize()

    const transaction = this.db!.transaction(['cached_team_members'], 'readwrite')
    const store = transaction.objectStore('cached_team_members')

    // Clear existing team members for this event
    const index = store.index('event_id')
    const range = IDBKeyRange.only(eventId)
    const deleteRequest = index.openCursor(range)
    
    deleteRequest.onsuccess = () => {
      const cursor = deleteRequest.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      } else {
        // Add new team members
        for (const member of teamMembers) {
          const cachedMember: CachedTeamMember = {
            id: member.id,
            event_id: eventId,
            user_id: member.user_id,
            role_type: member.role_type,
            permissions: member.permissions,
            user_profile: {
              email: member.user_profile?.email || '',
              full_name: member.user_profile?.full_name || null
            },
            cached_at: new Date().toISOString()
          }
          store.put(cachedMember)
        }
      }
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  /**
   * Get cached team members
   */
  static async getCachedTeamMembers(eventId: string): Promise<CachedTeamMember[]> {
    if (!this.db) await this.initialize()

    const transaction = this.db!.transaction(['cached_team_members'], 'readonly')
    const store = transaction.objectStore('cached_team_members')
    const index = store.index('event_id')

    return new Promise((resolve, reject) => {
      const request = index.getAll(eventId)
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Save offline session
   */
  static async saveOfflineSession(session: OfflineSession): Promise<void> {
    if (!this.db) await this.initialize()

    const transaction = this.db!.transaction(['offline_sessions'], 'readwrite')
    const store = transaction.objectStore('offline_sessions')

    return new Promise((resolve, reject) => {
      const request = store.put(session)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get active offline session
   */
  static async getActiveSession(eventId: string, staffMemberId: string): Promise<OfflineSession | null> {
    if (!this.db) await this.initialize()

    const transaction = this.db!.transaction(['offline_sessions'], 'readonly')
    const store = transaction.objectStore('offline_sessions')

    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => {
        const sessions = request.result as OfflineSession[]
        const activeSession = sessions.find(s => 
          s.event_id === eventId && 
          s.staff_member_id === staffMemberId && 
          s.is_active
        )
        resolve(activeSession || null)
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Update session stats
   */
  static async updateSessionStats(sessionId: string, stats: Partial<OfflineSession['stats']>): Promise<void> {
    if (!this.db) await this.initialize()

    const transaction = this.db!.transaction(['offline_sessions'], 'readwrite')
    const store = transaction.objectStore('offline_sessions')

    return new Promise((resolve, reject) => {
      const getRequest = store.get(sessionId)
      getRequest.onsuccess = () => {
        const session = getRequest.result as OfflineSession
        if (session) {
          session.stats = { ...session.stats, ...stats }
          const putRequest = store.put(session)
          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => reject(putRequest.error)
        } else {
          resolve()
        }
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  /**
   * Clean up expired data
   */
  static async cleanup(): Promise<void> {
    if (!this.db) await this.initialize()

    const transaction = this.db!.transaction(['offline_tickets', 'queued_checkins'], 'readwrite')
    
    // Clean expired tickets
    const ticketsStore = transaction.objectStore('offline_tickets')
    const ticketsIndex = ticketsStore.index('expires_at')
    const expiredRange = IDBKeyRange.upperBound(new Date().toISOString())
    
    const expiredTicketsRequest = ticketsIndex.openCursor(expiredRange)
    expiredTicketsRequest.onsuccess = () => {
      const cursor = expiredTicketsRequest.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }

    // Clean old synced check-ins (older than 7 days)
    const checkinsStore = transaction.objectStore('queued_checkins')
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    
    const oldCheckinsRequest = checkinsStore.openCursor()
    oldCheckinsRequest.onsuccess = () => {
      const cursor = oldCheckinsRequest.result
      if (cursor) {
        const checkIn = cursor.value as QueuedCheckIn
        if (checkIn.synced && checkIn.created_at < weekAgo) {
          cursor.delete()
        }
        cursor.continue()
      }
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  /**
   * Get storage usage statistics
   */
  static async getStorageStats(): Promise<{
    tickets: number
    queuedCheckIns: number
    events: number
    teamMembers: number
    sessions: number
  }> {
    if (!this.db) await this.initialize()

    const transaction = this.db!.transaction([
      'offline_tickets', 
      'queued_checkins', 
      'cached_events', 
      'cached_team_members', 
      'offline_sessions'
    ], 'readonly')

    const promises = [
      this.getStoreCount(transaction.objectStore('offline_tickets')),
      this.getStoreCount(transaction.objectStore('queued_checkins')),
      this.getStoreCount(transaction.objectStore('cached_events')),
      this.getStoreCount(transaction.objectStore('cached_team_members')),
      this.getStoreCount(transaction.objectStore('offline_sessions'))
    ]

    const [tickets, queuedCheckIns, events, teamMembers, sessions] = await Promise.all(promises)

    return {
      tickets,
      queuedCheckIns,
      events,
      teamMembers,
      sessions
    }
  }

  private static getStoreCount(store: IDBObjectStore): Promise<number> {
    return new Promise((resolve, reject) => {
      const request = store.count()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Clear all offline data
   */
  static async clearAllData(): Promise<void> {
    if (!this.db) await this.initialize()

    const transaction = this.db!.transaction([
      'offline_tickets', 
      'queued_checkins', 
      'cached_events', 
      'cached_team_members', 
      'offline_sessions'
    ], 'readwrite')

    const stores = [
      'offline_tickets',
      'queued_checkins', 
      'cached_events', 
      'cached_team_members', 
      'offline_sessions'
    ]

    stores.forEach(storeName => {
      transaction.objectStore(storeName).clear()
    })

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }
}