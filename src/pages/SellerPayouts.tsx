import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { PayoutService, UnpaidCommissions, PayoutSummary } from '@/services/payoutService'
import { EventsService } from '@/lib/events-db'
import { SellerPayoutInsert, PayoutMethod, Event } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, DollarSign, Users, Calendar, CreditCard } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

const PAYOUT_METHODS: { value: PayoutMethod; label: string }[] = [
  { value: 'zelle', label: 'Zelle' },
  { value: 'cashapp', label: 'Cash App' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'check', label: 'Check' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
]

export default function SellerPayouts() {
  const { user } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [unpaidCommissions, setUnpaidCommissions] = useState<UnpaidCommissions[]>([])
  const [payoutSummary, setPayoutSummary] = useState<PayoutSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingPayout, setProcessingPayout] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Payout form state
  const [selectedSeller, setSelectedSeller] = useState<UnpaidCommissions | null>(null)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('cash')
  const [payoutReference, setPayoutReference] = useState('')
  const [payoutNotes, setPayoutNotes] = useState('')
  const [showPayoutDialog, setShowPayoutDialog] = useState(false)

  useEffect(() => {
    if (user) {
      loadOrganizerEvents()
      loadPayoutSummary()
    }
  }, [user])

  useEffect(() => {
    if (selectedEventId) {
      loadUnpaidCommissions()
    }
  }, [selectedEventId])

  const loadOrganizerEvents = async () => {
    try {
      const userEvents = await EventsService.getUserEvents(user!.id)
      setEvents(userEvents)
      if (userEvents.length > 0) {
        setSelectedEventId(userEvents[0].id)
      }
    } catch (error) {
      console.error('Error loading events:', error)
      setError('Failed to load events')
    }
  }

  const loadUnpaidCommissions = async () => {
    if (!selectedEventId || !user) return

    setLoading(true)
    try {
      const commissions = await PayoutService.getUnpaidCommissionsBySeller(
        selectedEventId,
        user.id
      )
      setUnpaidCommissions(commissions)
    } catch (error) {
      console.error('Error loading unpaid commissions:', error)
      setError('Failed to load unpaid commissions')
    } finally {
      setLoading(false)
    }
  }

  const loadPayoutSummary = async () => {
    if (!user) return

    try {
      const summary = await PayoutService.getPayoutSummary(user.id)
      setPayoutSummary(summary)
    } catch (error) {
      console.error('Error loading payout summary:', error)
    }
  }

  const handlePayoutClick = (seller: UnpaidCommissions) => {
    setSelectedSeller(seller)
    setPayoutAmount(seller.total_unpaid.toString())
    setPayoutReference('')
    setPayoutNotes('')
    setShowPayoutDialog(true)
  }

  const processPayout = async () => {
    if (!selectedSeller || !user || !selectedEventId) return

    setProcessingPayout(true)
    try {
      const payoutData: SellerPayoutInsert = {
        event_id: selectedEventId,
        organizer_id: user.id,
        seller_id: selectedSeller.seller_id,
        amount: parseFloat(payoutAmount),
        payout_method: payoutMethod,
        payout_reference: payoutReference || null,
        payout_notes: payoutNotes || null,
        commission_earnings_ids: selectedSeller.commission_ids,
        status: 'paid'
      }

      await PayoutService.createPayout(payoutData)
      
      // Refresh data
      await loadUnpaidCommissions()
      await loadPayoutSummary()
      
      setShowPayoutDialog(false)
      setSelectedSeller(null)
    } catch (error) {
      console.error('Error processing payout:', error)
      setError('Failed to process payout')
    } finally {
      setProcessingPayout(false)
    }
  }

  if (loading && events.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading seller payouts...</p>
          </div>
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No Events Found</h3>
              <p className="text-muted-foreground">You need to create events before managing seller payouts.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Seller Payouts</h1>
          <p className="text-muted-foreground">
            Manage payments to your ticket sellers
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      {payoutSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Total Paid</p>
                  <p className="text-2xl font-bold">${payoutSummary.total_paid.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-sm font-medium">Total Pending</p>
                  <p className="text-2xl font-bold">${payoutSummary.total_pending.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Total Sellers</p>
                  <p className="text-2xl font-bold">{payoutSummary.total_sellers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">Recent Payouts</p>
                  <p className="text-2xl font-bold">{payoutSummary.recent_payouts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Event Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Event</CardTitle>
          <CardDescription>
            Choose an event to view and manage seller payouts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an event" />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.title} - {new Date(event.date).toLocaleDateString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Unpaid Commissions */}
      {selectedEventId && (
        <Card>
          <CardHeader>
            <CardTitle>Unpaid Seller Commissions</CardTitle>
            <CardDescription>
              Sellers waiting for payment for this event
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading...</p>
              </div>
            ) : unpaidCommissions.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold">No Unpaid Commissions</h3>
                <p className="text-muted-foreground">
                  All sellers for this event have been paid, or no sales have been made yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {unpaidCommissions.map((seller) => (
                  <div
                    key={seller.seller_id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-semibold">{seller.seller_name}</p>
                          <p className="text-sm text-muted-foreground">{seller.seller_email}</p>
                        </div>
                        <Badge variant="secondary">
                          {seller.unpaid_count} sale{seller.unpaid_count !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold">${seller.total_unpaid.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">Amount Owed</p>
                      </div>
                      <Button onClick={() => handlePayoutClick(seller)}>
                        Pay Now
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payout Dialog */}
      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payout</DialogTitle>
            <DialogDescription>
              Record payment to {selectedSeller?.seller_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="method">Payment Method</Label>
              <Select value={payoutMethod} onValueChange={(value: PayoutMethod) => setPayoutMethod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYOUT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reference">Reference/Transaction ID (Optional)</Label>
              <Input
                id="reference"
                value={payoutReference}
                onChange={(e) => setPayoutReference(e.target.value)}
                placeholder="Transaction ID, check number, etc."
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={payoutNotes}
                onChange={(e) => setPayoutNotes(e.target.value)}
                placeholder="Additional notes about this payout..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayoutDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={processPayout} 
              disabled={!payoutAmount || processingPayout}
            >
              {processingPayout ? 'Processing...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}