import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { PayoutService } from '@/services/payoutService'
import { SellerPayout } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  CreditCard,
  Download
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface EarningsSummary {
  total_earned: number
  total_paid: number
  total_pending: number
}

export default function PayoutsDashboard() {
  const { user } = useAuth()
  const [payouts, setPayouts] = useState<SellerPayout[]>([])
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadSellerData()
    }
  }, [user])

  const loadSellerData = async () => {
    if (!user) return

    setLoading(true)
    try {
      const [payoutData, earningsData] = await Promise.all([
        PayoutService.getSellerPayouts(user.id),
        PayoutService.getSellerTotalEarnings(user.id)
      ])

      setPayouts(payoutData)
      setEarnings(earningsData)
    } catch (error) {
      console.error('Error loading seller data:', error)
      setError('Failed to load payout information')
    } finally {
      setLoading(false)
    }
  }

  const getPayoutMethodIcon = (method: string) => {
    switch (method) {
      case 'zelle':
      case 'cashapp':
      case 'venmo':
      case 'paypal':
        return <CreditCard className="h-4 w-4" />
      case 'cash':
        return <DollarSign className="h-4 w-4" />
      case 'check':
        return <Calendar className="h-4 w-4" />
      default:
        return <CreditCard className="h-4 w-4" />
    }
  }

  const getPayoutStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'cancelled':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatPaymentMethod = (method: string) => {
    const methods = {
      zelle: 'Zelle',
      cashapp: 'Cash App',
      venmo: 'Venmo',
      paypal: 'PayPal',
      check: 'Check',
      cash: 'Cash',
      other: 'Other'
    }
    return methods[method as keyof typeof methods] || method
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading your payouts...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Payouts</h1>
          <p className="text-muted-foreground">
            Track your earnings and payment history
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Earnings Summary */}
      {earnings && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Earned</p>
                  <p className="text-2xl font-bold">${earnings.total_earned.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                  <p className="text-2xl font-bold">${earnings.total_paid.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">${earnings.total_pending.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>
            Your payment history from event organizers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No Payouts Yet</h3>
              <p className="text-muted-foreground">
                Your payouts will appear here once event organizers process payments.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {payouts.map((payout, index) => (
                <div key={payout.id}>
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full">
                        {getPayoutMethodIcon(payout.payout_method)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{payout.event?.title}</p>
                          {getPayoutStatusBadge(payout.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {payout.organizer?.full_name} • {formatPaymentMethod(payout.payout_method)}
                        </p>
                        {payout.payout_reference && (
                          <p className="text-xs text-muted-foreground">
                            Ref: {payout.payout_reference}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">${payout.amount.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(payout.paid_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {payout.payout_notes && (
                    <div className="px-4 pb-4">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm text-muted-foreground">
                          <strong>Note:</strong> {payout.payout_notes}
                        </p>
                      </div>
                    </div>
                  )}
                  {index < payouts.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Information */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
          <CardDescription>
            How to get paid faster
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Commission Tracking</p>
                <p className="text-sm text-muted-foreground">
                  Your commissions are automatically tracked when customers purchase tickets using your referral codes.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-medium">Payment Processing</p>
                <p className="text-sm text-muted-foreground">
                  Event organizers can process payments at any time using their preferred method.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium">Payment Methods</p>
                <p className="text-sm text-muted-foreground">
                  Organizers can pay via Zelle, Cash App, Venmo, PayPal, check, or cash.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}