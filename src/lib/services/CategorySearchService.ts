// Unified category search service for events, classes, and businesses
import { EVENT_CATEGORIES } from '../constants/event-categories';
import { CLASS_CATEGORIES, CLASS_LEVELS, CLASS_TYPES } from '../constants/class-categories';
import { BUSINESS_CATEGORIES, SERVICE_TYPES, BUSINESS_LOCATIONS } from '../constants/business-categories';

export interface SearchFilters {
  query?: string;
  categories?: string[];
  location?: string;
  priceRange?: { min?: number; max?: number };
  dateRange?: { start?: string; end?: string };
  level?: string;
  type?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryLabel: string;
  type: 'event' | 'class' | 'business';
  location?: string;
  price?: number;
  date?: string;
  level?: string;
  tags: string[];
  averageRating?: number;
  totalRatings?: number;
  imageUrl?: string;
  url: string;
}

export interface CategoryGroup {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  categories: Array<{
    id: string;
    label: string;
    description?: string;
    count?: number;
  }>;
}

class CategorySearchService {
  // Get all category groups organized by type
  getAllCategoryGroups(): {
    events: CategoryGroup[];
    classes: CategoryGroup[];
    businesses: CategoryGroup[];
  } {
    return {
      events: [
        {
          id: 'core-stepping',
          label: 'Core Stepping',
          description: 'Traditional stepping events and socials',
          icon: '💃',
          categories: [
            { id: 'stepping-socials', label: 'Stepping Socials', description: 'Regular social stepping events' },
            { id: 'chicago-stepping', label: 'Chicago Stepping', description: 'Traditional Chicago stepping' },
            { id: 'line-dancing', label: 'Line Dancing', description: 'Group choreography events' },
            { id: 'couples-stepping', label: 'Couples Stepping', description: 'Partner-focused events' }
          ]
        },
        {
          id: 'learning',
          label: 'Learning & Development',
          description: 'Educational and skill-building events',
          icon: '📚',
          categories: [
            { id: 'workshops', label: 'Workshops', description: 'Skill development workshops' },
            { id: 'learn-to-step', label: 'Learn to Step', description: 'Beginner instruction' },
            { id: 'master-classes', label: 'Master Classes', description: 'Advanced expert classes' }
          ]
        },
        {
          id: 'performance',
          label: 'Performance & Competition',
          description: 'Shows, competitions, and performances',
          icon: '🏆',
          categories: [
            { id: 'sets', label: 'Sets', description: 'Performance sets' },
            { id: 'step-shows', label: 'Step Shows', description: 'Performance showcases' },
            { id: 'competitions', label: 'Competitions', description: 'Competitive events' },
            { id: 'battles', label: 'Battles', description: 'Head-to-head competitions' }
          ]
        },
        {
          id: 'social',
          label: 'Social Events',
          description: 'Community and social gatherings',
          icon: '🎉',
          categories: [
            { id: 'mixers', label: 'Mixers', description: 'Mixed dance style events' },
            { id: 'in-the-park', label: 'In the Park', description: 'Outdoor gatherings' },
            { id: 'socials', label: 'Socials', description: 'General social events' }
          ]
        },
        {
          id: 'special',
          label: 'Special Events',
          description: 'Unique and destination events',
          icon: '🚢',
          categories: [
            { id: 'cruises', label: 'Cruises', description: 'Stepping cruises' },
            { id: 'trips', label: 'Trips', description: 'Travel and destination events' },
            { id: 'festivals', label: 'Festivals', description: 'Multi-day celebrations' },
            { id: 'holiday', label: 'Holiday', description: 'Holiday-themed events' },
            { id: 'fundraisers', label: 'Fundraisers', description: 'Charity events' }
          ]
        }
      ],
      classes: [
        {
          id: 'technique',
          label: 'Technique & Skills',
          description: 'Core stepping techniques and skills',
          icon: '🎯',
          categories: [
            { id: 'chicago-stepping', label: 'Chicago Stepping', description: 'Traditional technique' },
            { id: 'basic-technique', label: 'Basic Technique', description: 'Fundamental skills' },
            { id: 'advanced-technique', label: 'Advanced Technique', description: 'Complex patterns' },
            { id: 'footwork-mastery', label: 'Footwork Mastery', description: 'Specialized footwork' }
          ]
        },
        {
          id: 'partnership',
          label: 'Partnership & Social',
          description: 'Partner dancing and social skills',
          icon: '👫',
          categories: [
            { id: 'partnership', label: 'Partnership', description: 'Partner connection' },
            { id: 'couples-technique', label: 'Couples Technique', description: 'Partner-specific techniques' },
            { id: 'social-stepping', label: 'Social Stepping', description: 'Social dancing skills' }
          ]
        },
        {
          id: 'performance',
          label: 'Performance & Competition',
          description: 'Performance and competitive training',
          icon: '🎭',
          categories: [
            { id: 'performance', label: 'Performance', description: 'Performance techniques' },
            { id: 'competition', label: 'Competition', description: 'Competition preparation' },
            { id: 'choreography', label: 'Choreography', description: 'Choreographed routines' }
          ]
        },
        {
          id: 'specialized',
          label: 'Specialized Styles',
          description: 'Specialized and fusion styles',
          icon: '🌟',
          categories: [
            { id: 'line-dancing', label: 'Line Dancing', description: 'Group choreography' },
            { id: 'fusion', label: 'Fusion', description: 'Mixed dance styles' },
            { id: 'urban-stepping', label: 'Urban Stepping', description: 'Contemporary styles' }
          ]
        }
      ],
      businesses: [
        {
          id: 'venues',
          label: 'Venues & Spaces',
          description: 'Dance venues and event spaces',
          icon: '🏢',
          categories: [
            { id: 'dance-venues', label: 'Dance Venues', description: 'Studios and dance spaces' },
            { id: 'event-venues', label: 'Event Venues', description: 'Event and party venues' }
          ]
        },
        {
          id: 'entertainment',
          label: 'Music & Entertainment',
          description: 'DJs, musicians, and entertainment',
          icon: '🎵',
          categories: [
            { id: 'djs-musicians', label: 'DJs & Musicians', description: 'Music professionals' },
            { id: 'entertainment-services', label: 'Entertainment Services', description: 'Performance services' }
          ]
        },
        {
          id: 'fashion',
          label: 'Fashion & Apparel',
          description: 'Clothing and fashion for stepping',
          icon: '👗',
          categories: [
            { id: 'stepping-attire', label: 'Stepping Attire', description: 'Dance clothing' },
            { id: 'dance-shoes', label: 'Dance Shoes', description: 'Specialized footwear' }
          ]
        },
        {
          id: 'professional',
          label: 'Professional Services',
          description: 'Instructors and event services',
          icon: '👨‍🏫',
          categories: [
            { id: 'stepping-instructors', label: 'Stepping Instructors', description: 'Dance instructors' },
            { id: 'event-planning', label: 'Event Planning', description: 'Event coordination' }
          ]
        },
        {
          id: 'media',
          label: 'Photography & Media',
          description: 'Photography and media services',
          icon: '📸',
          categories: [
            { id: 'photography-video', label: 'Photography & Video', description: 'Professional photography' },
            { id: 'media-production', label: 'Media Production', description: 'Content creation' }
          ]
        },
        {
          id: 'support',
          label: 'Support Services',
          description: 'Catering, transportation, and support',
          icon: '🤝',
          categories: [
            { id: 'catering-food', label: 'Catering & Food', description: 'Food services' },
            { id: 'transportation', label: 'Transportation', description: 'Travel and transport' },
            { id: 'health-wellness', label: 'Health & Wellness', description: 'Health services' }
          ]
        }
      ]
    };
  }

