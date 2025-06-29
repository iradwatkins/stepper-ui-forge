import { TicketType } from '@/types/database';

interface SelectedTicket {
  ticketTypeId: string;
  quantity: number;
  ticketType: TicketType;
}

interface PriceCalculatorProps {
  selectedTickets: SelectedTicket[];
  getCurrentPrice: (ticketType: TicketType) => number;
  taxRate?: number;
  serviceFeeRate?: number;
  className?: string;
}

export const PriceCalculator = ({
  selectedTickets,
  getCurrentPrice,
  taxRate = 0.0875, // 8.75% default tax rate
  serviceFeeRate = 0.029, // 2.9% service fee
  className = ""
}: PriceCalculatorProps) => {
  // Calculate subtotal
  const subtotal = selectedTickets.reduce(
    (sum, item) => sum + (getCurrentPrice(item.ticketType) * item.quantity),
    0
  );

  // Calculate service fee
  const serviceFee = subtotal * serviceFeeRate;

  // Calculate tax (on subtotal + service fee)
  const taxableAmount = subtotal + serviceFee;
  const tax = taxableAmount * taxRate;

  // Calculate total
  const total = subtotal + serviceFee + tax;

  // Total quantity
  const totalQuantity = selectedTickets.reduce((sum, item) => sum + item.quantity, 0);

  if (selectedTickets.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Order Summary</h3>
        <span className="text-sm text-muted-foreground">
          {totalQuantity} ticket{totalQuantity !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Ticket Breakdown */}
      <div className="space-y-2">
        {selectedTickets.map((item) => {
          const unitPrice = getCurrentPrice(item.ticketType);
          const lineTotal = unitPrice * item.quantity;
          
          return (
            <div key={item.ticketTypeId} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {item.quantity}× {item.ticketType.name}
              </span>
              <span>${lineTotal.toFixed(2)}</span>
            </div>
          );
        })}
      </div>

      <hr />

      {/* Price Breakdown */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            Service Fee ({(serviceFeeRate * 100).toFixed(1)}%)
          </span>
          <span>${serviceFee.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            Tax ({(taxRate * 100).toFixed(2)}%)
          </span>
          <span>${tax.toFixed(2)}</span>
        </div>
      </div>

      <hr />

      {/* Total */}
      <div className="flex justify-between items-center font-semibold text-lg">
        <span>Total</span>
        <span>${total.toFixed(2)}</span>
      </div>

      {/* Early Bird Savings */}
      {(() => {
        const totalSavings = selectedTickets.reduce((sum, item) => {
          if (item.ticketType.early_bird_price && 
              item.ticketType.early_bird_until &&
              new Date() <= new Date(item.ticketType.early_bird_until)) {
            const savings = (item.ticketType.price - item.ticketType.early_bird_price) * item.quantity;
            return sum + savings;
          }
          return sum;
        }, 0);

        if (totalSavings > 0) {
          return (
            <div className="text-sm text-green-600 font-medium">
              🎉 Early Bird Savings: ${totalSavings.toFixed(2)}
            </div>
          );
        }
        return null;
      })()}
    </div>
  );
};