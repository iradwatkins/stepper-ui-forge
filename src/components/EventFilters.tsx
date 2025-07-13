import * as React from "react"
import {
  Search,
  MapPin,
  CalendarDays,
  SlidersHorizontal,
  LayoutGrid,
  Columns,
  List,
  Map,
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
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex flex-col gap-6">

        {/* Enhanced Search Bar with Stepping-specific suggestions */}
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={steppingSearchPlaceholders[Math.floor(Math.random() * steppingSearchPlaceholders.length)]}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-full text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:outline-none"
          />
          {/* Search suggestions would appear here in a real implementation */}
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
                activeCategory === category
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Advanced Filter Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="relative">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 appearance-none pr-8"
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
            <MapPin className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDateRange.start}
              onChange={(e) => setSelectedDateRange({...selectedDateRange, start: e.target.value})}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={selectedDateRange.end}
              onChange={(e) => setSelectedDateRange({...selectedDateRange, end: e.target.value})}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm"
            />
          </div>
          
          <button 
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              showAdvancedFilters 
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' 
                : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" /> Advanced Filters
          </button>
        </div>

        <hr className="border-t border-gray-200 dark:border-gray-800" />

        {/* Sort By and View Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">All Events</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="date_asc">Date (Earliest First)</option>
                <option value="date_desc">Date (Latest First)</option>
                <option value="popularity">Popularity</option>
                <option value="price_asc">Price (Low to High)</option>
                <option value="price_desc">Price (High to Low)</option>
                <option value="title_asc">Title (A to Z)</option>
              </select>
            </div>
            
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button onClick={() => setActiveView("Grid")} className={`p-2 rounded-md transition-colors ${activeView === "Grid" ? "bg-white dark:bg-gray-900 shadow" : "hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
                <LayoutGrid className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </button>
              <button onClick={() => setActiveView("Masonry")} className={`p-2 rounded-md transition-colors ${activeView === "Masonry" ? "bg-purple-600 text-white shadow" : "hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
                <Columns className={`h-5 w-5 ${activeView === "Masonry" ? "text-white" : "text-gray-700 dark:text-gray-300"}`} />
              </button>
              <button onClick={() => setActiveView("List")} className={`p-2 rounded-md transition-colors ${activeView === "List" ? "bg-white dark:bg-gray-900 shadow" : "hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
                <List className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </button>
              <button onClick={() => setActiveView("Map")} className={`p-2 rounded-md transition-colors ${activeView === "Map" ? "bg-white dark:bg-gray-900 shadow" : "hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
                <Map className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </button>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  )
}