  // Search across all content types
  async searchAll(filters: SearchFilters): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    // This would normally query actual data sources
    // For now, returning mock results that demonstrate the search functionality
    
    const mockResults: SearchResult[] = [
      {
        id: 'event_001',
        title: 'Chicago Stepping Social at Navy Pier',
        description: 'Join us for an evening of Chicago stepping with live DJ and great music',
        category: 'stepping-socials',
        categoryLabel: 'Stepping Socials',
        type: 'event',
        location: 'Chicago, IL',
        price: 15,
        date: '2024-02-15T19:00:00Z',
        tags: ['chicago stepping', 'social', 'navy pier', 'dj'],
        averageRating: 4.8,
        totalRatings: 24,
        imageUrl: '/placeholder.svg',
        url: '/events/event_001'
      },
      {
        id: 'class_001',
        title: 'Beginner Line Dancing Workshop',
        description: 'Learn popular line dances in a fun, supportive environment',
        category: 'line-dancing',
        categoryLabel: 'Line Dancing',
        type: 'class',
        location: 'Atlanta, GA',
        price: 25,
        level: 'Beginner',
        tags: ['line dancing', 'beginner', 'workshop', 'atlanta'],
        averageRating: 4.6,
        totalRatings: 18,
        imageUrl: '/placeholder.svg',
        url: '/classes/class_001'
      },
      {
        id: 'business_001',
        title: 'Elite Dance Shoes',
        description: 'Premium dance shoes for stepping and social dancing',
        category: 'dance-shoes',
        categoryLabel: 'Dance Shoes',
        type: 'business',
        location: 'Chicago, IL',
        tags: ['dance shoes', 'stepping', 'premium', 'retail'],
        averageRating: 4.9,
        totalRatings: 156,
        imageUrl: '/placeholder.svg',
        url: '/businesses/business_001'
      }
    ];

