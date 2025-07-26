import { supabase } from './supabase'
import { authenticator } from 'otplib'
import CryptoJS from 'crypto-js'

export interface TwoFactorSetup {
  qr_code: string
  secret: string
  backup_codes: string[]
}

/**
 * Secure 2FA Service with proper TOTP validation and encryption
 * Fixes critical security vulnerability where any 6-digit code was accepted
 */

export class TwoFactorService {
  // Use environment variable for encryption key in production
  private static readonly ENCRYPTION_KEY = process.env.VITE_2FA_ENCRYPTION_KEY || 'default-dev-key-change-in-production'
  
  /**
   * Encrypt a secret for database storage
   */
  private static encryptSecret(secret: string): string {
    return CryptoJS.AES.encrypt(secret, this.ENCRYPTION_KEY).toString()
  }
  
  /**
   * Decrypt a secret from database storage
   */
  private static decryptSecret(encryptedSecret: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedSecret, this.ENCRYPTION_KEY)
    return bytes.toString(CryptoJS.enc.Utf8)
  }
  
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
      // Generate a cryptographically secure secret
      const secret = authenticator.generateSecret()
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
      // SECURITY FIX: Properly verify the TOTP code against the secret
      const isValidCode = this.verifyTOTP(verificationCode, secret)
      
      if (!isValidCode) {
        return false
      }

      // SECURITY FIX: Encrypt the secret before storing in database
      const encryptedSecret = this.encryptSecret(secret)
      
      // Update profile to enable 2FA with encrypted secret
      const { error } = await supabase
        .from('profiles')
        .update({ 
          two_factor_enabled: true,
          two_factor_secret: encryptedSecret
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

  // SECURITY FIX: Proper TOTP verification using otplib
  private static verifyTOTP(code: string, secret: string): boolean {
    try {
      // Use proper TOTP verification with time window tolerance
      return authenticator.verify({ 
        token: code, 
        secret: secret,
        window: 2  // Allow 2 time steps before/after current (60 seconds tolerance)
      })
    } catch (error) {
      console.error('Error verifying TOTP:', error)
      return false
    }
  }

  // Note: We now use authenticator.generateSecret() for cryptographically secure secrets

  // Generate QR code URL using proper otpauth URL generation
  private static generateQRCode(userId: string, secret: string): string {
    const issuer = 'SteppersLife'
    const label = `${issuer}:${userId}`
    
    // Use otplib to generate proper otpauth URL
    const otpauthUrl = authenticator.keyuri(userId, issuer, secret)
    
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`
  }

  // Generate secure backup codes
  private static generateBackupCodes(): string[] {
    const codes = []
    for (let i = 0; i < 8; i++) {
      // Generate cryptographically secure random backup codes
      const code = CryptoJS.lib.WordArray.random(4).toString().substring(0, 8).toUpperCase()
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

  /**
   * NEW: Biometric Authentication Support
   * Supports fingerprint, facial recognition, and device fingerprinting
   */
  
  /**
   * Verify user with biometric authentication (WebAuthn)
   */
  static async verifyBiometric(userId: string): Promise<boolean> {
    try {
      // Check if WebAuthn is supported
      if (!window.navigator.credentials || !window.PublicKeyCredential) {
        console.warn('WebAuthn not supported in this browser')
        return false
      }

      // Get stored credential for user
      const { data: profile } = await supabase
        .from('profiles')
        .select('biometric_credential_id')
        .eq('id', userId)
        .single()

      if (!profile?.biometric_credential_id) {
        return false
      }

      // Create authentication request
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32), // In production, get from server
          allowCredentials: [{
            id: new Uint8Array(Buffer.from(profile.biometric_credential_id, 'base64')),
            type: 'public-key'
          }],
          userVerification: 'required',
          timeout: 60000
        }
      }) as PublicKeyCredential

      // Verify the credential (simplified - should verify signature on server)
      return credential !== null
    } catch (error) {
      console.error('Biometric verification failed:', error)
      return false
    }
  }

  /**
   * Register biometric authentication for user
   */
  static async registerBiometric(userId: string, userEmail: string): Promise<boolean> {
    try {
      if (!window.navigator.credentials || !window.PublicKeyCredential) {
        throw new Error('WebAuthn not supported')
      }

      // Create registration request
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: { name: 'SteppersLife' },
          user: {
            id: new Uint8Array(Buffer.from(userId)),
            name: userEmail,
            displayName: userEmail
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform', // Built-in authenticators (TouchID, FaceID, Windows Hello)
            userVerification: 'required'
          },
          timeout: 60000
        }
      }) as PublicKeyCredential

      if (!credential) {
        return false
      }

      // Store credential ID for user
      const credentialId = Buffer.from(credential.rawId).toString('base64')
      const { error } = await supabase
        .from('profiles')
        .update({ biometric_credential_id: credentialId })
        .eq('id', userId)

      return !error
    } catch (error) {
      console.error('Biometric registration failed:', error)
      return false
    }
  }

  /**
   * Generate device fingerprint for additional security
   */
  static generateDeviceFingerprint(): string {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx!.textBaseline = 'top'
    ctx!.font = '14px Arial'
    ctx!.fillText('Device fingerprint', 2, 2)
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency,
      canvas.toDataURL()
    ].join('|')
    
    return CryptoJS.SHA256(fingerprint).toString()
  }

  /**
   * Comprehensive authentication verification
   * Supports TOTP, biometric, and device fingerprinting
   */
  static async verifyAuthentication(
    userId: string, 
    code?: string,
    allowBiometric: boolean = true,
    requireDeviceFingerprint: boolean = false
  ): Promise<{ success: boolean; method: string; deviceTrusted: boolean }> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('two_factor_enabled, two_factor_secret, biometric_credential_id, trusted_devices')
        .eq('id', userId)
        .single()

      if (!profile) {
        return { success: false, method: 'none', deviceTrusted: false }
      }

      // Check device fingerprint
      const deviceFingerprint = this.generateDeviceFingerprint()
      const trustedDevices = profile.trusted_devices || []
      const deviceTrusted = trustedDevices.includes(deviceFingerprint)

      // If device fingerprinting is required and device is not trusted
      if (requireDeviceFingerprint && !deviceTrusted) {
        return { success: false, method: 'device_untrusted', deviceTrusted: false }
      }

      // Try biometric first if available and allowed
      if (allowBiometric && profile.biometric_credential_id) {
        const biometricSuccess = await this.verifyBiometric(userId)
        if (biometricSuccess) {
          return { success: true, method: 'biometric', deviceTrusted }
        }
      }

      // Fall back to TOTP if 2FA is enabled
      if (profile.two_factor_enabled && profile.two_factor_secret && code) {
        const decryptedSecret = this.decryptSecret(profile.two_factor_secret)
        const totpSuccess = this.verifyTOTP(code, decryptedSecret)
        if (totpSuccess) {
          return { success: true, method: 'totp', deviceTrusted }
        }
      }

      return { success: false, method: 'failed', deviceTrusted }
    } catch (error) {
      console.error('Authentication verification failed:', error)
      return { success: false, method: 'error', deviceTrusted: false }
    }
  }

  /**
   * Trust current device for future authentications
   */
  static async trustDevice(userId: string): Promise<boolean> {
    try {
      const deviceFingerprint = this.generateDeviceFingerprint()
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('trusted_devices')
        .eq('id', userId)
        .single()

      const trustedDevices = profile?.trusted_devices || []
      if (!trustedDevices.includes(deviceFingerprint)) {
        trustedDevices.push(deviceFingerprint)
        
        const { error } = await supabase
          .from('profiles')
          .update({ trusted_devices: trustedDevices })
          .eq('id', userId)
        
        return !error
      }
      
      return true
    } catch (error) {
      console.error('Error trusting device:', error)
      return false
    }
  }
}