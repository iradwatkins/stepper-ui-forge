import { supabase } from '@/integrations/supabase/client';

export type BusinessCategory = 
  | 'food_beverage'
  | 'health_wellness'
  | 'beauty_personal_care'
  | 'fitness_sports'
  | 'education_training'
  | 'professional_services'
  | 'home_garden'
  | 'automotive'
  | 'technology'
  | 'arts_crafts'
  | 'entertainment'
  | 'retail_shopping'
  | 'real_estate'
  | 'financial_services'
  | 'childcare_family'
  | 'pet_services'
  | 'cleaning_maintenance'
  | 'event_services'
  | 'travel_hospitality'
  | 'other';

export type BusinessType = 
  | 'physical_business'
  | 'service_provider'
  | 'venue'
  | 'online_business'
  | 'mobile_service';

export type ServiceRateType = 
  | 'hourly'
  | 'per_project'
  | 'per_session'
  | 'per_day'
  | 'fixed';

export type BusinessStatus = 'pending' | 'approved' | 'suspended' | 'rejected';

export type PriceRange = '$' | '$$' | '$$$' | '$$$$';

export interface BusinessHours {
  monday?: { open: string; close: string; closed?: boolean };
  tuesday?: { open: string; close: string; closed?: boolean };
  wednesday?: { open: string; close: string; closed?: boolean };
  thursday?: { open: string; close: string; closed?: boolean };
  friday?: { open: string; close: string; closed?: boolean };
  saturday?: { open: string; close: string; closed?: boolean };
  sunday?: { open: string; close: string; closed?: boolean };
}

export interface SocialMedia {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
  tiktok?: string;
}

export interface CommunityBusiness {
  id: string;
  owner_id: string;
  business_name: string;
  description: string;
  category: BusinessCategory;
  subcategory?: string;
  business_type: BusinessType;
  contact_email?: string;
  contact_phone?: string;
  website_url?: string;
  social_media?: SocialMedia;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  service_area_radius?: number;
  business_hours?: BusinessHours;
  price_range?: PriceRange;
  tags?: string[];
  specialties?: string[];
  logo_url?: string;
  cover_image_url?: string;
  gallery_images?: string[];
  status: BusinessStatus;
  is_verified: boolean;
  verification_date?: string;
  verified_by?: string;
  slug?: string;
  keywords?: string[];
  featured: boolean;
  featured_until?: string;
  view_count: number;
  contact_count: number;
  rating_average: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
  last_active_at?: string;
  // Service-specific fields
  hourly_rate?: number;
  service_rate_type?: ServiceRateType;
  min_booking_duration?: number;
  max_booking_duration?: number;
  availability_schedule?: Record<string, { start: string; end: string; available: boolean }>;
  booking_advance_notice?: number;
  accepts_online_booking?: boolean;
  service_offerings?: string[];
  service_area_description?: string;
  travel_fee?: number;
  max_travel_distance?: number;
}

export interface BusinessReview {
  id: string;
  business_id: string;
  reviewer_id: string;
  rating: number;
  review_text?: string;
  helpful_count: number;
  verified_purchase: boolean;
  created_at: string;
  updated_at: string;
  reviewer_name?: string;
  reviewer_avatar?: string;
}

export interface BusinessInquiry {
  id: string;
  business_id: string;
  inquirer_id?: string;
  inquirer_email: string;
  inquirer_name: string;
  inquirer_phone?: string;
  subject?: string;
  message: string;
  inquiry_type: string;
  status: string;
  created_at: string;
}

export interface BusinessSearchFilters {
  category?: BusinessCategory;
  businessType?: BusinessType;
  location?: {
    city?: string;
    state?: string;
    radius?: number; // miles
    lat?: number;
    lng?: number;
  };
  priceRange?: PriceRange;
  rating?: number; // minimum rating
  verified?: boolean;
  tags?: string[];
  serviceType?: 'booking_available' | 'online_service' | 'mobile_service';
  sortBy?: 'newest' | 'oldest' | 'rating' | 'alphabetical' | 'featured' | 'distance';
  limit?: number;
  offset?: number;
}

export class CommunityBusinessService {
  /**
   * Get all approved businesses with optional filtering
   */
  static async getBusinesses(filters: BusinessSearchFilters = {}): Promise<{
    businesses: CommunityBusiness[];
    total: number;
  }> {
    let query = supabase
      .from('community_businesses')
      .select('*', { count: 'exact' })
      .eq('status', 'approved');

    // Apply filters
    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.businessType) {
      query = query.eq('business_type', filters.businessType);
    }

    if (filters.location?.city) {
      query = query.ilike('city', `%${filters.location.city}%`);
    }

