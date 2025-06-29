
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Plus, Trash2, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Ticket {
  name: string;
  description?: string;
  price: number;
  earlyBirdPrice?: number;
  earlyBirdUntil?: string;
  quantity: number;
  hasEarlyBird?: boolean;
}

interface TicketConfigurationProps {
  tickets: Ticket[];
  onAddTicketTier: () => void;
  onRemoveTicketTier: (index: number) => void;
  onUpdateTicketTier: (index: number, field: string, value: string | number | boolean) => void;
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

  // Validation function
  const validateTickets = () => {
    const errors: string[] = [];
    const warnings: string[] = [];

    tickets.forEach((ticket, index) => {
      if (!ticket.name.trim()) {
        errors.push(`Ticket ${index + 1}: Name is required`);
      }
      if (ticket.price <= 0) {
        errors.push(`Ticket ${index + 1}: Price must be greater than 0`);
      }
      if (ticket.quantity <= 0) {
        errors.push(`Ticket ${index + 1}: Quantity must be greater than 0`);
      }
      if (ticket.hasEarlyBird) {
        if (!ticket.earlyBirdPrice || ticket.earlyBirdPrice <= 0) {
          errors.push(`Ticket ${index + 1}: Early bird price is required`);
        }
        if (ticket.earlyBirdPrice && ticket.earlyBirdPrice >= ticket.price) {
          warnings.push(`Ticket ${index + 1}: Early bird price should be less than regular price`);
        }
        if (!ticket.earlyBirdUntil) {
          errors.push(`Ticket ${index + 1}: Early bird end date is required`);
        }
      }
    });

    return { errors, warnings, isValid: errors.length === 0 };
  };

  const validation = validateTickets();

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Ticket Configuration</h2>
        <p className="text-muted-foreground">Set up your ticket tiers and pricing</p>
      </div>

      {validation.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validation.errors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {validation.warnings.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validation.warnings.map((warning, index) => (
                <div key={index}>{warning}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ticket Tiers</CardTitle>
          <CardDescription>Configure different ticket types for your event</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {tickets.map((ticket, index) => (
            <div key={index} className="border rounded-lg p-6 space-y-4">
              {/* Ticket Header */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Ticket {index + 1}</h3>
                {tickets.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRemoveTicketTier(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>

              {/* Basic Information */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`ticket-name-${index}`}>Ticket Name *</Label>
                  <Input
                    id={`ticket-name-${index}`}
                    placeholder="General Admission"
                    value={ticket.name}
                    onChange={(e) => onUpdateTicketTier(index, 'name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`ticket-quantity-${index}`}>Quantity Available *</Label>
                  <Input
                    id={`ticket-quantity-${index}`}
                    type="number"
                    min="1"
                    value={ticket.quantity}
                    onChange={(e) => onUpdateTicketTier(index, 'quantity', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor={`ticket-description-${index}`}>Description</Label>
                <Textarea
                  id={`ticket-description-${index}`}
                  placeholder="Describe what this ticket includes..."
                  value={ticket.description || ''}
                  onChange={(e) => onUpdateTicketTier(index, 'description', e.target.value)}
                  rows={3}
                />
              </div>

              {/* Pricing Section */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`ticket-price-${index}`}>Regular Price ($) *</Label>
                  <Input
                    id={`ticket-price-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={ticket.price}
                    onChange={(e) => onUpdateTicketTier(index, 'price', parseFloat(e.target.value) || 0)}
                  />
                </div>

                {/* Early Bird Toggle */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`early-bird-${index}`}
                    checked={ticket.hasEarlyBird || false}
                    onCheckedChange={(checked) => onUpdateTicketTier(index, 'hasEarlyBird', checked)}
                  />
                  <Label htmlFor={`early-bird-${index}`}>Enable Early Bird Pricing</Label>
                </div>

                {/* Early Bird Pricing */}
                {ticket.hasEarlyBird && (
                  <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor={`early-bird-price-${index}`}>Early Bird Price ($) *</Label>
                      <Input
                        id={`early-bird-price-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={ticket.earlyBirdPrice || ''}
                        onChange={(e) => onUpdateTicketTier(index, 'earlyBirdPrice', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`early-bird-until-${index}`}>Early Bird Ends *</Label>
                      <Input
                        id={`early-bird-until-${index}`}
                        type="datetime-local"
                        value={ticket.earlyBirdUntil || ''}
                        onChange={(e) => onUpdateTicketTier(index, 'earlyBirdUntil', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={onAddTicketTier} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Ticket Tier
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          Back
        </Button>
        <Button 
          onClick={onNext} 
          disabled={!validation.isValid}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};
