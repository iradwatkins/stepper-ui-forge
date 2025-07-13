// Business and service category definitions for stepping community
export const BUSINESS_CATEGORIES = [
  // Venues & Spaces
  { 
    id: 'dance-venues', 
    label: 'Dance Venues', 
    description: 'Dance studios, event halls, and stepping venues',
    icon: '🏢',
    subcategories: ['studios', 'event-halls', 'outdoor-venues', 'restaurants-with-dancing']
  },
  { 
    id: 'event-venues', 
    label: 'Event Venues', 
    description: 'Venues that host stepping events and socials',
    icon: '🎪',
    subcategories: ['ballrooms', 'community-centers', 'hotels', 'clubs']
  },
  
  // Music & Entertainment
  { 
    id: 'djs-musicians', 
    label: 'DJs & Musicians', 
    description: 'Music professionals specializing in stepping music',
    icon: '🎵',
    subcategories: ['stepping-djs', 'live-bands', 'music-producers', 'sound-equipment']
  },
  { 
    id: 'entertainment-services', 
    label: 'Entertainment Services', 
    description: 'Performance and entertainment for stepping events',
    icon: '🎭',
    subcategories: ['performers', 'mc-services', 'show-productions', 'lighting-services']
  },
  
  // Fashion & Apparel
  { 
    id: 'stepping-attire', 
    label: 'Stepping Attire', 
    description: 'Clothing and fashion for stepping events',
    icon: '👗',
    subcategories: ['dresses', 'suits', 'casual-wear', 'accessories']
  },
  { 
    id: 'dance-shoes', 
    label: 'Dance Shoes', 
    description: 'Specialized footwear for stepping and dancing',
    icon: '👠',
    subcategories: ['mens-shoes', 'womens-shoes', 'custom-shoes', 'shoe-repair']
  },
  
  // Professional Services
  { 
    id: 'stepping-instructors', 
    label: 'Stepping Instructors', 
    description: 'Professional stepping and dance instructors',
    icon: '👨‍🏫',
    subcategories: ['private-instructors', 'group-instructors', 'competition-coaches', 'online-instructors']
  },
  { 
    id: 'event-planning', 
    label: 'Event Planning', 
    description: 'Event planning and coordination services',
    icon: '📋',
    subcategories: ['wedding-planners', 'party-planners', 'corporate-events', 'stepping-events']
  },
  
  // Photography & Media
  { 
    id: 'photography-video', 
    label: 'Photography & Video', 
    description: 'Professional photography and videography services',
    icon: '📸',
    subcategories: ['event-photography', 'dance-photography', 'videography', 'live-streaming']
  },
  { 
    id: 'media-production', 
    label: 'Media Production', 
    description: 'Content creation and media production',
    icon: '🎬',
    subcategories: ['video-editing', 'promotional-videos', 'social-media', 'graphic-design']
  },
  
  // Health & Wellness
  { 
    id: 'health-wellness', 
    label: 'Health & Wellness', 
    description: 'Health and wellness services for dancers',
    icon: '💪',
    subcategories: ['physical-therapy', 'massage', 'fitness-training', 'nutrition']
  },
  { 
    id: 'beauty-personal-care', 
    label: 'Beauty & Personal Care', 
    description: 'Beauty and grooming services',
    icon: '💄',
    subcategories: ['hair-styling', 'makeup', 'nail-services', 'skin-care']
  },
  
  // Food & Catering
  { 
    id: 'catering-food', 
    label: 'Catering & Food', 
    description: 'Food and catering services for events',
    icon: '🍽️',
    subcategories: ['catering-services', 'food-trucks', 'restaurants', 'specialty-foods']
  },
  { 
    id: 'beverages', 
    label: 'Beverages', 
    description: 'Beverage services and suppliers',
    icon: '🥤',
    subcategories: ['bartending', 'beverage-catering', 'specialty-drinks', 'alcohol-suppliers']
  },
  
  // Transportation & Travel
  { 
    id: 'transportation', 
    label: 'Transportation', 
    description: 'Transportation services for events and travel',
    icon: '🚐',
    subcategories: ['charter-buses', 'limousines', 'party-buses', 'ride-sharing']
  },
  { 
    id: 'travel-services', 
    label: 'Travel Services', 
    description: 'Travel planning and booking services',
    icon: '✈️',
    subcategories: ['travel-agents', 'cruise-planners', 'hotel-booking', 'group-travel']
  },
  
  // Technology & Services
  { 
    id: 'technology-services', 
    label: 'Technology Services', 
    description: 'Tech services for events and businesses',
    icon: '💻',
    subcategories: ['av-equipment', 'live-streaming', 'registration-systems', 'payment-processing']
  },
  { 
    id: 'marketing-promotion', 
    label: 'Marketing & Promotion', 
    description: 'Marketing and promotional services',
    icon: '📢',
    subcategories: ['social-media-marketing', 'print-marketing', 'web-design', 'branding']
  },
  
  // Specialty Services
  { 
    id: 'specialty-services', 
    label: 'Specialty Services', 
    description: 'Unique and specialized services',
    icon: '⭐',
    subcategories: ['custom-services', 'consulting', 'coaching', 'equipment-rental']
  }
] as const;

