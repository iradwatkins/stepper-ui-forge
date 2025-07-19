import { supabase } from '../supabase';
import { startOfDay, subDays, format } from 'date-fns';

interface TicketAnalyticsData {
  salesTrend: Array<{ date: string; sales: number; revenue: number }>;
  topEvents: Array<{ name: string; tickets_sold: number; revenue: number }>;
  salesByType: Array<{ type: string; count: number; percentage: number }>;
  timeDistribution: Array<{ hour: number; sales: number }>;
}

interface DateRange {
  start: Date;
  end: Date;
}

export class AnalyticsService {
  /**
   * Get ticket analytics for an organizer
   */
  static async getTicketAnalytics(
    organizerId: string,
    timeRange: '7d' | '30d' | '90d' | '1y' = '30d'
  ): Promise<TicketAnalyticsData> {
    const dateRange = this.getDateRange(timeRange);
    
    const [salesTrend, topEvents, salesByType, timeDistribution] = await Promise.all([
      this.getSalesTrend(organizerId, dateRange),
      this.getTopEvents(organizerId, dateRange),
      this.getSalesByType(organizerId, dateRange),
      this.getTimeDistribution(organizerId, dateRange),
    ]);

    return {
      salesTrend,
      topEvents,
      salesByType,
      timeDistribution,
    };
  }

  /**
   * Get daily sales trend
   */
  private static async getSalesTrend(
    organizerId: string,
    dateRange: DateRange
  ): Promise<Array<{ date: string; sales: number; revenue: number }>> {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          created_at,
          ticket_types!inner(
            price,
            events!inner(
              organizer_id
            )
          )
        `)
        .eq('ticket_types.events.organizer_id', organizerId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .not('status', 'eq', 'cancelled');

      if (error) throw error;

      // Group by date
      const salesByDate = new Map<string, { sales: number; revenue: number }>();
      
      // Initialize all dates in range
      const currentDate = new Date(dateRange.start);
      while (currentDate <= dateRange.end) {
        const dateKey = format(currentDate, 'yyyy-MM-dd');
        salesByDate.set(dateKey, { sales: 0, revenue: 0 });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Aggregate sales data
      data?.forEach((ticket: any) => {
        const date = format(new Date(ticket.created_at), 'yyyy-MM-dd');
        const existing = salesByDate.get(date) || { sales: 0, revenue: 0 };
        salesByDate.set(date, {
          sales: existing.sales + 1,
          revenue: existing.revenue + (ticket.ticket_types?.price || 0),
        });
      });

      return Array.from(salesByDate.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('Error fetching sales trend:', error);
      return [];
    }
  }

  /**
   * Get top performing events
   */
  private static async getTopEvents(
    organizerId: string,
    dateRange: DateRange
  ): Promise<Array<{ name: string; tickets_sold: number; revenue: number }>> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          tickets!inner(
            id,
            status,
            created_at,
            ticket_types!inner(price)
          )
        `)
        .eq('organizer_id', organizerId)
        .gte('tickets.created_at', dateRange.start.toISOString())
        .lte('tickets.created_at', dateRange.end.toISOString())
        .not('tickets.status', 'eq', 'cancelled');

      if (error) throw error;

      // Aggregate by event
      const eventStats = data?.map((event: any) => {
        const validTickets = event.tickets?.filter((t: any) => t.status !== 'cancelled') || [];
        const revenue = validTickets.reduce((sum: number, ticket: any) => 
          sum + (ticket.ticket_types?.price || 0), 0
        );

        return {
          name: event.title,
          tickets_sold: validTickets.length,
          revenue,
        };
      }) || [];

