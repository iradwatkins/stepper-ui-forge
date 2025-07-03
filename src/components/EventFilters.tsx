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

const categories = [
  "All Events",
  "Workshops",
  "Sets",
  "In the park",
  "Trips",
  "Cruises",
  "Holiday",
  "Competitions",
]

interface EventFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  activeView: string;
  setActiveView: (view: string) => void;
}

export function EventFilters({ 
  searchQuery, 
  setSearchQuery, 
  activeCategory, 
  setActiveCategory, 
  activeView, 
  setActiveView 
}: EventFiltersProps) {

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex flex-col gap-6">

        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search events, promoters, venues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-full text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:outline-none"
          />
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
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            <MapPin className="h-4 w-4" /> All States
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            <CalendarDays className="h-4 w-4" /> All Dates
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
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
              <select className="border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                <option>Date (Earliest First)</option>
                <option>Date (Latest First)</option>
                <option>Popularity</option>
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