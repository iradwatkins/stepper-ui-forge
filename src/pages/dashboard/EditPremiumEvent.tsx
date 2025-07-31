import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Crown,
  ArrowLeft,
  Save,
  Loader2,
  Info,
  Building2,
  DollarSign,
  Users,
  BarChart3,
  CheckCircle,
  Eye
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { BasicInformation } from '@/components/create-event/BasicInformation'
import { TicketConfigurationWizard } from '@/components/create-event/TicketConfigurationWizard'
import PremiumSeatingManager from '@/components/seating/PremiumSeatingManager'
import { VenueService } from '@/lib/services/VenueService'
import { EventFormData } from '@/types/event-form'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { eventFormSchema } from '@/types/event-form'
import { useImageUpload } from '@/hooks/useImageUpload'

export default function EditPremiumEvent() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('basic')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [event, setEvent] = useState<any>(null)
  const [venue, setVenue] = useState<any>(null)
  const [ticketTypes, setTicketTypes] = useState<any[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    mode: 'onChange'
  })

  const {
    uploadedImages,
    setUploadedImages,
    handleImageUpload,
    removeImage
  } = useImageUpload()

  // Load event data
  useEffect(() => {
    const loadEvent = async () => {
      if (!id || !user?.id) return

      try {
        setIsLoading(true)

        // Load event
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .eq('owner_id', user.id)
          .single()

        if (eventError) throw eventError
        if (!eventData) throw new Error('Event not found')

        setEvent(eventData)

        // Set form values
        form.reset({
          title: eventData.title,
          description: eventData.description || '',
          organizationName: eventData.organization_name || '',
          venueName: eventData.venue_name || '',
          date: eventData.date,
          time: eventData.time,
          endDate: eventData.end_date || '',
          endTime: eventData.end_time || '',
          address: eventData.location || '',
          categories: eventData.categories || [],
          capacity: eventData.max_attendees,
          isPublic: eventData.is_public,
          tags: eventData.tags || [],
          timezone: eventData.timezone,
          images: eventData.images || {}
        })

        setSelectedCategories(eventData.categories || [])
        setUploadedImages(eventData.images || {})

        // Load venue if exists
        if (eventData.venue_layout_id) {
          const venueLayout = await VenueService.getVenueById(eventData.venue_layout_id)
          if (venueLayout) {
            setVenue(venueLayout)
          }
        }

        // Load ticket types
        const { data: tickets, error: ticketsError } = await supabase
          .from('ticket_types')
          .select('*')
          .eq('event_id', id)
          .order('price', { ascending: false })

        if (!ticketsError && tickets) {
          setTicketTypes(tickets.map(ticket => ({
            id: ticket.id,
            name: ticket.name,
            description: ticket.description || '',
            price: ticket.price,
            quantity: ticket.quantity,
            hasEarlyBird: !!ticket.early_bird_price,
            earlyBirdPrice: ticket.early_bird_price,
            earlyBirdUntil: ticket.early_bird_until
          })))
        }
      } catch (error) {
        console.error('Error loading event:', error)
        toast.error('Failed to load event')
        navigate('/dashboard/events/premium')
      } finally {
        setIsLoading(false)
      }
    }

    loadEvent()
  }, [id, user?.id, form, navigate, setUploadedImages])

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => {
      const isSelected = prev.includes(categoryId)
      if (isSelected) {
        return prev.filter(id => id !== categoryId)
      } else {
        return [...prev, categoryId]
      }
    })
  }

  const saveChanges = async () => {
    if (!event || !id) return

    setIsSaving(true)
    try {
      const formData = form.getValues()

      const updates = {
        title: formData.title,
        description: formData.description,
        organization_name: formData.organizationName,
        venue_name: formData.venueName || venue?.name || 'To Be Announced',
        date: formData.date,
        time: formData.time,
        end_date: formData.endDate || null,
        end_time: formData.endTime || null,
        location: formData.address || 'To Be Announced',
        categories: selectedCategories,
        tags: formData.tags || [],
        images: uploadedImages,
        timezone: formData.timezone
      }

      const { error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      toast.success('Event updated successfully')
    } catch (error) {
      console.error('Error saving event:', error)
      toast.error('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  const publishEvent = async () => {
    if (!id) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('events')
        .update({ status: 'published', is_public: true })
        .eq('id', id)

      if (error) throw error

      toast.success('Event published successfully!')
      navigate('/dashboard/events/premium')
    } catch (error) {
      console.error('Error publishing event:', error)
      toast.error('Failed to publish event')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Event not found</h2>
          <Button onClick={() => navigate('/dashboard/events/premium')}>
            Back to Premium Events
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard/events/premium')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Premium Events
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Crown className="h-8 w-8 text-purple-600" />
                Edit Premium Event
              </h1>
              <p className="text-muted-foreground mt-1">
                {event.title}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={event.status === 'published' ? 'default' : 'secondary'}>
                {event.status}
              </Badge>
              <Button
                variant="outline"
                onClick={() => window.open(`/events/${id}`, '_blank')}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              {event.status === 'draft' && (
                <Button
                  onClick={publishEvent}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Publish
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <Card>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start rounded-none border-b">
                <TabsTrigger value="basic" className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Basic Info
                </TabsTrigger>
                <TabsTrigger value="venue" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Venue
                </TabsTrigger>
                <TabsTrigger value="tickets" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Tickets
                </TabsTrigger>
                <TabsTrigger value="seating" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Seating
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </TabsTrigger>
              </TabsList>

              <div className="p-6">
                <TabsContent value="basic" className="mt-0">
                  <BasicInformation
                    form={form}
                    selectedCategories={selectedCategories}
                    onCategoryToggle={handleCategoryToggle}
                    uploadedImages={uploadedImages}
                    onImageUpload={handleImageUpload}
                    onRemoveImage={removeImage}
                    isProcessingImage={false}
                    eventType="premium"
                  />
                  <div className="mt-6 flex justify-end">
                    <Button onClick={saveChanges} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="venue" className="mt-0">
                  {venue ? (
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Current Venue</CardTitle>
                          <CardDescription>
                            This event is using the following venue layout
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-start gap-4">
                            {venue.imageUrl && (
                              <img
                                src={venue.imageUrl}
                                alt={venue.name}
                                className="w-32 h-24 object-cover rounded-lg"
                              />
                            )}
                            <div className="flex-1">
                              <h4 className="font-medium">{venue.name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {venue.description || 'No description'}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <span>{venue.capacity} seats</span>
                                <span>{venue.venueType}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          To change the venue for this event, you'll need to create a new event. 
                          Venue layouts cannot be changed after tickets have been configured.
                        </AlertDescription>
                      </Alert>
                    </div>
                  ) : (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        No venue selected for this event. Premium events work best with a venue layout.
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>

                <TabsContent value="tickets" className="mt-0">
                  <div className="space-y-6">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Ticket types cannot be modified after creation. You can only adjust quantities.
                      </AlertDescription>
                    </Alert>

                    <TicketConfigurationWizard
                      form={form}
                      eventType="premium"
                      initialTickets={ticketTypes}
                      onTicketsChange={setTicketTypes}
                      readOnly={true}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="seating" className="mt-0">
                  {venue?.imageUrl ? (
                    <div className="space-y-6">
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          View and manage your seating configuration. Changes are saved automatically.
                        </AlertDescription>
                      </Alert>

                      <PremiumSeatingManager
                        venueImageUrl={venue.imageUrl}
                        onSeatingConfigurationChange={() => {}}
                        initialSeats={venue.seats || []}
                        initialCategories={venue.priceCategories || []}
                        ticketTypes={ticketTypes}
                        startingTab="preview"
                        readOnly={event.status === 'published'}
                      />
                    </div>
                  ) : (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        No venue layout available. Seating configuration requires a venue with an uploaded layout image.
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>

                <TabsContent value="analytics" className="mt-0">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-6">
                          <div className="text-2xl font-bold">{venue?.capacity || 0}</div>
                          <p className="text-sm text-muted-foreground">Total Seats</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-6">
                          <div className="text-2xl font-bold">0</div>
                          <p className="text-sm text-muted-foreground">Tickets Sold</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-6">
                          <div className="text-2xl font-bold">$0</div>
                          <p className="text-sm text-muted-foreground">Total Revenue</p>
                        </CardContent>
                      </Card>
                    </div>

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Detailed analytics will be available once ticket sales begin.
                      </AlertDescription>
                    </Alert>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}