      // Sort by revenue and take top 10
      return eventStats
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
    } catch (error) {
      console.error('Error fetching top events:', error);
      return [];
    }
  }

  /**
   * Get sales breakdown by ticket type
   */
  private static async getSalesByType(
    organizerId: string,
    dateRange: DateRange
  ): Promise<Array<{ type: string; count: number; percentage: number }>> {
    try {
      const { data, error } = await supabase
        .from('ticket_types')
        .select(`
          name,
          tickets!inner(
            id,
            status,
            created_at
          ),
          events!inner(
            organizer_id
          )
        `)
        .eq('events.organizer_id', organizerId)
        .gte('tickets.created_at', dateRange.start.toISOString())
        .lte('tickets.created_at', dateRange.end.toISOString())
        .not('tickets.status', 'eq', 'cancelled');

      if (error) throw error;

      // Count tickets by type
      const typeStats = data?.map((ticketType: any) => {
        const validTickets = ticketType.tickets?.filter((t: any) => t.status !== 'cancelled') || [];
        return {
          type: ticketType.name,
          count: validTickets.length,
        };
      }) || [];

      // Calculate percentages
      const totalTickets = typeStats.reduce((sum, type) => sum + type.count, 0);
      
      return typeStats
        .map(type => ({
          ...type,
          percentage: totalTickets > 0 ? Math.round((type.count / totalTickets) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('Error fetching sales by type:', error);
      return [];
    }
  }

  /**
   * Get sales distribution by hour of day
   */
  private static async getTimeDistribution(
    organizerId: string,
    dateRange: DateRange
  ): Promise<Array<{ hour: number; sales: number }>> {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          created_at,
          ticket_types!inner(
            events!inner(
              organizer_id
            )
          )
        `)
        .eq('ticket_types.events.organizer_id', organizerId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .not('status', 'eq', 'cancelled');

      if (error) throw error;

      // Count by hour
      const hourCounts = new Array(24).fill(0);
      
      data?.forEach((ticket: any) => {
        const hour = new Date(ticket.created_at).getHours();
        hourCounts[hour]++;
      });

      return hourCounts.map((sales, hour) => ({ hour, sales }));
    } catch (error) {
      console.error('Error fetching time distribution:', error);
      return Array.from({ length: 24 }, (_, hour) => ({ hour, sales: 0 }));
    }
  }

  /**
   * Get date range based on time period
   */
  private static getDateRange(timeRange: string): DateRange {
    const end = new Date();
    let start: Date;

    switch (timeRange) {
      case '7d':
        start = subDays(end, 7);
        break;
      case '30d':
        start = subDays(end, 30);
        break;
      case '90d':
        start = subDays(end, 90);
        break;
      case '1y':
        start = subDays(end, 365);
        break;
      default:
        start = subDays(end, 30);
    }

    return {
      start: startOfDay(start),
      end,
    };
  }

  /**
   * Get conversion funnel analytics
   */
  static async getConversionFunnel(
    organizerId: string,
    eventId?: string
  ): Promise<{
    views: number;
    addedToCart: number;
    checkoutStarted: number;
    completed: number;
  }> {
    // This would require additional tracking implementation
    // For now, return placeholder data
    return {
      views: 0,
      addedToCart: 0,
      checkoutStarted: 0,
      completed: 0,
    };
  }

  /**
   * Export analytics data
   */
  static async exportAnalytics(
    organizerId: string,
    timeRange: string,
    format: 'csv' | 'json' = 'csv'
  ): Promise<Blob> {
    const data = await this.getTicketAnalytics(organizerId, timeRange as any);
    
    if (format === 'json') {
      return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    }
    
    // Convert to CSV
    const csvRows: string[] = [];
    
    // Sales trend CSV
    csvRows.push('Sales Trend');
    csvRows.push('Date,Sales,Revenue');
    data.salesTrend.forEach(row => {
      csvRows.push(`${row.date},${row.sales},${row.revenue}`);
    });
    csvRows.push('');
    
    // Top events CSV
    csvRows.push('Top Events');
    csvRows.push('Event Name,Tickets Sold,Revenue');
    data.topEvents.forEach(row => {
      csvRows.push(`"${row.name}",${row.tickets_sold},${row.revenue}`);
    });
    
    const csv = csvRows.join('\n');
    return new Blob([csv], { type: 'text/csv' });
  }
}

export default AnalyticsService;