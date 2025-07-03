// Centralized event category definitions
export const EVENT_CATEGORIES = [
  { id: 'workshops', label: 'Workshops' },
  { id: 'sets', label: 'Sets' },
  { id: 'in-the-park', label: 'In the park' },
  { id: 'trips', label: 'Trips' },
  { id: 'cruises', label: 'Cruises' },
  { id: 'holiday', label: 'Holiday' },
  { id: 'competitions', label: 'Competitions' }
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