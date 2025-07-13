// Enhanced class category definitions for stepping and dance instruction
export const CLASS_LEVELS = [
  { id: 'beginner', label: 'Beginner', description: 'Perfect for those new to stepping' },
  { id: 'beginner-plus', label: 'Beginner Plus', description: 'Building on basic stepping knowledge' },
  { id: 'intermediate', label: 'Intermediate', description: 'For dancers with solid stepping foundation' },
  { id: 'intermediate-plus', label: 'Intermediate Plus', description: 'Advanced intermediate techniques' },
  { id: 'advanced', label: 'Advanced', description: 'Expert-level stepping and complex patterns' },
  { id: 'footwork', label: 'Footwork Focus', description: 'Specialized footwork technique classes' },
  { id: 'all-levels', label: 'All Levels', description: 'Suitable for any experience level' }
] as const;

export const CLASS_CATEGORIES = [
  // Core Stepping Techniques
  { id: 'chicago-stepping', label: 'Chicago Stepping', description: 'Traditional Chicago stepping instruction' },
  { id: 'basic-technique', label: 'Basic Technique', description: 'Fundamental stepping techniques and timing' },
  { id: 'advanced-technique', label: 'Advanced Technique', description: 'Complex patterns and advanced moves' },
  { id: 'footwork-mastery', label: 'Footwork Mastery', description: 'Specialized footwork training' },
  
  // Partnership & Social
  { id: 'partnership', label: 'Partnership', description: 'Partner connection and leading/following' },
  { id: 'couples-technique', label: 'Couples Technique', description: 'Partner-specific stepping techniques' },
  { id: 'social-stepping', label: 'Social Stepping', description: 'Social dancing skills and etiquette' },
  
  // Performance & Competition
  { id: 'performance', label: 'Performance', description: 'Performance techniques and choreography' },
  { id: 'competition', label: 'Competition', description: 'Competition preparation and strategy' },
  { id: 'choreography', label: 'Choreography', description: 'Creating and learning choreographed routines' },
  
  // Specialized Styles
  { id: 'line-dancing', label: 'Line Dancing', description: 'Group choreography and line dancing' },
  { id: 'fusion', label: 'Fusion', description: 'Stepping combined with other dance styles' },
  { id: 'urban-stepping', label: 'Urban Stepping', description: 'Contemporary urban stepping styles' },
  
  // Special Programs
  { id: 'youth', label: 'Youth', description: 'Classes designed for younger dancers' },
  { id: 'seniors', label: 'Seniors', description: 'Classes adapted for older adults' },
  { id: 'adaptive', label: 'Adaptive', description: 'Classes for dancers with special needs' },
  
  // Online & Format
  { id: 'online', label: 'Online', description: 'Virtual stepping classes and instruction' },
  { id: 'workshop', label: 'Workshop', description: 'Intensive workshop format classes' },
  { id: 'private-lessons', label: 'Private Lessons', description: 'One-on-one instruction' },
  
  // Cultural & Historical
  { id: 'history-culture', label: 'History & Culture', description: 'Stepping history and cultural context' },
  { id: 'music-timing', label: 'Music & Timing', description: 'Understanding stepping music and rhythm' }
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