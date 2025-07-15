import * as React from "react"
import {
  Search,
  MapPin,
  CalendarDays,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Grid3X3,
  ChevronDown,
} from "lucide-react"
import { EVENT_CATEGORIES, getCategoryLabels } from "@/lib/constants/event-categories"
import { categorySearchService } from "@/lib/services/CategorySearchService"

const categories = ["All Events", ...getCategoryLabels()]

// Enhanced search suggestions for stepping community
const steppingSearchPlaceholders = [
  "Search Chicago stepping events, line dancing, venues...",
  "Find stepping classes, workshops, instructors...",
  "Discover stepping socials, competitions, shows...",
  "Search DJs, dance shoes, event venues..."
]

interface EventFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  activeView: string;
  setActiveView: (view: string) => void;
  selectedLocation: string;
  setSelectedLocation: (location: string) => void;
  selectedDateRange: { start: string; end: string };
  setSelectedDateRange: (range: { start: string; end: string }) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: (show: boolean) => void;
}

export function EventFilters({ 
  searchQuery, 
  setSearchQuery, 
  activeCategory, 
  setActiveCategory, 
  activeView, 
  setActiveView,
  selectedLocation,
  setSelectedLocation,
  selectedDateRange,
  setSelectedDateRange,
  sortBy,
  setSortBy,
  showAdvancedFilters,
  setShowAdvancedFilters
}: EventFiltersProps) {

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      {/* Main Search Section */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-2xl p-8 mb-8 shadow-sm border border-purple-100 dark:border-purple-800/30">
        <div className="flex flex-col gap-6">
          
          {/* Enhanced Search Bar */}
          <div className="relative max-w-2xl mx-auto w-full">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-6 w-6 text-purple-400" />
            </div>
            <input
              type="text"
              placeholder={steppingSearchPlaceholders[Math.floor(Math.random() * steppingSearchPlaceholders.length)]}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-4 text-lg bg-white dark:bg-gray-900 border-2 border-purple-200 dark:border-purple-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none transition-all duration-200 shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center"
              >
                <div className="h-6 w-6 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors">
                  <span className="text-white text-sm">×</span>
                </div>
              </button>
            )}
          </div>

          {/* Primary Filters Row */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            
            {/* Category Filter */}
            <div className="relative">
              <select
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                className="px-6 py-3 border-2 border-purple-200 dark:border-purple-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 hover:border-purple-300 dark:hover:border-purple-600 focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none appearance-none pr-12 min-w-[180px] font-medium transition-all duration-200 shadow-sm"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-400 pointer-events-none" />
            </div>

            {/* Location Filter */}
            <div className="relative">
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="px-6 py-3 border-2 border-purple-200 dark:border-purple-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 hover:border-purple-300 dark:hover:border-purple-600 focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none appearance-none pr-12 min-w-[160px] font-medium transition-all duration-200 shadow-sm"
              >
                <option value="">All Locations</option>
                <option value="CA">California</option>
                <option value="NY">New York</option>
                <option value="TX">Texas</option>
                <option value="FL">Florida</option>
                <option value="IL">Illinois</option>
                <option value="WA">Washington</option>
                <option value="OR">Oregon</option>
                <option value="NV">Nevada</option>
                <option value="AZ">Arizona</option>
                <option value="CO">Colorado</option>
              </select>
              <MapPin className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-400 pointer-events-none" />
            </div>
            
            {/* Date Range */}
            <div className="flex items-center gap-3 bg-white dark:bg-gray-900 border-2 border-purple-200 dark:border-purple-700 rounded-xl px-4 py-3 shadow-sm">
              <CalendarDays className="h-5 w-5 text-purple-400" />
              <input
                type="date"
                value={selectedDateRange.start}
                onChange={(e) => setSelectedDateRange({...selectedDateRange, start: e.target.value})}
                className="border-0 bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none font-medium"
              />
              <span className="text-purple-400 font-medium">to</span>
              <input
                type="date"
                value={selectedDateRange.end}
                onChange={(e) => setSelectedDateRange({...selectedDateRange, end: e.target.value})}
                className="border-0 bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none font-medium"
              />
            </div>
            
            {/* Advanced Filters Button */}
            <button 
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-3 px-6 py-3 border-2 rounded-xl font-medium transition-all duration-200 shadow-sm ${
                showAdvancedFilters 
                  ? 'border-purple-500 bg-purple-500 text-white hover:bg-purple-600' 
                  : 'border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-400 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30'
              }`}
            >
              <SlidersHorizontal className="h-5 w-5" />
              Advanced
            </button>
          </div>
        </div>
      </div>

      {/* Results Header with Sort and View Controls */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Discover Events</h2>
            <p className="text-gray-600 dark:text-gray-400">Find stepping events, workshops, and community gatherings</p>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Sort by:</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border-2 border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none transition-all duration-200"
              >
                <option value="date_asc">Date (Earliest First)</option>
                <option value="date_desc">Date (Latest First)</option>
                <option value="popularity">Popularity</option>
                <option value="price_asc">Price (Low to High)</option>
                <option value="price_desc">Price (High to Low)</option>
                <option value="title_asc">Title (A to Z)</option>
              </select>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border-2 border-gray-200 dark:border-gray-700">
              <button 
                onClick={() => setActiveView("Grid")} 
                className={`p-2 rounded-md transition-all duration-200 ${
                  activeView === "Grid" 
                    ? "bg-white dark:bg-gray-900 shadow-sm text-purple-600 dark:text-purple-400" 
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="h-5 w-5" />
              </button>
              <button 
                onClick={() => setActiveView("List")} 
                className={`p-2 rounded-md transition-all duration-200 ${
                  activeView === "List" 
                    ? "bg-white dark:bg-gray-900 shadow-sm text-purple-600 dark:text-purple-400" 
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
                title="List View"
              >
                <List className="h-5 w-5" />
              </button>
              <button 
                onClick={() => setActiveView("Masonry")} 
                className={`p-2 rounded-md transition-all duration-200 ${
                  activeView === "Masonry" 
                    ? "bg-white dark:bg-gray-900 shadow-sm text-purple-600 dark:text-purple-400" 
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
                title="Masonry View"
              >
                <Grid3X3 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}