    // Apply search filters
    let filtered = mockResults;

    if (filters.query) {
      const query = filters.query.toLowerCase();
      filtered = filtered.filter(result =>
        result.title.toLowerCase().includes(query) ||
        result.description.toLowerCase().includes(query) ||
        result.tags.some(tag => tag.toLowerCase().includes(query)) ||
        result.categoryLabel.toLowerCase().includes(query)
      );
    }

    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter(result =>
        filters.categories!.includes(result.category)
      );
    }

    if (filters.location) {
      filtered = filtered.filter(result =>
        result.location?.toLowerCase().includes(filters.location!.toLowerCase())
      );
    }

    if (filters.level) {
      filtered = filtered.filter(result =>
        result.level?.toLowerCase() === filters.level!.toLowerCase()
      );
    }

    if (filters.priceRange) {
      filtered = filtered.filter(result => {
        if (!result.price) return true;
        const inRange = (!filters.priceRange!.min || result.price >= filters.priceRange!.min) &&
                       (!filters.priceRange!.max || result.price <= filters.priceRange!.max);
        return inRange;
      });
    }

    return filtered;
  }

  // Get suggested search terms based on categories
  getSuggestedSearchTerms(): string[] {
    return [
      'Chicago stepping',
      'Line dancing',
      'Beginner classes',
      'Stepping socials',
      'Dance shoes',
      'Partner dancing',
      'Workshops',
      'Competitions',
      'DJs',
      'Venues',
      'Private lessons',
      'Couples stepping',
      'Advanced technique',
      'Footwork',
      'Step shows',
      'Mixers',
      'Cruises',
      'Photography',
      'Event planning',
      'Catering'
    ];
  }

  // Get category filters for search UI
  getCategoryFilters(): Array<{ 
    id: string; 
    label: string; 
    type: 'event' | 'class' | 'business';
    count?: number;
  }> {
    const filters = [];
    
    // Add event categories
    EVENT_CATEGORIES.forEach(cat => {
      filters.push({
        id: cat.id,
        label: cat.label,
        type: 'event' as const,
        count: Math.floor(Math.random() * 50) + 1 // Mock count
      });
    });

    // Add class categories (subset)
    CLASS_CATEGORIES.slice(0, 10).forEach(cat => {
      filters.push({
        id: cat.id,
        label: cat.label,
        type: 'class' as const,
        count: Math.floor(Math.random() * 30) + 1 // Mock count
      });
    });

    // Add business categories (subset)
    BUSINESS_CATEGORIES.slice(0, 8).forEach(cat => {
      filters.push({
        id: cat.id,
        label: cat.label,
        type: 'business' as const,
        count: Math.floor(Math.random() * 20) + 1 // Mock count
      });
    });

    return filters;
  }

  // Get popular categories based on activity
  getPopularCategories(): Array<{
    id: string;
    label: string;
    type: 'event' | 'class' | 'business';
    activityScore: number;
  }> {
    return [
      { id: 'stepping-socials', label: 'Stepping Socials', type: 'event', activityScore: 95 },
      { id: 'chicago-stepping', label: 'Chicago Stepping', type: 'class', activityScore: 92 },
      { id: 'line-dancing', label: 'Line Dancing', type: 'event', activityScore: 89 },
      { id: 'dance-shoes', label: 'Dance Shoes', type: 'business', activityScore: 87 },
      { id: 'couples-stepping', label: 'Couples Stepping', type: 'event', activityScore: 85 },
      { id: 'djs-musicians', label: 'DJs & Musicians', type: 'business', activityScore: 83 },
      { id: 'workshops', label: 'Workshops', type: 'event', activityScore: 81 },
      { id: 'basic-technique', label: 'Basic Technique', type: 'class', activityScore: 79 }
    ];
  }

  // Auto-complete search suggestions
  async getSearchSuggestions(query: string): Promise<string[]> {
    const allTerms = this.getSuggestedSearchTerms();
    const suggestions = allTerms.filter(term => 
      term.toLowerCase().includes(query.toLowerCase())
    );
    
    // Add category matches
    EVENT_CATEGORIES.forEach(cat => {
      if (cat.label.toLowerCase().includes(query.toLowerCase())) {
        suggestions.push(cat.label);
      }
    });

    return suggestions.slice(0, 8); // Limit to 8 suggestions
  }
}

export const categorySearchService = new CategorySearchService();