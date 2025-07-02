// Referral Service for generating unique codes/URLs and tracking sales attribution
// Handles referral code generation, QR codes, URL creation, and commission tracking

import { supabase } from '@/integrations/supabase/client'
import QRCode from 'qrcode'
import type { 
  ReferralCode, ReferralCodeInsert, ReferralCodeUpdate,
  CommissionEarning, CommissionEarningInsert
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
  static generatePromotionalMaterials(referralCode: ReferralCode, eventTitle?: string): {
    socialMediaPost: string
    emailTemplate: string
    shortUrl: string
  } {
    const eventText = eventTitle ? ` for ${eventTitle}` : '';
    
    return {
      socialMediaPost: `🎉 Get your tickets${eventText}! Use my link for exclusive access: ${referralCode.referral_url} #Events #Tickets`,
      
      emailTemplate: `Hi there!

I wanted to share this amazing event${eventText} with you. 

Get your tickets here: ${referralCode.referral_url}

Looking forward to seeing you there!

Best regards`,

      shortUrl: referralCode.referral_url
    };
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
}