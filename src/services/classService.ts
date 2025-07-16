// Enhanced Class Service for managing stepping classes and VOD content
import { supabase } from '@/integrations/supabase/client';
export interface ClassSchedule {
  type: 'single' | 'weekly' | 'monthly' | 'custom';
  startDate: string;
  endDate?: string;
  time: string;
  duration: number; // in minutes
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday) for weekly
  dayOfMonth?: number; // 1-31 for monthly
  exceptions?: string[]; // ISO date strings for cancelled/rescheduled dates
  notes?: string;
}

export interface ClassLocation {
  type: 'physical' | 'online';
  venue?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  onlineLink?: string;
  specialInstructions?: string;
}

export interface ClassImage {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  uploadedAt: string;
}

export interface SteppingClass {
  id: string;
  title: string;
  description: string;
  instructorId: string;
  instructorName: string;
  classType: 'Regular Class' | 'Workshop' | 'Private Lesson' | 'Group Session';
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  category: 'Stepping' | 'Line Dancing' | 'Walking';
  location: ClassLocation;
  schedule: ClassSchedule;
  price: number;
  capacity?: number;
  hasRSVP: boolean;
  contactInfo: {
    email?: string;
    phone?: string;
    preferredContact?: 'email' | 'phone';
  };
  prerequisites?: string;
  whatToBring?: string;
  extras?: string;
  images: ClassImage[];
  tags: string[];
  isActive: boolean;
  isPending: boolean;
  lastConfirmed: string;
  attendeeCount: number;
  interestedCount: number;
  averageRating: number;
  totalRatings: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClassSubmissionData {
  title: string;
  description: string;
  classType: 'Regular Class' | 'Workshop' | 'Private Lesson' | 'Group Session';
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  category: 'Stepping' | 'Line Dancing' | 'Walking';
  location: ClassLocation;
  schedule: ClassSchedule;
  price: number;
  capacity?: number;
  hasRSVP: boolean;
  contactInfo: {
    email?: string;
    phone?: string;
    preferredContact?: 'email' | 'phone';
  };
  prerequisites?: string;
  whatToBring?: string;
  extras?: string;
  images?: File[];
  tags: string[];
}

export interface ClassAttendee {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  classId: string;
  status: 'interested' | 'registered' | 'attended' | 'cancelled';
  registeredAt: string;
  notes?: string;
}

export interface VODClass {
  id: string;
  title: string;
  description: string;
  instructorId: string;
  instructorName: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
  price: number;
  sections: VODSection[];
  totalDuration: number; // in minutes
  thumbnailUrl: string;
  previewVideoUrl?: string;
  tags: string[];
  isPublished: boolean;
  purchaseCount: number;
  averageRating: number;
  totalRatings: number;
  createdAt: string;
  updatedAt: string;
}

export interface VODSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  videos: VODVideo[];
  isPreview: boolean; // Can be watched without purchase
}

export interface VODVideo {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  duration: number; // in seconds
  order: number;
  isProcessed: boolean;
  uploadedAt: string;
}

