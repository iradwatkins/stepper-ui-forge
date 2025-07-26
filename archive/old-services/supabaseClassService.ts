// Supabase-based Class Service for real database integration
import { supabase } from '@/integrations/supabase/client';
import { ImageUploadService } from '@/lib/services/ImageUploadService';
import { 
  SteppingClass, 
  ClassSubmissionData, 
  ClassAttendee, 
  VODClass,
  ClassImage
} from './classService';

export class SupabaseClassService {
  // Classes Management
  async createClass(data: ClassSubmissionData, instructorId: string, instructorName: string): Promise<SteppingClass> {
    try {
      // Insert main class record
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .insert({
          title: data.title,
          description: data.description,
          instructor_id: instructorId,
          instructor_name: instructorName,
          class_type: data.classType,
          level: data.level,
          category: data.category,
          price: data.price,
          capacity: data.capacity,
          has_rsvp: data.hasRSVP,
          prerequisites: data.prerequisites,
          what_to_bring: data.whatToBring,
          extras: data.extras,
          tags: data.tags,
          is_active: false, // Requires approval
          is_pending: true
        })
        .select()
        .single();

      if (classError) throw classError;

      // Insert schedule information
      const { error: scheduleError } = await supabase
        .from('class_schedules')
        .insert({
          class_id: classData.id,
          schedule_type: data.schedule.type,
          start_date: data.schedule.startDate,
          end_date: data.schedule.endDate,
          time: data.schedule.time,
          duration: data.schedule.duration,
          days_of_week: data.schedule.daysOfWeek,
          day_of_month: data.schedule.dayOfMonth,
          exceptions: data.schedule.exceptions,
          notes: data.schedule.notes
        });

      if (scheduleError) throw scheduleError;

      // Insert location information
      const { error: locationError } = await supabase
        .from('class_locations')
        .insert({
          class_id: classData.id,
          location_type: data.location.type,
          venue: data.location.venue,
          address: data.location.address,
          city: data.location.city,
          state: data.location.state,
          zip_code: data.location.zipCode,
          latitude: data.location.coordinates?.lat,
          longitude: data.location.coordinates?.lng,
          online_link: data.location.onlineLink,
          special_instructions: data.location.specialInstructions
        });

      if (locationError) throw locationError;

      // Insert contact information
      const { error: contactError } = await supabase
        .from('class_contact_info')
        .insert({
          class_id: classData.id,
          email: data.contactInfo.email,
          phone: data.contactInfo.phone,
          preferred_contact: data.contactInfo.preferredContact
        });

      if (contactError) throw contactError;

      // Convert database result to SteppingClass format
      return this.convertDatabaseToClass(classData);
    } catch (error) {
      console.error('Error creating class:', error);
      throw new Error('Failed to create class');
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
        .from('classes')
        .select(`
          *,
          class_schedules (*),
          class_locations (*),
          class_contact_info (*),
          class_images (*)
        `)
        .eq('is_active', true)
        .eq('is_pending', false);

      // Apply filters
      if (filters?.level && filters.level !== 'all') {
        query = query.eq('level', filters.level);
      }

      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      if (filters?.search) {
        query = query.or(`
          title.ilike.%${filters.search}%,
          description.ilike.%${filters.search}%,
          instructor_name.ilike.%${filters.search}%
        `);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(classData => this.convertDatabaseToClass(classData));
    } catch (error) {
      console.error('Error fetching classes:', error);
      throw new Error('Failed to fetch classes');
    }
  }

  async getInstructorClasses(instructorId: string): Promise<SteppingClass[]> {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          class_schedules (*),
          class_locations (*),
          class_contact_info (*),
          class_images (*)
        `)
        .eq('instructor_id', instructorId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(classData => this.convertDatabaseToClass(classData));
    } catch (error) {
      console.error('Error fetching instructor classes:', error);
      throw new Error('Failed to fetch instructor classes');
    }
  }

  async uploadClassImages(classId: string, files: File[]): Promise<ClassImage[]> {
    try {
      const uploadedImages: ClassImage[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Check if this might be a profile picture or logo based on the file name or order
        const isInstructorProfile = file.name.toLowerCase().includes('profile') || 
                                   file.name.toLowerCase().includes('instructor');
        const isClassLogo = file.name.toLowerCase().includes('logo') || 
                           file.name.toLowerCase().includes('brand');
        
        // Upload to Supabase Storage
        const uploadResult = await ImageUploadService.uploadImage(file, 'class-images');
        
        // Insert image record
        const { data: imageData, error: imageError } = await supabase
          .from('class_images')
          .insert({
            class_id: classId,
            url: uploadResult.url,
            alt_text: file.name,
            is_primary: i === 0 && !isInstructorProfile && !isClassLogo,
            is_instructor_profile: isInstructorProfile,
            is_class_logo: isClassLogo,
            file_size: file.size,
            file_type: file.type
          })
          .select()
          .single();

        if (imageError) throw imageError;

        uploadedImages.push({
          id: imageData.id,
          url: imageData.url,
          alt: imageData.alt_text || '',
          isPrimary: imageData.is_primary || false,
          uploadedAt: imageData.uploaded_at
        });
      }

      return uploadedImages;
    } catch (error) {
      console.error('Error uploading class images:', error);
      throw new Error('Failed to upload images');
    }
  }

  async registerForClass(classId: string, userId: string, status: 'interested' | 'registered'): Promise<ClassAttendee> {
    try {
      // Get user info
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('username, email')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Insert or update registration
      const { data, error } = await supabase
        .from('class_attendees')
        .upsert({
          class_id: classId,
          user_id: userId,
          user_name: userProfile.username || 'Unknown User',
          user_email: userProfile.email || '',
          status: status
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        userId: data.user_id,
        userName: data.user_name,
        userEmail: data.user_email,
        classId: data.class_id,
        status: data.status,
        registeredAt: data.registered_at
      };
    } catch (error) {
      console.error('Error registering for class:', error);
      throw new Error('Failed to register for class');
    }
  }

  async createClassPayment(classId: string, userId: string, amount: number, paymentMethod: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('class_payments')
        .insert({
          class_id: classId,
          user_id: userId,
          amount: amount,
          payment_method: paymentMethod,
          payment_status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      return data.id;
    } catch (error) {
      console.error('Error creating class payment:', error);
      throw new Error('Failed to create payment record');
    }
  }

  async updatePaymentStatus(paymentId: string, status: string, transactionId?: string): Promise<void> {
    try {
      const updateData: any = {
        payment_status: status,
        updated_at: new Date().toISOString()
      };

      if (status === 'completed') {
        updateData.paid_at = new Date().toISOString();
      }

      if (transactionId) {
        updateData.transaction_id = transactionId;
      }

      const { error } = await supabase
        .from('class_payments')
        .update(updateData)
        .eq('id', paymentId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw new Error('Failed to update payment status');
    }
  }

  // Helper method to convert database format to SteppingClass interface
  private convertDatabaseToClass(classData: any): SteppingClass {
    const schedule = classData.class_schedules?.[0] || {};
    const location = classData.class_locations?.[0] || {};
    const contact = classData.class_contact_info?.[0] || {};
    const images = classData.class_images || [];

    return {
      id: classData.id,
      title: classData.title,
      description: classData.description || '',
      instructorId: classData.instructor_id,
      instructorName: classData.instructor_name,
      classType: classData.class_type,
      level: classData.level,
      category: classData.category,
      location: {
        type: location.location_type || 'physical',
        venue: location.venue,
        address: location.address,
        city: location.city,
        state: location.state,
        zipCode: location.zip_code,
        coordinates: location.latitude && location.longitude ? {
          lat: location.latitude,
          lng: location.longitude
        } : undefined,
        onlineLink: location.online_link,
        specialInstructions: location.special_instructions
      },
      schedule: {
        type: schedule.schedule_type || 'single',
        startDate: schedule.start_date,
        endDate: schedule.end_date,
        time: schedule.time,
        duration: schedule.duration || 60,
        daysOfWeek: schedule.days_of_week || [],
        dayOfMonth: schedule.day_of_month,
        exceptions: schedule.exceptions || [],
        notes: schedule.notes
      },
      price: classData.price || 0,
      capacity: classData.capacity,
      hasRSVP: classData.has_rsvp || false,
      contactInfo: {
        email: contact.email,
        phone: contact.phone,
        preferredContact: contact.preferred_contact || 'email'
      },
      prerequisites: classData.prerequisites,
      whatToBring: classData.what_to_bring,
      extras: classData.extras,
      images: images.map((img: any) => ({
        id: img.id,
        url: img.url,
        alt: img.alt_text || '',
        isPrimary: img.is_primary || false,
        uploadedAt: img.uploaded_at
      })),
      tags: classData.tags || [],
      isActive: classData.is_active || false,
      isPending: classData.is_pending || false,
      lastConfirmed: classData.last_confirmed,
      attendeeCount: classData.attendee_count || 0,
      interestedCount: classData.interested_count || 0,
      averageRating: classData.average_rating || 5.0,
      totalRatings: classData.total_ratings || 0,
      createdAt: classData.created_at,
      updatedAt: classData.updated_at
    };
  }
}

export const supabaseClassService = new SupabaseClassService();