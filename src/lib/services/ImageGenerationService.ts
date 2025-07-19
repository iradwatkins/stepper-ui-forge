// Image Generation Service for creating promotional materials
// Generates social media-optimized images with event details and QR codes

import { SOCIAL_MEDIA_SIZES, getSizeForPlatform, type ImageSize } from '@/lib/constants/socialMediaSizes'
import type { Event } from '@/types/database'

export interface PromotionalImageOptions {
  event: Event
  qrCodeUrl?: string
  referralCode?: string
  platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'whatsapp'
  sizeKey?: string // Override default size for platform
  includeQR?: boolean
  includeReferralCode?: boolean
  brandingText?: string
}

export interface GeneratedImage {
  url: string
  width: number
  height: number
  platform: string
  sizeKey: string
}

export class ImageGenerationService {
  private static canvas: HTMLCanvasElement | null = null
  private static ctx: CanvasRenderingContext2D | null = null

  /**
   * Initialize canvas for server-side or client-side rendering
   */
  private static initCanvas(width: number, height: number): CanvasRenderingContext2D {
    if (typeof window !== 'undefined') {
      // Client-side
      this.canvas = document.createElement('canvas')
      this.canvas.width = width
      this.canvas.height = height
      this.ctx = this.canvas.getContext('2d')!
    } else {
      // Server-side would require node-canvas
      throw new Error('Server-side canvas not implemented')
    }
    return this.ctx
  }

  /**
   * Generate promotional image for a specific platform
   */
  static async generatePromotionalImage(options: PromotionalImageOptions): Promise<GeneratedImage> {
    const { event, platform, sizeKey, qrCodeUrl, referralCode, includeQR = true, includeReferralCode = true } = options
    
    // Get size for platform
    const size = sizeKey ? SOCIAL_MEDIA_SIZES[sizeKey] : getSizeForPlatform(platform)
    const ctx = this.initCanvas(size.width, size.height)
    
    // Clear canvas
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size.width, size.height)
    
    // Load and draw event image as background
    if (event.images && Array.isArray(event.images) && event.images.length > 0) {
      try {
        await this.drawEventImage(ctx, event.images[0], size)
      } catch (error) {
        console.error('Failed to load event image:', error)
        // Continue with gradient background as fallback
        this.drawGradientBackground(ctx, size)
      }
    } else {
      this.drawGradientBackground(ctx, size)
    }
    
    // Add overlay for text readability
    this.drawOverlay(ctx, size)
    
    // Draw event details
    this.drawEventDetails(ctx, event, size)
    
    // Draw QR code if provided
    if (includeQR && qrCodeUrl) {
      await this.drawQRCode(ctx, qrCodeUrl, size)
    }
    
    // Draw referral code if provided
    if (includeReferralCode && referralCode) {
      this.drawReferralCode(ctx, referralCode, size)
    }
    
    // Add branding
    this.drawBranding(ctx, size, options.brandingText)
    
    // Convert to data URL
    const dataUrl = this.canvas!.toDataURL('image/png')
    
