import { UseFormReturn } from "react-hook-form";
import { EventFormData } from "@/types/event-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Plus, Trash2, Info, TicketIcon, DollarSignIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState, useEffect } from "react";

export interface TicketType {
  id: string;
  name: string;
  description: string;
  price: number;
  earlyBirdPrice?: number;
  earlyBirdUntil?: string;
  quantity: number;
  hasEarlyBird: boolean;
}

interface TicketConfigurationWizardProps {
  form: UseFormReturn<EventFormData>;
  eventType: 'simple' | 'ticketed' | 'premium' | '';
  onTicketsChange?: (tickets: TicketType[]) => void;
  initialTickets?: TicketType[];
}

export const TicketConfigurationWizard = ({ form, eventType, onTicketsChange, initialTickets }: TicketConfigurationWizardProps) => {
  const [tickets, setTickets] = useState<TicketType[]>(
    initialTickets && initialTickets.length > 0 
      ? initialTickets 
      : [
          {
            id: 'general',
            name: 'General Admission',
            description: 'Standard access to the event',
            price: 25,
            quantity: 100,
            hasEarlyBird: false
          }
        ]
  );

  // Notify parent component when tickets change
  useEffect(() => {
    if (onTicketsChange && eventType !== 'simple') {
      onTicketsChange(tickets);
    }
  }, [tickets, onTicketsChange, eventType]);

  const addTicketTier = () => {
    const newTicket: TicketType = {
      id: `ticket-${Date.now()}`,
      name: 'New Ticket Type',
      description: '',
      price: 0,
      quantity: 50,
      hasEarlyBird: false
    };
    setTickets(prev => [...prev, newTicket]);
  };

  const removeTicketTier = (index: number) => {
    setTickets(prev => prev.filter((_, i) => i !== index));
  };

  const updateTicketTier = (index: number, field: keyof TicketType, value: string | number | boolean) => {
    setTickets(prev => prev.map((ticket, i) => 
      i === index ? { ...ticket, [field]: value } : ticket
    ));
  };

  if (eventType === 'simple') {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold mb-2">Event Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Simple events are free to attend with optional display pricing
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TicketIcon className="w-5 h-5" />
              Event Access
            </CardTitle>
            <CardDescription>
              This is a simple event - attendees can register for free
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TicketIcon className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Free Registration</h3>
              <p className="text-muted-foreground mb-4">
                Attendees can register for your event at no cost
              </p>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  ✓ Unlimited registrations<br/>
                  ✓ Email confirmations<br/>
                  ✓ Basic attendee management
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold mb-2">Ticket Configuration</h2>
        <p className="text-sm text-muted-foreground">
          Set up your ticket types and pricing for {eventType} events
        </p>
      </div>

      {tickets.length === 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            You need at least one ticket type. Click "Add Ticket Type" to get started.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {tickets.map((ticket, index) => (
          <Card key={ticket.id}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Ticket Type {index + 1}</CardTitle>
                {tickets.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTicketTier(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`ticket-name-${index}`}>Ticket Name *</Label>
                  <Input
                    id={`ticket-name-${index}`}
                    value={ticket.name}
                    onChange={(e) => updateTicketTier(index, 'name', e.target.value)}
                    placeholder="e.g., General Admission, VIP"
                  />
                </div>
                <div>
                  <Label htmlFor={`ticket-price-${index}`}>Price ($) *</Label>
                  <Input
                    id={`ticket-price-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={ticket.price}
                    onChange={(e) => updateTicketTier(index, 'price', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor={`ticket-description-${index}`}>Description</Label>
                <Textarea
                  id={`ticket-description-${index}`}
                  value={ticket.description}
                  onChange={(e) => updateTicketTier(index, 'description', e.target.value)}
                  placeholder="Describe what's included with this ticket..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`ticket-quantity-${index}`}>Available Quantity *</Label>
                  <Input
                    id={`ticket-quantity-${index}`}
                    type="number"
                    min="1"
                    value={ticket.quantity}
                    onChange={(e) => updateTicketTier(index, 'quantity', parseInt(e.target.value) || 1)}
                    placeholder="100"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id={`early-bird-${index}`}
                    checked={ticket.hasEarlyBird}
                    onCheckedChange={(checked) => updateTicketTier(index, 'hasEarlyBird', checked)}
                  />
                  <Label htmlFor={`early-bird-${index}`}>Early Bird Pricing</Label>
                </div>
              </div>

              {ticket.hasEarlyBird && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <Label htmlFor={`early-bird-price-${index}`}>Early Bird Price ($)</Label>
                    <Input
                      id={`early-bird-price-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={ticket.earlyBirdPrice || 0}
                      onChange={(e) => updateTicketTier(index, 'earlyBirdPrice', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`early-bird-until-${index}`}>Early Bird Until</Label>
                    <Input
                      id={`early-bird-until-${index}`}
                      type="datetime-local"
                      value={ticket.earlyBirdUntil || ''}
                      onChange={(e) => updateTicketTier(index, 'earlyBirdUntil', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          onClick={addTicketTier}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Ticket Type
        </Button>
      </div>

      {/* Pricing Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSignIcon className="w-5 h-5" />
            Pricing Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {tickets.map((ticket, index) => (
              <div key={ticket.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                <div>
                  <span className="font-medium">{ticket.name}</span>
                  <span className="text-sm text-muted-foreground ml-2">({ticket.quantity} available)</span>
                </div>
                <div className="text-right">
                  {ticket.hasEarlyBird && ticket.earlyBirdPrice ? (
                    <div>
                      <span className="text-sm text-muted-foreground line-through">${ticket.price}</span>
                      <span className="ml-2 font-semibold text-green-600">${ticket.earlyBirdPrice}</span>
                    </div>
                  ) : (
                    <span className="font-semibold">${ticket.price}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {eventType === 'premium' && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Premium events</strong> include additional features like seating charts, team management, and advanced analytics that will be configured after publishing.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};