// Enhanced mock data with stepping community locations
const mockClasses: SteppingClass[] = [
  {
    id: 'class_001',
    title: 'Fundamentals of Chicago Stepping',
    description: 'Master the basic steps and timing of Chicago stepping in this comprehensive beginner course. Perfect for those new to stepping or looking to refine their fundamentals.',
    instructorId: 'instructor_001',
    instructorName: 'Marcus Johnson',
    classType: 'Regular Class',
    level: 'Beginner',
    category: 'Stepping',
    location: {
      type: 'physical',
      venue: 'Chicago Cultural Center',
      address: '78 E Washington St',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60602',
      coordinates: { lat: 41.8836, lng: -87.6270 },
      specialInstructions: 'Enter through main entrance, Studio B on 2nd floor'
    },
    schedule: {
      type: 'weekly',
      startDate: '2024-02-01',
      endDate: '2024-03-28',
      time: '19:00',
      duration: 90,
      daysOfWeek: [4], // Thursday
      notes: 'No class on February 15th (holiday)'
    },
    price: 120,
    capacity: 20,
    hasRSVP: true,
    contactInfo: {
      email: 'marcus@stepperslife.com',
      phone: '(312) 555-0123',
      preferredContact: 'email'
    },
    prerequisites: 'None - beginners welcome!',
    whatToBring: 'Comfortable dance shoes, water bottle',
    extras: 'Light refreshments provided',
    images: [
      {
        id: 'img_class_001',
        url: '/placeholder.svg',
        alt: 'Class in session',
        isPrimary: true,
        uploadedAt: '2024-01-15T00:00:00Z'
      }
    ],
    tags: ['fundamentals', 'beginner', 'chicago stepping', 'basics'],
    isActive: true,
    isPending: false,
    lastConfirmed: '2024-01-20T00:00:00Z',
    attendeeCount: 18,
    interestedCount: 25,
    averageRating: 4.9,
    totalRatings: 12,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z'
  },
  {
    id: 'class_002',
    title: 'Advanced Footwork Mastery',
    description: 'Elevate your stepping with complex footwork patterns and advanced techniques. This intensive workshop focuses on precision and style.',
    instructorId: 'instructor_002',
    instructorName: 'Lisa Davis',
    classType: 'Workshop',
    level: 'Advanced',
    category: 'Stepping',
    location: {
      type: 'physical',
      venue: 'DuSable Museum Dance Studio',
      address: '740 E 56th Pl',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60637',
      coordinates: { lat: 41.7910, lng: -87.6086 }
    },
    schedule: {
      type: 'single',
      startDate: '2024-02-10',
      time: '14:00',
      duration: 180, // 3 hours
      notes: 'Intensive workshop format'
    },
    price: 75,
    capacity: 15,
    hasRSVP: true,
    contactInfo: {
      email: 'lisa@advancedstep.com',
      phone: '(773) 555-0456',
      preferredContact: 'phone'
    },
    prerequisites: 'Must have at least 2 years of stepping experience',
    whatToBring: 'Professional dance shoes, knee pads (optional)',
    extras: 'Video recording available for participants',
    images: [
      {
        id: 'img_class_002',
        url: '/placeholder.svg',
        alt: 'Advanced footwork demonstration',
        isPrimary: true,
        uploadedAt: '2024-01-10T00:00:00Z'
      }
    ],
    tags: ['advanced', 'footwork', 'workshop', 'technique'],
    isActive: true,
    isPending: false,
    lastConfirmed: '2024-01-18T00:00:00Z',
    attendeeCount: 12,
    interestedCount: 8,
    averageRating: 4.8,
    totalRatings: 6,
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-18T00:00:00Z'
  },
  {
    id: 'class_003',
    title: 'Partner Connection & Leading',
    description: 'Learn how to connect with your partner and develop strong leading skills for smooth stepping.',
    instructorId: 'instructor_003',
    instructorName: 'Carlos Martinez',
    classType: 'Group Session',
    level: 'Intermediate',
    category: 'Line Dancing',
    location: {
      type: 'physical',
      venue: 'Atlanta Dance Studio',
      address: '1234 Peachtree St',
      city: 'Atlanta',
      state: 'GA',
      zipCode: '30309',
      coordinates: { lat: 33.7490, lng: -84.3880 }
    },
    schedule: {
      type: 'weekly',
      startDate: '2024-02-15',
      endDate: '2024-03-15',
      time: '18:30',
      duration: 60,
      daysOfWeek: [2], // Tuesday
    },
    price: 80,
    capacity: 16,
    hasRSVP: true,
    contactInfo: {
      email: 'carlos@atlantastep.com',
      phone: '(404) 555-0789',
      preferredContact: 'email'
    },
    prerequisites: 'Basic stepping knowledge required',
    whatToBring: 'Dance shoes, comfortable clothing',
    extras: 'Partner rotation included',
    images: [
      {
        id: 'img_class_003',
        url: '/placeholder.svg',
        alt: 'Partner dancing session',
        isPrimary: true,
        uploadedAt: '2024-01-12T00:00:00Z'
      }
    ],
    tags: ['partnership', 'leading', 'intermediate', 'atlanta'],
    isActive: true,
    isPending: false,
    lastConfirmed: '2024-01-22T00:00:00Z',
    attendeeCount: 14,
    interestedCount: 6,
    averageRating: 4.7,
    totalRatings: 8,
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-22T00:00:00Z'
  },
  {
    id: 'class_004',
    title: 'Virtual Step Fundamentals',
    description: 'Learn stepping basics from home with interactive online sessions and personalized feedback.',
    instructorId: 'instructor_004',
    instructorName: 'Dr. Patricia Jones',
    classType: 'Regular Class',
    level: 'Beginner',
    category: 'Walking',
    location: {
      type: 'online',
      onlineLink: 'https://zoom.us/j/steppingclass',
      specialInstructions: 'Ensure you have adequate space to move and a stable internet connection'
    },
    schedule: {
      type: 'weekly',
      startDate: '2024-02-20',
      endDate: '2024-04-02',
      time: '20:00',
      duration: 75,
      daysOfWeek: [1], // Monday
    },
    price: 60,
    capacity: 30,
    hasRSVP: true,
    contactInfo: {
      email: 'patricia@virtualstep.com',
      preferredContact: 'email'
    },
    prerequisites: 'None - perfect for beginners',
    whatToBring: 'Comfortable clothes, water, small towel',
    extras: 'Recordings available for review',
    images: [
      {
        id: 'img_class_004',
        url: '/placeholder.svg',
        alt: 'Online class setup',
        isPrimary: true,
        uploadedAt: '2024-01-08T00:00:00Z'
      }
    ],
    tags: ['online', 'virtual', 'beginner', 'fundamentals'],
    isActive: true,
    isPending: false,
    lastConfirmed: '2024-01-25T00:00:00Z',
    attendeeCount: 22,
    interestedCount: 15,
    averageRating: 4.4,
    totalRatings: 10,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-25T00:00:00Z'
  }
];