    return {
      url: dataUrl,
      width: size.width,
      height: size.height,
      platform,
      sizeKey: sizeKey || platform.toUpperCase()
    }
  }

  /**
   * Generate images for multiple platforms
   */
  static async generateMultiplePlatformImages(
    event: Event,
    qrCodeUrl?: string,
    referralCode?: string
  ): Promise<GeneratedImage[]> {
    const platforms: Array<'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'whatsapp'> = [
      'instagram',
      'facebook', 
      'twitter',
      'linkedin',
      'whatsapp'
    ]
    
    const images: GeneratedImage[] = []
    
    for (const platform of platforms) {
      try {
        const image = await this.generatePromotionalImage({
          event,
          platform,
          qrCodeUrl,
          referralCode,
          includeQR: true,
          includeReferralCode: true
        })
        images.push(image)
      } catch (error) {
        console.error(`Failed to generate image for ${platform}:`, error)
      }
    }
    
    return images
  }

  /**
   * Draw event image as background
   */
  private static async drawEventImage(ctx: CanvasRenderingContext2D, imageUrl: string, size: ImageSize): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        // Calculate scaling to cover entire canvas
        const scale = Math.max(size.width / img.width, size.height / img.height)
        const scaledWidth = img.width * scale
        const scaledHeight = img.height * scale
        const x = (size.width - scaledWidth) / 2
        const y = (size.height - scaledHeight) / 2
        
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight)
        resolve()
      }
      
      img.onerror = reject
      img.src = imageUrl
    })
  }

  /**
   * Draw gradient background as fallback
   */
  private static drawGradientBackground(ctx: CanvasRenderingContext2D, size: ImageSize): void {
    const gradient = ctx.createLinearGradient(0, 0, size.width, size.height)
    gradient.addColorStop(0, '#7C3AED') // Purple
    gradient.addColorStop(1, '#DB2777') // Pink
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size.width, size.height)
  }

  /**
   * Draw semi-transparent overlay for text readability
   */
  private static drawOverlay(ctx: CanvasRenderingContext2D, size: ImageSize): void {
    const gradient = ctx.createLinearGradient(0, size.height * 0.4, 0, size.height)
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size.width, size.height)
  }

  /**
   * Draw event details
   */
  private static drawEventDetails(ctx: CanvasRenderingContext2D, event: Event, size: ImageSize): void {
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'left'
    
    // Event title
    const titleFontSize = Math.min(size.width * 0.06, 60)
    ctx.font = `bold ${titleFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
    
    const titleY = size.height * 0.65
    this.wrapText(ctx, event.title, size.width * 0.05, titleY, size.width * 0.9, titleFontSize * 1.2)
    
    // Event date and time
    const detailsFontSize = Math.min(size.width * 0.04, 32)
    ctx.font = `${detailsFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
    
    const dateStr = new Date(event.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    
    const detailsY = titleY + titleFontSize * 2
    ctx.fillText(`${dateStr} at ${event.time}`, size.width * 0.05, detailsY)
    
    // Location
    const locationY = detailsY + detailsFontSize * 1.5
    ctx.fillText(event.location, size.width * 0.05, locationY)
  }

  /**
   * Draw QR code
   */
  private static async drawQRCode(ctx: CanvasRenderingContext2D, qrCodeUrl: string, size: ImageSize): Promise<void> {
    const qrSize = Math.min(size.width * 0.2, 200)
    const qrX = size.width - qrSize - (size.width * 0.05)
    const qrY = size.height - qrSize - (size.height * 0.05)
    
    // White background for QR code
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20)
    
    // Draw QR code image
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        ctx.drawImage(img, qrX, qrY, qrSize, qrSize)
        resolve()
      }
      
      img.onerror = () => {
        // If QR code fails to load, just continue
        resolve()
      }
      
      img.src = qrCodeUrl
    })
  }

  /**
   * Draw referral code
   */
  private static drawReferralCode(ctx: CanvasRenderingContext2D, referralCode: string, size: ImageSize): void {
    const fontSize = Math.min(size.width * 0.035, 28)
    ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'left'
    
    const codeY = size.height - (size.height * 0.05)
    ctx.fillText(`Use code: ${referralCode}`, size.width * 0.05, codeY)
  }

  /**
   * Draw branding
   */
  private static drawBranding(ctx: CanvasRenderingContext2D, size: ImageSize, customText?: string): void {
    const fontSize = Math.min(size.width * 0.03, 24)
    ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    
    const brandingText = customText || 'All things Stepping. Get tickets at stepperslife.com'
    ctx.fillText(brandingText, size.width / 2, size.height * 0.05)
  }

  /**
   * Wrap text to fit within width
   */
  private static wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): void {
    const words = text.split(' ')
    let line = ''
    
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' '
      const metrics = ctx.measureText(testLine)
      const testWidth = metrics.width
      
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y)
        line = words[n] + ' '
        y += lineHeight
      } else {
        line = testLine
      }
    }
    ctx.fillText(line, x, y)
  }

  /**
   * Convert data URL to Blob for uploading
   */
  static dataURLtoBlob(dataURL: string): Blob {
    const parts = dataURL.split(',')
    const mime = parts[0].match(/:(.*?);/)![1]
    const bstr = atob(parts[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    
    return new Blob([u8arr], { type: mime })
  }
}