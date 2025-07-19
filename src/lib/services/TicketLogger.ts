import { supabase } from '@/integrations/supabase/client';

export enum TicketLogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export enum TicketEventType {
  // Ticket lifecycle
  TICKET_CREATED = 'ticket_created',
  TICKET_SENT = 'ticket_sent',
  TICKET_VIEWED = 'ticket_viewed',
  TICKET_VALIDATED = 'ticket_validated',
  TICKET_CHECKED_IN = 'ticket_checked_in',
  TICKET_CANCELLED = 'ticket_cancelled',
  TICKET_REFUNDED = 'ticket_refunded',
  
  // Validation events
  VALIDATION_SUCCESS = 'validation_success',
  VALIDATION_FAILED = 'validation_failed',
  VALIDATION_RATE_LIMITED = 'validation_rate_limited',
  VALIDATION_HASH_MISMATCH = 'validation_hash_mismatch',
  
  // Check-in events
  CHECKIN_SUCCESS = 'checkin_success',
  CHECKIN_FAILED = 'checkin_failed',
  CHECKIN_DUPLICATE = 'checkin_duplicate',
  
  // Error events
  QR_GENERATION_FAILED = 'qr_generation_failed',
  EMAIL_SEND_FAILED = 'email_send_failed',
  DATABASE_ERROR = 'database_error',
  
  // Analytics events
  ANALYTICS_QUERY = 'analytics_query',
  REPORT_GENERATED = 'report_generated',
}

interface TicketLogEntry {
  id?: string;
  timestamp: Date;
  level: TicketLogLevel;
  event_type: TicketEventType;
  ticket_id?: string;
  event_id?: string;
  user_id?: string;
  organizer_id?: string;
  message: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  duration_ms?: number;
  error_code?: string;
  stack_trace?: string;
}

export class TicketLogger {
  private static instance: TicketLogger;
  private buffer: TicketLogEntry[] = [];
  private flushInterval: number = 5000; // 5 seconds
  private maxBufferSize: number = 100;
  private timer?: NodeJS.Timeout;

  private constructor() {
    this.startAutoFlush();
  }

  static getInstance(): TicketLogger {
    if (!TicketLogger.instance) {
      TicketLogger.instance = new TicketLogger();
    }
    return TicketLogger.instance;
  }

  /**
   * Log a ticket event
   */
  async log(
    level: TicketLogLevel,
    eventType: TicketEventType,
    message: string,
    options: Partial<TicketLogEntry> = {}
  ): Promise<void> {
    const entry: TicketLogEntry = {
      timestamp: new Date(),
      level,
      event_type: eventType,
      message,
      ...options,
    };

    // Add to buffer
    this.buffer.push(entry);

    // Console log in development
    if (import.meta.env.DEV) {
      this.consoleLog(entry);
    }

    // Flush if buffer is full
    if (this.buffer.length >= this.maxBufferSize) {
      await this.flush();
    }
  }

  /**
   * Convenience methods for different log levels
   */
  debug(eventType: TicketEventType, message: string, options?: Partial<TicketLogEntry>): Promise<void> {
    return this.log(TicketLogLevel.DEBUG, eventType, message, options);
  }

  info(eventType: TicketEventType, message: string, options?: Partial<TicketLogEntry>): Promise<void> {
    return this.log(TicketLogLevel.INFO, eventType, message, options);
  }

  warn(eventType: TicketEventType, message: string, options?: Partial<TicketLogEntry>): Promise<void> {
    return this.log(TicketLogLevel.WARN, eventType, message, options);
  }

  error(eventType: TicketEventType, message: string, error?: Error, options?: Partial<TicketLogEntry>): Promise<void> {
    return this.log(TicketLogLevel.ERROR, eventType, message, {
      ...options,
      error_code: error?.name,
      stack_trace: error?.stack,
      metadata: {
        ...options?.metadata,
        error_message: error?.message,
      },
    });
  }

  /**
   * Log ticket creation
   */
  async logTicketCreated(ticketId: string, eventId: string, userId: string, metadata?: Record<string, any>): Promise<void> {
    await this.info(TicketEventType.TICKET_CREATED, `Ticket created for event`, {
      ticket_id: ticketId,
      event_id: eventId,
      user_id: userId,
      metadata,
    });
  }

  /**
   * Log ticket validation attempt
   */
  async logValidation(
    ticketId: string,
    success: boolean,
    message: string,
    ipAddress?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const eventType = success ? TicketEventType.VALIDATION_SUCCESS : TicketEventType.VALIDATION_FAILED;
    const level = success ? TicketLogLevel.INFO : TicketLogLevel.WARN;
    
    await this.log(level, eventType, message, {
      ticket_id: ticketId,
      ip_address: ipAddress,
      metadata,
    });
  }

