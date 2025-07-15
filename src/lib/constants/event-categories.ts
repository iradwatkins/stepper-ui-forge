// Centralized event category definitions - Limited to 8 searchable event types
export const EVENT_CATEGORIES = [
  { id: 'workshops', label: 'Workshops', description: 'Skill development and technique workshops' },
  { id: 'sets', label: 'Sets', description: 'Stepping sets and performances by teams and individuals' },
  { id: 'step-shows', label: 'Step Shows', description: 'Performance showcases and exhibitions' },
  { id: 'competitions', label: 'Competitions', description: 'Competitive stepping events and battles' },
  { id: 'in-the-park', label: 'In the Park', description: 'Outdoor park stepping events and gatherings' },
  { id: 'cruises', label: 'Cruises', description: 'Stepping cruises and boat events with music and dancing' },
  { id: 'trips', label: 'Trips', description: 'Travel events and destination stepping experiences' },
  { id: 'festivals', label: 'Festivals', description: 'Multi-day stepping celebrations and festivals' },
  { id: 'holiday', label: 'Holiday', description: 'Holiday-themed stepping and dance events' }
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