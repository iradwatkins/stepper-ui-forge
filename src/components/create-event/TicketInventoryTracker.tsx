import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TicketIcon, Users, Accessibility, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TicketType {
  id: string;
  name: string;
  quantity: number;
  price: number;
  color?: string;
  isAccessible?: boolean;
}

interface SeatData {
  id: string;
  category: string;
  categoryId?: string;
  tableId?: string;
}

interface TicketInventoryTrackerProps {
  tickets: TicketType[];
  placedSeats: SeatData[];
  className?: string;
}

export function TicketInventoryTracker({ tickets, placedSeats, className }: TicketInventoryTrackerProps) {
  // Calculate seat allocation for each ticket type
  const ticketAllocation = tickets.map(ticket => {
    const placedCount = placedSeats.filter(seat => 
      seat.category === ticket.id || seat.categoryId === ticket.id
    ).length;
    const percentage = ticket.quantity > 0 ? (placedCount / ticket.quantity) * 100 : 0;
    const remaining = ticket.quantity - placedCount;
    
    return {
      ...ticket,
      placed: placedCount,
      remaining,
      percentage,
      isComplete: placedCount === ticket.quantity,
      isOverAllocated: placedCount > ticket.quantity
    };
  });

  const totalTickets = tickets.reduce((sum, t) => sum + t.quantity, 0);
  const totalPlaced = placedSeats.length;
  const totalPercentage = totalTickets > 0 ? (totalPlaced / totalTickets) * 100 : 0;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TicketIcon className="h-5 w-5" />
          Ticket Inventory Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span>Overall Progress</span>
            <span>{totalPlaced} / {totalTickets} seats placed</span>
          </div>
          <Progress value={totalPercentage} className="h-3" />
          <div className="text-xs text-muted-foreground text-center">
            {totalPercentage.toFixed(0)}% Complete
          </div>
        </div>

        {/* Individual Ticket Types */}
        <div className="space-y-3">
          {ticketAllocation.map((ticket) => (
            <div key={ticket.id} className="space-y-2 p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {ticket.color && (
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: ticket.color }}
                    />
                  )}
                  <span className="font-medium text-sm">{ticket.name}</span>
                  {ticket.isAccessible && (
                    <Accessibility className="h-3 w-3 text-blue-600" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {ticket.isComplete && (
                    <Badge variant="default" className="bg-green-600 text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Complete
                    </Badge>
                  )}
                  {ticket.isOverAllocated && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Over
                    </Badge>
                  )}
                  <span className="text-sm font-medium">
                    {ticket.placed} / {ticket.quantity}
                  </span>
                </div>
              </div>
              
              <Progress 
                value={Math.min(ticket.percentage, 100)} 
                className={cn(
                  "h-2",
                  ticket.isComplete && "bg-green-100",
                  ticket.isOverAllocated && "bg-red-100"
                )}
              />
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>${ticket.price} per ticket</span>
                {ticket.remaining > 0 ? (
                  <span>{ticket.remaining} seats remaining</span>
                ) : ticket.isOverAllocated ? (
                  <span className="text-red-600">
                    {Math.abs(ticket.remaining)} seats over allocated
                  </span>
                ) : (
                  <span className="text-green-600">All seats placed</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{totalPlaced}</p>
            <p className="text-xs text-muted-foreground">Seats Placed</p>
          </div>
          <div className="text-center">
            <TicketIcon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{totalTickets - totalPlaced}</p>
            <p className="text-xs text-muted-foreground">Remaining</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}