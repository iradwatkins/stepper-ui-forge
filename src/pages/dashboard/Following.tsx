import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Heart, 
  Search, 
  Users, 
  Calendar, 
  DollarSign,
  MapPin,
  Star,
  UserMinus,
  Bell,
  BellOff,
  Eye
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FollowerService } from '@/lib/services/FollowerService'
import { supabase } from '@/lib/supabase'
import { Link } from 'react-router-dom'

interface Organizer {
  id: string
  name: string
  email?: string
  avatar_url?: string
  bio?: string
  location?: string
  followers_count: number
  events_count: number
  total_revenue?: number
  commission_rate: number
  commission_type?: 'percentage' | 'fixed'
  commission_fixed_amount?: number
  following_since: string
  notifications_enabled: boolean
  can_sell_tickets: boolean
  can_work_events: boolean
  is_co_organizer: boolean
  upcoming_events: number
}

export default function Following() {
  const { user } = useAuth()
  const [organizers, setOrganizers] = useState<Organizer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadFollowingData()
  }, [])

  const loadFollowingData = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Get list of followed organizers
      const followedOrganizers = await FollowerService.getFollowedOrganizers(user.id)
      
      if (followedOrganizers.length === 0) {
        setOrganizers([])
        return
      }

      // Get permissions for each organizer
      const organizerIds = followedOrganizers.map(org => org.id)
      
      // Get additional data for each organizer in parallel
      const organizerPromises = organizerIds.map(async (organizerId) => {
        const [permissions, followData, followerCount, eventCount, upcomingEvents] = await Promise.all([
          // Get user permissions
          FollowerService.getUserPermissions(user.id, organizerId),
          
          // Get follow relationship data
          supabase
            .from('user_follows')
            .select('created_at')
            .eq('follower_id', user.id)
            .eq('organizer_id', organizerId)
            .single(),
          
          // Get follower count
          supabase
            .from('user_follows')
            .select('id', { count: 'exact', head: true })
            .eq('organizer_id', organizerId),
          
          // Get total events count
          supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('organizer_id', organizerId),
          
          // Get upcoming events count
          supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('organizer_id', organizerId)
            .gte('date', new Date().toISOString())
        ])

        const profile = followedOrganizers.find(org => org.id === organizerId)
        
        return {
          id: organizerId,
          name: profile?.full_name || profile?.organization || 'Unknown Organizer',
          email: profile?.email,
          avatar_url: profile?.avatar_url,
          bio: profile?.bio,
          location: profile?.location,
          followers_count: followerCount.count || 0,
          events_count: eventCount.count || 0,
          commission_rate: permissions.commission_rate,
          commission_type: permissions.commission_type,
          commission_fixed_amount: permissions.commission_fixed_amount,
          following_since: followData.data?.created_at || new Date().toISOString(),
          notifications_enabled: true, // TODO: Add notification preferences
          can_sell_tickets: permissions.can_sell_tickets,
          can_work_events: permissions.can_work_events,
          is_co_organizer: permissions.is_co_organizer,
          upcoming_events: upcomingEvents.count || 0
        } as Organizer
      })

      const organizersData = await Promise.all(organizerPromises)
      setOrganizers(organizersData)
    } catch (error) {
      console.error('Failed to load following data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleNotifications = async (organizerId: string) => {
    setOrganizers(prev => prev.map(org => 
      org.id === organizerId 
        ? { ...org, notifications_enabled: !org.notifications_enabled }
        : org
    ))
  }

  const unfollowOrganizer = async (organizerId: string) => {
    if (!user) return
    
    if (confirm('Are you sure you want to unfollow this organizer? You may lose selling privileges.')) {
      try {
        const result = await FollowerService.unfollowOrganizer(user.id, organizerId)
        if (result.success) {
          setOrganizers(prev => prev.filter(org => org.id !== organizerId))
        }
      } catch (error) {
        console.error('Failed to unfollow organizer:', error)
      }
    }
  }

  const filteredOrganizers = organizers.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.location?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalEarningPotential = organizers
    .filter(org => org.can_sell_tickets)
    .reduce((sum, org) => {
      if (org.commission_type === 'fixed') {
        return sum + (org.commission_fixed_amount || 0) * org.upcoming_events
      }
      return sum + (org.total_revenue || 0) * org.commission_rate
    }, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your followed organizers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Following</h1>
        <p className="text-muted-foreground">Organizers you follow and your selling opportunities</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Following</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizers.length}</div>
            <p className="text-xs text-muted-foreground">Event organizers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selling Access</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizers.filter(org => org.can_sell_tickets).length}</div>
            <p className="text-xs text-muted-foreground">Can sell tickets for</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizers.reduce((sum, org) => sum + org.upcoming_events, 0)}</div>
            <p className="text-xs text-muted-foreground">Events to promote</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Earning Potential</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Math.round(totalEarningPotential).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Based on past revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search organizers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Link to="/events">
          <Button variant="outline">
            <Users className="h-4 w-4 mr-2" />
            Discover Organizers
          </Button>
        </Link>
      </div>

      {/* Organizers List */}
      {filteredOrganizers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">No organizers found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Try adjusting your search terms' : 'Start following organizers to see them here'}
            </p>
            <Link to="/events">
              <Button>
                <Users className="h-4 w-4 mr-2" />
                Discover Organizers
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredOrganizers.map((organizer) => (
            <Card key={organizer.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={organizer.avatar_url} alt={organizer.name} />
                      <AvatarFallback>
                        {organizer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold">{organizer.name}</h3>
                        {organizer.can_sell_tickets && (
                          <Badge className="bg-green-100 text-green-800">Selling Enabled</Badge>
                        )}
                        {organizer.can_work_events && (
                          <Badge className="bg-blue-100 text-blue-800">Team Member</Badge>
                        )}
                        {organizer.is_co_organizer && (
                          <Badge className="bg-purple-100 text-purple-800">Co-Organizer</Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">{organizer.bio}</p>
                      
                      {organizer.location && (
                        <div className="flex items-center text-sm text-muted-foreground mb-3">
                          <MapPin className="h-4 w-4 mr-1" />
                          {organizer.location}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="font-medium">{organizer.followers_count.toLocaleString()}</p>
                          <p className="text-muted-foreground">Followers</p>
                        </div>
                        <div>
                          <p className="font-medium">{organizer.events_count}</p>
                          <p className="text-muted-foreground">Events</p>
                        </div>
                        <div>
                          <p className="font-medium">{organizer.upcoming_events}</p>
                          <p className="text-muted-foreground">Upcoming</p>
                        </div>
                        {organizer.can_sell_tickets && (
                          <div>
                            <p className="font-medium">
                              {organizer.commission_type === 'fixed' 
                                ? `$${organizer.commission_fixed_amount || 0}`
                                : `${(organizer.commission_rate * 100).toFixed(1)}%`
                              }
                            </p>
                            <p className="text-muted-foreground">Commission</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleNotifications(organizer.id)}
                    >
                      {organizer.notifications_enabled ? (
                        <Bell className="h-4 w-4" />
                      ) : (
                        <BellOff className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Calendar className="h-4 w-4 mr-2" />
                          View Events
                        </DropdownMenuItem>
                        {organizer.can_sell_tickets && (
                          <DropdownMenuItem>
                            <DollarSign className="h-4 w-4 mr-2" />
                            Generate Referral Code
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => unfollowOrganizer(organizer.id)}
                        >
                          <UserMinus className="h-4 w-4 mr-2" />
                          Unfollow
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
                  <span>Following since {new Date(organizer.following_since).toLocaleDateString()}</span>
                  <span>
                    Notifications: {organizer.notifications_enabled ? 'On' : 'Off'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}