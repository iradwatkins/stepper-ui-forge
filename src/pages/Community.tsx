import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, MapPin, Phone, Globe, Star, Search, Filter, Plus, Clock, CheckCircle, Users, Heart, ChevronLeft, ChevronRight, Building, Calendar, Car, Laptop } from 'lucide-react';
import { LocationSearchBar, LocationFilterPanel, LocationMapToggle } from '@/components/location';
import { SimpleMapView } from '@/components/map';
import { BusinessCard } from '@/components/business';
import { 
  LocationResult, 
  LocationCoordinates, 
  getCurrentLocation, 
  filterByLocation, 
  getDistanceText 
} from '@/services/locationSearchService';
import { CommunityBusinessService, CommunityBusiness, BusinessCategory, BusinessType } from '@/lib/services/CommunityBusinessService';
import { Link } from 'react-router-dom';

export default function Community() {
  const [activeTab, setActiveTab] = useState('all');
  const [businessTypeFilter, setBusinessTypeFilter] = useState<BusinessType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All Locations');

  // Location search state
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [locationQuery, setLocationQuery] = useState('');
  const [userLocation, setUserLocation] = useState<LocationCoordinates | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [radius, setRadius] = useState(25);
  const [sortByDistance, setSortByDistance] = useState(false);

  // Store data state
  const [businesses, setBusinesses] = useState<CommunityBusiness[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carousel state
  const [currentSlide, setCurrentSlide] = useState(0);

  // Carousel data
  const carouselSlides = [
    {
      id: 1,
      title: "Need help around the house?",
      subtitle: "Find a service provider.",
      description: "Connect with trusted professionals for home services, repairs, and maintenance",
      buttonText: "Find Services",
      gradient: "from-emerald-600 to-teal-600",
      businessType: 'service_provider' as BusinessType
    },
    {
      id: 2,
      title: "Find the perfect small business",
      subtitle: "near you.",
      description: "Discover local businesses that understand and support our stepping community",
      buttonText: "Browse Businesses",
      gradient: "from-purple-600 to-indigo-600",
      businessType: 'physical_business' as BusinessType
    },
    {
      id: 3,
      title: "Book your next event venue",
      subtitle: "for stepping events.",
      description: "Find the perfect venue for your next stepping event, practice, or celebration",
      buttonText: "Browse Venues",
      gradient: "from-blue-600 to-cyan-600",
      businessType: 'venue' as BusinessType
    }
  ];

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 8000); // Slowed down from 5000ms to 8000ms
    return () => clearInterval(timer);
  }, []);

  // Load store data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const businessData = await CommunityBusinessService.getBusinesses();
        const categoryData = CommunityBusinessService.getBusinessCategories();
        setBusinesses(businessData.businesses);
        setCategories(categoryData.map(cat => ({id: cat.value, name: cat.label})));
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
      const matchesSearch = business.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           business.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (business.tags || []).some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (business.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (business.service_offerings || []).some(service => service.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Category filter
      const matchesCategory = activeTab === 'all' || business.category === activeTab;
      
      // Business type filter
      const matchesBusinessType = businessTypeFilter === 'all' || business.business_type === businessTypeFilter;
      
      // Location filter (legacy dropdown)
      const matchesLocation = selectedLocation === 'All Locations' || 
                              `${business.city || ''}, ${business.state || ''}` === selectedLocation;
      
      return matchesSearch && matchesCategory && matchesBusinessType && matchesLocation;
    });

    // Location-based filtering
    if (locationEnabled && userLocation) {
      filtered = filterByLocation(filtered, userLocation, radius, { sortByDistance });
    }

    return filtered;
  }, [businesses, searchTerm, activeTab, selectedLocation, userLocation, locationEnabled, radius, sortByDistance]);

  const featuredBusinesses = businesses.filter(business => business.is_verified);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Carousel Section */}
      <div className="relative overflow-hidden">
        <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
          {carouselSlides.map((slide, index) => (
            <div key={slide.id} className={`w-full flex-shrink-0 relative bg-gradient-to-br ${slide.gradient}`}>
              <div className="absolute inset-0 bg-black/20" />
              <div className="relative container mx-auto px-4 py-24 lg:py-32">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                  <div className="text-white space-y-6">
                    <div className="space-y-2">
                      <h1 className="text-5xl lg:text-7xl font-bold tracking-tight">
                        {slide.title}
                      </h1>
                      <h2 className="text-4xl lg:text-6xl font-bold text-white/90">
                        {slide.subtitle}
                      </h2>
                    </div>
                    <p className="text-xl lg:text-2xl text-white/90 max-w-lg leading-relaxed">
                      {slide.description}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                      <Button 
                        size="lg" 
                        className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-4"
                        onClick={() => slide.businessType && setBusinessTypeFilter(slide.businessType)}
                      >
                        {slide.buttonText}
                      </Button>
                      <Link to="/dashboard/businesses/create">
                        <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8 py-4">
                          List Your {slide.businessType === 'service_provider' ? 'Service' : 'Business'}
                        </Button>
                      </Link>
                    </div>
                  </div>
                  <div className="hidden lg:block">
                    <img
                      src="/placeholder.svg"
                      alt={slide.title}
                      className="w-full h-96 object-cover rounded-2xl shadow-2xl"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Carousel Controls */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {carouselSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                currentSlide === index ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
        
        {/* Navigation Arrows */}
        <button
          onClick={() => setCurrentSlide((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length)}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={() => setCurrentSlide((prev) => (prev + 1) % carouselSlides.length)}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <div className="container mx-auto px-4 py-12">

        {/* Featured Businesses */}
        {featuredBusinesses.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-8 text-center">Featured Businesses</h2>
            <div className="space-y-8">
              {featuredBusinesses.slice(0, 3).map((business) => (
                <Card key={business.id} className="overflow-hidden hover:shadow-xl transition-shadow border-green-200 dark:border-green-800">
                  <CardContent className="p-0">
                    <div className="flex flex-col lg:flex-row">
                      {/* Large Image */}
                      <div className="lg:w-1/2 relative">
                        <img
                          src={(business.gallery_images && business.gallery_images[0]) || "/placeholder.svg"}
                          alt={business.business_name}
                          className="w-full h-64 lg:h-80 object-cover"
                        />
                        <div className="absolute top-4 left-4 flex gap-2">
                          <Badge className="bg-green-600 text-white">
                            Featured
                          </Badge>
                          {business.is_verified && (
                            <Badge className="bg-blue-600 text-white">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Content on the right */}
                      <div className="lg:w-1/2 p-8 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <Link 
                                to={`/stores/${business.id}`}
                                className="hover:text-green-600 transition-colors"
                              >
                                <h3 className="font-bold text-2xl hover:text-green-600 mb-2">
                                  {business.business_name}
                                </h3>
                              </Link>
                              <Badge variant="secondary" className="text-sm">
                                {categories.find(c => c.id === business.category)?.name}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="w-5 h-5 text-yellow-400" />
                              <span className="text-lg font-medium">{business.rating_average}</span>
                              <span className="text-sm text-muted-foreground">({business.rating_count})</span>
                            </div>
                          </div>
                          
                          <p className="text-muted-foreground text-base mb-6 leading-relaxed">
                            {business.description.slice(0, 200)}...
                          </p>
                          
                          <div className="space-y-3 mb-6">
                            <div className="flex items-center text-muted-foreground">
                              <MapPin className="w-5 h-5 mr-3 text-green-600" />
                              <span className="text-sm">{business.address || ''}, {business.city}, {business.state}</span>
                              {userLocation && business.latitude && business.longitude && locationEnabled && (
                                <Badge variant="outline" className="ml-auto">
                                  {getDistanceText(userLocation, {lat: business.latitude, lng: business.longitude})}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center text-muted-foreground">
                              <Phone className="w-5 h-5 mr-3 text-green-600" />
                              <span className="text-sm">{business.contact_phone}</span>
                            </div>
                            {business.website_url && (
                              <div className="flex items-center text-muted-foreground">
                                <Globe className="w-5 h-5 mr-3 text-green-600" />
                                <a 
                                  href={business.website_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="hover:text-green-600 text-sm"
                                >
                                  Visit Website
                                </a>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mb-6">
                            {(business.tags || []).slice(0, 4).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex gap-3">
                          <Button className="flex-1 bg-green-600 hover:bg-green-700">
                            Contact Business
                          </Button>
                          <Link to={`/stores/${business.id}`} className="flex-1">
                            <Button variant="outline" className="w-full">
                              View Details
                            </Button>
                          </Link>
                        </div>
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
                <div className="grid md:grid-cols-2 gap-4 mb-6">
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
                      <SelectItem value="All Locations">All Locations</SelectItem>
                      {[...new Set(businesses.map(b => `${b.city || ''}, ${b.state || ''}`))].map(location => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

                {/* Business Type Filter */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium mb-2">Business Type</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setBusinessTypeFilter('all')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                        businessTypeFilter === 'all'
                          ? 'bg-green-600 text-white'
                          : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10'
                      }`}
                    >
                      All Types
                    </button>
                    {CommunityBusinessService.getBusinessTypes().map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setBusinessTypeFilter(type.value)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                          businessTypeFilter === type.value
                            ? 'bg-green-600 text-white'
                            : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10'
                        }`}
                      >
                        {type.value === 'physical_business' && <Building className="w-3.5 h-3.5" />}
                        {type.value === 'service_provider' && <Calendar className="w-3.5 h-3.5" />}
                        {type.value === 'mobile_service' && <Car className="w-3.5 h-3.5" />}
                        {type.value === 'online_business' && <Laptop className="w-3.5 h-3.5" />}
                        {type.value === 'venue' && <Building className="w-3.5 h-3.5" />}
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

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
          <SimpleMapView
            items={filteredAndSortedBusinesses.map(business => ({
              id: business.id,
              name: business.business_name,
              address: business.address,
              city: business.city,
              state: business.state,
              coordinates: business.latitude && business.longitude ? {
                lat: business.latitude,
                lng: business.longitude
              } : undefined,
              description: business.description,
              category: business.category
            })) as any}
            userLocation={userLocation}
            onItemClick={(item) => {
              // Could navigate to business detail page
              console.log('Business clicked:', item);
            }}
            onViewModeChange={setViewMode}
            height="600px"
          />
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
            : 'space-y-6'
          }>
            {filteredAndSortedBusinesses.map((business, index) => {
              const isLarge = viewMode === 'grid' && index % 9 === 0; // Every 9th item is larger in grid
              return viewMode === 'grid' ? (
                <div 
                  key={business.id}
                  className={isLarge ? 'lg:col-span-2' : ''}
                >
                  <BusinessCard
                    business={business}
                    userLocation={userLocation}
                    size={isLarge ? 'large' : 'default'}
                    showContactButton={true}
                  />
                </div>
              ) : (
                <BusinessCard
                  key={business.id}
                  business={business}
                  userLocation={userLocation}
                  size="large"
                  showContactButton={true}
                />
              );
            })}
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
                    setBusinessTypeFilter('all');
                    setSelectedLocation('All Locations');
                    handleClearLocation();
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Clear All Filters
                </Button>
                <Link to="/create-business">
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Be the First to List Your Business
                  </Button>
                </Link>
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