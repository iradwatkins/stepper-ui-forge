import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Plus, 
  Building2, 
  Users, 
  DollarSign, 
  Calendar,
  Edit3,
  Copy,
  Trash2,
  Search,
  Filter,
  MoreVertical,
  MapPin,
  Save,
  Upload,
  Download,
  Eye,
  Settings
} from 'lucide-react';
import SeatingLayoutManager from '@/components/seating/SeatingLayoutManager';
import { toast } from 'sonner';

interface VenueLayout {
  id: string;
  name: string;
  description: string;
  venueType: 'theater' | 'stadium' | 'arena' | 'table-service' | 'general-admission';
  imageUrl: string;
  capacity: number;
  priceCategories: Array<{
    id: string;
    name: string;
    price: number;
    color: string;
  }>;
  seats: Array<{
    id: string;
    x: number;
    y: number;
    seatNumber: string;
    priceCategory: string;
    isADA: boolean;
    price: number;
  }>;
  isTemplate: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  eventCount: number; // Number of events using this layout
}

const VenueManagement: React.FC = () => {
  const [venues, setVenues] = useState<VenueLayout[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<VenueLayout | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  // Load venues from localStorage (mock data)
  useEffect(() => {
    const savedVenues = localStorage.getItem('venue_layouts');
    if (savedVenues) {
      try {
        const parsedVenues = JSON.parse(savedVenues).map((venue: Partial<VenueLayout>) => ({
          ...venue,
          createdAt: new Date(venue.createdAt),
          updatedAt: new Date(venue.updatedAt)
        }));
        setVenues(parsedVenues);
      } catch (error) {
        console.error('Error loading venues:', error);
      }
    }
  }, []);

  // Save venues to localStorage
  const saveVenues = (updatedVenues: VenueLayout[]) => {
    localStorage.setItem('venue_layouts', JSON.stringify(updatedVenues));
    setVenues(updatedVenues);
  };

  const handleCreateVenue = () => {
    setSelectedVenue(null);
    setIsCreating(true);
    setIsEditing(false);
  };

  const handleEditVenue = (venue: VenueLayout) => {
    setSelectedVenue(venue);
    setIsCreating(false);
    setIsEditing(true);
  };

  const handleVenueLayoutSaved = (layout: Partial<VenueLayout>) => {
    const venueLayout: VenueLayout = {
      id: layout.id || `venue_${Date.now()}`,
      name: layout.name,
      description: layout.description,
      venueType: layout.venueType,
      imageUrl: layout.imageUrl,
      capacity: layout.capacity,
      priceCategories: layout.priceCategories,
      seats: layout.seats,
      isTemplate: layout.isTemplate,
      tags: layout.tags,
      createdAt: selectedVenue?.createdAt || new Date(),
      updatedAt: new Date(),
      eventCount: selectedVenue?.eventCount || 0
    };

    if (selectedVenue) {
      // Update existing venue
      const updatedVenues = venues.map(v => 
        v.id === selectedVenue.id ? venueLayout : v
      );
      saveVenues(updatedVenues);
      toast.success('Venue layout updated successfully');
    } else {
      // Create new venue
      const updatedVenues = [...venues, venueLayout];
      saveVenues(updatedVenues);
      toast.success('Venue layout created successfully');
    }

    setIsCreating(false);
    setIsEditing(false);
    setSelectedVenue(null);
  };

  const handleDuplicateVenue = (venue: VenueLayout) => {
    const duplicatedVenue: VenueLayout = {
      ...venue,
      id: `venue_${Date.now()}`,
      name: `${venue.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
      eventCount: 0
    };

    const updatedVenues = [...venues, duplicatedVenue];
    saveVenues(updatedVenues);
    toast.success('Venue layout duplicated successfully');
  };

  const handleDeleteVenue = (venue: VenueLayout) => {
    if (venue.eventCount > 0) {
      toast.error(`Cannot delete venue. It's being used by ${venue.eventCount} event(s).`);
      return;
    }

    if (confirm(`Are you sure you want to delete "${venue.name}"?`)) {
      const updatedVenues = venues.filter(v => v.id !== venue.id);
      saveVenues(updatedVenues);
      toast.success('Venue layout deleted successfully');
    }
  };

  const handleExportVenue = (venue: VenueLayout) => {
    const dataStr = JSON.stringify(venue, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `venue-${venue.name.replace(/[^a-zA-Z0-9]/g, '-')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('Venue layout exported successfully');
  };

  const handleImportVenue = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedVenue = JSON.parse(e.target?.result as string);
        const newVenue: VenueLayout = {
          ...importedVenue,
          id: `venue_${Date.now()}`,
          name: `${importedVenue.name} (Imported)`,
          createdAt: new Date(),
          updatedAt: new Date(),
          eventCount: 0
        };
        
        const updatedVenues = [...venues, newVenue];
        saveVenues(updatedVenues);
        toast.success('Venue layout imported successfully');
      } catch (error) {
        toast.error('Error importing venue layout file');
      }
    };
    reader.readAsText(file);
  };

  const filteredVenues = venues.filter(venue => {
    const matchesSearch = venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         venue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         venue.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = selectedType === 'all' || venue.venueType === selectedType;
    return matchesSearch && matchesType;
  });

  const getVenueTypeIcon = (type: string) => {
    switch (type) {
      case 'theater': return '🎭';
      case 'stadium': return '🏟️';
      case 'arena': return '🏟️';
      case 'table-service': return '🍽️';
      case 'general-admission': return '🎪';
      default: return '🏢';
    }
  };

  const getVenueTypeColor = (type: string) => {
    switch (type) {
      case 'theater': return 'bg-purple-100 text-purple-800';
      case 'stadium': return 'bg-blue-100 text-blue-800';
      case 'arena': return 'bg-green-100 text-green-800';
      case 'table-service': return 'bg-orange-100 text-orange-800';
      case 'general-admission': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isCreating || isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {isCreating ? 'Create New Venue Layout' : `Edit ${selectedVenue?.name}`}
            </h2>
            <p className="text-muted-foreground">
              {isCreating ? 'Design a new seating layout for your venue' : 'Modify the existing venue layout'}
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              setIsCreating(false);
              setIsEditing(false);
              setSelectedVenue(null);
            }}
          >
            Back to Venues
          </Button>
        </div>

        <SeatingLayoutManager
          initialLayout={selectedVenue ? {
            id: selectedVenue.id,
            name: selectedVenue.name,
            description: selectedVenue.description,
            venueType: selectedVenue.venueType,
            imageUrl: selectedVenue.imageUrl,
            imageWidth: 800,
            imageHeight: 600,
            seats: selectedVenue.seats.map(seat => ({
              ...seat,
              status: 'available' as const
            })),
            priceCategories: selectedVenue.priceCategories,
            capacity: selectedVenue.capacity,
            createdAt: selectedVenue.createdAt,
            updatedAt: selectedVenue.updatedAt,
            isTemplate: selectedVenue.isTemplate,
            tags: selectedVenue.tags
          } : undefined}
          mode={isCreating ? 'create' : 'edit'}
          onLayoutSaved={handleVenueLayoutSaved}
          venueImageUrl={selectedVenue?.imageUrl}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Venue Management</h2>
          <p className="text-muted-foreground">
            Create and manage seating layouts for your venues
          </p>
        </div>
        <div className="flex gap-2">
          <label htmlFor="import-venue">
            <Button variant="outline" className="cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              Import Layout
            </Button>
          </label>
          <input
            id="import-venue"
            type="file"
            accept="application/json"
            onChange={handleImportVenue}
            className="hidden"
          />
          <Button onClick={handleCreateVenue}>
            <Plus className="w-4 h-4 mr-2" />
            Create Venue
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{venues.length}</div>
                <div className="text-sm text-muted-foreground">Total Venues</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {venues.reduce((sum, venue) => sum + venue.capacity, 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total Capacity</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">
                  {venues.reduce((sum, venue) => sum + venue.eventCount, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Active Events</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold">
                  {venues.filter(v => v.isTemplate).length}
                </div>
                <div className="text-sm text-muted-foreground">Templates</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search venues by name, description, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Types</option>
                <option value="theater">Theater</option>
                <option value="stadium">Stadium</option>
                <option value="arena">Arena</option>
                <option value="table-service">Table Service</option>
                <option value="general-admission">General Admission</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Venues Grid */}
      {filteredVenues.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {venues.length === 0 ? 'No venues created yet' : 'No venues match your search'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {venues.length === 0 
                ? 'Create your first venue layout to get started with seating management'
                : 'Try adjusting your search criteria or create a new venue'
              }
            </p>
            <Button onClick={handleCreateVenue}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Venue
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVenues.map((venue) => (
            <Card key={venue.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{getVenueTypeIcon(venue.venueType)}</span>
                      <CardTitle className="text-lg">{venue.name}</CardTitle>
                      {venue.isTemplate && <Badge variant="secondary">Template</Badge>}
                    </div>
                    <CardDescription className="line-clamp-2">
                      {venue.description || 'No description provided'}
                    </CardDescription>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Venue Actions</DialogTitle>
                        <DialogDescription>
                          Choose an action for {venue.name}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => handleEditVenue(venue)}
                          className="flex items-center gap-2"
                        >
                          <Edit3 className="w-4 h-4" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => handleDuplicateVenue(venue)}
                          className="flex items-center gap-2"
                        >
                          <Copy className="w-4 h-4" />
                          Duplicate
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => handleExportVenue(venue)}
                          className="flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Export
                        </Button>
                        <Button 
                          variant="destructive"
                          onClick={() => handleDeleteVenue(venue)}
                          disabled={venue.eventCount > 0}
                          className="flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Venue Image Preview */}
                {venue.imageUrl && (
                  <div className="relative h-32 rounded border overflow-hidden">
                    <img 
                      src={venue.imageUrl} 
                      alt={venue.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => handleEditVenue(venue)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Layout
                      </Button>
                    </div>
                  </div>
                )}

                {/* Venue Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-muted-foreground">Capacity</div>
                    <div className="text-lg font-bold">{venue.capacity.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Categories</div>
                    <div className="text-lg font-bold">{venue.priceCategories.length}</div>
                  </div>
                </div>

                {/* Venue Type and Tags */}
                <div className="space-y-2">
                  <Badge className={getVenueTypeColor(venue.venueType)}>
                    {venue.venueType.charAt(0).toUpperCase() + venue.venueType.slice(1).replace('-', ' ')}
                  </Badge>
                  
                  {venue.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {venue.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {venue.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{venue.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Event Usage */}
                {venue.eventCount > 0 && (
                  <Alert>
                    <Calendar className="h-4 w-4" />
                    <AlertDescription>
                      Used by {venue.eventCount} active event{venue.eventCount !== 1 ? 's' : ''}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEditVenue(venue)}
                    className="flex-1"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDuplicateVenue(venue)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default VenueManagement;