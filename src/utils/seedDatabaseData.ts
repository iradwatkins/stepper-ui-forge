// Database seeding utilities for sample data
// This creates sample data using the application's normal APIs

import { classService } from '@/services/classService';
import { CommunityBusinessService } from '@/lib/services/CommunityBusinessService';
import { supabase } from '@/integrations/supabase/client';

export interface SeedResult {
  success: boolean;
  message: string;
  count?: number;
  error?: string;
}

export class DatabaseSeeder {
  
  // Seed sample classes
  static async seedClasses(): Promise<SeedResult> {
    try {
      console.log('🌱 Seeding sample classes...');
      
      // Check if we already have classes
      const existingClasses = await classService.getAllClasses();
      if (existingClasses.length > 0) {
        return {
          success: true,
          message: `Database already has ${existingClasses.length} classes. Skipping seed.`,
          count: existingClasses.length
        };
      }
      
      const sampleClasses = [
        {
          title: 'Chicago Stepping Fundamentals',
          description: 'Master the art of Chicago Stepping with this comprehensive beginner course. Learn the signature smooth glide, basic six count, and essential partner connection that makes Chicago Stepping so elegant.',
          classType: 'Regular Class' as const,
          level: 'Beginner' as const,
          category: 'Stepping' as const,
          location: {
            type: 'physical' as const,
            venue: 'Southside Cultural Center',
            address: '4506 S Drexel Blvd',
            city: 'Chicago',
            state: 'IL',
            zipCode: '60653',
            coordinates: { lat: 41.8154, lng: -87.6054 }
          },
          schedule: {
            type: 'weekly' as const,
            startDate: '2024-02-01',
            endDate: '2024-04-25',
            time: '19:00',
            duration: 90,
            daysOfWeek: [4] // Thursday
          },
          price: 25,
          capacity: 20,
          hasRSVP: true,
          contactInfo: {
            email: 'marcus.johnson@steppingworld.com',
            phone: '(312) 555-0123',
            preferredContact: 'email' as const
          },
          prerequisites: 'None - perfect for beginners!',
          whatToBring: 'Comfortable flat shoes (no sneakers), water bottle, positive attitude',
          extras: 'Light refreshments provided after class. Monthly social dance included.',
          tags: ['fundamentals', 'chicago stepping', 'beginner', 'six count', 'partner dancing']
        },
        {
          title: 'Advanced Footwork & Style Workshop',
          description: 'Take your stepping to the next level with complex footwork patterns, styling techniques, and advanced partner dynamics. This intensive workshop focuses on musicality and creative expression.',
          classType: 'Workshop' as const,
          level: 'Advanced' as const,
          category: 'Stepping' as const,
          location: {
            type: 'physical' as const,
            venue: 'DuSable Museum Dance Studio',
            address: '740 E 56th Pl',
            city: 'Chicago',
            state: 'IL',
            zipCode: '60637',
            coordinates: { lat: 41.7910, lng: -87.6086 }
          },
          schedule: {
            type: 'single' as const,
            startDate: '2024-02-17',
            time: '14:00',
            duration: 180
          },
          price: 75,
          capacity: 15,
          hasRSVP: true,
          contactInfo: {
            email: 'lisa.davis@advancedstepping.com',
            phone: '(773) 555-0456',
            preferredContact: 'phone' as const
          },
          prerequisites: 'Must have at least 2 years of stepping experience and know basic patterns',
          whatToBring: 'Professional dance shoes, knee pads (optional), towel',
          extras: 'Video recording available for participants. Certificate of completion provided.',
          tags: ['advanced', 'footwork', 'workshop', 'styling', 'musicality']
        },
        {
          title: 'Virtual Stepping Basics - Learn from Home',
          description: 'Perfect for those who want to learn stepping from the comfort of home. Interactive online sessions with personalized feedback and downloadable practice materials.',
          classType: 'Regular Class' as const,
          level: 'Beginner' as const,
          category: 'Stepping' as const,
          location: {
            type: 'online' as const,
            onlineLink: 'https://zoom.us/j/steppingclass',
            specialInstructions: 'Ensure you have adequate space to move and a stable internet connection'
          },
          schedule: {
            type: 'weekly' as const,
            startDate: '2024-02-05',
            endDate: '2024-03-25',
            time: '20:00',
            duration: 75,
            daysOfWeek: [1] // Monday
          },
          price: 20,
          capacity: 30,
          hasRSVP: true,
          contactInfo: {
            email: 'patricia@virtualstepping.com',
            preferredContact: 'email' as const
          },
          prerequisites: 'Stable internet connection, 6x6 feet of clear space',
          whatToBring: 'Comfortable clothes, water, small towel, phone or tablet for recording',
          extras: 'Recorded sessions available for review. Private Facebook group access.',
          tags: ['online', 'virtual', 'beginner', 'remote learning']
        },
        {
          title: 'Urban Line Dancing Fusion',
          description: 'Combine the smoothness of stepping with the energy of line dancing. Learn popular line dances with a stepping twist, perfect for parties and events.',
          classType: 'Regular Class' as const,
          level: 'Beginner' as const,
          category: 'Line Dancing' as const,
          location: {
            type: 'physical' as const,
            venue: 'Community Center South',
            address: '8500 S Halsted St',
            city: 'Chicago',
            state: 'IL',
            zipCode: '60620',
            coordinates: { lat: 41.7370, lng: -87.6441 }
          },
          schedule: {
            type: 'weekly' as const,
            startDate: '2024-02-03',
            endDate: '2024-04-27',
            time: '16:00',
            duration: 60,
            daysOfWeek: [6] // Saturday
          },
          price: 15,
          capacity: 25,
          hasRSVP: true,
          contactInfo: {
            email: 'stephanie@linedancing.com',
            phone: '(312) 555-0567',
            preferredContact: 'email' as const
          },
          prerequisites: 'None - all levels welcome',
          whatToBring: 'Comfortable sneakers, water bottle, towel',
          extras: 'Monthly showcase performance opportunity',
          tags: ['line dancing', 'urban', 'fusion', 'group dance', 'beginner']
        }
      ];
      
      let createdCount = 0;
      for (const classData of sampleClasses) {
        try {
          await classService.createClass(
            classData, 
            'sample-instructor-id', 
            'Sample Instructor'
          );
          createdCount++;
        } catch (error) {
          console.warn('Failed to create class:', classData.title, error);
        }
      }
      
      return {
        success: createdCount > 0,
        message: `Successfully created ${createdCount} sample classes`,
        count: createdCount
      };
      
    } catch (error) {
      return {
        success: false,
        message: 'Failed to seed classes',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Seed sample businesses (using direct database inserts since we have existing service)
  static async seedBusinesses(): Promise<SeedResult> {
    try {
      console.log('🌱 Seeding sample businesses...');
      
      // Check if we already have businesses
      const { businesses: existingBusinesses } = await CommunityBusinessService.getBusinesses({ limit: 1 });
      if (existingBusinesses.length > 0) {
        const { total } = await CommunityBusinessService.getBusinesses();
        return {
          success: true,
          message: `Database already has ${total} businesses. Skipping seed.`,
          count: total
        };
      }
      
      const sampleBusinesses = [
        {
          business_name: 'Smooth Moves Dance Studio',
          description: 'Premier stepping dance studio in Chicago offering classes for all skill levels. From beginners to advanced steppers, we provide a welcoming environment to learn and perfect the art of Chicago stepping.',
          category: 'fitness_sports' as const,
          subcategory: 'Dance Studio',
          contact_email: 'info@smoothmoveschicago.com',
          contact_phone: '(312) 555-0100',
          website_url: 'https://smoothmoveschicago.com',
          social_media: {
            facebook: 'https://facebook.com/smoothmoveschicago',
            instagram: 'https://instagram.com/smoothmoveschicago'
          },
          address: '2247 S Michigan Ave',
          city: 'Chicago',
          state: 'IL',
          zip_code: '60616',
          latitude: 41.8516,
          longitude: -87.6196,
          service_area_radius: 25,
          business_hours: {
            monday: { open: '17:00', close: '22:00' },
            tuesday: { open: '17:00', close: '22:00' },
            wednesday: { open: '17:00', close: '22:00' },
            thursday: { open: '17:00', close: '22:00' },
            friday: { open: '17:00', close: '23:00' },
            saturday: { open: '12:00', close: '23:00' },
            sunday: { open: '14:00', close: '20:00' }
          },
          price_range: '$$' as const,
          tags: ['chicago stepping', 'dance classes', 'partner dancing', 'group lessons', 'private instruction'],
          specialties: ['Chicago Stepping', 'Beginner Classes', 'Advanced Workshops', 'Private Lessons', 'Wedding Dance Prep'],
          cover_image_url: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800',
          gallery_images: ['https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600', 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600'],
          keywords: ['dance', 'stepping', 'chicago', 'lessons', 'classes']
        },
        {
          business_name: 'StepShot Photography',
          description: 'Specializing in capturing the elegance and emotion of stepping events, competitions, and social dances. We understand the unique movements and moments that make stepping special.',
          category: 'event_services' as const,
          subcategory: 'Photography',
          contact_email: 'bookings@stepshotphoto.com',
          contact_phone: '(773) 555-0200',
          website_url: 'https://stepshotphoto.com',
          social_media: {
            instagram: 'https://instagram.com/stepshotphoto',
            facebook: 'https://facebook.com/stepshotphoto'
          },
          address: '4658 S Cottage Grove Ave',
          city: 'Chicago',
          state: 'IL',
          zip_code: '60653',
          latitude: 41.8095,
          longitude: -87.6063,
          service_area_radius: 50,
          business_hours: {
            monday: { closed: true },
            tuesday: { open: '10:00', close: '18:00' },
            wednesday: { open: '10:00', close: '18:00' },
            thursday: { open: '10:00', close: '18:00' },
            friday: { open: '10:00', close: '20:00' },
            saturday: { open: '09:00', close: '22:00' },
            sunday: { open: '12:00', close: '18:00' }
          },
          price_range: '$$$' as const,
          tags: ['event photography', 'dance photography', 'stepping events', 'competitions', 'social events'],
          specialties: ['Stepping Events', 'Competition Photography', 'Social Dance Coverage', 'Portrait Sessions', 'Video Services'],
          cover_image_url: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800',
          gallery_images: ['https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600'],
          keywords: ['photography', 'events', 'stepping', 'dance', 'professional']
        },
        {
          business_name: 'DJ Smooth Grooves',
          description: 'Professional DJ services specializing in stepping music and events. With an extensive collection of classic and contemporary stepping tracks, I know exactly what gets dancers moving.',
          category: 'entertainment' as const,
          subcategory: 'DJ Services',
          contact_email: 'booking@djsmoothgrooves.com',
          contact_phone: '(773) 555-0600',
          website_url: 'https://djsmoothgrooves.com',
          social_media: {
            instagram: 'https://instagram.com/djsmoothgrooves',
            soundcloud: 'https://soundcloud.com/djsmoothgrooves'
          },
          address: '1455 E 53rd St',
          city: 'Chicago',
          state: 'IL',
          zip_code: '60615',
          latitude: 41.7993,
          longitude: -87.5903,
          service_area_radius: 100,
          business_hours: {
            monday: { open: '12:00', close: '20:00' },
            tuesday: { open: '12:00', close: '20:00' },
            wednesday: { open: '12:00', close: '20:00' },
            thursday: { open: '12:00', close: '22:00' },
            friday: { open: '12:00', close: '02:00' },
            saturday: { open: '12:00', close: '02:00' },
            sunday: { open: '14:00', close: '20:00' }
          },
          price_range: '$$$' as const,
          tags: ['DJ services', 'stepping music', 'event entertainment', 'sound system', 'music mixing'],
          specialties: ['Stepping Events', 'Competition DJing', 'Social Dances', 'Private Parties', 'Wedding Receptions'],
          cover_image_url: 'https://images.unsplash.com/photo-1571266028243-d220c42d2c86?w=800',
          gallery_images: ['https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600'],
          keywords: ['DJ', 'music', 'entertainment', 'stepping', 'events']
        },
        {
          business_name: 'Perfect Steps Shoe Emporium',
          description: 'The premier destination for stepping shoes and dance footwear. We carry all the top brands preferred by steppers, from classic leather soles to modern comfort designs.',
          category: 'retail_shopping' as const,
          subcategory: 'Footwear',
          contact_email: 'info@perfectstepsshoes.com',
          contact_phone: '(773) 555-0800',
          website_url: 'https://perfectstepsshoes.com',
          social_media: {
            instagram: 'https://instagram.com/perfectstepsshoes'
          },
          address: '754 E 47th St',
          city: 'Chicago',
          state: 'IL',
          zip_code: '60653',
          latitude: 41.8097,
          longitude: -87.6006,
          service_area_radius: 25,
          business_hours: {
            monday: { open: '10:00', close: '19:00' },
            tuesday: { open: '10:00', close: '19:00' },
            wednesday: { open: '10:00', close: '19:00' },
            thursday: { open: '10:00', close: '20:00' },
            friday: { open: '10:00', close: '20:00' },
            saturday: { open: '09:00', close: '20:00' },
            sunday: { open: '12:00', close: '17:00' }
          },
          price_range: '$$' as const,
          tags: ['dance shoes', 'stepping shoes', 'leather soles', 'custom fitting', 'shoe repair'],
          specialties: ['Stepping Shoes', 'Dance Footwear', 'Custom Fitting', 'Sole Replacement', 'Shoe Repair'],
          cover_image_url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800',
          gallery_images: ['https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600', 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=600'],
          keywords: ['shoes', 'dance', 'stepping', 'footwear', 'retail']
        }
      ];
      
      let createdCount = 0;
      for (const businessData of sampleBusinesses) {
        try {
          await CommunityBusinessService.createBusiness(businessData);
          createdCount++;
        } catch (error) {
          console.warn('Failed to create business:', businessData.business_name, error);
        }
      }
      
      return {
        success: createdCount > 0,
        message: `Successfully created ${createdCount} sample businesses`,
        count: createdCount
      };
      
    } catch (error) {
      return {
        success: false,
        message: 'Failed to seed businesses',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Check if database needs seeding
  static async checkSeedStatus(): Promise<{
    classes: { count: number; needsSeeding: boolean };
    businesses: { count: number; needsSeeding: boolean };
  }> {
    try {
      const allClasses = await classService.getAllClasses();
      const { total: businessTotal } = await CommunityBusinessService.getBusinesses({ limit: 1 });
      
      return {
        classes: {
          count: allClasses.length,
          needsSeeding: allClasses.length === 0
        },
        businesses: {
          count: businessTotal,
          needsSeeding: businessTotal === 0
        }
      };
    } catch (error) {
      console.error('Error checking seed status:', error);
      return {
        classes: { count: 0, needsSeeding: true },
        businesses: { count: 0, needsSeeding: true }
      };
    }
  }

  // Seed all sample data
  static async seedAll(): Promise<{
    classes: SeedResult;
    businesses: SeedResult;
    summary: {
      totalCreated: number;
      successful: number;
      failed: number;
    };
  }> {
    console.log('🌱 Starting complete database seeding...');
    
    const classResult = await this.seedClasses();
    const businessResult = await this.seedBusinesses();
    
    const totalCreated = (classResult.count || 0) + (businessResult.count || 0);
    const successful = [classResult, businessResult].filter(r => r.success).length;
    const failed = 2 - successful;
    
    console.log('📊 Seeding Summary:');
    console.log(`✅ Successful operations: ${successful}/2`);
    console.log(`❌ Failed operations: ${failed}/2`);
    console.log(`📈 Total items created: ${totalCreated}`);
    
    return {
      classes: classResult,
      businesses: businessResult,
      summary: {
        totalCreated,
        successful,
        failed
      }
    };
  }
}