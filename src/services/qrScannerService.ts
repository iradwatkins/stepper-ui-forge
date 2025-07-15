import { supabase } from '@/lib/supabase'
import { TicketEntryLogInsert } from '@/types/database'

export interface ScanResult {
  success: boolean
  message: string
  ticket_id?: string
  holder_name?: string
  ticket_type?: string
  already_used?: boolean
  entry_log_id?: string
}

export interface ScanStats {
  total_scans: number
  successful_scans: number
  failed_scans: number
  last_scan_at?: string
}

export interface TicketInfo {
  id: string
  holder_name: string
  holder_email: string
  ticket_type: string
  qr_code: string
  backup_code: string
  checked_in_at?: string
  checked_in_by?: string
  is_checked_in: boolean
}

export class QRScannerService {
  /**
   * Validate ticket entry using QR code or 7-digit backup code
   */
  static async validateTicketEntry(
    eventId: string, 
    code: string, 
    scannedBy: string, 
    isManualEntry: boolean = false
  ): Promise<ScanResult> {
    try {
      // Call the database function to validate the ticket
      const { data, error } = await supabase
        .rpc('validate_ticket_entry', {
          event_id_param: eventId,
          code_param: code,
          scanned_by_param: scannedBy,
          is_manual: isManualEntry
        })

      if (error) {
        console.error('Error validating ticket:', error)
        throw new Error('Failed to validate ticket')
      }

      const result = data?.[0]
      if (!result) {
        throw new Error('No validation result returned')
      }

      // Log the scan attempt
      const entryLogId = await this.logScanAttempt({
        ticket_id: result.ticket_id,
        event_id: eventId,
        scanned_by: scannedBy,
        scan_method: isManualEntry ? 'backup_code' : 'qr_code',
        success: result.success,
        failure_reason: result.success ? null : result.message
      })

      return {
        success: result.success,
        message: result.message,
        ticket_id: result.ticket_id,
        holder_name: result.holder_name,
        ticket_type: result.ticket_type,
        already_used: result.already_used,
        entry_log_id: entryLogId
      }

    } catch (error) {
      console.error('Error validating ticket entry:', error)
      
      // Log failed attempt
      await this.logScanAttempt({
        ticket_id: null,
        event_id: eventId,
        scanned_by: scannedBy,
        scan_method: isManualEntry ? 'backup_code' : 'qr_code',
        success: false,
        failure_reason: error instanceof Error ? error.message : 'Unknown error'
      })

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Validation failed'
      }
    }
  }

  /**
   * Log scan attempt to ticket_entry_logs table
   */
  private static async logScanAttempt(logData: {
    ticket_id: string | null,
    event_id: string,
    scanned_by: string,
    scan_method: string,
    success: boolean,
    failure_reason?: string | null
  }): Promise<string | undefined> {
    try {
      const entryLog: TicketEntryLogInsert = {
        ticket_id: logData.ticket_id!,
        event_id: logData.event_id,
        scanned_by: logData.scanned_by,
        scan_method: logData.scan_method,
        success: logData.success,
        failure_reason: logData.failure_reason,
        device_info: {
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          platform: navigator.platform
        }
      }

      const { data, error } = await supabase
        .from('ticket_entry_logs')
        .insert(entryLog)
        .select('id')
        .single()

      if (error) {
        console.error('Error logging scan attempt:', error)
        return undefined
      }

      return data?.id
    } catch (error) {
      console.error('Error logging scan attempt:', error)
      return undefined
    }
  }

  /**
   * Get scan statistics for a team member
   */
  static async getTeamMemberScanStats(
    teamMemberId: string, 
    eventId: string
  ): Promise<ScanStats> {
    try {
      const { data, error } = await supabase
        .rpc('get_team_member_scan_stats', {
          team_member_id: teamMemberId,
          event_id_param: eventId
        })

      if (error) {
        console.error('Error fetching scan stats:', error)
        throw new Error('Failed to fetch scan statistics')
      }

      const stats = data?.[0]
      return {
        total_scans: stats?.total_scans || 0,
        successful_scans: stats?.successful_scans || 0,
        failed_scans: stats?.failed_scans || 0,
        last_scan_at: stats?.last_scan_at
      }
    } catch (error) {
      console.error('Error fetching scan stats:', error)
      return {
        total_scans: 0,
        successful_scans: 0,
        failed_scans: 0
      }
    }
  }

  /**
   * Get recent scan history for an event
   */
  static async getEventScanHistory(
    eventId: string, 
    limit: number = 50
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('ticket_entry_logs')
        .select(`
          *,
          ticket:tickets(holder_name, holder_email, backup_code),
          scanner:profiles!scanned_by(full_name, email)
        `)
        .eq('event_id', eventId)
        .order('scanned_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching scan history:', error)
        throw new Error('Failed to fetch scan history')
      }

      return data || []
    } catch (error) {
      console.error('Error fetching scan history:', error)
      return []
    }
  }

  /**
   * Get ticket information by QR code or backup code
   */
  static async getTicketInfo(
    eventId: string, 
    code: string, 
    isBackupCode: boolean = false
  ): Promise<TicketInfo | null> {
    try {
      let query = supabase
        .from('tickets')
        .select(`
          id,
          holder_name,
          holder_email,
          qr_code,
          backup_code,
          checked_in_at,
          checked_in_by,
          ticket_type:ticket_types(name)
        `)
        .eq('event_id', eventId)

      if (isBackupCode) {
        query = query.eq('backup_code', code)
      } else {
        query = query.eq('qr_code', code)
      }

      const { data, error } = await query.single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Ticket not found
        }
        console.error('Error fetching ticket info:', error)
        throw new Error('Failed to fetch ticket information')
      }

      return {
        id: data.id,
        holder_name: data.holder_name || '',
        holder_email: data.holder_email,
        ticket_type: data.ticket_type?.name || '',
        qr_code: data.qr_code,
        backup_code: data.backup_code,
        checked_in_at: data.checked_in_at,
        checked_in_by: data.checked_in_by,
        is_checked_in: !!data.checked_in_at
      }
    } catch (error) {
      console.error('Error fetching ticket info:', error)
      return null
    }
  }

  /**
   * Parse QR code data (handles both JSON and plain text formats)
   */
  static parseQRCode(qrData: string): {
    eventId?: string,
    ticketId?: string,
    backupCode?: string,
    isValid: boolean
  } {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(qrData)
      
      return {
        eventId: parsed.eventId,
        ticketId: parsed.ticketId,
        backupCode: parsed.backupCode,
        isValid: !!(parsed.eventId && parsed.ticketId)
      }
    } catch {
      // If not JSON, treat as backup code (7-digit alphanumeric)
      const isBackupCode = /^[A-Z0-9]{7}$/.test(qrData)
      
      return {
        backupCode: isBackupCode ? qrData : undefined,
        isValid: isBackupCode
      }
    }
  }

  /**
   * Generate QR code data for a ticket
   */
  static generateQRCodeData(
    eventId: string, 
    ticketId: string, 
    backupCode: string
  ): string {
    return JSON.stringify({
      eventId,
      ticketId,
      backupCode,
      timestamp: Date.now(),
      version: '1.0'
    })
  }

  /**
   * Check if user can scan for an event (team member permissions)
   */
  static async canUserScanForEvent(
    userId: string, 
    eventId: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('status')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .single()

      if (error) {
        return false
      }

      return data?.status === 'active'
    } catch (error) {
      console.error('Error checking scan permissions:', error)
      return false
    }
  }
}