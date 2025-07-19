// Promotional Materials Generator Component
// Allows sellers to generate and download social media-optimized promotional images

import React, { useState, useEffect } from 'react'
import { Download, Image, Copy, Loader2, Share2, QrCode, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ReferralService, type ReferralCode } from '@/lib/services/ReferralService'
import { ImageGenerationService, type GeneratedImage } from '@/lib/services/ImageGenerationService'
import { SOCIAL_MEDIA_SIZES, getAllSizesForPlatform } from '@/lib/constants/socialMediaSizes'
import type { Event } from '@/types/database'

interface PromotionalMaterialsGeneratorProps {
  referralCode: ReferralCode
  event: Event
  platform?: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'whatsapp'
}

interface PlatformMaterials {
  platform: string
  message: string
  trackingUrl: string
  images: GeneratedImage[]
}

export function PromotionalMaterialsGenerator({ 
  referralCode, 
  event,
  platform 
}: PromotionalMaterialsGeneratorProps) {
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [materials, setMaterials] = useState<PlatformMaterials[]>([])
  const [selectedPlatform, setSelectedPlatform] = useState<string>(platform || 'instagram')
  const [copied, setCopied] = useState<{ [key: string]: boolean }>({})
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: boolean }>({})
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null)

  const platforms = ['instagram', 'facebook', 'twitter', 'linkedin', 'whatsapp']

  useEffect(() => {
    generateMaterials()
  }, [referralCode, event])

  const generateMaterials = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const platformMaterials: PlatformMaterials[] = []
      
      for (const plat of platforms) {
        const materials = ReferralService.generatePromotionalMaterials(
          referralCode,
          event.title,
          plat as 'facebook' | 'instagram' | 'twitter' | 'whatsapp' | 'email'
        )
        
        platformMaterials.push({
          platform: plat,
          message: materials.socialMediaPost,
          trackingUrl: materials.trackingUrl,
          images: []
        })
      }
      
      setMaterials(platformMaterials)
    } catch (err) {
      console.error('Failed to generate materials:', err)
      setError('Failed to generate promotional materials')
    } finally {
      setLoading(false)
    }
  }

  const generateImages = async (platform: string) => {
    setGenerating(true)
    setError(null)
    
    try {
      const result = await ReferralService.generatePromotionalImages(
        referralCode,
        event,
        [platform as 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'whatsapp']
      )
      
      if (result.success && result.images) {
        setMaterials(prev => prev.map(m => 
          m.platform === platform 
            ? { ...m, images: result.images! }
            : m
        ))
      }
    } catch (err) {
      console.error('Failed to generate images:', err)
      setError('Failed to generate images')
    } finally {
      setGenerating(false)
    }
  }

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(prev => ({ ...prev, [key]: true }))
      setTimeout(() => {
        setCopied(prev => ({ ...prev, [key]: false }))
      }, 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const downloadImage = async (image: GeneratedImage, filename: string) => {
    setDownloadProgress(prev => ({ ...prev, [filename]: true }))
    
    try {
      // Convert data URL to blob
      const blob = ImageGenerationService.dataURLtoBlob(image.url)
      const url = URL.createObjectURL(blob)
      
      // Create download link
      const link = document.createElement('a')
      link.href = url
      link.download = `${filename}-${image.platform}-${image.width}x${image.height}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download image:', err)
    } finally {
      setDownloadProgress(prev => ({ ...prev, [filename]: false }))
    }
  }

  const downloadAllImages = async (platform: string) => {
    const material = materials.find(m => m.platform === platform)
    if (!material?.images.length) return
    
    for (const image of material.images) {
      await downloadImage(image, `${event.title.replace(/\s+/g, '-')}-${referralCode.code}`)
      // Add delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  const currentMaterial = materials.find(m => m.platform === selectedPlatform)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600">Generating promotional materials...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Promotional Materials
          </CardTitle>
          <CardDescription>
            Ready-to-use content for promoting {event.title}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedPlatform} onValueChange={setSelectedPlatform}>
            <TabsList className="grid grid-cols-5 w-full">
              {platforms.map(plat => (
                <TabsTrigger key={plat} value={plat} className="capitalize">
                  {plat}
                </TabsTrigger>
              ))}
            </TabsList>

            {platforms.map(plat => (
              <TabsContent key={plat} value={plat} className="space-y-6 mt-6">
                {currentMaterial && currentMaterial.platform === plat && (
                  <>
                    {/* Message Section */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Social Media Post</Label>
                        <div className="relative">
                          <Textarea
                            value={currentMaterial.message}
                            readOnly
                            className="min-h-[120px] pr-12"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2"
                            onClick={() => copyToClipboard(currentMaterial.message, `${plat}-message`)}
                          >
                            {copied[`${plat}-message`] ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Tracking URL</Label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={currentMaterial.trackingUrl}
                            readOnly
                            className="flex-1 px-3 py-2 border rounded-md text-sm bg-gray-50"
                          />
                          <Button
                            size="sm"
                            onClick={() => copyToClipboard(currentMaterial.trackingUrl, `${plat}-url`)}
                          >
                            {copied[`${plat}-url`] ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge>Code: {referralCode.code}</Badge>
                        {referralCode.qr_code_url && (
                          <Badge variant="secondary">
                            <QrCode className="h-3 w-3 mr-1" />
                            QR Code Available
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Images Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Promotional Images</Label>
                        <div className="flex gap-2">
                          {!currentMaterial.images.length && (
                            <Button
                              size="sm"
                              onClick={() => generateImages(plat)}
                              disabled={generating}
                            >
                              {generating ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Image className="h-4 w-4 mr-2" />
                                  Generate Images
                                </>
                              )}
                            </Button>
                          )}
                          {currentMaterial.images.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadAllImages(plat)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download All
                            </Button>
                          )}
                        </div>
                      </div>

                      {currentMaterial.images.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {currentMaterial.images.map((image, index) => (
                            <div key={index} className="space-y-2">
                              <div 
                                className="relative group cursor-pointer overflow-hidden rounded-lg border"
                                onClick={() => setPreviewImage(image)}
                              >
                                <img
                                  src={image.url}
                                  alt={`${plat} promotional image`}
                                  className="w-full h-auto"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      downloadImage(image, `${event.title.replace(/\s+/g, '-')}-${referralCode.code}`)
                                    }}
                                  >
                                    {downloadProgress[`${event.title.replace(/\s+/g, '-')}-${referralCode.code}`] ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Download className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                              <p className="text-xs text-center text-gray-500">
                                {image.width} × {image.height}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 border-2 border-dashed rounded-lg">
                          <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-sm text-gray-600">
                            Click "Generate Images" to create promotional images for {plat}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
            <DialogDescription>
              {previewImage && `${previewImage.width} × ${previewImage.height} pixels`}
            </DialogDescription>
          </DialogHeader>
          {previewImage && (
            <div className="space-y-4">
              <img
                src={previewImage.url}
                alt="Full size preview"
                className="w-full h-auto rounded-lg"
              />
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    if (previewImage) {
                      downloadImage(previewImage, `${event.title.replace(/\s+/g, '-')}-${referralCode.code}`)
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}