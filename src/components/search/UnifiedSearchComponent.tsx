import * as React from "react"
import { useState, useEffect } from "react"
import {
  Search,
  Filter,
  X,
  ChevronDown,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Star,
  Clock
} from "lucide-react"
import { categorySearchService, SearchFilters, SearchResult } from "@/lib/services/CategorySearchService"

interface UnifiedSearchComponentProps {
  onResults?: (results: SearchResult[]) => void;
  initialFilters?: Partial<SearchFilters>;
  showTypeFilter?: boolean;
  className?: string;
}

export function UnifiedSearchComponent({
  onResults,
  initialFilters = {},
  showTypeFilter = true,
  className = ""
}: UnifiedSearchComponentProps) {
  const [searchQuery, setSearchQuery] = useState(initialFilters.query || "");
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [filters, setFilters] = useState<SearchFilters>({
    query: initialFilters.query || "",
    categories: initialFilters.categories || [],
    location: initialFilters.location || "",
    priceRange: initialFilters.priceRange || {},
    dateRange: initialFilters.dateRange || {},
    level: initialFilters.level || "",
    type: initialFilters.type || ""
  });

  const categoryGroups = categorySearchService.getAllCategoryGroups();
  const popularCategories = categorySearchService.getPopularCategories();

  // Get search suggestions
  useEffect(() => {
    if (searchQuery.length > 2) {
      categorySearchService.getSearchSuggestions(searchQuery).then(setSuggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [searchQuery]);

  // Perform search
  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.length > 0 || filters.categories?.length || filters.location) {
        setIsLoading(true);
        try {
          const searchResults = await categorySearchService.searchAll({
            ...filters,
            query: searchQuery
          });
          setResults(searchResults);
          onResults?.(searchResults);
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setResults([]);
        onResults?.([]);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, filters, onResults]);

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    setFilters(prev => ({ ...prev, query: value }));
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setFilters(prev => ({ ...prev, query: suggestion }));
    setShowSuggestions(false);
  };

  const toggleCategory = (categoryId: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories?.includes(categoryId)
        ? prev.categories.filter(id => id !== categoryId)
        : [...(prev.categories || []), categoryId]
    }));
  };

  const clearFilters = () => {
    setFilters({
      query: searchQuery,
      categories: [],
      location: "",
      priceRange: {},
      dateRange: {},
      level: "",
      type: ""
    });
  };

  const activeFilterCount = 
    (filters.categories?.length || 0) +
    (filters.location ? 1 : 0) +
    (filters.level ? 1 : 0) +
    (filters.type ? 1 : 0) +
    (filters.priceRange?.min || filters.priceRange?.max ? 1 : 0);

  return (
    <div className={`w-full ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search stepping events, classes, line dancing, venues..."
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            onFocus={() => setShowSuggestions(searchQuery.length > 2)}
            className="w-full pl-12 pr-16 py-4 border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:outline-none text-lg"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
              showFilters ? 'bg-purple-100 text-purple-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Filter className="h-5 w-5" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Search Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-50">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg"
              >
                <div className="flex items-center gap-3">
                  <Search className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900 dark:text-gray-100">{suggestion}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Popular Categories Quick Access */}
      <div className="mt-4">
        <div className="flex flex-wrap gap-2">
          {popularCategories.slice(0, 6).map((category) => (
            <button
              key={category.id}
              onClick={() => toggleCategory(category.id)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                filters.categories?.includes(category.id)
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {category.label}
              <span className="ml-1 text-xs opacity-75">
                {category.type === 'event' ? '📅' : category.type === 'class' ? '🎓' : '🏢'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="mt-4 p-6 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filters</h3>
            <div className="flex gap-2">
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  Clear all
                </button>
              )}
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Content Type Filter */}
            {showTypeFilter && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Content Type
                </label>
                <select
                  value={filters.type || ""}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Types</option>
                  <option value="event">Events</option>
                  <option value="class">Classes</option>
                  <option value="business">Businesses</option>
                </select>
              </div>
            )}

            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <MapPin className="inline h-4 w-4 mr-1" />
                Location
              </label>
              <input
                type="text"
                placeholder="City, State or Online"
                value={filters.location || ""}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Level Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Users className="inline h-4 w-4 mr-1" />
                Level
              </label>
              <select
                value={filters.level || ""}
                onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value }))}
                className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="all-levels">All Levels</option>
              </select>
            </div>

            {/* Price Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <DollarSign className="inline h-4 w-4 mr-1" />
                Price Range
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.priceRange?.min || ""}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    priceRange: { ...prev.priceRange, min: e.target.value ? Number(e.target.value) : undefined }
                  }))}
                  className="flex-1 p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.priceRange?.max || ""}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    priceRange: { ...prev.priceRange, max: e.target.value ? Number(e.target.value) : undefined }
                  }))}
                  className="flex-1 p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Category Selection */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Categories
            </label>
            <div className="space-y-4">
              {Object.entries(categoryGroups).map(([type, groups]) => (
                <div key={type}>
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
                    {type}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {groups.flatMap(group => group.categories).map((category) => (
                      <button
                        key={category.id}
                        onClick={() => toggleCategory(category.id)}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                          filters.categories?.includes(category.id)
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {category.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search Results Summary */}
      {(searchQuery || activeFilterCount > 0) && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div>
            {isLoading ? (
              <span>Searching...</span>
            ) : (
              <span>
                Found {results.length} result{results.length !== 1 ? 's' : ''}
                {searchQuery && ` for "${searchQuery}"`}
              </span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2">
              <span>{activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} applied</span>
              <button
                onClick={clearFilters}
                className="text-purple-600 hover:text-purple-700"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}