  /**
   * Log check-in attempt
   */
  async logCheckIn(
    ticketId: string,
    success: boolean,
    checkedInBy: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const eventType = success ? TicketEventType.CHECKIN_SUCCESS : TicketEventType.CHECKIN_FAILED;
    const level = success ? TicketLogLevel.INFO : TicketLogLevel.WARN;
    
    await this.log(level, eventType, message, {
      ticket_id: ticketId,
      user_id: checkedInBy,
      metadata,
    });
  }

  /**
   * Log performance metrics
   */
  async logPerformance(
    operation: string,
    durationMs: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (durationMs > 1000) {
      // Log slow operations as warnings
      await this.warn(TicketEventType.ANALYTICS_QUERY, `Slow operation: ${operation}`, {
        duration_ms: durationMs,
        metadata,
      });
    } else {
      await this.debug(TicketEventType.ANALYTICS_QUERY, `Operation completed: ${operation}`, {
        duration_ms: durationMs,
        metadata,
      });
    }
  }

  /**
   * Flush buffer to database
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      // Transform entries for database
      const dbEntries = entries.map(entry => ({
        level: entry.level,
        event_type: entry.event_type,
        ticket_id: entry.ticket_id,
        event_id: entry.event_id,
        user_id: entry.user_id,
        organizer_id: entry.organizer_id,
        message: entry.message,
        metadata: entry.metadata,
        ip_address: entry.ip_address,
        user_agent: entry.user_agent,
        duration_ms: entry.duration_ms,
        error_code: entry.error_code,
        stack_trace: entry.stack_trace,
        created_at: entry.timestamp.toISOString(),
      }));

      const { error } = await supabase
        .from('ticket_logs')
        .insert(dbEntries);

      if (error) {
        console.error('Failed to write ticket logs:', error);
        // Re-add to buffer if failed (with limit to prevent infinite growth)
        if (this.buffer.length < this.maxBufferSize * 2) {
          this.buffer.unshift(...entries.slice(0, this.maxBufferSize));
        }
      }
    } catch (error) {
      console.error('Error flushing ticket logs:', error);
    }
  }

  /**
   * Start auto-flush timer
   */
  private startAutoFlush(): void {
    this.timer = setInterval(() => {
      this.flush().catch(console.error);
    }, this.flushInterval);
  }

  /**
   * Stop auto-flush timer
   */
  stopAutoFlush(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /**
   * Console log for development
   */
  private consoleLog(entry: TicketLogEntry): void {
    const color = {
      [TicketLogLevel.DEBUG]: 'color: gray',
      [TicketLogLevel.INFO]: 'color: blue',
      [TicketLogLevel.WARN]: 'color: orange',
      [TicketLogLevel.ERROR]: 'color: red',
    };

    const prefix = `[${entry.event_type}]`;
    const details = {
      ticketId: entry.ticket_id,
      eventId: entry.event_id,
      userId: entry.user_id,
      duration: entry.duration_ms ? `${entry.duration_ms}ms` : undefined,
      metadata: entry.metadata,
    };

    // Remove undefined values
    Object.keys(details).forEach(key => {
      if (details[key as keyof typeof details] === undefined) {
        delete details[key as keyof typeof details];
      }
    });

    console.log(
      `%c${prefix} ${entry.message}`,
      color[entry.level],
      Object.keys(details).length > 0 ? details : ''
    );

    if (entry.stack_trace) {
      console.error(entry.stack_trace);
    }
  }

  /**
   * Query logs from database
   */
  static async queryLogs(filters: {
    ticket_id?: string;
    event_id?: string;
    user_id?: string;
    organizer_id?: string;
    event_type?: TicketEventType;
    level?: TicketLogLevel;
    start_date?: Date;
    end_date?: Date;
    limit?: number;
  }): Promise<TicketLogEntry[]> {
    let query = supabase
      .from('ticket_logs')
      .select('*');

    if (filters.ticket_id) {
      query = query.eq('ticket_id', filters.ticket_id);
    }
    if (filters.event_id) {
      query = query.eq('event_id', filters.event_id);
    }
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters.organizer_id) {
      query = query.eq('organizer_id', filters.organizer_id);
    }
    if (filters.event_type) {
      query = query.eq('event_type', filters.event_type);
    }
    if (filters.level) {
      query = query.eq('level', filters.level);
    }
    if (filters.start_date) {
      query = query.gte('created_at', filters.start_date.toISOString());
    }
    if (filters.end_date) {
      query = query.lte('created_at', filters.end_date.toISOString());
    }

    query = query.order('created_at', { ascending: false });

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error querying ticket logs:', error);
      return [];
    }

    return (data || []).map(row => ({
      ...row,
      timestamp: new Date(row.created_at),
    }));
  }
}

// Export singleton instance
export const ticketLogger = TicketLogger.getInstance();