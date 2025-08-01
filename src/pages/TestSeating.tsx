import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { SeatData } from '@/types/seating'
import CustomerSeatingChart from '@/components/seating/CustomerSeatingChart'
import { SeatingService } from '@/lib/services/SeatingService'
import { Crown, Calendar, Clock, MapPin, DollarSign } from 'lucide-react'

export default function TestSeating() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [eventId, setEventId] = useState<string | null>(null)
  const [venueImageUrl, setVenueImageUrl] = useState<string>('')
  const [isCreating, setIsCreating] = useState(false)
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [sessionId] = useState(() => SeatingService.getInstance().generateSessionId())

  const createDemoEvent = async () => {
    if (!user) {
      toast.error('Please sign in to create a test event')
      return
    }

    setIsCreating(true)
    try {
      // Create demo event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          title: 'Premium Gala Night - Test Event',
          description: 'An elegant evening of fine dining and entertainment featuring interactive table seating',
          date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
          time: '19:00',
          location: 'Grand Ballroom, Luxury Hotel',
          venue_name: 'Grand Ballroom',
          organization_name: 'Premium Events Inc.',
          owner_id: user.id,
          event_type: 'premium',
          max_attendees: 24,
          is_public: true,
          status: 'published',
          categories: ['Gala', 'Premium'],
          tags: ['test', 'demo', 'seating'],
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
        .select()
        .single()

      if (eventError) throw eventError

      // Create demo venue
      const { data: venue, error: venueError } = await supabase
        .from('venues')
        .insert({
          name: 'Grand Ballroom',
          address: '123 Luxury Ave',
          city: 'New York',
          state: 'NY',
          country: 'USA',
          postal_code: '10001',
          description: 'Elegant ballroom with table seating for premium events',
          capacity: 24,
          venue_type: 'conference',
          created_by: user.id
        })
        .select()
        .single()

      if (venueError) throw venueError

      // Create seating chart
      const { data: seatingChart, error: chartError } = await supabase
        .from('seating_charts')
        .insert({
          venue_id: venue.id,
          event_id: event.id,
          name: 'Main Floor',
          description: 'Premium table seating arrangement',
          chart_data: {
            layout: 'table-based',
            totalSeats: 24,
            tables: 6
          },
          total_seats: 24,
          is_active: true,
          created_by: user.id
        })
        .select()
        .single()

      if (chartError) throw chartError

      // Create seat categories
      const categories = [
        { name: 'VIP Table', color: '#FFD700', price: 100, isPremium: true },
        { name: 'Accessible Table', color: '#3B82F6', price: 100, isAccessible: true },
        { name: 'Regular Table', color: '#10B981', price: 75, isPremium: false }
      ]

      const categoryIds: { [key: string]: string } = {}
      
      for (const cat of categories) {
        const { data: category, error: catError } = await supabase
          .from('seat_categories')
          .insert({
            seating_chart_id: seatingChart.id,
            name: cat.name,
            color_code: cat.color,
            base_price: cat.price,
            is_premium: cat.isPremium || false,
            is_accessible: cat.isAccessible || false,
            sort_order: categories.indexOf(cat)
          })
          .select()
          .single()

        if (catError) throw catError
        categoryIds[cat.name] = category.id
      }

      // Create ticket types
      for (const cat of categories) {
        await supabase
          .from('ticket_types')
          .insert({
            event_id: event.id,
            name: cat.name,
            description: `${cat.name} seating with table service`,
            price: cat.price,
            quantity: 8, // 8 seats per category
            quantity_sold: 0,
            color: cat.color
          })
      }

      // Create seats with table groupings
      const tables = [
        { id: 'table-1', type: 'round', x: 25, y: 30, category: 'VIP Table', seats: 4 },
        { id: 'table-2', type: 'round', x: 75, y: 30, category: 'Accessible Table', seats: 2 },
        { id: 'table-3', type: 'round', x: 25, y: 50, category: 'Regular Table', seats: 4 },
        { id: 'table-4', type: 'round', x: 50, y: 50, category: 'Regular Table', seats: 4 },
        { id: 'table-5', type: 'round', x: 75, y: 50, category: 'Regular Table', seats: 4 },
        { id: 'table-6', type: 'round', x: 50, y: 70, category: 'Accessible Table', seats: 2 },
        { id: 'table-7', type: 'round', x: 25, y: 70, category: 'Regular Table', seats: 4 }
      ]

      const seatInserts = []
      let seatNumber = 1

      for (const table of tables) {
        const angleStep = (2 * Math.PI) / table.seats
        
        for (let i = 0; i < table.seats; i++) {
          const angle = i * angleStep
          const radius = 8 // Distance from table center
          const seatX = table.x + radius * Math.cos(angle)
          const seatY = table.y + radius * Math.sin(angle)

          seatInserts.push({
            seating_chart_id: seatingChart.id,
            seat_category_id: categoryIds[table.category],
            section: 'Main Floor',
            row_label: table.id.replace('table-', 'T'),
            seat_number: String(i + 1),
            seat_identifier: `T${table.id.split('-')[1]}-${i + 1}`,
            x_position: seatX,
            y_position: seatY,
            base_price: categories.find(c => c.name === table.category)?.price || 75,
            current_price: categories.find(c => c.name === table.category)?.price || 75,
            is_available: true,
            is_accessible: table.category === 'Accessible Table',
            is_premium: table.category === 'VIP Table',
            metadata: {
              tableId: table.id,
              tableType: table.type,
              tableCapacity: table.seats,
              amenities: table.category === 'VIP Table' ? ['Champagne Service', 'Priority Seating'] : []
            }
          })
          seatNumber++
        }
      }

      const { error: seatsError } = await supabase
        .from('seats')
        .insert(seatInserts)

      if (seatsError) throw seatsError

      setEventId(event.id)
      setVenueImageUrl('/images/venue-placeholder.jpg') // You can replace with actual venue image
      
      toast.success('Demo event created successfully!')
    } catch (error) {
      console.error('Error creating demo event:', error)
      toast.error('Failed to create demo event')
    } finally {
      setIsCreating(false)
    }
  }

  const handleSeatsSelected = (seats: SeatData[], totalPrice: number) => {
    console.log('Selected seats:', seats)
    console.log('Total price:', totalPrice)
  }

  const handlePurchase = () => {
    if (selectedSeats.length === 0) {
      toast.error('Please select at least one seat')
      return
    }

    toast.success(`${selectedSeats.length} seats selected. Ready for checkout!`)
    // In a real app, this would navigate to checkout with the selected seats
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Crown className="h-6 w-6 text-purple-600" />
                  Interactive Table Seating Test
                </CardTitle>
                <CardDescription className="mt-1">
                  Test the premium event table seating system with real-time seat selection
                </CardDescription>
              </div>
              <Button onClick={() => navigate('/')} variant="outline">
                Back to Home
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!eventId ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Click the button below to create a demo premium event with table seating
                </p>
                <Button onClick={createDemoEvent} disabled={isCreating} size="lg">
                  {isCreating ? 'Creating...' : 'Create Demo Event'}
                </Button>
                <div className="mt-4 text-sm text-muted-foreground">
                  This will create:
                  <ul className="mt-2 space-y-1">
                    <li>• 1 VIP table with 4 seats ($100/seat)</li>
                    <li>• 2 accessible tables with 2 seats each ($100/seat)</li>
                    <li>• 4 regular tables with 4 seats each ($75/seat)</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Event Info */}
                <div className="bg-muted rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">Premium Gala Night - Test Event</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>30 days from now</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>7:00 PM</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>Grand Ballroom</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>$75 - $100</span>
                    </div>
                  </div>
                </div>

                {/* Seating Chart */}
                <CustomerSeatingChart
                  eventId={eventId}
                  venueImageUrl={venueImageUrl}
                  onSeatsSelected={(seats) => setSelectedSeats(seats.map(s => s.id))}
                  onPurchaseClick={handlePurchase}
                  maxSeats={8}
                  sessionId={sessionId}
                />

                <div className="flex justify-center">
                  <Button 
                    onClick={handlePurchase} 
                    size="lg" 
                    disabled={selectedSeats.length === 0}
                    className="px-8"
                  >
                    Proceed to Checkout ({selectedSeats.length} seats)
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How to Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Click "Create Demo Event" to generate a test event with table seating</p>
            <p>2. Use the interactive seating chart to select individual seats or entire tables</p>
            <p>3. Selected seats are held for 15 minutes with a countdown timer</p>
            <p>4. Try the zoom controls and drag to pan around the venue</p>
            <p>5. Switch between "Individual Seats" and "Entire Tables" selection modes</p>
            <p>6. Use filters to find seats by section, price, or availability</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}