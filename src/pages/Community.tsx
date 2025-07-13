import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, MapPin, Phone, Globe, Star, Search, Filter, Plus, Clock, CheckCircle, Users, Heart } from 'lucide-react';
import { LocationSearchBar, LocationFilterPanel, LocationMapToggle } from '@/components/location';
import { 
  LocationResult, 
  LocationCoordinates, 
  getCurrentLocation, 
  filterByLocation, 
  getDistanceText 
} from '@/services/locationSearchService';
import { storeDirectoryService, StoreListing, StoreCategory } from '@/services/storeDirectoryService';
import { Link } from 'react-router-dom';

export default function Community() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');

  // Location search state
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('list');
  const [locationQuery, setLocationQuery] = useState('');
  const [userLocation, setUserLocation] = useState<LocationCoordinates | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [radius, setRadius] = useState(25);
  const [sortByDistance, setSortByDistance] = useState(false);

  // Store data state
  const [businesses, setBusinesses] = useState<StoreListing[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load store data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [storeData, categoryData] = await Promise.all([
          storeDirectoryService.getStoreListings(),
          storeDirectoryService.getStoreCategories()
        ]);
        setBusinesses(storeData);
        setCategories(categoryData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load store data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Location search handlers
  const handleLocationSelect = (location: LocationResult) => {
    setUserLocation(location.coordinates);
    setLocationEnabled(true);
    setSortByDistance(true);
  };

  const handleLocationToggle = async () => {
    if (locationEnabled) {
      setLocationEnabled(false);
      setUserLocation(null);
      setSortByDistance(false);
    } else {
      try {
        const location = await getCurrentLocation();
        setUserLocation(location);
        setLocationEnabled(true);
        setSortByDistance(true);
        setLocationQuery('Current Location');
      } catch (error) {
        console.error('Failed to get location:', error);
        alert(error instanceof Error ? error.message : 'Failed to get current location');
      }
    }
  };

  const handleClearLocation = () => {
    setLocationEnabled(false);
    setUserLocation(null);
    setSortByDistance(false);
    setLocationQuery('');
  };

  // Filter and search logic
  const filteredAndSortedBusinesses = useMemo(() => {
    let filtered = businesses.filter(business => {
      // Text search
      const matchesSearch = business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           business.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           business.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           business.address.city.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Category filter
      const matchesCategory = activeTab === 'all' || business.categoryId === activeTab;
      
      // Location filter (legacy dropdown)
      const matchesLocation = selectedLocation === 'all' || selectedLocation === 'All Locations' || 
                              `${business.address.city}, ${business.address.state}` === selectedLocation;
      
      return matchesSearch && matchesCategory && matchesLocation;
    });

    // Location-based filtering
    if (locationEnabled && userLocation) {
      filtered = filterByLocation(filtered, userLocation, radius, { sortByDistance });
    }

    return filtered;
  }, [businesses, searchTerm, activeTab, selectedLocation, userLocation, locationEnabled, radius, sortByDistance]);

  const featuredBusinesses = businesses.filter(business => business.isVerified);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center justify-center md:justify-start mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <Store className="w-8 h-8 text-white" />
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent text-center md:text-left">
                Business & Services Directory
              </h1>
              <p className="text-xl text-muted-foreground text-center md:text-left max-w-2xl">
                Discover and connect with stepping community businesses and service providers
              </p>
            </div>
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              List Your Business
            </Button>
          </div>
        </div>

        {/* Featured Businesses */}
        {featuredBusinesses.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Featured Businesses</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {featuredBusinesses.slice(0, 2).map((business) => (
                <Card key={business.id} className="overflow-hidden border-green-200 dark:border-green-800">
                  <CardContent className="p-0">
                    <div className="relative">
                      <img
                        src={business.images[0]?.url || "/placeholder.svg"}
                        alt={business.name}
                        className="w-full h-32 object-cover"
                      />
                      <Badge className="absolute top-3 left-3 bg-green-600 text-white">
                        Featured
                      </Badge>
                      {business.isVerified && (
                        <Badge className="absolute top-3 right-3 bg-blue-600 text-white">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <Link 
                            to={`/stores/${business.id}`}
                            className="hover:text-green-600 transition-colors"
                          >
                            <h3 className="font-semibold text-lg hover:text-green-600">
                              {business.name}
                            </h3>
                          </Link>
                          <Badge variant="secondary" className="text-xs">{categories.find(c => c.id === business.categoryId)?.name}</Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-400 mr-1" />
                            <span className="text-sm font-medium">{business.averageRating}</span>
                            <span className="text-xs text-muted-foreground ml-1">({business.totalRatings})</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-muted-foreground text-sm mb-4">{business.description.slice(0, 120)}...</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center text-muted-foreground">
                          <MapPin className="w-4 h-4 mr-2" />
                          <span>{business.address.street}, {business.address.city}, {business.address.state}</span>
                          {userLocation && business.address.coordinates && locationEnabled && (
                            <Badge variant="outline" className="ml-auto">
                              {getDistanceText(userLocation, business.address.coordinates)}
                            </Badge>
                          )}
                        </div>
                        {business.operatingHours && (
                          <div className="flex items-center text-muted-foreground">
                            <Clock className="w-4 h-4 mr-2" />
                            Open Today
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="grid lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search businesses and services..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {[...new Set(businesses.map(b => `${b.address.city}, ${b.address.state}`))].map(location => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button variant="outline" className="w-full">
                    <Filter className="w-4 h-4 mr-2" />
                    More Filters
                  </Button>
                </div>

                {/* Location Search Bar */}
                <LocationSearchBar
                  value={locationQuery}
                  onChange={setLocationQuery}
                  onLocationSelect={handleLocationSelect}
                  onUseCurrentLocation={handleLocationToggle}
                  placeholder="Search location or use GPS..."
                  className="w-full mb-4"
                />

                {/* Category Tabs */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      activeTab === 'all'
                        ? 'bg-green-600 text-white'
                        : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10'
                    }`}
                  >
                    All
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setActiveTab(category.id)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        activeTab === category.id
                          ? 'bg-green-600 text-white'
                          : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Location Filter Panel */}
          <div className="lg:col-span-1">
            <LocationFilterPanel
              userLocation={userLocation}
              locationEnabled={locationEnabled}
              radius={radius}
              onRadiusChange={setRadius}
              onLocationToggle={handleLocationToggle}
              onClearLocation={handleClearLocation}
              sortByDistance={sortByDistance}
              onSortByDistanceChange={setSortByDistance}
            />
          </div>
        </div>

        {/* Results Header with View Toggle */}
        <LocationMapToggle
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          resultsCount={filteredAndSortedBusinesses.length}
          locationEnabled={locationEnabled}
          userLocation={userLocation}
          radius={locationEnabled ? radius : undefined}
          className="mb-6"
        />

        {/* Business Listings */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading businesses...</p>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-red-500 mb-4">
                <Store className="w-12 h-12 mx-auto mb-2" />
                <p className="font-semibold">Error Loading Businesses</p>
              </div>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </CardContent>
          </Card>
        ) : viewMode === 'map' ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Map View Coming Soon</h3>
              <p className="text-muted-foreground mb-6">
                Interactive map view for businesses will be available soon. For now, please use the grid or list view.
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setViewMode('list')}>Switch to List</Button>
                <Button variant="outline" onClick={() => setViewMode('grid')}>Switch to Grid</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === 'grid' ? 'grid lg:grid-cols-2 gap-6' : 'space-y-4'}>
            {filteredAndSortedBusinesses.map((business) => (
              <Card key={business.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className={`flex ${viewMode === 'grid' ? 'gap-4' : 'gap-6'}`}>
                    <img
                      src={business.images[0]?.url || "/placeholder.svg"}
                      alt={business.name}
                      className={`rounded-lg object-cover ${
                        viewMode === 'grid' ? 'w-20 h-20' : 'w-24 h-24'
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Link 
                              to={`/stores/${business.id}`}
                              className="hover:text-green-600 transition-colors"
                            >
                              <h3 className="font-semibold text-lg hover:text-green-600">
                                {business.name}
                              </h3>
                            </Link>
                            {business.isVerified && (
                              <Badge variant="outline" className="text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {categories.find(c => c.id === business.categoryId)?.name}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-400 mr-1" />
                            <span className="text-sm font-medium">{business.averageRating}</span>
                            <span className="text-xs text-muted-foreground ml-1">({business.totalRatings})</span>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{business.description.slice(0, 120)}...</p>
                      
                      <div className="space-y-1 text-sm mb-4">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <div className="flex items-center">
                            <MapPin className="w-3 h-3 mr-2" />
                            <span>{business.address.street}, {business.address.city}, {business.address.state}</span>
                          </div>
                          {userLocation && business.address.coordinates && locationEnabled && (
                            <Badge variant="outline" className="ml-2">
                              {getDistanceText(userLocation, business.address.coordinates)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <Phone className="w-4 h-4 mr-1" />
                              {business.contactInfo.phone}
                            </div>
                            {business.contactInfo.website && (
                              <div className="flex items-center">
                                <Globe className="w-4 h-4 mr-1" />
                                <a 
                                  href={business.contactInfo.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="hover:text-green-600"
                                >
                                  Website
                                </a>
                              </div>
                            )}
                          </div>
                          <Link 
                            to={`/stores/${business.id}`}
                            className="text-sm text-green-600 hover:text-green-700 font-medium"
                          >
                            View Details
                          </Link>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-4">
                        {business.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700">
                          Contact
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && !error && filteredAndSortedBusinesses.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Store className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No businesses found</h3>
              <p className="text-muted-foreground mb-6">
                No businesses match your current search criteria. Try adjusting your filters or search terms.
              </p>
              <div className="flex gap-2 justify-center">
                <Button 
                  onClick={() => {
                    setSearchTerm('');
                    setActiveTab('all');
                    setSelectedLocation('all');
                    handleClearLocation();
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Clear All Filters
                </Button>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Be the First to List Your Business
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Community Values Section */}
        <Card className="mt-12 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-4">Supporting Our Community</h3>
              <p className="text-white/90 max-w-2xl mx-auto">
                Our business directory helps connect the stepping community with trusted local and online service providers who understand and support our culture.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <h4 className="font-semibold mb-2">Community First</h4>
                <p className="text-sm text-white/90">
                  Supporting businesses that understand and celebrate stepping culture
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h4 className="font-semibold mb-2">Verified Quality</h4>
                <p className="text-sm text-white/90">
                  Trusted businesses verified by community members and reviews
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h4 className="font-semibold mb-2">Growing Together</h4>
                <p className="text-sm text-white/90">
                  Building a network that helps our community thrive and succeed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}