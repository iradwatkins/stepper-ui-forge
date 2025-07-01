import { supabase } from './supabase'

export interface TwoFactorSetup {
  qr_code: string
  secret: string
  backup_codes: string[]
}

export class TwoFactorService {
  
  // Check if 2FA is enabled for user
  static async is2FAEnabled(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('two_factor_enabled')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error checking 2FA status:', error)
        return false
      }

      return data?.two_factor_enabled || false
    } catch (error) {
      console.error('Error in is2FAEnabled:', error)
      return false
    }
  }

  // Generate 2FA setup (QR code and backup codes)
  static async setup2FA(userId: string): Promise<TwoFactorSetup | null> {
    try {
      // In a real implementation, you would:
      // 1. Generate a secret key
      // 2. Create QR code for the secret
      // 3. Generate backup codes
      // 4. Store the secret securely (encrypted)

      // For demo purposes, we'll return mock data
      const secret = this.generateSecret()
      const qrCode = this.generateQRCode(userId, secret)
      const backupCodes = this.generateBackupCodes()

      return {
        qr_code: qrCode,
        secret: secret,
        backup_codes: backupCodes
      }
    } catch (error) {
      console.error('Error setting up 2FA:', error)
      return null
    }
  }

  // Enable 2FA after verification
  static async enable2FA(userId: string, verificationCode: string, secret: string): Promise<boolean> {
    try {
      // In a real implementation, you would verify the code against the secret
      const isValidCode = this.verifyTOTP(verificationCode, secret)
      
      if (!isValidCode) {
        return false
      }

      // Update profile to enable 2FA
      const { error } = await supabase
        .from('profiles')
        .update({ 
          two_factor_enabled: true,
          two_factor_secret: secret // In production, this should be encrypted
        })
        .eq('id', userId)

      if (error) {
        console.error('Error enabling 2FA:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in enable2FA:', error)
      return false
    }
  }

  // Disable 2FA
  static async disable2FA(userId: string, password: string): Promise<boolean> {
    try {
      // In a real implementation, you would verify the password first
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          two_factor_enabled: false,
          two_factor_secret: null
        })
        .eq('id', userId)

      if (error) {
        console.error('Error disabling 2FA:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in disable2FA:', error)
      return false
    }
  }

  // Verify TOTP code (simplified implementation)
  private static verifyTOTP(code: string, secret: string): boolean {
    // In a real implementation, you would use a proper TOTP library
    // like 'otplib' to verify the code against the secret
    
    // For demo purposes, accept any 6-digit code
    return /^\d{6}$/.test(code)
  }

  // Generate a random secret (simplified)
  private static generateSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    let result = ''
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  // Generate QR code URL (using Google Charts API for demo)
  private static generateQRCode(userId: string, secret: string): string {
    const issuer = 'SteppersLife'
    const label = `${issuer}:${userId}`
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`
    
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`
  }

  // Generate backup codes
  private static generateBackupCodes(): string[] {
    const codes = []
    for (let i = 0; i < 8; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase()
      codes.push(code)
    }
    return codes
  }

  // Generate new backup codes
  static async generateNewBackupCodes(userId: string): Promise<string[] | null> {
    try {
      const newCodes = this.generateBackupCodes()
      
      // In a real implementation, you would store these securely
      const { error } = await supabase
        .from('profiles')
        .update({ backup_codes: newCodes })
        .eq('id', userId)

      if (error) {
        console.error('Error generating backup codes:', error)
        return null
      }

      return newCodes
    } catch (error) {
      console.error('Error in generateNewBackupCodes:', error)
      return null
    }
  }
}