    if (filters.location?.state) {
      query = query.ilike('state', `%${filters.location.state}%`);
    }

    if (filters.priceRange) {
      query = query.eq('price_range', filters.priceRange);
    }

    if (filters.rating) {
      query = query.gte('rating_average', filters.rating);
    }

    if (filters.verified) {
      query = query.eq('is_verified', true);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    if (filters.serviceType) {
      switch (filters.serviceType) {
        case 'booking_available':
          query = query.eq('accepts_online_booking', true);
          break;
        case 'online_service':
          query = query.eq('business_type', 'online_business');
          break;
        case 'mobile_service':
          query = query.eq('business_type', 'mobile_service');
          break;
      }
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'rating':
        query = query.order('rating_average', { ascending: false });
        break;
      case 'alphabetical':
        query = query.order('business_name', { ascending: true });
        break;
      case 'featured':
        query = query.order('featured', { ascending: false }).order('created_at', { ascending: false });
        break;
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // Apply pagination
    if (filters.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1);
    } else if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error, count } = await query;

    if (error) {
      // Check if it's a table not found error
      if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.warn('Community businesses table not found, returning empty data');
        return {
          businesses: [],
          total: 0
        };
      }
      console.error('Error fetching businesses:', error);
      throw error;
    }

    return {
      businesses: data || [],
      total: count || 0
    };
  }

  /**
   * Get a single business by ID or slug
   */
  static async getBusiness(identifier: string): Promise<CommunityBusiness | null> {
    const { data, error } = await supabase
      .from('community_businesses')
      .select('*')
      .or(`id.eq.${identifier},slug.eq.${identifier}`)
      .eq('status', 'approved')
      .single();

    if (error) {
      // Check if it's a table not found error
      if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.warn('Community businesses table not found');
        return null;
      }
      if (error.code !== 'PGRST116') {
        console.error('Error fetching business:', error);
        throw error;
      }
    }

    // Increment view count
    if (data) {
      await this.incrementViewCount(data.id);
    }

    return data;
  }

  /**
   * Create a new business listing
   */
  static async createBusiness(businessData: Partial<CommunityBusiness>): Promise<CommunityBusiness> {
    const { data, error } = await supabase
      .from('community_businesses')
      .insert({
        ...businessData,
        owner_id: (await supabase.auth.getUser()).data.user?.id,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating business:', error);
      throw error;
    }

    return data;
  }

  /**
   * Update a business listing
   */
  static async updateBusiness(businessId: string, updates: Partial<CommunityBusiness>): Promise<CommunityBusiness> {
    const { data, error } = await supabase
      .from('community_businesses')
      .update(updates)
      .eq('id', businessId)
      .select()
      .single();

    if (error) {
      console.error('Error updating business:', error);
      throw error;
    }

    return data;
  }

  /**
   * Delete a business listing
   */
  static async deleteBusiness(businessId: string): Promise<void> {
    const { error } = await supabase
      .from('community_businesses')
      .delete()
      .eq('id', businessId);

    if (error) {
      console.error('Error deleting business:', error);
      throw error;
    }
  }

  /**
   * Get businesses owned by current user
   */
  static async getMyBusinesses(): Promise<CommunityBusiness[]> {
    const { data, error } = await supabase
      .from('community_businesses')
      .select('*')
      .eq('owner_id', (await supabase.auth.getUser()).data.user?.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching my businesses:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Search businesses by text
   */
  static async searchBusinesses(query: string, filters: BusinessSearchFilters = {}): Promise<{
    businesses: CommunityBusiness[];
    total: number;
  }> {
    let searchQuery = supabase
      .from('community_businesses')
      .select('*', { count: 'exact' })
      .eq('status', 'approved')
      .textSearch('business_name,description,tags', query);

    // Apply additional filters
    if (filters.category) {
      searchQuery = searchQuery.eq('category', filters.category);
    }

    if (filters.location?.city) {
      searchQuery = searchQuery.ilike('city', `%${filters.location.city}%`);
    }

    // Apply sorting
    searchQuery = searchQuery.order('featured', { ascending: false })
                             .order('rating_average', { ascending: false });

    const { data, error, count } = await searchQuery;

    if (error) {
      console.error('Error searching businesses:', error);
      throw error;
    }

    return {
      businesses: data || [],
      total: count || 0
    };
  }

  /**
   * Get featured businesses
   */
  static async getFeaturedBusinesses(limit: number = 6): Promise<CommunityBusiness[]> {
    const { data, error } = await supabase
      .from('community_businesses')
      .select('*')
      .eq('status', 'approved')
      .eq('featured', true)
      .gte('featured_until', new Date().toISOString())
      .order('rating_average', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching featured businesses:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get business reviews
   */
  static async getBusinessReviews(businessId: string): Promise<BusinessReview[]> {
    const { data, error } = await supabase
      .from('business_reviews')
      .select(`
        *,
        reviewer:reviewer_id(
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching business reviews:', error);
      throw error;
    }

    return data?.map(review => ({
      ...review,
      reviewer_name: review.reviewer?.full_name || 'Anonymous',
      reviewer_avatar: review.reviewer?.avatar_url
    })) || [];
  }

  /**
   * Create a business review
   */
  static async createReview(businessId: string, rating: number, reviewText?: string): Promise<BusinessReview> {
    const { data, error } = await supabase
      .from('business_reviews')
      .insert({
        business_id: businessId,
        reviewer_id: (await supabase.auth.getUser()).data.user?.id,
        rating,
        review_text: reviewText
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating review:', error);
      throw error;
    }

    return data;
  }

  /**
   * Create a business inquiry
   */
  static async createInquiry(inquiry: Omit<BusinessInquiry, 'id' | 'created_at'>): Promise<BusinessInquiry> {
    const { data, error } = await supabase
      .from('business_inquiries')
      .insert({
        ...inquiry,
        inquirer_id: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating inquiry:', error);
      throw error;
    }

    // Increment contact count
    await this.incrementContactCount(inquiry.business_id);

    return data;
  }

  /**
   * Get inquiries for a business
   */
  static async getBusinessInquiries(businessId: string): Promise<BusinessInquiry[]> {
    const { data, error } = await supabase
      .from('business_inquiries')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching business inquiries:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Increment view count for a business
   */
  private static async incrementViewCount(businessId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_business_views', {
      business_id: businessId
    });

    if (error) {
      console.error('Error incrementing view count:', error);
    }
  }

  /**
   * Increment contact count for a business
   */
  private static async incrementContactCount(businessId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_business_contacts', {
      business_id: businessId
    });

    if (error) {
      console.error('Error incrementing contact count:', error);
    }
  }

  /**
   * Get business categories for filtering
   */
  static getBusinessCategories(): Array<{
    value: BusinessCategory;
    label: string;
    description: string;
  }> {
    return [
      { value: 'food_beverage', label: 'Food & Beverage', description: 'Restaurants, cafes, catering, food trucks' },
      { value: 'health_wellness', label: 'Health & Wellness', description: 'Healthcare, therapy, nutrition, mental health' },
      { value: 'beauty_personal_care', label: 'Beauty & Personal Care', description: 'Salons, spas, skincare, cosmetics' },
      { value: 'fitness_sports', label: 'Fitness & Sports', description: 'Gyms, personal training, sports coaching' },
      { value: 'education_training', label: 'Education & Training', description: 'Tutoring, courses, workshops, coaching' },
      { value: 'professional_services', label: 'Professional Services', description: 'Legal, accounting, consulting, business services' },
      { value: 'home_garden', label: 'Home & Garden', description: 'Home improvement, landscaping, interior design' },
      { value: 'automotive', label: 'Automotive', description: 'Car repair, detailing, sales, maintenance' },
      { value: 'technology', label: 'Technology', description: 'IT services, web development, tech support' },
      { value: 'arts_crafts', label: 'Arts & Crafts', description: 'Art classes, handmade goods, creative services' },
      { value: 'entertainment', label: 'Entertainment', description: 'Music, photography, event entertainment' },
      { value: 'retail_shopping', label: 'Retail & Shopping', description: 'Online stores, boutiques, specialty retail' },
      { value: 'real_estate', label: 'Real Estate', description: 'Property sales, rentals, property management' },
      { value: 'financial_services', label: 'Financial Services', description: 'Financial planning, insurance, investments' },
      { value: 'childcare_family', label: 'Childcare & Family', description: 'Daycare, babysitting, family services' },
      { value: 'pet_services', label: 'Pet Services', description: 'Pet grooming, veterinary, pet sitting' },
      { value: 'cleaning_maintenance', label: 'Cleaning & Maintenance', description: 'House cleaning, maintenance, repairs' },
      { value: 'event_services', label: 'Event Services', description: 'Wedding planning, party services, catering' },
      { value: 'travel_hospitality', label: 'Travel & Hospitality', description: 'Travel planning, accommodations, tours' },
      { value: 'other', label: 'Other', description: 'Services not listed in other categories' }
    ];
  }

  /**
   * Get business types for selection
   */
  static getBusinessTypes(): Array<{
    value: BusinessType;
    label: string;
    description: string;
    icon: string;
  }> {
    return [
      { 
        value: 'physical_business', 
        label: 'Physical Business', 
        description: 'Brick-and-mortar stores, restaurants, shops with fixed locations',
        icon: '🏪'
      },
      { 
        value: 'service_provider', 
        label: 'Service Provider', 
        description: 'Individual professionals offering services (instructors, consultants, etc.)',
        icon: '👨‍💼'
      },
      { 
        value: 'venue', 
        label: 'Venue', 
        description: 'Event spaces, studios, halls available for booking',
        icon: '🏢'
      },
      { 
        value: 'online_business', 
        label: 'Online Business', 
        description: 'E-commerce stores, digital services, virtual businesses',
        icon: '💻'
      },
      { 
        value: 'mobile_service', 
        label: 'Mobile Service', 
        description: 'Services that travel to the customer location',
        icon: '🚗'
      }
    ];
  }

  /**
   * Get service rate types
   */
  static getServiceRateTypes(): Array<{
    value: ServiceRateType;
    label: string;
    description: string;
  }> {
    return [
      { value: 'hourly', label: 'Hourly Rate', description: 'Charged per hour of service' },
      { value: 'per_project', label: 'Per Project', description: 'Fixed rate per project or job' },
      { value: 'per_session', label: 'Per Session', description: 'Fixed rate per session or appointment' },
      { value: 'per_day', label: 'Per Day', description: 'Daily rate for extended services' },
      { value: 'fixed', label: 'Fixed Price', description: 'Set price for specific services' }
    ];
  }

  /**
   * Helper methods for business type logic
   */
  static isServiceProvider(businessType: BusinessType): boolean {
    return businessType === 'service_provider';
  }

  static requiresPhysicalAddress(businessType: BusinessType): boolean {
    return businessType === 'physical_business' || businessType === 'venue';
  }

  static supportsOnlineBooking(businessType: BusinessType): boolean {
    return businessType === 'service_provider' || businessType === 'venue';
  }

  static canHaveMobileService(businessType: BusinessType): boolean {
    return businessType === 'service_provider' || businessType === 'mobile_service';
  }

  static getBusinessTypeLabel(businessType: BusinessType): string {
    const types = this.getBusinessTypes();
    return types.find(t => t.value === businessType)?.label || businessType;
  }

  static getRequiredFieldsForType(businessType: BusinessType): string[] {
    const baseFields = ['business_name', 'description', 'category'];
    
    switch (businessType) {
      case 'physical_business':
      case 'venue':
        return [...baseFields, 'address', 'city', 'state'];
      case 'service_provider':
        return [...baseFields, 'service_offerings'];
      case 'online_business':
        return [...baseFields, 'website_url'];
      case 'mobile_service':
        return [...baseFields, 'service_area_radius', 'service_offerings'];
      default:
        return baseFields;
    }
  }

  static getDefaultServiceAreaRadius(businessType: BusinessType): number | null {
    switch (businessType) {
      case 'service_provider':
        return 25;
      case 'mobile_service':
        return 50;
      default:
        return null;
    }
  }

  /**
   * Get businesses by type with type-specific sorting
   */
  static async getBusinessesByType(businessType: BusinessType, filters: BusinessSearchFilters = {}): Promise<{
    businesses: CommunityBusiness[];
    total: number;
  }> {
    const typeFilters = { ...filters, businessType };
    
    // Add type-specific sorting
    if (!typeFilters.sortBy) {
      switch (businessType) {
        case 'service_provider':
          typeFilters.sortBy = 'rating';
          break;
        case 'venue':
          typeFilters.sortBy = 'featured';
          break;
        default:
          typeFilters.sortBy = 'newest';
      }
    }
    
    return this.getBusinesses(typeFilters);
  }

  /**
   * Get service providers with availability
   */
  static async getAvailableServiceProviders(filters: BusinessSearchFilters = {}): Promise<{
    businesses: CommunityBusiness[];
    total: number;
  }> {
    return this.getBusinesses({
      ...filters,
      businessType: 'service_provider',
      serviceType: 'booking_available'
    });
  }

  /**
   * Search businesses with type-aware logic
   */
  static async searchByTypeAndLocation(
    query: string, 
    businessType?: BusinessType, 
    userLocation?: { lat: number; lng: number }, 
    radius: number = 25
  ): Promise<{ businesses: CommunityBusiness[]; total: number }> {
    const filters: BusinessSearchFilters = {
      businessType,
      location: userLocation ? {
        lat: userLocation.lat,
        lng: userLocation.lng,
        radius
      } : undefined,
      sortBy: userLocation ? 'distance' : 'rating'
    };
    
    return this.searchBusinesses(query, filters);
  }
}