// Referral Service for generating unique codes/URLs and tracking sales attribution
// Handles referral code generation, QR codes, URL creation, and commission tracking

import { supabase } from '@/integrations/supabase/client'
import QRCode from 'qrcode'
import { ImageGenerationService, type PromotionalImageOptions } from './ImageGenerationService'
import type { 
  ReferralCode, ReferralCodeInsert, ReferralCodeUpdate,
  CommissionEarning, CommissionEarningInsert, Event
} from '@/types/database'

// Type assertion for supabase client
const db = supabase as any

export interface ReferralCodeResult {
  success: boolean
  referralCode?: ReferralCode
  error?: string
}

export interface ReferralTrackingResult {
  success: boolean
  commission?: CommissionEarning
  error?: string
}

export interface ReferralStats {
  code: string
  clicks: number
  conversions: number
  totalSales: number
  totalCommissions: number
  conversionRate: number
}

export class ReferralService {
  private static readonly BASE_URL = import.meta.env.VITE_APP_URL || 'https://stepperslife.com'

  /**
   * Generate a unique referral code for a promoted follower
   */
  static async generateReferralCode(
    promotionId: string, 
    eventId?: string
  ): Promise<ReferralCodeResult> {
    try {
      // Generate unique code using database function
      const { data: codeData } = await db.rpc('generate_referral_code');
      
      if (!codeData) {
        throw new Error('Failed to generate unique code');
      }

      const referralUrl = eventId 
        ? `${this.BASE_URL}/event/${eventId}?ref=${codeData}`
        : `${this.BASE_URL}?ref=${codeData}`;

      // Generate QR code
      const qrCodeUrl = await this.generateQRCode(referralUrl);

      const referralData: ReferralCodeInsert = {
        promotion_id: promotionId,
        event_id: eventId || null,
        code: codeData,
        referral_url: referralUrl,
        qr_code_url: qrCodeUrl,
        is_active: true,
        clicks_count: 0,
        conversions_count: 0
      };

      const { data, error } = await db
        .from('referral_codes')
        .insert(referralData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create referral code: ${error.message}`);
      }

      return {
        success: true,
        referralCode: data
      };

    } catch (error) {
      console.error('Failed to generate referral code:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate QR code as data URL
   */
  private static async generateQRCode(url: string): Promise<string> {
    try {
      return await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      return '';
    }
  }

  /**
   * Track referral click
   */
  static async trackReferralClick(referralCode: string): Promise<void> {
    try {
      const { error } = await db
        .from('referral_codes')
        .update({ 
          clicks_count: db.raw('clicks_count + 1'),
          updated_at: new Date().toISOString()
        })
        .eq('code', referralCode)
        .eq('is_active', true);

      if (error) {
        console.error('Failed to track referral click:', error);
      }
    } catch (error) {
      console.error('Failed to track referral click:', error);
    }
  }

  /**
   * Track referral conversion (when order is created)
   */
  static async trackReferralConversion(
    referralCode: string,
    orderId: string,
    saleAmount: number
  ): Promise<ReferralTrackingResult> {
    try {
      // Get referral code details with promotion info
      const { data: referralData, error: referralError } = await db
        .from('referral_codes')
        .select(`
          id,
          promotion_id,
          event_id,
          follower_promotions (
            follower_id,
            organizer_id,
            commission_rate
          )
        `)
        .eq('code', referralCode)
        .eq('is_active', true)
        .single();

      if (referralError || !referralData) {
        throw new Error('Referral code not found or inactive');
      }

      const promotion = referralData.follower_promotions;
      if (!promotion) {
        throw new Error('Promotion not found for referral code');
      }

      // Calculate commission
      const commissionRate = parseFloat(promotion.commission_rate);
      const commissionAmount = Math.round(saleAmount * commissionRate * 100) / 100;

      // Create commission earning record
      const commissionData: CommissionEarningInsert = {
        referral_code_id: referralData.id,
        order_id: orderId,
        follower_id: promotion.follower_id,
        organizer_id: promotion.organizer_id,
        event_id: referralData.event_id,
        sale_amount: saleAmount,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        status: 'pending'
      };

      const { data: commissionResult, error: commissionError } = await db
        .from('commission_earnings')
        .insert(commissionData)
        .select()
        .single();

      if (commissionError) {
        throw new Error(`Failed to create commission record: ${commissionError.message}`);
      }

      // Update referral code conversion count
      await db
        .from('referral_codes')
        .update({ 
          conversions_count: db.raw('conversions_count + 1'),
          updated_at: new Date().toISOString()
        })
        .eq('id', referralData.id);

      return {
        success: true,
        commission: commissionResult
      };

    } catch (error) {
      console.error('Failed to track referral conversion:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get referral codes for a promotion
   */
  static async getReferralCodesForPromotion(promotionId: string): Promise<ReferralCode[]> {
    try {
      const { data, error } = await db
        .from('referral_codes')
        .select('*')
        .eq('promotion_id', promotionId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch referral codes: ${error.message}`);
      }

      return data || [];

    } catch (error) {
      console.error('Failed to get referral codes:', error);
      return [];
    }
  }

  /**
   * Get referral stats for a specific code
   */
  static async getReferralStats(referralCode: string): Promise<ReferralStats | null> {
    try {
      // Get basic referral code data
      const { data: codeData, error: codeError } = await db
        .from('referral_codes')
        .select('code, clicks_count, conversions_count')
        .eq('code', referralCode)
        .single();

      if (codeError || !codeData) {
        return null;
      }

      // Get commission data
      const { data: commissionData, error: commissionError } = await db
        .from('commission_earnings')
        .select('sale_amount, commission_amount')
        .eq('referral_code_id', (
          await db
            .from('referral_codes')
            .select('id')
            .eq('code', referralCode)
            .single()
        ).data?.id);

      if (commissionError) {
        console.error('Failed to fetch commission data:', commissionError);
      }

      const totalSales = (commissionData || []).reduce((sum, item) => sum + parseFloat(item.sale_amount), 0);
      const totalCommissions = (commissionData || []).reduce((sum, item) => sum + parseFloat(item.commission_amount), 0);
      const conversionRate = codeData.clicks_count > 0 ? (codeData.conversions_count / codeData.clicks_count) * 100 : 0;

      return {
        code: codeData.code,
        clicks: codeData.clicks_count,
        conversions: codeData.conversions_count,
        totalSales,
        totalCommissions,
        conversionRate: Math.round(conversionRate * 100) / 100
      };

    } catch (error) {
      console.error('Failed to get referral stats:', error);
      return null;
    }
  }

  /**
   * Get all referral stats for a follower
   */
  static async getFollowerReferralStats(followerId: string): Promise<ReferralStats[]> {
    try {
      const { data, error } = await db
        .from('referral_codes')
        .select(`
          id,
          code,
          clicks_count,
          conversions_count,
          commission_earnings (
            sale_amount,
            commission_amount
          )
        `)
        .eq('promotion_id', (
          await db
            .from('follower_promotions')
            .select('id')
            .eq('follower_id', followerId)
        ).data?.map((p: any) => p.id) || [])
        .eq('is_active', true);

      if (error) {
        throw new Error(`Failed to fetch follower referral stats: ${error.message}`);
      }

      return (data || []).map((item: any) => {
        const totalSales = (item.commission_earnings || []).reduce(
          (sum: number, earning: any) => sum + parseFloat(earning.sale_amount), 0
        );
        const totalCommissions = (item.commission_earnings || []).reduce(
          (sum: number, earning: any) => sum + parseFloat(earning.commission_amount), 0
        );
        const conversionRate = item.clicks_count > 0 ? (item.conversions_count / item.clicks_count) * 100 : 0;

        return {
          code: item.code,
          clicks: item.clicks_count,
          conversions: item.conversions_count,
          totalSales,
          totalCommissions,
          conversionRate: Math.round(conversionRate * 100) / 100
        };
      });

    } catch (error) {
      console.error('Failed to get follower referral stats:', error);
      return [];
    }
  }

  /**
   * Deactivate a referral code
   */
  static async deactivateReferralCode(referralCode: string): Promise<ReferralCodeResult> {
    try {
      const { data, error } = await db
        .from('referral_codes')
        .update({ is_active: false })
        .eq('code', referralCode)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to deactivate referral code: ${error.message}`);
      }

      return {
        success: true,
        referralCode: data
      };

    } catch (error) {
      console.error('Failed to deactivate referral code:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate promotional materials for a referral code
   */
  static generatePromotionalMaterials(
    referralCode: ReferralCode, 
    eventTitle?: string,
    platform?: 'facebook' | 'instagram' | 'twitter' | 'whatsapp' | 'email'
  ): {
    socialMediaPost: string
    emailTemplate: string
    shortUrl: string
    trackingUrl: string
  } {
    const eventText = eventTitle ? ` for ${eventTitle}` : '';
    
    // Add UTM parameters for tracking
    const trackingUrl = this.addUTMParameters(referralCode.referral_url, {
      source: platform || 'direct',
      medium: 'social',
      campaign: `referral-${referralCode.code}`
    });
    
    // Platform-specific messages
    const platformMessages = {
      facebook: `🎉 Don't miss out on ${eventTitle}! I've got an exclusive link just for you. Get your tickets now and let's have an amazing time together! ${trackingUrl} #SteppersLife #Events`,
      instagram: `🎉 ${eventTitle} is going to be AMAZING! Swipe up or click the link in my bio for tickets! Use my special code: ${referralCode.code} 💃🕺 #SteppersLife #${eventTitle?.replace(/\s+/g, '')}`,
      twitter: `🎉 Who's ready for ${eventTitle}? Get your tickets with my exclusive link: ${trackingUrl} #SteppersLife #Events`,
      whatsapp: `Hey! 👋 I wanted to make sure you don't miss ${eventTitle}. Here's my exclusive link for tickets: ${trackingUrl}. See you there! 🎉`,
      email: `Hi there!

I'm excited to share that I'll be at ${eventTitle} and I'd love for you to join me!

I have a special link that you can use to get your tickets: ${trackingUrl}

Event Details:
${eventTitle}
Use code: ${referralCode.code}

This is going to be an amazing event with great music, dancing, and vibes. Don't miss out!

Looking forward to seeing you there!

Best regards`,
      default: `🎉 Get your tickets${eventText}! Use my link for exclusive access: ${trackingUrl} #SteppersLife #Events`
    };
    
    return {
      socialMediaPost: platformMessages[platform || 'default'] || platformMessages.default,
      emailTemplate: platformMessages.email,
      shortUrl: referralCode.referral_url,
      trackingUrl
    };
  }

  /**
   * Add UTM parameters to a URL for tracking
   */
  static addUTMParameters(url: string, params: {
    source?: string
    medium?: string
    campaign?: string
    term?: string
    content?: string
  }): string {
    try {
      const urlObj = new URL(url);
      
      if (params.source) urlObj.searchParams.set('utm_source', params.source);
      if (params.medium) urlObj.searchParams.set('utm_medium', params.medium);
      if (params.campaign) urlObj.searchParams.set('utm_campaign', params.campaign);
      if (params.term) urlObj.searchParams.set('utm_term', params.term);
      if (params.content) urlObj.searchParams.set('utm_content', params.content);
      
      return urlObj.toString();
    } catch (error) {
      console.error('Failed to add UTM parameters:', error);
      return url;
    }
  }

  /**
   * Validate referral code and return associated data
   */
  static async validateReferralCode(code: string): Promise<{
    valid: boolean
    promotionId?: string
    eventId?: string
    followerId?: string
    organizerId?: string
  }> {
    try {
      const { data, error } = await db
        .from('referral_codes')
        .select(`
          promotion_id,
          event_id,
          is_active,
          follower_promotions (
            follower_id,
            organizer_id
          )
        `)
        .eq('code', code)
        .single();

      if (error || !data || !data.is_active) {
        return { valid: false };
      }

      return {
        valid: true,
        promotionId: data.promotion_id,
        eventId: data.event_id,
        followerId: data.follower_promotions?.follower_id,
        organizerId: data.follower_promotions?.organizer_id
      };

    } catch (error) {
      console.error('Failed to validate referral code:', error);
      return { valid: false };
    }
  }

  /**
   * Generate promotional images for social media
   */
  static async generatePromotionalImages(
    referralCode: ReferralCode,
    event: Event,
    platforms?: Array<'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'whatsapp'>
  ): Promise<{ success: boolean; images?: any[]; error?: string }> {
    try {
      const platformsToGenerate = platforms || ['instagram', 'facebook', 'twitter', 'linkedin', 'whatsapp'];
      const images = [];
      
      for (const platform of platformsToGenerate) {
        try {
          const image = await ImageGenerationService.generatePromotionalImage({
            event,
            platform,
            qrCodeUrl: referralCode.qr_code_url || undefined,
            referralCode: referralCode.code,
            includeQR: true,
            includeReferralCode: true,
            brandingText: 'All things Stepping. Get tickets at stepperslife.com'
          });
          
          images.push({
            platform,
            ...image
          });
        } catch (error) {
          console.error(`Failed to generate image for ${platform}:`, error);
        }
      }
      
      return {
        success: true,
        images
      };
    } catch (error) {
      console.error('Failed to generate promotional images:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Store referral click with UTM parameters
   */
  static async trackReferralClickWithUTM(
    referralCode: string,
    utmParams?: {
      source?: string
      medium?: string
      campaign?: string
      term?: string
      content?: string
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // First track the basic click
      const trackResult = await this.trackReferralClick(referralCode);
      
      if (!trackResult.success) {
        return trackResult;
      }
      
      // Store UTM parameters in a separate analytics table if they exist
      if (utmParams && Object.keys(utmParams).length > 0) {
        // This would require a new table for detailed analytics
        // For now, we'll just log it
        console.log('UTM Parameters tracked:', {
          referralCode,
          ...utmParams
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to track referral click with UTM:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}