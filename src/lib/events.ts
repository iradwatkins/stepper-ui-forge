export interface Event {
  id: string;
  title: string;
  description: string;
  organizationName: string;
  date: string;
  time: string;
  endDate?: string;
  endTime?: string;
  location: string;
  category: string;
  categories: string[];
  capacity?: number;
  displayPrice?: {
    amount: number;
    label: string;
  };
  isPublic: boolean;
  images?: string[];
  tickets?: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  eventType: 'simple' | 'ticketed' | 'premium';
  createdAt: string;
  updatedAt: string;
  attendees?: number;
}

const EVENTS_STORAGE_KEY = 'steppers-events';

export const eventsService = {
  // Get all events
  getAllEvents: (): Event[] => {
    try {
      const events = localStorage.getItem(EVENTS_STORAGE_KEY);
      return events ? JSON.parse(events) : [];
    } catch (error) {
      console.error('Error loading events:', error);
      return [];
    }
  },

  // Get public events only
  getPublicEvents: (): Event[] => {
    const allEvents = eventsService.getAllEvents();
    return allEvents.filter(event => event.isPublic);
  },

  // Get event by ID
  getEventById: (id: string): Event | null => {
    const events = eventsService.getAllEvents();
    return events.find(event => event.id === id) || null;
  },

  // Create new event
  createEvent: (eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Event => {
    const events = eventsService.getAllEvents();
    const newEvent: Event = {
      ...eventData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attendees: 0
    };
    
    const updatedEvents = [...events, newEvent];
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(updatedEvents));
    
    console.log('Event created:', newEvent);
    return newEvent;
  },

  // Update event
  updateEvent: (id: string, updates: Partial<Event>): Event | null => {
    const events = eventsService.getAllEvents();
    const eventIndex = events.findIndex(event => event.id === id);
    
    if (eventIndex === -1) return null;
    
    const updatedEvent: Event = {
      ...events[eventIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    events[eventIndex] = updatedEvent;
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
    
    return updatedEvent;
  },

  // Delete event
  deleteEvent: (id: string): boolean => {
    const events = eventsService.getAllEvents();
    const filteredEvents = events.filter(event => event.id !== id);
    
    if (filteredEvents.length === events.length) return false;
    
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(filteredEvents));
    return true;
  },

  // Search events
  searchEvents: (query: string, category?: string): Event[] => {
    const events = eventsService.getPublicEvents();
    
    return events.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(query.toLowerCase()) ||
                           event.description.toLowerCase().includes(query.toLowerCase()) ||
                           event.organizationName.toLowerCase().includes(query.toLowerCase());
      
      const matchesCategory = !category || category === 'all' || 
                             event.categories.includes(category) || 
                             event.category.includes(category);
      
      return matchesSearch && matchesCategory;
    });
  }
}; 