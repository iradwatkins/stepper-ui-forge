// Enhanced Class Service for managing stepping classes and VOD content
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
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Footwork' | 'All Levels';
  category: 'Technique' | 'Partnership' | 'Competition' | 'Style' | 'Youth' | 'Fusion' | 'Online';
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
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Footwork' | 'All Levels';
  category: 'Technique' | 'Partnership' | 'Competition' | 'Style' | 'Youth' | 'Fusion' | 'Online';
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
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Footwork' | 'All Levels';
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
    category: 'Technique',
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
    category: 'Technique',
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
    category: 'Partnership',
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
    category: 'Online',
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
    category: 'Technique',
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
    const instructorClasses = mockClasses.filter(cls => cls.instructorId === instructorId);
    return Promise.resolve(instructorClasses);
  }

  async getAllClasses(filters?: {
    level?: string;
    category?: string;
    location?: string;
    search?: string;
    isActive?: boolean;
  }): Promise<SteppingClass[]> {
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
        cls.tags.some(tag => tag.toLowerCase().includes(query)) ||
        cls.location.city?.toLowerCase().includes(query) ||
        cls.location.venue?.toLowerCase().includes(query)
      );
    }

    if (filters?.location) {
      filtered = filtered.filter(cls =>
        cls.location.city?.toLowerCase().includes(filters.location!.toLowerCase()) ||
        cls.location.state?.toLowerCase().includes(filters.location!.toLowerCase())
      );
    }

    return Promise.resolve(filtered);
  }

  async createClass(data: ClassSubmissionData, instructorId: string, instructorName: string): Promise<SteppingClass> {
    const newClass: SteppingClass = {
      id: `class_${Date.now()}`,
      title: data.title,
      description: data.description,
      instructorId,
      instructorName,
      classType: data.classType,
      level: data.level,
      category: data.category,
      location: data.location,
      schedule: data.schedule,
      price: data.price,
      capacity: data.capacity,
      hasRSVP: data.hasRSVP,
      contactInfo: data.contactInfo,
      prerequisites: data.prerequisites,
      whatToBring: data.whatToBring,
      extras: data.extras,
      images: [], // Would handle image upload separately
      tags: data.tags,
      isActive: false, // Starts inactive until confirmed
      isPending: true,
      lastConfirmed: new Date().toISOString(),
      attendeeCount: 0,
      interestedCount: 0,
      averageRating: 5.0,
      totalRatings: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return Promise.resolve(newClass);
  }

  async updateClass(classId: string, data: Partial<ClassSubmissionData>): Promise<SteppingClass> {
    const existingClass = mockClasses.find(cls => cls.id === classId);
    if (!existingClass) {
      throw new Error('Class not found');
    }

    const updatedClass: SteppingClass = {
      ...existingClass,
      ...data,
      updatedAt: new Date().toISOString()
    };

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return Promise.resolve(updatedClass);
  }

  async deleteClass(classId: string, instructorId: string): Promise<boolean> {
    const classIndex = mockClasses.findIndex(cls => cls.id === classId && cls.instructorId === instructorId);
    if (classIndex === -1) {
      throw new Error('Class not found or unauthorized');
    }

    // In real implementation, would soft delete or mark as inactive
    mockClasses.splice(classIndex, 1);
    return Promise.resolve(true);
  }

  async confirmClass(classId: string, instructorId: string): Promise<SteppingClass> {
    const classToConfirm = mockClasses.find(cls => cls.id === classId && cls.instructorId === instructorId);
    if (!classToConfirm) {
      throw new Error('Class not found or unauthorized');
    }

    classToConfirm.lastConfirmed = new Date().toISOString();
    classToConfirm.isActive = true;
    classToConfirm.isPending = false;

    return Promise.resolve(classToConfirm);
  }

  // Attendee Management
  async getClassAttendees(classId: string): Promise<ClassAttendee[]> {
    // Mock attendee data
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

    return Promise.resolve(mockAttendees);
  }

  async registerForClass(classId: string, userId: string, status: 'interested' | 'registered'): Promise<ClassAttendee> {
    const newAttendee: ClassAttendee = {
      id: `attendee_${Date.now()}`,
      userId,
      userName: 'Current User',
      userEmail: 'user@example.com',
      classId,
      status,
      registeredAt: new Date().toISOString()
    };

    return Promise.resolve(newAttendee);
  }

  // VOD Classes Management
  async getInstructorVODClasses(instructorId: string): Promise<VODClass[]> {
    const instructorVODs = mockVODClasses.filter(vod => vod.instructorId === instructorId);
    return Promise.resolve(instructorVODs);
  }

  async getAllVODClasses(filters?: {
    level?: string;
    category?: string;
    search?: string;
  }): Promise<VODClass[]> {
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

    return Promise.resolve(filtered);
  }

  async uploadClassImages(classId: string, files: File[]): Promise<ClassImage[]> {
    const images: ClassImage[] = files.map((file, index) => ({
      id: `img_${classId}_${Date.now()}_${index}`,
      url: URL.createObjectURL(file),
      alt: file.name,
      isPrimary: index === 0,
      uploadedAt: new Date().toISOString()
    }));

    // Simulate upload
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return Promise.resolve(images);
  }
}

export const classService = new ClassService();