import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  DollarSign, 
  Percent, 
  AlertCircle,
  Save,
  RotateCcw
} from 'lucide-react';
import { VenueLayout } from '@/lib/services/VenueService';
import { TicketType } from '@/types/database';
import { cn } from '@/lib/utils';

interface VenueCustomizationProps {
  venue: VenueLayout;
  ticketTypes: TicketType[];
  onSaveCustomizations: (customizations: VenueCustomizations) => void;
  className?: string;
}

export interface VenueCustomizations {
  priceOverrides: Record<string, number>;
  categoryMapping: Record<string, string>;
  usePercentageAdjustment?: boolean;
  percentageAdjustment?: number;
}

export const VenueCustomization: React.FC<VenueCustomizationProps> = ({
  venue,
  ticketTypes,
  onSaveCustomizations,
  className
}) => {
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});
  const [categoryMapping, setCategoryMapping] = useState<Record<string, string>>({});
  const [usePercentage, setUsePercentage] = useState(false);
  const [percentageAdjustment, setPercentageAdjustment] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize category mapping on mount
  useEffect(() => {
    if (!venue.priceCategories || !ticketTypes.length) return;

    const mapping: Record<string, string> = {};
    
    // Auto-map by matching names or by index
    venue.priceCategories.forEach((category, index) => {
      // Try to find matching ticket type by name
      const matchingTicket = ticketTypes.find(t => 
        t.name.toLowerCase().includes(category.name.toLowerCase()) ||
        category.name.toLowerCase().includes(t.name.toLowerCase())
      );
      
      if (matchingTicket) {
        mapping[category.id] = matchingTicket.id;
      } else if (ticketTypes[index]) {
        // Fallback to index mapping
        mapping[category.id] = ticketTypes[index].id;
      }
    });

    setCategoryMapping(mapping);
  }, [venue, ticketTypes]);

  const handlePriceOverride = (categoryId: string, newPrice: number) => {
    setPriceOverrides(prev => ({
      ...prev,
      [categoryId]: newPrice
    }));
    setHasChanges(true);
  };

  const handlePercentageChange = (percentage: number) => {
    setPercentageAdjustment(percentage);
    
    // Apply percentage to all categories
    if (venue.priceCategories) {
      const newOverrides: Record<string, number> = {};
      venue.priceCategories.forEach(category => {
        const adjustedPrice = category.price * (1 + percentage / 100);
        newOverrides[category.id] = Math.round(adjustedPrice * 100) / 100;
      });
      setPriceOverrides(newOverrides);
    }
    setHasChanges(true);
  };

  const handleResetPrices = () => {
    setPriceOverrides({});
    setPercentageAdjustment(0);
    setUsePercentage(false);
    setHasChanges(false);
  };

  const handleSave = () => {
    const customizations: VenueCustomizations = {
      priceOverrides,
      categoryMapping,
      usePercentageAdjustment: usePercentage,
      percentageAdjustment: usePercentage ? percentageAdjustment : undefined
    };
    
    onSaveCustomizations(customizations);
    setHasChanges(false);
  };

  if (!venue.priceCategories || venue.priceCategories.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          This venue has no price categories to customize.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Customize Venue Pricing</CardTitle>
        <CardDescription>
          Adjust pricing for this specific event. Original venue prices will remain unchanged.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Percentage Adjustment Option */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Use Percentage Adjustment</Label>
              <p className="text-sm text-muted-foreground">
                Apply a percentage increase or decrease to all prices
              </p>
            </div>
            <Switch
              checked={usePercentage}
              onCheckedChange={setUsePercentage}
            />
          </div>
          
          {usePercentage && (
            <div className="space-y-2">
              <Label>Percentage Adjustment</Label>
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={percentageAdjustment}
                  onChange={(e) => handlePercentageChange(parseFloat(e.target.value) || 0)}
                  className="w-32"
                  min="-100"
                  max="300"
                  step="5"
                />
                <span className="text-sm text-muted-foreground">
                  {percentageAdjustment > 0 && '+'}{percentageAdjustment}%
                </span>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Individual Price Overrides */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Price Categories</h4>
          {venue.priceCategories.map((category) => {
            const mappedTicketId = categoryMapping[category.id];
            const mappedTicket = ticketTypes.find(t => t.id === mappedTicketId);
            const currentPrice = priceOverrides[category.id] ?? category.price;
            const hasOverride = category.id in priceOverrides;
            
            return (
              <div key={category.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="font-medium">{category.name}</span>
                    {mappedTicket && (
                      <Badge variant="outline" className="text-xs">
                        → {mappedTicket.name}
                      </Badge>
                    )}
                  </div>
                  {hasOverride && (
                    <Badge variant="secondary" className="text-xs">
                      Modified
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 flex-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={currentPrice}
                      onChange={(e) => handlePriceOverride(category.id, parseFloat(e.target.value) || 0)}
                      className="w-32"
                      min="0"
                      step="5"
                      disabled={usePercentage}
                    />
                    {hasOverride && category.price !== currentPrice && (
                      <span className="text-sm text-muted-foreground">
                        (was ${category.price})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        {hasChanges && (
          <>
            <Separator />
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You have unsaved pricing changes. These will only apply to this event.
              </AlertDescription>
            </Alert>
          </>
        )}

        {/* Actions */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleResetPrices}
            disabled={!hasChanges}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Original
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Customizations
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default VenueCustomization;