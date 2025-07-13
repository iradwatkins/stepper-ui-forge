import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Clock, Users, Star, Play, Filter, Search, MapPin, GraduationCap, Award } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent text-center">
            Stepping Classes
          </h1>
          <p className="text-xl text-muted-foreground text-center max-w-2xl mx-auto">
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
                      <SelectValue placeholder="All Levels" />
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
                      <SelectValue placeholder="All Categories" />
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

        {/* Classes Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading classes...</p>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-red-500 mb-4">
                <BookOpen className="w-12 h-12 mx-auto mb-2" />
                <p className="font-semibold">Error Loading Classes</p>
              </div>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => loadClasses()}>Try Again</Button>
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
          <div className={viewMode === 'list' ? 'space-y-4' : 'grid md:grid-cols-2 lg:grid-cols-3 gap-6'}>
            {filteredAndSortedClasses.map((classItem) => (
              <Card key={classItem.id} className={`overflow-hidden hover:shadow-lg transition-shadow ${
                viewMode === 'list' ? 'flex' : ''
              }`}>
                <div className={`relative ${viewMode === 'list' ? 'w-48 flex-shrink-0' : ''}`}>
                  <img
                    src={classItem.images[0]?.url || "/placeholder.svg"}
                    alt={classItem.title}
                    className={`object-cover ${
                      viewMode === 'list' ? 'w-full h-full' : 'w-full h-48'
                    }`}
                  />
                  <Badge className="absolute top-3 left-3 bg-blue-600">
                    {classItem.level}
                  </Badge>
                  <div className="absolute top-3 right-3 bg-black/50 rounded-full p-2">
                    <Play className="w-4 h-4 text-white" />
                  </div>
                </div>
                
                <CardContent className="p-6 flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src="/placeholder.svg"
                      alt={classItem.instructorName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{classItem.instructorName}</p>
                      <p className="text-sm text-muted-foreground">{classItem.category}</p>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-2">
                    {classItem.title}
                  </h3>
                  
                  <p className="text-muted-foreground text-sm mb-4">
                    {classItem.description.slice(0, 120)}...
                  </p>
                  
                  {/* Location Information */}
                  <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{classItem.location.venue}, {classItem.location.city}, {classItem.location.state}</span>
                    {userLocation && classItem.location.coordinates && locationEnabled && (
                      <Badge variant="outline" className="ml-auto">
                        {getDistanceText(userLocation, classItem.location.coordinates)}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Star className="w-4 h-4 text-yellow-500 mr-1" />
                      <span>{classItem.averageRating}</span>
                      <span className="ml-1">({classItem.attendeeCount})</span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>{classItem.schedule.duration} min</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-blue-600">
                      ${classItem.price}
                    </span>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      Enroll Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
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
        <Card className="mt-12 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">
              Become an Instructor
            </h3>
            <p className="text-white/90 mb-6">
              Share your stepping expertise and teach students worldwide
            </p>
            <Button className="bg-white text-purple-600 hover:bg-white/90">
              Apply to Teach
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}