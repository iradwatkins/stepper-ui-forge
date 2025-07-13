// Centralized event category definitions with enhanced stepping and dance categories
export const EVENT_CATEGORIES = [
  // Core Stepping Categories
  { id: 'stepping-socials', label: 'Stepping Socials', description: 'Regular social stepping events with music and dancing' },
  { id: 'chicago-stepping', label: 'Chicago Stepping', description: 'Traditional Chicago stepping events and lessons' },
  { id: 'line-dancing', label: 'Line Dancing', description: 'Group choreography line dancing events' },
  { id: 'couples-stepping', label: 'Couples Stepping', description: 'Partner-focused stepping and dance events' },
  
  // Learning & Development
  { id: 'workshops', label: 'Workshops', description: 'Skill development and technique workshops' },
  { id: 'learn-to-step', label: 'Learn to Step', description: 'Beginner-friendly instruction sessions' },
  { id: 'master-classes', label: 'Master Classes', description: 'Advanced technique classes with expert instructors' },
  
  // Performance & Competition
  { id: 'sets', label: 'Sets', description: 'Stepping sets and performances by teams and individuals' },
  { id: 'step-shows', label: 'Step Shows', description: 'Performance showcases and exhibitions' },
  { id: 'competitions', label: 'Competitions', description: 'Competitive stepping events and battles' },
  { id: 'battles', label: 'Battles', description: 'Head-to-head stepping competitions' },
  
  // Social Events
  { id: 'mixers', label: 'Mixers', description: 'Mixed dance style social events' },
  { id: 'in-the-park', label: 'In the Park', description: 'Outdoor park stepping events and gatherings' },
  { id: 'socials', label: 'Socials', description: 'General social dancing and community events' },
  
  // Special Events
  { id: 'cruises', label: 'Cruises', description: 'Stepping cruises and boat events with music and dancing' },
  { id: 'trips', label: 'Trips', description: 'Travel events and destination stepping experiences' },
  { id: 'festivals', label: 'Festivals', description: 'Multi-day stepping celebrations and festivals' },
  { id: 'holiday', label: 'Holiday', description: 'Holiday-themed stepping and dance events' },
  { id: 'fundraisers', label: 'Fundraisers', description: 'Charity and community benefit events with stepping' }
] as const;

export type EventCategoryId = typeof EVENT_CATEGORIES[number]['id'];

// Helper functions for category operations
export const getCategoryLabel = (id: EventCategoryId): string => {
  const category = EVENT_CATEGORIES.find(cat => cat.id === id);
  return category?.label || id;
};

export const getCategoryId = (label: string): EventCategoryId | undefined => {
  const category = EVENT_CATEGORIES.find(cat => cat.label === label);
  return category?.id;
};

export const getCategoryLabels = (): string[] => {
  return EVENT_CATEGORIES.map(cat => cat.label);
};

export const getCategoryIds = (): EventCategoryId[] => {
  return EVENT_CATEGORIES.map(cat => cat.id);
};