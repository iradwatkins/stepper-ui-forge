import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BookOpen, 
  Clock, 
  Users, 
  Star, 
  Play, 
  Filter, 
  Search, 
  MapPin, 
  GraduationCap, 
  Award,
  ChevronLeft,
  ChevronRight,
  Home,
  Briefcase,
  Phone,
  Mail,
  Globe,
  Heart
} from 'lucide-react';
import { LocationSearchBar, LocationFilterPanel, LocationMapToggle } from '@/components/location';
import { 
  LocationResult, 
  LocationCoordinates, 
  getCurrentLocation, 
  filterByLocation, 
  getDistanceText 
} from '@/services/locationSearchService';
import { useClasses } from '@/hooks/useClasses';
import { UnifiedSearchComponent } from '@/components/search/UnifiedSearchComponent';
import { SearchResult } from '@/lib/services/CategorySearchService';
import { CLASS_LEVELS, CLASS_CATEGORIES } from '@/lib/constants/class-categories';

export default function Classes() {
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Carousel state
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Location search state
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [locationQuery, setLocationQuery] = useState('');
  const [userLocation, setUserLocation] = useState<LocationCoordinates | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [radius, setRadius] = useState(25);
  const [sortByDistance, setSortByDistance] = useState(false);

  // Use the classes hook
  const { classes, loading, error, loadClasses } = useClasses();

  const levels = CLASS_LEVELS.map(level => level.label);
  const categories = CLASS_CATEGORIES.map(cat => cat.label);

  // Handle search results from unified search
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const handleSearchResults = (results: SearchResult[]) => {
    setSearchResults(results.filter(result => result.type === 'class'));
    setShowSearchResults(results.length > 0);
  };

  // Load classes on component mount
  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  // Carousel data
  const carouselSlides = [
    {
      id: 1,
      title: "Want to learn to step?",
      subtitle: "Find a class near you.",
      description: "Connect with expert instructors and master the art of stepping with classes designed for every skill level",
      buttonText: "Find Classes",
      gradient: "from-emerald-600 to-teal-600"
    },
    {
      id: 2,
      title: "Meet New People",
      subtitle: "take a Line Dancing Class",
      description: "Join our vibrant community and make lasting connections through the joy of line dancing",
      buttonText: "Browse Classes",
      gradient: "from-purple-600 to-indigo-600"
    }
  ];

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 8000); // Slowed down from 5000ms to 8000ms
    return () => clearInterval(timer);
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
  const filteredAndSortedClasses = useMemo(() => {
    let filtered = classes.filter(classItem => {
      // Text search
      const matchesSearch = classItem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           classItem.instructorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           classItem.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           classItem.location.venue?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           classItem.location.city?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Level filter
      const matchesLevel = selectedLevel === 'all' || classItem.level === selectedLevel;
      
      // Category filter
      const matchesCategory = selectedCategory === 'all' || classItem.category === selectedCategory;
      
      return matchesSearch && matchesLevel && matchesCategory;
    });

    // Location filtering
    if (locationEnabled && userLocation) {
      filtered = filterByLocation(filtered, userLocation, radius, { sortByDistance });
    }

    return filtered;
  }, [classes, searchTerm, selectedLevel, selectedCategory, userLocation, locationEnabled, radius, sortByDistance]);

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
                      <Button size="lg" className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-4">
                        {slide.buttonText}
                      </Button>
                      <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8 py-4">
                        Learn More
                      </Button>
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
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Stepping Classes</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Learn from expert instructors and master the art of stepping with classes designed for every skill level
          </p>
        </div>

        {/* Featured Class */}
        {filteredAndSortedClasses.length > 0 && (
          <Card className="mb-8 overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <Badge className="bg-white text-blue-600 mb-4">
                    Most Popular
                  </Badge>
                  <h2 className="text-3xl font-bold mb-4">
                    {filteredAndSortedClasses[0].title}
                  </h2>
                  <p className="text-white/90 mb-6">
                    {filteredAndSortedClasses[0].description.slice(0, 150)}...
                  </p>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center">
                      <Star className="w-5 h-5 mr-1" />
                      <span>{filteredAndSortedClasses[0].averageRating} ({filteredAndSortedClasses[0].attendeeCount} students)</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-5 h-5 mr-1" />
                      <span>{filteredAndSortedClasses[0].schedule.duration} min</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-5 h-5 mr-1" />
                      <span>{filteredAndSortedClasses[0].location.city}, {filteredAndSortedClasses[0].location.state}</span>
                    </div>
                  </div>
                  <Button className="bg-white text-blue-600 hover:bg-white/90">
                    Enroll Now - ${filteredAndSortedClasses[0].price}
                  </Button>
                </div>
                <div className="hidden md:block">
                  <img
                    src={filteredAndSortedClasses[0].images[0]?.url || "/placeholder.svg"}
                    alt="Featured Class"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filters */}
        <div className="grid lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-4 gap-4 mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search classes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      {levels.map(level => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Filter className="w-4 h-4 mr-2" />
                    Apply Filters
                  </Button>
                </div>

                {/* Location Search Bar */}
                <LocationSearchBar
                  value={locationQuery}
                  onChange={setLocationQuery}
                  onLocationSelect={handleLocationSelect}
                  onUseCurrentLocation={handleLocationToggle}
                  placeholder="Search location or use GPS..."
                  className="w-full"
                />
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
          resultsCount={filteredAndSortedClasses.length}
          locationEnabled={locationEnabled}
          userLocation={userLocation}
          radius={locationEnabled ? radius : undefined}
          className="mb-6"
        />

        {/* Class Categories */}
        <div className="grid md:grid-cols-6 gap-4 mb-8">
          {categories.map((category) => (
            <Card key={category} className="text-center cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-sm">{category}</h3>
                <p className="text-xs text-muted-foreground">
                  {classes.filter(c => c.category === category).length} classes
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Classes Grid/Masonry */}
        {loading ? (
          <div className="text-center py-24">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-xl text-muted-foreground">Loading amazing classes...</p>
          </div>
        ) : error ? (
          <Card className="border-destructive">
            <CardContent className="p-12 text-center">
              <div className="text-destructive mb-4">
                <BookOpen className="w-16 h-16 mx-auto mb-4" />
                <p className="font-semibold text-xl">Error Loading Classes</p>
              </div>
              <p className="text-muted-foreground mb-6 text-lg">{error}</p>
              <Button onClick={() => loadClasses()} size="lg">Try Again</Button>
            </CardContent>
          </Card>
        ) : viewMode === 'map' ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Map View Coming Soon</h3>
              <p className="text-muted-foreground mb-6">
                Interactive map view for classes will be available soon. For now, please use the grid or list view.
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setViewMode('grid')}>Switch to Grid</Button>
                <Button variant="outline" onClick={() => setViewMode('list')}>Switch to List</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedClasses.map((classItem, index) => {
              const isLarge = index % 7 === 0; // Every 7th item is larger
              return (
                <Card key={classItem.id} className={`bg-card rounded-xl border-2 border-border overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all duration-300 group cursor-pointer ${
                  isLarge ? 'lg:col-span-2 lg:row-span-2' : ''
                }`}>
                  {/* Image Container */}
                  <div className={`relative ${isLarge ? 'h-64' : 'h-48'}`}>
                    <img
                      src={classItem.images[0]?.url || "/placeholder.svg"}
                      alt={classItem.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {/* Price Badge */}
                    <div className="absolute top-3 left-3 bg-card/95 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold text-foreground border border-border">
                      ${classItem.price}
                    </div>
                    
                    {/* Level Badge */}
                    <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground">
                      {classItem.level}
                    </Badge>
                    
                    {/* Play Icon Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-16 h-16 bg-primary/90 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <Play className="w-8 h-8 text-primary-foreground ml-1" />
                      </div>
                    </div>
                  </div>

                  {/* Content Container */}
                  <CardContent className={`${isLarge ? 'p-6' : 'p-4'}`}>
                    {/* Instructor */}
                    <div className="flex items-center gap-2 mb-3">
                      <img
                        src="/placeholder.svg"
                        alt={classItem.instructorName}
                        className="w-8 h-8 rounded-full object-cover border-2 border-border"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{classItem.instructorName}</p>
                        <p className="text-xs text-muted-foreground">{classItem.category}</p>
                      </div>
                    </div>
                    
                    {/* Title */}
                    <h3 className={`font-bold text-foreground mb-2 line-clamp-2 ${isLarge ? 'text-xl' : 'text-lg'}`}>
                      {classItem.title}
                    </h3>
                    
                    {/* Description */}
                    <p className={`text-muted-foreground text-sm mb-4 ${isLarge ? 'line-clamp-3' : 'line-clamp-2'}`}>
                      {classItem.description}
                    </p>
                    
                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400" />
                        <span className="font-medium">{classItem.averageRating}</span>
                        <span>({classItem.attendeeCount})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{classItem.schedule.duration}min</span>
                      </div>
                    </div>
                    
                    {/* Location */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="truncate">{classItem.location.city}, {classItem.location.state}</span>
                      {userLocation && classItem.location.coordinates && locationEnabled && (
                        <Badge variant="outline" className="ml-auto text-xs">
                          {getDistanceText(userLocation, classItem.location.coordinates)}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Action Button */}
                    <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                      Enroll Now
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* No Results */}
        {!loading && !error && filteredAndSortedClasses.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No classes found</h3>
              <p className="text-muted-foreground mb-6">
                No classes match your current search criteria. Try adjusting your filters or search terms.
              </p>
              <Button 
                onClick={() => {
                  setSearchTerm('');
                  setSelectedLevel('all');
                  setSelectedCategory('all');
                  handleClearLocation();
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Clear All Filters
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Call to Action */}
        <Card className="mt-16 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0">
          <CardContent className="p-12 text-center">
            <Heart className="w-16 h-16 mx-auto mb-6 text-primary-foreground/90" />
            <h3 className="text-3xl font-bold mb-4">
              Join Our Teaching Community
            </h3>
            <p className="text-primary-foreground/90 mb-8 text-xl max-w-2xl mx-auto">
              Share your stepping expertise and inspire the next generation of dancers in our community
            </p>
            <Button 
              size="lg"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 text-lg px-8 py-4"
              onClick={() => window.location.href = '/create-class'}
            >
              Start Teaching Today
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}