export const SERVICE_TYPES = [
  { id: 'product', label: 'Product', description: 'Physical products and merchandise' },
  { id: 'service', label: 'Service', description: 'Professional services and expertise' },
  { id: 'venue', label: 'Venue', description: 'Physical locations and spaces' },
  { id: 'online', label: 'Online', description: 'Digital products and online services' },
  { id: 'hybrid', label: 'Hybrid', description: 'Combination of physical and online offerings' }
] as const;

export const BUSINESS_LOCATIONS = [
  { id: 'chicago', label: 'Chicago', state: 'IL', description: 'Chicago metropolitan area' },
  { id: 'atlanta', label: 'Atlanta', state: 'GA', description: 'Atlanta metropolitan area' },
  { id: 'detroit', label: 'Detroit', state: 'MI', description: 'Detroit metropolitan area' },
  { id: 'milwaukee', label: 'Milwaukee', state: 'WI', description: 'Milwaukee metropolitan area' },
  { id: 'cleveland', label: 'Cleveland', state: 'OH', description: 'Cleveland metropolitan area' },
  { id: 'baltimore', label: 'Baltimore', state: 'MD', description: 'Baltimore metropolitan area' },
  { id: 'washington-dc', label: 'Washington DC', state: 'DC', description: 'Washington DC metropolitan area' },
  { id: 'new-york', label: 'New York', state: 'NY', description: 'New York metropolitan area' },
  { id: 'los-angeles', label: 'Los Angeles', state: 'CA', description: 'Los Angeles metropolitan area' },
  { id: 'houston', label: 'Houston', state: 'TX', description: 'Houston metropolitan area' },
  { id: 'dallas', label: 'Dallas', state: 'TX', description: 'Dallas metropolitan area' },
  { id: 'philadelphia', label: 'Philadelphia', state: 'PA', description: 'Philadelphia metropolitan area' },
  { id: 'online', label: 'Online', state: 'Virtual', description: 'Online services available everywhere' },
  { id: 'nationwide', label: 'Nationwide', state: 'USA', description: 'Services available nationwide' }
] as const;

export type BusinessCategoryId = typeof BUSINESS_CATEGORIES[number]['id'];
export type ServiceTypeId = typeof SERVICE_TYPES[number]['id'];
export type BusinessLocationId = typeof BUSINESS_LOCATIONS[number]['id'];

// Helper functions for business operations
export const getBusinessCategoryLabel = (id: BusinessCategoryId): string => {
  const category = BUSINESS_CATEGORIES.find(cat => cat.id === id);
  return category?.label || id;
};

export const getServiceTypeLabel = (id: ServiceTypeId): string => {
  const type = SERVICE_TYPES.find(type => type.id === id);
  return type?.label || id;
};

export const getBusinessLocationLabel = (id: BusinessLocationId): string => {
  const location = BUSINESS_LOCATIONS.find(loc => loc.id === id);
  return location?.label || id;
};

// Search tags for business discovery
export const BUSINESS_SEARCH_TAGS = [
  'stepping', 'chicago stepping', 'dance', 'instruction', 'events',
  'venue', 'dj', 'music', 'fashion', 'shoes', 'photography', 'catering',
  'transportation', 'wedding', 'party', 'social', 'competition',
  'professional', 'certified', 'experienced', 'affordable', 'premium'
] as const;