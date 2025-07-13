import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  MapPin, 
  DollarSign, 
  Users, 
  Star, 
  Clock,
  ExternalLink,
  Filter,
  Grid,
  List,
  Map as MapIcon
} from 'lucide-react';
import { UnifiedSearchComponent } from '@/components/search/UnifiedSearchComponent';
import { SearchResult, categorySearchService } from '@/lib/services/CategorySearchService';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [sortBy, setSortBy] = useState('relevance');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const initialQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || '';
  const initialLocation = searchParams.get('location') || '';

  // Update URL params when search changes
  const updateSearchParams = (query: string, category?: string, location?: string) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    if (location) params.set('location', location);
    setSearchParams(params);
  };

  const handleSearchResults = (searchResults: SearchResult[]) => {
    setResults(searchResults);
  };

  const toggleTypeFilter = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const filteredResults = selectedTypes.length > 0 
    ? results.filter(result => selectedTypes.includes(result.type))
    : results;

  const sortedResults = [...filteredResults].sort((a, b) => {
    switch (sortBy) {
      case 'price_asc':
        return (a.price || 0) - (b.price || 0);
      case 'price_desc':
        return (b.price || 0) - (a.price || 0);
      case 'rating':
        return (b.averageRating || 0) - (a.averageRating || 0);
      case 'date':
        return new Date(a.date || '').getTime() - new Date(b.date || '').getTime();
      default:
        return 0; // relevance - maintain current order
    }
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'event': return '📅';
      case 'class': return '🎓';
      case 'business': return '🏢';
      default: return '📄';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'event': return 'bg-blue-100 text-blue-800';
      case 'class': return 'bg-green-100 text-green-800';
      case 'business': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const resultCounts = {
    total: results.length,
    events: results.filter(r => r.type === 'event').length,
    classes: results.filter(r => r.type === 'class').length,
    businesses: results.filter(r => r.type === 'business').length
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Search Stepping Community
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Find stepping events, classes, instructors, venues, and more
          </p>
        </div>

        {/* Search Component */}
        <div className="mb-8">
          <UnifiedSearchComponent
            onResults={handleSearchResults}
            initialFilters={{
              query: initialQuery,
              categories: initialCategory ? [initialCategory] : [],
              location: initialLocation
            }}
            showTypeFilter={true}
            className="max-w-4xl mx-auto"
          />
        </div>

        {/* Results Section */}
        {results.length > 0 && (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Filters */}
            <div className="lg:w-64 flex-shrink-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Filter Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Content Type Filter */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Content Type
                    </h3>
                    <div className="space-y-2">
                      {['event', 'class', 'business'].map(type => (
                        <label key={type} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedTypes.includes(type)}
                            onChange={() => toggleTypeFilter(type)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm capitalize">
                            {getTypeIcon(type)} {type}s ({
                              type === 'event' ? resultCounts.events :
                              type === 'class' ? resultCounts.classes :
                              resultCounts.businesses
                            })
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Sort Options */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Sort By
                    </h3>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="relevance">Relevance</option>
                      <option value="date">Date</option>
                      <option value="price_asc">Price: Low to High</option>
                      <option value="price_desc">Price: High to Low</option>
                      <option value="rating">Highest Rated</option>
                    </select>
                  </div>

                  {/* View Mode */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      View Mode
                    </h3>
                    <div className="flex gap-1">
                      {[
                        { mode: 'grid', icon: Grid, label: 'Grid' },
                        { mode: 'list', icon: List, label: 'List' },
                        { mode: 'map', icon: MapIcon, label: 'Map' }
                      ].map(({ mode, icon: Icon, label }) => (
                        <Button
                          key={mode}
                          variant={viewMode === mode ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setViewMode(mode as any)}
                          className="flex-1"
                        >
                          <Icon className="h-4 w-4" />
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Results Content */}
            <div className="flex-1">
              {/* Results Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      Search Results
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      {filteredResults.length} of {results.length} results
                      {selectedTypes.length > 0 && ` • Filtered by: ${selectedTypes.join(', ')}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Results Grid/List */}
              <div className={`${
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' 
                  : 'space-y-4'
              }`}>
                {sortedResults.map((result) => (
                  <Card 
                    key={result.id} 
                    className={`h-full hover:shadow-lg transition-shadow cursor-pointer ${
                      viewMode === 'list' ? 'flex flex-row' : ''
                    }`}
                    onClick={() => window.open(result.url, '_blank')}
                  >
                    {result.imageUrl && (
                      <div className={`${
                        viewMode === 'list' ? 'w-48 flex-shrink-0' : 'h-48'
                      } bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden`}>
                        <img 
                          src={result.imageUrl} 
                          alt={result.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className={`${viewMode === 'list' ? 'flex-1' : ''}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg leading-tight">
                            {result.title}
                          </CardTitle>
                          <Badge className={getTypeColor(result.type)}>
                            {getTypeIcon(result.type)} {result.type}
                          </Badge>
                        </div>
                        <Badge variant="outline" className="w-fit text-xs">
                          {result.categoryLabel}
                        </Badge>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                          {result.description}
                        </p>
                        
                        <div className="space-y-2 text-sm">
                          {result.location && (
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <MapPin className="h-4 w-4" />
                              <span>{result.location}</span>
                            </div>
                          )}
                          
                          {result.date && (
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(result.date).toLocaleDateString()}</span>
                            </div>
                          )}
                          
                          {result.level && (
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <Users className="h-4 w-4" />
                              <span>{result.level}</span>
                            </div>
                          )}
                          
                          {result.price && (
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <DollarSign className="h-4 w-4" />
                              <span>${result.price}</span>
                            </div>
                          )}
                          
                          {result.averageRating && (
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span>{result.averageRating.toFixed(1)} ({result.totalRatings} reviews)</span>
                            </div>
                          )}
                        </div>
                        
                        {result.tags.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-1">
                            {result.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {result.tags.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{result.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Empty State */}
              {filteredResults.length === 0 && results.length > 0 && (
                <div className="text-center py-12">
                  <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    No results match your filters
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Try adjusting your filters or search terms
                  </p>
                  <Button onClick={() => setSelectedTypes([])}>
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Results State */}
        {results.length === 0 && (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Start Your Search
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Search for stepping events, classes, instructors, venues, DJs, and more in the stepping community
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div>
                  <div className="text-2xl mb-2">💃</div>
                  <div>Stepping Events</div>
                </div>
                <div>
                  <div className="text-2xl mb-2">🎓</div>
                  <div>Dance Classes</div>
                </div>
                <div>
                  <div className="text-2xl mb-2">🎵</div>
                  <div>DJs & Music</div>
                </div>
                <div>
                  <div className="text-2xl mb-2">🏢</div>
                  <div>Venues & Services</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}