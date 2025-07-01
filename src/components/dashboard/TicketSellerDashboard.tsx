// Ticket Seller Dashboard for followers with selling permissions
// Shows sales stats, referral codes, promotional materials, and earnings

import React, { useState, useEffect } from 'react'
import { DollarSign, ShoppingCart, TrendingUp, Link, QrCode, Download, Copy, ExternalLink, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ReferralService, ReferralStats } from '@/lib/services/ReferralService'
import { FollowerService } from '@/lib/services/FollowerService'

interface TicketSellerDashboardProps {
  userId: string
}

interface SellingPermission {
  organizer_id: string
  organizer_name: string
  commission_rate: number
  can_sell_tickets: boolean
}

interface ReferralCodeWithDetails {
  id: string
  code: string
  referralUrl: string
  qrCodeUrl: string
  organizerName: string
  eventTitle?: string
  stats: ReferralStats
}

export function TicketSellerDashboard({ userId }: TicketSellerDashboardProps) {
  const [sellingPermissions, setSellingPermissions] = useState<SellingPermission[]>([])
  const [referralCodes, setReferralCodes] = useState<ReferralCodeWithDetails[]>([])
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCode, setSelectedCode] = useState<ReferralCodeWithDetails | null>(null)
  const [showQRDialog, setShowQRDialog] = useState(false)

  useEffect(() => {
    loadSellerData()
  }, [userId])

  const loadSellerData = async () => {
    setLoading(true)
    setError(null)

    try {
      const permissions = await FollowerService.getUserSellingPermissions(userId)
      setSellingPermissions(permissions)

      // Load referral codes and stats for each permission
      // TODO: Implement ReferralService.getUserReferralCodes()
      const mockReferralCodes: ReferralCodeWithDetails[] = []
      setReferralCodes(mockReferralCodes)

      // Calculate total earnings
      const earnings = mockReferralCodes.reduce((sum, code) => sum + code.stats.totalCommissions, 0)
      setTotalEarnings(earnings)

    } catch (err) {
      console.error('Failed to load seller data:', err)
      setError('Failed to load seller data')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // TODO: Show toast notification
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const downloadQRCode = (qrCodeUrl: string, filename: string) => {
    const link = document.createElement('a')
    link.href = qrCodeUrl
    link.download = `${filename}-qr-code.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const generatePromotionalMaterials = (code: ReferralCodeWithDetails) => {
    return ReferralService.generatePromotionalMaterials(
      {
        id: code.id,
        promotion_id: '',
        event_id: null,
        code: code.code,
        qr_code_url: code.qrCodeUrl,
        referral_url: code.referralUrl,
        is_active: true,
        clicks_count: code.stats.clicks,
        conversions_count: code.stats.conversions,
        created_at: '',
        updated_at: ''
      },
      code.eventTitle
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading seller dashboard...</p>
        </div>
      </div>
    )
  }

  if (sellingPermissions.length === 0) {
    return (
      <div className="text-center py-8">
        <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No selling permissions</h3>
        <p className="text-gray-600">Ask event organizers to grant you ticket selling permissions to start earning commissions.</p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalEarnings.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {referralCodes.reduce((sum, code) => sum + code.stats.conversions, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Referrals</CardTitle>
            <Link className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralCodes.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Commission</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sellingPermissions.length > 0 
                ? (sellingPermissions.reduce((sum, p) => sum + p.commission_rate, 0) / sellingPermissions.length * 100).toFixed(1)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="referrals">Referral Codes</TabsTrigger>
          <TabsTrigger value="materials">Promotional Materials</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4">
            {/* Selling Permissions */}
            <Card>
              <CardHeader>
                <CardTitle>Your Selling Permissions</CardTitle>
                <CardDescription>
                  Event organizers who have granted you selling permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organizer</TableHead>
                      <TableHead>Commission Rate</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sellingPermissions.map((permission) => (
                      <TableRow key={permission.organizer_id}>
                        <TableCell className="font-medium">
                          {permission.organizer_name}
                        </TableCell>
                        <TableCell>
                          {(permission.commission_rate * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">Active</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="referrals">
          <Card>
            <CardHeader>
              <CardTitle>Referral Codes</CardTitle>
              <CardDescription>
                Your unique referral codes and their performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {referralCodes.length === 0 ? (
                <div className="text-center py-8">
                  <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No referral codes yet</h3>
                  <p className="text-gray-600">Generate referral codes to start selling tickets.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Organizer</TableHead>
                      <TableHead>Clicks</TableHead>
                      <TableHead>Sales</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referralCodes.map((code) => (
                      <TableRow key={code.id}>
                        <TableCell className="font-mono">{code.code}</TableCell>
                        <TableCell>{code.organizerName}</TableCell>
                        <TableCell>{code.stats.clicks}</TableCell>
                        <TableCell>{code.stats.conversions}</TableCell>
                        <TableCell>${code.stats.totalCommissions.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(code.referralUrl)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCode(code)
                                setShowQRDialog(true)
                              }}
                            >
                              <QrCode className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials">
          <Card>
            <CardHeader>
              <CardTitle>Promotional Materials</CardTitle>
              <CardDescription>
                Ready-to-use content for social media and marketing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {referralCodes.length === 0 ? (
                <div className="text-center py-8">
                  <Download className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No materials available</h3>
                  <p className="text-gray-600">Generate referral codes to access promotional materials.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {referralCodes.map((code) => {
                    const materials = generatePromotionalMaterials(code)
                    return (
                      <div key={code.id} className="border rounded-lg p-4">
                        <h4 className="font-medium mb-3">{code.organizerName} - {code.code}</h4>
                        
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor={`social-${code.id}`}>Social Media Post</Label>
                            <Textarea
                              id={`social-${code.id}`}
                              value={materials.socialMediaPost}
                              readOnly
                              className="mt-1"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2"
                              onClick={() => copyToClipboard(materials.socialMediaPost)}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                          </div>

                          <div>
                            <Label htmlFor={`email-${code.id}`}>Email Template</Label>
                            <Textarea
                              id={`email-${code.id}`}
                              value={materials.emailTemplate}
                              readOnly
                              rows={6}
                              className="mt-1"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2"
                              onClick={() => copyToClipboard(materials.emailTemplate)}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                          </div>

                          <div>
                            <Label htmlFor={`url-${code.id}`}>Referral URL</Label>
                            <div className="flex mt-1">
                              <Input
                                id={`url-${code.id}`}
                                value={materials.shortUrl}
                                readOnly
                                className="mr-2"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(materials.shortUrl)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code - {selectedCode?.code}</DialogTitle>
            <DialogDescription>
              Share this QR code for people to scan and access your referral link
            </DialogDescription>
          </DialogHeader>
          
          {selectedCode && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img 
                  src={selectedCode.qrCodeUrl} 
                  alt={`QR Code for ${selectedCode.code}`}
                  className="w-48 h-48 border rounded-lg"
                />
              </div>
              
              <div className="flex space-x-2">
                <Button
                  className="flex-1"
                  onClick={() => downloadQRCode(selectedCode.qrCodeUrl, selectedCode.code)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(selectedCode.referralUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}