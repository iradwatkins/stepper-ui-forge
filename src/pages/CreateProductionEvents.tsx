import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { CheckCircle, Loader2 } from 'lucide-react'

export default function CreateProductionEvents() {
  const { user } = useAuth()
  const [isCreating, setIsCreating] = useState(false)
  const [createdEvents, setCreatedEvents] = useState<string[]>([])

  const createEvents = async () => {
    if (!user) {
      toast.error('Please login to create events')
      return
    }

    setIsCreating(true)
    setCreatedEvents([])

    try {
      // Calculate dates
      const now = new Date()
      const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
      const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      const twoMonthsFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
      const threeMonthsFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

      // Event 1: Tech Conference
      const techConference = {
        title: 'Annual Tech Innovation Summit 2024',
        description: `Join us for the premier technology conference featuring industry leaders, innovative workshops, and networking opportunities. 

**Early Bird Special: Save up to 40% on tickets!**

Featured Speakers:
• AI and Machine Learning experts
• Cloud Architecture leaders
• Cybersecurity professionals
• Startup founders and VCs

What's Included:
• 2-day conference access
• Breakfast and lunch included
• Workshop materials
• Networking events
• Conference swag bag`,
        date: twoMonthsFromNow.toISOString().split('T')[0],
        time: '09:00',
        location: 'San Francisco Convention Center, 747 Howard St, San Francisco, CA 94103',
        venue: 'San Francisco Convention Center',
        type: 'ticketed' as const,
        status: 'published' as const,
        organizer_id: user.id,
        image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200',
        capacity: 1000,
        event_type: 'conference',
        tags: ['technology', 'innovation', 'networking', 'conference'],
        featured: true
      }

      const { data: event1, error: error1 } = await supabase
        .from('events')
        .insert(techConference)
        .select()
        .single()

      if (error1) throw error1
      setCreatedEvents(prev => [...prev, techConference.title])

      // Create ticket types for Tech Conference
      const techTickets = [
        {
          event_id: event1.id,
          name: 'VIP All-Access Pass',
          description: 'Premium experience with VIP lounge access, priority seating, exclusive speaker meet & greets',
          price: 899,
          early_bird_price: 549,
          early_bird_until: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          quantity: 100,
          sold_quantity: 12,
          max_per_person: 4,
          is_active: true
        },
        {
          event_id: event1.id,
          name: 'Professional Pass',
          description: 'Full conference access with workshop participation and networking events',
          price: 599,
          early_bird_price: 399,
          early_bird_until: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          quantity: 300,
          sold_quantity: 45,
          max_per_person: 6,
          is_active: true
        },
        {
          event_id: event1.id,
          name: 'Student Pass',
          description: 'Discounted access for students with valid ID (limited workshops)',
          price: 199,
          early_bird_price: 99,
          early_bird_until: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          quantity: 200,
          sold_quantity: 78,
          max_per_person: 2,
          is_active: true
        }
      ]

      await supabase.from('ticket_types').insert(techTickets)

      // Event 2: Music Festival
      const musicFestival = {
        title: 'Summer Vibes Music Festival 2024',
        description: `Experience the ultimate summer music festival featuring top artists across multiple genres!

**EARLY BIRD SALE: Up to 35% OFF - Limited Time Only!**

Lineup includes:
• 20+ Live Bands
• 3 Stages
• Local Food Vendors
• Art Installations
• VIP Areas

Gates open at 2 PM. All ages welcome. Rain or shine event.`,
        date: threeMonthsFromNow.toISOString().split('T')[0],
        time: '14:00',
        location: 'Golden Gate Park, San Francisco, CA 94117',
        venue: 'Golden Gate Park Amphitheater',
        type: 'ticketed' as const,
        status: 'published' as const,
        organizer_id: user.id,
        image_url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200',
        capacity: 5000,
        event_type: 'concert',
        tags: ['music', 'festival', 'outdoor', 'summer', 'concert'],
        featured: true
      }

      const { data: event2, error: error2 } = await supabase
        .from('events')
        .insert(musicFestival)
        .select()
        .single()

      if (error2) throw error2
      setCreatedEvents(prev => [...prev, musicFestival.title])

      // Create ticket types for Music Festival
      const musicTickets = [
        {
          event_id: event2.id,
          name: 'VIP Weekend Pass',
          description: 'VIP area access, complimentary drinks, exclusive viewing areas, private restrooms',
          price: 350,
          early_bird_price: 229,
          early_bird_until: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          quantity: 500,
          sold_quantity: 125,
          max_per_person: 8,
          is_active: true
        },
        {
          event_id: event2.id,
          name: 'General Admission',
          description: 'Full festival access to all stages and general areas',
          price: 150,
          early_bird_price: 99,
          early_bird_until: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          quantity: 3000,
          sold_quantity: 892,
          max_per_person: 10,
          is_active: true
        },
        {
          event_id: event2.id,
          name: 'Group Pass (4 people)',
          description: 'Discounted group rate for 4 general admission tickets',
          price: 520,
          early_bird_price: 360,
          early_bird_until: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          quantity: 250,
          sold_quantity: 67,
          max_per_person: 5,
          is_active: true
        }
      ]

      await supabase.from('ticket_types').insert(musicTickets)

      // Event 3: Food & Wine Festival
      const foodWineFestival = {
        title: 'Bay Area Food & Wine Festival',
        description: `Indulge in the finest culinary experiences with renowned chefs and premium wineries.

**Early Bird Special: Save 25% - Book Now!**

Experience includes:
• Tastings from 50+ restaurants
• Wine from 30+ premium wineries
• Cooking demonstrations
• Meet celebrity chefs
• Live entertainment

Must be 21+ with valid ID. Designated driver tickets available.`,
        date: oneMonthFromNow.toISOString().split('T')[0],
        time: '12:00',
        location: 'Fort Mason Center, 2 Marina Blvd, San Francisco, CA 94123',
        venue: 'Fort Mason Center',
        type: 'ticketed' as const,
        status: 'published' as const,
        organizer_id: user.id,
        image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200',
        capacity: 2000,
        event_type: 'festival',
        tags: ['food', 'wine', 'culinary', 'tasting'],
        featured: true
      }

      const { data: event3, error: error3 } = await supabase
        .from('events')
        .insert(foodWineFestival)
        .select()
        .single()

      if (error3) throw error3
      setCreatedEvents(prev => [...prev, foodWineFestival.title])

      // Create ticket types for Food & Wine Festival
      const foodWineTickets = [
        {
          event_id: event3.id,
          name: 'Grand Tasting VIP',
          description: 'Early entry at 11 AM, exclusive tastings, chef meet & greets, gift bag',
          price: 225,
          early_bird_price: 169,
          early_bird_until: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          quantity: 200,
          sold_quantity: 45,
          max_per_person: 6,
          is_active: true
        },
        {
          event_id: event3.id,
          name: 'General Tasting',
          description: 'Access to all tastings, demonstrations, and entertainment starting at noon',
          price: 125,
          early_bird_price: 95,
          early_bird_until: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          quantity: 1200,
          sold_quantity: 342,
          max_per_person: 8,
          is_active: true
        },
        {
          event_id: event3.id,
          name: 'Designated Driver',
          description: 'Non-alcoholic beverages, food tastings, and full event access',
          price: 65,
          early_bird_price: 49,
          early_bird_until: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          quantity: 300,
          sold_quantity: 28,
          max_per_person: 4,
          is_active: true
        }
      ]

      await supabase.from('ticket_types').insert(foodWineTickets)

      // Event 4: Comedy Show
      const comedyShow = {
        title: 'Stand-Up Comedy Spectacular',
        description: `An evening of non-stop laughter with nationally touring comedians!

**EARLY BIRD: Save $15 per ticket - This Week Only!**

Featuring:
• 4 Headlining Comedians
• Special Guest Appearances
• 2+ Hours of Entertainment

Bar service available. Must be 18+. Doors open 30 minutes before showtime.`,
        date: twoWeeksFromNow.toISOString().split('T')[0],
        time: '20:00',
        location: 'The Fillmore, 1805 Geary Blvd, San Francisco, CA 94115',
        venue: 'The Fillmore',
        type: 'ticketed' as const,
        status: 'published' as const,
        organizer_id: user.id,
        image_url: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=1200',
        capacity: 800,
        event_type: 'comedy',
        tags: ['comedy', 'entertainment', 'nightlife'],
        featured: true
      }

      const { data: event4, error: error4 } = await supabase
        .from('events')
        .insert(comedyShow)
        .select()
        .single()

      if (error4) throw error4
      setCreatedEvents(prev => [...prev, comedyShow.title])

      // Create ticket types for Comedy Show
      const comedyTickets = [
        {
          event_id: event4.id,
          name: 'Front Row VIP',
          description: 'Best seats in the house, meet & greet with comedians, complimentary drinks',
          price: 85,
          early_bird_price: 65,
          early_bird_until: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          quantity: 50,
          sold_quantity: 22,
          max_per_person: 4,
          is_active: true
        },
        {
          event_id: event4.id,
          name: 'Reserved Seating',
          description: 'Guaranteed seats in the main section',
          price: 55,
          early_bird_price: 40,
          early_bird_until: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          quantity: 300,
          sold_quantity: 156,
          max_per_person: 8,
          is_active: true
        },
        {
          event_id: event4.id,
          name: 'General Admission',
          description: 'First come, first served seating in back sections',
          price: 35,
          early_bird_price: 25,
          early_bird_until: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          quantity: 400,
          sold_quantity: 189,
          max_per_person: 10,
          is_active: true
        }
      ]

      await supabase.from('ticket_types').insert(comedyTickets)

      toast.success('Successfully created all production events with early bird pricing!')
    } catch (error) {
      console.error('Error creating events:', error)
      toast.error('Failed to create events: ' + (error as Error).message)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Create Production Events with Early Bird Pricing</CardTitle>
          <CardDescription>
            This will create 4 real events with active early bird specials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!user && (
            <Alert>
              <AlertDescription>
                Please login to create events. Only logged-in users can be event organizers.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <h3 className="font-semibold">Events to be created:</h3>
            <ul className="space-y-2 list-disc list-inside text-sm text-muted-foreground">
              <li>Tech Innovation Summit - 40% early bird discount (3 weeks)</li>
              <li>Summer Music Festival - 35% early bird discount (1 month)</li>
              <li>Food & Wine Festival - 25% early bird discount (10 days)</li>
              <li>Comedy Show - $15 off early bird (1 week)</li>
            </ul>
          </div>

          {createdEvents.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-green-600">Created Events:</h3>
              {createdEvents.map((event, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>{event}</span>
                </div>
              ))}
            </div>
          )}

          <Button 
            onClick={createEvents} 
            disabled={!user || isCreating}
            className="w-full"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Events...
              </>
            ) : (
              'Create Production Events'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}