const mockVODClasses: VODClass[] = [
  {
    id: 'vod_001',
    title: 'Complete Beginner Stepping Course',
    description: 'Learn stepping from home with this comprehensive video course covering all the fundamentals.',
    instructorId: 'instructor_001',
    instructorName: 'Marcus Johnson',
    level: 'Beginner',
    category: 'Stepping',
    price: 49.99,
    sections: [
      {
        id: 'section_001',
        title: 'Getting Started',
        description: 'Basic concepts and warm-up exercises',
        order: 1,
        isPreview: true,
        videos: [
          {
            id: 'video_001',
            title: 'Welcome to Stepping',
            videoUrl: '/placeholder-video.mp4',
            duration: 300,
            order: 1,
            isProcessed: true,
            uploadedAt: '2024-01-01T00:00:00Z'
          },
          {
            id: 'video_002', 
            title: 'Basic Warm-Up',
            videoUrl: '/placeholder-video.mp4',
            duration: 480,
            order: 2,
            isProcessed: true,
            uploadedAt: '2024-01-01T00:00:00Z'
          }
        ]
      },
      {
        id: 'section_002',
        title: 'Fundamental Steps',
        description: 'Core stepping movements and timing',
        order: 2,
        isPreview: false,
        videos: [
          {
            id: 'video_003',
            title: 'Basic Six Count',
            videoUrl: '/placeholder-video.mp4',
            duration: 900,
            order: 1,
            isProcessed: true,
            uploadedAt: '2024-01-02T00:00:00Z'
          }
        ]
      }
    ],
    totalDuration: 120, // 2 hours
    thumbnailUrl: '/placeholder.svg',
    previewVideoUrl: '/placeholder-preview.mp4',
    tags: ['beginner', 'fundamentals', 'online'],
    isPublished: true,
    purchaseCount: 45,
    averageRating: 4.7,
    totalRatings: 23,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  }
];

class ClassService {
  // Physical Classes Management
  async getInstructorClasses(instructorId: string): Promise<SteppingClass[]> {
    try {
      const { data, error } = await supabase
        .from('stepping_classes')
        .select(`
          *,
          class_images(*)
        `)
        .eq('instructor_id', instructorId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching instructor classes:', error);
        return mockClasses.filter(cls => cls.instructorId === instructorId);
      }

      return this.transformDatabaseClasses(data || []);
    } catch (error) {
      console.error('Error in getInstructorClasses:', error);
      return mockClasses.filter(cls => cls.instructorId === instructorId);
    }
  }

