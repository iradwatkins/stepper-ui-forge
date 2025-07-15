// Class category definitions for stepping and dance instruction
export const CLASS_LEVELS = [
  { id: 'beginner', label: 'Beginner', description: 'Perfect for those new to dancing' },
  { id: 'intermediate', label: 'Intermediate', description: 'For dancers with solid foundation' },
  { id: 'advanced', label: 'Advanced', description: 'Advanced and expert-level techniques' }
] as const;

export const CLASS_CATEGORIES = [
  { id: 'steppin', label: 'Stepping', description: 'Stepping dance instruction and techniques' },
  { id: 'line-dancing', label: 'Line Dancing', description: 'Group choreography and line dancing' },
  { id: 'walking', label: 'Walking', description: 'Walking dance styles and techniques' }
] as const;

export const CLASS_TYPES = [
  { id: 'regular-class', label: 'Regular Class', description: 'Ongoing weekly or monthly classes' },
  { id: 'workshop', label: 'Workshop', description: 'Intensive one-time or short-term sessions' },
  { id: 'private-lesson', label: 'Private Lesson', description: 'One-on-one instruction' },
  { id: 'group-session', label: 'Group Session', description: 'Small group focused instruction' },
  { id: 'master-class', label: 'Master Class', description: 'Advanced classes with expert instructors' },
  { id: 'boot-camp', label: 'Boot Camp', description: 'Intensive multi-day training programs' }
] as const;

export type ClassLevelId = typeof CLASS_LEVELS[number]['id'];
export type ClassCategoryId = typeof CLASS_CATEGORIES[number]['id'];
export type ClassTypeId = typeof CLASS_TYPES[number]['id'];

// Helper functions for class operations
export const getClassLevelLabel = (id: ClassLevelId): string => {
  const level = CLASS_LEVELS.find(level => level.id === id);
  return level?.label || id;
};

export const getClassCategoryLabel = (id: ClassCategoryId): string => {
  const category = CLASS_CATEGORIES.find(cat => cat.id === id);
  return category?.label || id;
};

export const getClassTypeLabel = (id: ClassTypeId): string => {
  const type = CLASS_TYPES.find(type => type.id === id);
  return type?.label || id;
};

// Search tags for enhanced discovery
export const STEPPING_SEARCH_TAGS = [
  'stepping', 'chicago stepping', 'line dancing', 'partner dancing',
  'social dancing', 'footwork', 'technique', 'beginner', 'advanced',
  'workshop', 'performance', 'competition', 'couples', 'solo',
  'rhythm', 'timing', 'choreography', 'urban', 'fusion'
] as const;