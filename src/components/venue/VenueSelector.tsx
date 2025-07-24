import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Users, DollarSign, Search, Check, Building2, Plus } from 'lucide-react';
import { VenueService } from '@/lib/services/VenueService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface VenueLayout {
  id: string;
  name: string;
  description?: string;
  layout_data: {
    venueType: string;
    imageUrl?: string;
    capacity: number;
    priceCategories: Array<{
      id: string;
      name: string;
      color: string;
      basePrice: number;
    }>;
    seats: Array<{
      id: string;
      x: number;
      y: number;
      category: string;
    }>;
    isTemplate?: boolean;
    tags?: string[];
  };
  created_at: string;
}

interface VenueSelectorProps {
  onSelectVenue: (venue: VenueLayout) => void;
  onCreateNew: () => void;
  selectedVenueId?: string;
}

export const VenueSelector = ({ onSelectVenue, onCreateNew, selectedVenueId }: VenueSelectorProps) => {
  const { user } = useAuth();
  const [venues, setVenues] = useState<VenueLayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVenue, setSelectedVenue] = useState<VenueLayout | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadVenues();
  }, [user]);

  const loadVenues = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const userVenues = await VenueService.getVenueLayouts(user.id);
      setVenues(userVenues);
    } catch (error) {
      console.error('Error loading venues:', error);
      toast.error('Failed to load venue layouts');
    } finally {
      setLoading(false);
    }
  };

  const filteredVenues = venues.filter(venue =>
    venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    venue.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    venue.layout_data.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelectVenue = (venue: VenueLayout) => {
    setSelectedVenue(venue);
    onSelectVenue(venue);
  };

  const getCategoryCount = (venue: VenueLayout) => {
    return venue.layout_data.priceCategories?.length || 0;
  };

  const getPriceRange = (venue: VenueLayout) => {
    const prices = venue.layout_data.priceCategories?.map(cat => cat.basePrice) || [];
    if (prices.length === 0) return 'No pricing';
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `$${min}` : `$${min} - $${max}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search venues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Button onClick={onCreateNew} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Create Custom Layout
        </Button>
      </div>

      {filteredVenues.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Venue Layouts Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'No venues match your search.' : 'You haven\'t created any venue layouts yet.'}
            </p>
            <Button onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Venue
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVenues.map((venue) => (
            <Card 
              key={venue.id} 
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedVenueId === venue.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleSelectVenue(venue)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{venue.name}</CardTitle>
                    {venue.description && (
                      <CardDescription className="mt-1 text-sm">
                        {venue.description}
                      </CardDescription>
                    )}
                  </div>
                  {selectedVenueId === venue.id && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {venue.layout_data.imageUrl && (
                  <div className="mb-3 relative group">
                    <img
                      src={venue.layout_data.imageUrl}
                      alt={venue.name}
                      className="w-full h-32 object-cover rounded-md"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVenue(venue);
                          setShowPreview(true);
                        }}
                      >
                        Preview Layout
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{venue.layout_data.capacity} seats</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>{getPriceRange(venue)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {venue.layout_data.venueType}
                    </Badge>
                    {getCategoryCount(venue) > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {getCategoryCount(venue)} categories
                      </Badge>
                    )}
                  </div>

                  {venue.layout_data.tags && venue.layout_data.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {venue.layout_data.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {venue.layout_data.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{venue.layout_data.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedVenue?.name}</DialogTitle>
            <DialogDescription>
              Venue layout preview with {selectedVenue?.layout_data.capacity} seats
            </DialogDescription>
          </DialogHeader>
          {selectedVenue?.layout_data.imageUrl && (
            <div className="relative">
              <img
                src={selectedVenue.layout_data.imageUrl}
                alt={selectedVenue.name}
                className="w-full rounded-lg"
              />
              <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-4">
                <h4 className="font-semibold mb-2">Price Categories</h4>
                <div className="space-y-1">
                  {selectedVenue.layout_data.priceCategories?.map((category) => (
                    <div key={category.id} className="flex items-center gap-2 text-sm">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: category.color }}
                      />
                      <span>{category.name}: ${category.basePrice}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};