  async getAllClasses(filters?: {
    level?: string;
    category?: string;
    location?: string;
    search?: string;
    isActive?: boolean;
  }): Promise<SteppingClass[]> {
    try {
      let query = supabase
        .from('stepping_classes')
        .select('*')
        .eq('status', 'published')
        .eq('is_active', true);

      // Apply filters
      if (filters?.level && filters.level !== 'all') {
        query = query.eq('level', filters.level);
      }

      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      if (filters?.location) {
        const location = filters.location.toLowerCase();
        query = query.or(`city.ilike.%${location}%,state.ilike.%${location}%`);
      }

      if (filters?.search) {
        query = query.textSearch('title,description,instructor_name,tags', filters.search);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        // Check if it's a table not found error
        if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          console.warn('Classes table not found, using mock data');
        } else {
          console.error('Error fetching classes:', error);
        }
        // Fallback to mock data
        let filtered = mockClasses.filter(cls => cls.isActive && !cls.isPending);
        
        if (filters?.level && filters.level !== 'all') {
          filtered = filtered.filter(cls => cls.level === filters.level);
        }
        if (filters?.category && filters.category !== 'all') {
          filtered = filtered.filter(cls => cls.category === filters.category);
        }
        if (filters?.search) {
          const query = filters.search.toLowerCase();
          filtered = filtered.filter(cls =>
            cls.title.toLowerCase().includes(query) ||
            cls.description.toLowerCase().includes(query) ||
            cls.instructorName.toLowerCase().includes(query) ||
            cls.tags.some(tag => tag.toLowerCase().includes(query))
          );
        }
        if (filters?.location) {
          filtered = filtered.filter(cls =>
            cls.location.city?.toLowerCase().includes(filters.location!.toLowerCase()) ||
            cls.location.state?.toLowerCase().includes(filters.location!.toLowerCase())
          );
        }
        return filtered;
      }

      return this.transformDatabaseClasses(data || []);
    } catch (error) {
      console.error('Error in getAllClasses:', error);
      return mockClasses.filter(cls => cls.isActive && !cls.isPending);
    }
  }

  async createClass(data: ClassSubmissionData, instructorId: string, instructorName: string): Promise<SteppingClass> {
    try {
      const classData = {
        instructor_id: instructorId,
        instructor_name: instructorName,
        title: data.title,
        description: data.description,
        class_type: data.classType,
        level: data.level,
        category: data.category,
        location_type: data.location.type,
        venue: data.location.venue,
        address: data.location.address,
        city: data.location.city,
        state: data.location.state,
        zip_code: data.location.zipCode,
        latitude: data.location.coordinates?.lat,
        longitude: data.location.coordinates?.lng,
        online_link: data.location.onlineLink,
        special_instructions: data.location.specialInstructions,
        schedule_type: data.schedule.type,
        start_date: data.schedule.startDate,
        end_date: data.schedule.endDate,
        class_time: data.schedule.time,
        duration_minutes: data.schedule.duration,
        days_of_week: data.schedule.daysOfWeek || [],
        day_of_month: data.schedule.dayOfMonth,
        exception_dates: data.schedule.exceptions || [],
        schedule_notes: data.schedule.notes,
        price: data.price,
        capacity: data.capacity,
        has_rsvp: data.hasRSVP,
        contact_email: data.contactInfo.email,
        contact_phone: data.contactInfo.phone,
        preferred_contact: data.contactInfo.preferredContact || 'email',
        prerequisites: data.prerequisites,
        what_to_bring: data.whatToBring,
        extras: data.extras,
        tags: data.tags,
        status: 'draft'
      };

      const { data: newClass, error } = await supabase
        .from('stepping_classes')
        .insert(classData)
        .select(`
          *,
          class_images(*)
        `)
        .single();

      if (error) {
        console.error('Error creating class:', error);
        throw error;
      }

      return this.transformDatabaseClass(newClass);
    } catch (error) {
      console.error('Error in createClass:', error);
      throw error;
    }
  }

  async updateClass(classId: string, data: Partial<ClassSubmissionData>): Promise<SteppingClass> {
    try {
      const updateData: any = {};
      
      if (data.title) updateData.title = data.title;
      if (data.description) updateData.description = data.description;
      if (data.classType) updateData.class_type = data.classType;
      if (data.level) updateData.level = data.level;
      if (data.category) updateData.category = data.category;
      if (data.price) updateData.price = data.price;
      if (data.capacity) updateData.capacity = data.capacity;
      if (data.hasRSVP !== undefined) updateData.has_rsvp = data.hasRSVP;
      if (data.prerequisites) updateData.prerequisites = data.prerequisites;
      if (data.whatToBring) updateData.what_to_bring = data.whatToBring;
      if (data.extras) updateData.extras = data.extras;
      if (data.tags) updateData.tags = data.tags;
      
      if (data.location) {
        updateData.location_type = data.location.type;
        updateData.venue = data.location.venue;
        updateData.address = data.location.address;
        updateData.city = data.location.city;
        updateData.state = data.location.state;
        updateData.zip_code = data.location.zipCode;
        updateData.latitude = data.location.coordinates?.lat;
        updateData.longitude = data.location.coordinates?.lng;
        updateData.online_link = data.location.onlineLink;
        updateData.special_instructions = data.location.specialInstructions;
      }
      
      if (data.schedule) {
        updateData.schedule_type = data.schedule.type;
        updateData.start_date = data.schedule.startDate;
        updateData.end_date = data.schedule.endDate;
        updateData.class_time = data.schedule.time;
        updateData.duration_minutes = data.schedule.duration;
        updateData.days_of_week = data.schedule.daysOfWeek;
        updateData.day_of_month = data.schedule.dayOfMonth;
        updateData.exception_dates = data.schedule.exceptions;
        updateData.schedule_notes = data.schedule.notes;
      }
      
      if (data.contactInfo) {
        updateData.contact_email = data.contactInfo.email;
        updateData.contact_phone = data.contactInfo.phone;
        updateData.preferred_contact = data.contactInfo.preferredContact;
      }

      const { data: updatedClass, error } = await supabase
        .from('stepping_classes')
        .update(updateData)
        .eq('id', classId)
        .select(`
          *,
          class_images(*)
        `)
        .single();

      if (error) {
        console.error('Error updating class:', error);
        throw error;
      }

      return this.transformDatabaseClass(updatedClass);
    } catch (error) {
      console.error('Error in updateClass:', error);
      throw error;
    }
  }

  async deleteClass(classId: string, instructorId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('stepping_classes')
        .update({ is_active: false })
        .eq('id', classId)
        .eq('instructor_id', instructorId);

      if (error) {
        console.error('Error deleting class:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteClass:', error);
      throw error;
    }
  }

  async confirmClass(classId: string, instructorId: string): Promise<SteppingClass> {
    try {
      const { data: confirmedClass, error } = await supabase
        .from('stepping_classes')
        .update({
          status: 'published',
          is_active: true
        })
        .eq('id', classId)
        .eq('instructor_id', instructorId)
        .select(`
          *,
          class_images(*)
        `)
        .single();

      if (error) {
        console.error('Error confirming class:', error);
        throw error;
      }

      return this.transformDatabaseClass(confirmedClass);
    } catch (error) {
      console.error('Error in confirmClass:', error);
      throw error;
    }
  }

  // Attendee Management
  async getClassAttendees(classId: string): Promise<ClassAttendee[]> {
    try {
      const { data, error } = await supabase
        .from('class_attendees')
        .select('*')
        .eq('class_id', classId)
        .order('registered_at', { ascending: false });

      if (error) {
        console.error('Error fetching class attendees:', error);
        // Fallback to mock data
        const mockAttendees: ClassAttendee[] = [
          {
            id: 'attendee_001',
            userId: 'user_001',
            userName: 'Sarah Johnson',
            userEmail: 'sarah@example.com',
            classId,
            status: 'registered',
            registeredAt: '2024-01-15T00:00:00Z'
          },
          {
            id: 'attendee_002',
            userId: 'user_002',
            userName: 'Mike Davis',
            userEmail: 'mike@example.com',
            classId,
            status: 'interested',
            registeredAt: '2024-01-16T00:00:00Z'
          }
        ];
        return mockAttendees;
      }

      return (data || []).map(attendee => ({
        id: attendee.id,
        userId: attendee.user_id,
        userName: attendee.user_name,
        userEmail: attendee.user_email,
        classId: attendee.class_id,
        status: attendee.status,
        registeredAt: attendee.registered_at,
        notes: attendee.notes
      }));
    } catch (error) {
      console.error('Error in getClassAttendees:', error);
      return [];
    }
  }

  async registerForClass(classId: string, userId: string, status: 'interested' | 'registered', userName: string, userEmail: string): Promise<ClassAttendee> {
    try {
      const { data, error } = await supabase
        .from('class_attendees')
        .insert({
          class_id: classId,
          user_id: userId,
          user_name: userName,
          user_email: userEmail,
          status
        })
        .select()
        .single();

      if (error) {
        console.error('Error registering for class:', error);
        throw error;
      }

      return {
        id: data.id,
        userId: data.user_id,
        userName: data.user_name,
        userEmail: data.user_email,
        classId: data.class_id,
        status: data.status,
        registeredAt: data.registered_at,
        notes: data.notes
      };
    } catch (error) {
      console.error('Error in registerForClass:', error);
      throw error;
    }
  }

  // VOD Classes Management
  async getInstructorVODClasses(instructorId: string): Promise<VODClass[]> {
    try {
      const { data, error } = await supabase
        .from('vod_classes')
        .select(`
          *,
          vod_sections(
            *,
            vod_videos(*)
          )
        `)
        .eq('instructor_id', instructorId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching instructor VOD classes:', error);
        return mockVODClasses.filter(vod => vod.instructorId === instructorId);
      }

      return this.transformDatabaseVODClasses(data || []);
    } catch (error) {
      console.error('Error in getInstructorVODClasses:', error);
      return mockVODClasses.filter(vod => vod.instructorId === instructorId);
    }
  }

  async getAllVODClasses(filters?: {
    level?: string;
    category?: string;
    search?: string;
  }): Promise<VODClass[]> {
    try {
      let query = supabase
        .from('vod_classes')
        .select(`
          *,
          vod_sections(
            *,
            vod_videos(*)
          )
        `)
        .eq('is_published', true);

      if (filters?.level && filters.level !== 'all') {
        query = query.eq('level', filters.level);
      }

      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      if (filters?.search) {
        query = query.textSearch('title,description,instructor_name,tags', filters.search);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching VOD classes:', error);
        // Fallback to mock data
        let filtered = mockVODClasses.filter(vod => vod.isPublished);
        
        if (filters?.level && filters.level !== 'all') {
          filtered = filtered.filter(vod => vod.level === filters.level);
        }
        if (filters?.category && filters.category !== 'all') {
          filtered = filtered.filter(vod => vod.category === filters.category);
        }
        if (filters?.search) {
          const query = filters.search.toLowerCase();
          filtered = filtered.filter(vod =>
            vod.title.toLowerCase().includes(query) ||
            vod.description.toLowerCase().includes(query) ||
            vod.instructorName.toLowerCase().includes(query) ||
            vod.tags.some(tag => tag.toLowerCase().includes(query))
          );
        }
        return filtered;
      }

      return this.transformDatabaseVODClasses(data || []);
    } catch (error) {
      console.error('Error in getAllVODClasses:', error);
      return mockVODClasses.filter(vod => vod.isPublished);
    }
  }

  async uploadClassImages(classId: string, files: File[]): Promise<ClassImage[]> {
    try {
      const uploadPromises = files.map(async (file, index) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${classId}/${Date.now()}_${index}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('class-images')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          // Fallback to mock data
          return {
            id: `img_${classId}_${Date.now()}_${index}`,
            url: URL.createObjectURL(file),
            alt: file.name,
            isPrimary: index === 0,
            uploadedAt: new Date().toISOString()
          };
        }

        const { data: urlData } = supabase.storage
          .from('class-images')
          .getPublicUrl(uploadData.path);

        const { data: imageData, error: imageError } = await supabase
          .from('class_images')
          .insert({
            class_id: classId,
            url: urlData.publicUrl,
            alt_text: file.name,
            is_primary: index === 0
          })
          .select()
          .single();

        if (imageError) {
          console.error('Error saving image record:', imageError);
          throw imageError;
        }

        return {
          id: imageData.id,
          url: imageData.url,
          alt: imageData.alt_text,
          isPrimary: imageData.is_primary,
          uploadedAt: imageData.uploaded_at
        };
      });

      const images = await Promise.all(uploadPromises);
      return images;
    } catch (error) {
      console.error('Error in uploadClassImages:', error);
      // Fallback to mock behavior
      const images: ClassImage[] = files.map((file, index) => ({
        id: `img_${classId}_${Date.now()}_${index}`,
        url: URL.createObjectURL(file),
        alt: file.name,
        isPrimary: index === 0,
        uploadedAt: new Date().toISOString()
      }));
      return images;
    }
  }

  // Helper methods for data transformation
  private transformDatabaseClasses(dbClasses: any[]): SteppingClass[] {
    return dbClasses.map(cls => this.transformDatabaseClass(cls));
  }

  private transformDatabaseClass(dbClass: any): SteppingClass {
    return {
      id: dbClass.id,
      title: dbClass.title,
      description: dbClass.description,
      instructorId: dbClass.instructor_id,
      instructorName: dbClass.instructor_name,
      classType: dbClass.class_type,
      level: dbClass.level,
      category: dbClass.category,
      location: {
        type: dbClass.location_type,
        venue: dbClass.venue,
        address: dbClass.address,
        city: dbClass.city,
        state: dbClass.state,
        zipCode: dbClass.zip_code,
        coordinates: dbClass.latitude && dbClass.longitude ? {
          lat: parseFloat(dbClass.latitude),
          lng: parseFloat(dbClass.longitude)
        } : undefined,
        onlineLink: dbClass.online_link,
        specialInstructions: dbClass.special_instructions
      },
      schedule: {
        type: dbClass.schedule_type,
        startDate: dbClass.start_date,
        endDate: dbClass.end_date,
        time: dbClass.class_time,
        duration: dbClass.duration_minutes,
        daysOfWeek: dbClass.days_of_week || [],
        dayOfMonth: dbClass.day_of_month,
        exceptions: dbClass.exception_dates || [],
        notes: dbClass.schedule_notes
      },
      price: parseFloat(dbClass.price),
      capacity: dbClass.capacity,
      hasRSVP: dbClass.has_rsvp,
      contactInfo: {
        email: dbClass.contact_email,
        phone: dbClass.contact_phone,
        preferredContact: dbClass.preferred_contact
      },
      prerequisites: dbClass.prerequisites,
      whatToBring: dbClass.what_to_bring,
      extras: dbClass.extras,
      images: (dbClass.class_images || []).map((img: any) => ({
        id: img.id,
        url: img.url,
        alt: img.alt_text,
        isPrimary: img.is_primary,
        uploadedAt: img.uploaded_at
      })),
      tags: dbClass.tags || [],
      isActive: dbClass.is_active,
      isPending: dbClass.status === 'draft',
      lastConfirmed: dbClass.updated_at,
      attendeeCount: dbClass.attendee_count || 0,
      interestedCount: dbClass.interested_count || 0,
      averageRating: parseFloat(dbClass.average_rating) || 0,
      totalRatings: dbClass.total_ratings || 0,
      createdAt: dbClass.created_at,
      updatedAt: dbClass.updated_at
    };
  }

  private transformDatabaseVODClasses(dbVODClasses: any[]): VODClass[] {
    return dbVODClasses.map(vod => this.transformDatabaseVODClass(vod));
  }

  private transformDatabaseVODClass(dbVOD: any): VODClass {
    const sections = (dbVOD.vod_sections || []).map((section: any) => ({
      id: section.id,
      title: section.title,
      description: section.description,
      order: section.order_index,
      isPreview: section.is_preview,
      videos: (section.vod_videos || []).map((video: any) => ({
        id: video.id,
        title: video.title,
        description: video.description,
        videoUrl: video.video_url,
        duration: video.duration_seconds,
        order: video.order_index,
        isProcessed: video.is_processed,
        uploadedAt: video.uploaded_at
      }))
    }));

    return {
      id: dbVOD.id,
      title: dbVOD.title,
      description: dbVOD.description,
      instructorId: dbVOD.instructor_id,
      instructorName: dbVOD.instructor_name,
      level: dbVOD.level,
      category: dbVOD.category,
      price: parseFloat(dbVOD.price),
      sections: sections,
      totalDuration: dbVOD.total_duration_minutes || 0,
      thumbnailUrl: dbVOD.thumbnail_url || '/placeholder.svg',
      previewVideoUrl: dbVOD.preview_video_url,
      tags: dbVOD.tags || [],
      isPublished: dbVOD.is_published,
      purchaseCount: dbVOD.purchase_count || 0,
      averageRating: parseFloat(dbVOD.average_rating) || 0,
      totalRatings: dbVOD.total_ratings || 0,
      createdAt: dbVOD.created_at,
      updatedAt: dbVOD.updated_at
    };
  }
}

export const classService = new ClassService();