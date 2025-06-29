
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface Ticket {
  name: string;
  price: number;
  quantity: number;
}

interface TicketConfigurationProps {
  tickets: Ticket[];
  onAddTicketTier: () => void;
  onRemoveTicketTier: (index: number) => void;
  onUpdateTicketTier: (index: number, field: string, value: string | number) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export const TicketConfiguration = ({ 
  tickets, 
  onAddTicketTier, 
  onRemoveTicketTier, 
  onUpdateTicketTier, 
  onNext, 
  onPrevious 
}: TicketConfigurationProps) => {
  console.log("TicketConfiguration rendering with tickets:", tickets);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Ticket Configuration</h2>
        <p className="text-muted-foreground">Set up your ticket tiers and pricing</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ticket Tiers</CardTitle>
          <CardDescription>Configure different ticket types for your event</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tickets.map((ticket, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor={`ticket-name-${index}`}>Ticket Name</Label>
                  <Input
                    id={`ticket-name-${index}`}
                    placeholder="General Admission"
                    value={ticket.name}
                    onChange={(e) => onUpdateTicketTier(index, 'name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`ticket-price-${index}`}>Price ($)</Label>
                  <Input
                    id={`ticket-price-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={ticket.price}
                    onChange={(e) => onUpdateTicketTier(index, 'price', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor={`ticket-quantity-${index}`}>Quantity</Label>
                  <div className="flex gap-2">
                    <Input
                      id={`ticket-quantity-${index}`}
                      type="number"
                      min="1"
                      value={ticket.quantity}
                      onChange={(e) => onUpdateTicketTier(index, 'quantity', parseInt(e.target.value) || 0)}
                    />
                    {tickets.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRemoveTicketTier(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={onAddTicketTier} className="w-full">
            Add Ticket Tier
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          Back
        </Button>
        <Button onClick={onNext}>
          Continue
        </Button>
      </div>
    </div>
  );
};
