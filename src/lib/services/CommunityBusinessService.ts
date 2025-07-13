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
  sortBy?: 'newest' | 'oldest' | 'rating' | 'alphabetical' | 'featured';
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

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching business:', error);
      throw error;
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
}