import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { EventLikesService } from '@/services/eventLikesService'
import { Event, EventWithStats } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Heart, Calendar, MapPin, User, AlertCircle, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Link } from 'react-router-dom'
import { getEventImageUrl } from '@/lib/utils/imageUtils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

export default function LikedEvents() {
  const { user } = useAuth()
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [pastEvents, setPastEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPastEvents, setShowPastEvents] = useState(false)

  useEffect(() => {
    if (user) {
      loadLikedEvents()
    }
  }, [user])

  const loadLikedEvents = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { upcoming, past } = await EventLikesService.getUserLikedEventsCategorized(user.id)
      setUpcomingEvents(upcoming)
      setPastEvents(past)
    } catch (error) {
      console.error('Error loading liked events:', error)
      setError('Failed to load liked events')
    } finally {
      setLoading(false)
    }
  }

  const handleUnlikeEvent = async (eventId: string, isPast: boolean) => {
    if (!user) return

    try {
      await EventLikesService.unlikeEvent(user.id, eventId)
      if (isPast) {
        setPastEvents(prev => prev.filter(event => event.id !== eventId))
      } else {
        setUpcomingEvents(prev => prev.filter(event => event.id !== eventId))
      }
    } catch (error) {
      console.error('Error unliking event:', error)
      setError('Failed to unlike event')
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'premium':
        return 'bg-purple-100 text-purple-800'
      case 'ticketed':
        return 'bg-blue-100 text-blue-800'
      case 'simple':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const isPastEvent = (date: string) => {
    return new Date(date) < new Date()
  }

  const renderEventCard = (event: Event, isPast: boolean = false) => {
    const imageUrl = getEventImageUrl(event as EventWithStats, 'small');
    return (
      <Card key={event.id} className="overflow-hidden hover:shadow-md transition-shadow">
        <div className="relative">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={event.title}
              className={`w-full h-48 object-cover ${isPast ? 'opacity-75' : ''}`}
            />
          ) : (
            <div className={`w-full h-48 bg-muted flex items-center justify-center ${isPast ? 'opacity-75' : ''}`}>
              <span className="text-muted-foreground">No image</span>
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            className="absolute top-3 right-3 bg-white/90 hover:bg-white"
            onClick={() => handleUnlikeEvent(event.id, isPast)}
          >
            <Heart className="h-4 w-4 text-red-500 fill-current" />
          </Button>
          {isPast && (
            <Badge className="absolute bottom-3 left-3 bg-gray-900/90 text-white">
              <Clock className="h-3 w-3 mr-1" />
              Event Ended
            </Badge>
          )}
        </div>

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className={`text-lg line-clamp-2 ${isPast ? 'text-muted-foreground' : ''}`}>{event.title}</CardTitle>
            <Badge className={getEventTypeColor(event.event_type)}>
              {event.event_type}
            </Badge>
          </div>
          {event.description && (
            <CardDescription className="line-clamp-2">
              {event.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(event.date)} at {formatTime(event.time)}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="line-clamp-1">{event.location}</span>
          </div>

          {event.owner && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>by {event.owner.full_name}</span>
            </div>
          )}

          {event.categories && event.categories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {event.categories.slice(0, 3).map((category, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {category}
                </Badge>
              ))}
              {event.categories.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{event.categories.length - 3} more
                </Badge>
              )}
            </div>
          )}

          <div className="pt-2">
            <Button asChild className="w-full" variant={isPast ? "outline" : "default"}>
              <Link to={`/events/${event.id}`}>
                View Event Details
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading your liked events...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Liked Events</h1>
          <p className="text-muted-foreground">
            Events you've saved for later
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          <span className="text-sm text-muted-foreground">
            {upcomingEvents.length + pastEvents.length} event{upcomingEvents.length + pastEvents.length !== 1 ? 's' : ''} liked
          </span>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {upcomingEvents.length === 0 && pastEvents.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Liked Events Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start exploring events and save the ones you're interested in!
              </p>
              <Button asChild>
                <Link to="/events">Browse Events</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Events ({upcomingEvents.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingEvents.map((event) => renderEventCard(event, false))}
              </div>
            </div>
          )}

          {/* Past Events - Collapsible */}
          {pastEvents.length > 0 && (
            <Collapsible open={showPastEvents} onOpenChange={setShowPastEvents}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Past Events ({pastEvents.length})
                  </span>
                  {showPastEvents ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pastEvents.map((event) => renderEventCard(event, true))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* No Upcoming Events Message */}
          {upcomingEvents.length === 0 && pastEvents.length > 0 && (
            <Card>
              <CardContent className="p-8">
                <div className="text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Upcoming Events</h3>
                  <p className="text-muted-foreground mb-4">
                    All your liked events have ended. Find new events to attend!
                  </p>
                  <Button asChild>
                    <Link to="/events">Browse Events</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {(upcomingEvents.length > 0 || pastEvents.length > 0) && (
        <div className="text-center pt-8">
          <Button variant="outline" asChild>
            <Link to="/events">
              <Heart className="h-4 w-4 mr-2" />
              Discover More Events
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}