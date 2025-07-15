import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { EventLikesService } from '@/services/eventLikesService'
import { Event } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Heart, Calendar, MapPin, User, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Link } from 'react-router-dom'

export default function LikedEvents() {
  const { user } = useAuth()
  const [likedEvents, setLikedEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadLikedEvents()
    }
  }, [user])

  const loadLikedEvents = async () => {
    if (!user) return

    setLoading(true)
    try {
      const events = await EventLikesService.getUserLikedEvents(user.id)
      setLikedEvents(events)
    } catch (error) {
      console.error('Error loading liked events:', error)
      setError('Failed to load liked events')
    } finally {
      setLoading(false)
    }
  }

  const handleUnlikeEvent = async (eventId: string) => {
    if (!user) return

    try {
      await EventLikesService.unlikeEvent(user.id, eventId)
      setLikedEvents(prev => prev.filter(event => event.id !== eventId))
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
            {likedEvents.length} event{likedEvents.length !== 1 ? 's' : ''} liked
          </span>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {likedEvents.length === 0 ? (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {likedEvents.map((event) => (
            <Card key={event.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative">
                {event.images?.hero && (
                  <img
                    src={event.images.hero}
                    alt={event.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-3 right-3 bg-white/90 hover:bg-white"
                  onClick={() => handleUnlikeEvent(event.id)}
                >
                  <Heart className="h-4 w-4 text-red-500 fill-current" />
                </Button>
              </div>

              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg line-clamp-2">{event.title}</CardTitle>
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
                  <Button asChild className="w-full">
                    <Link to={`/events/${event.id}`}>
                      View Event Details
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {likedEvents.length > 0 && (
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