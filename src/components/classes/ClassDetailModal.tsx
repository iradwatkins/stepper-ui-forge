import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Clock, 
  Calendar, 
  DollarSign, 
  Users, 
  Star, 
  Heart,
  Share2,
  User,
  Phone,
  Mail,
  Info,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { SteppingClass, classService } from '@/services/classService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getDistanceText, LocationCoordinates } from '@/services/locationSearchService';

interface ClassDetailModalProps {
  classItem: SteppingClass | null;
  isOpen: boolean;
  onClose: () => void;
  userLocation?: LocationCoordinates | null;
}

export function ClassDetailModal({ classItem, isOpen, onClose, userLocation }: ClassDetailModalProps) {
  const { user, profile } = useAuth();
  const [registrationStatus, setRegistrationStatus] = useState<'none' | 'interested' | 'registered'>('none');
  const [loading, setLoading] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState(0);

  useEffect(() => {
    if (classItem) {
      setAttendeeCount(classItem.attendeeCount + classItem.interestedCount);
      // In a real app, you'd check if the current user is already registered
      setRegistrationStatus('none');
    }
  }, [classItem]);

  if (!classItem) return null;

  const handleRegistration = async (status: 'interested' | 'registered') => {
    if (!user || !profile) {
      toast.error('Please sign in to register for classes');
      return;
    }

    try {
      setLoading(true);
      
      await classService.registerForClass(
        classItem.id,
        user.id,
        status,
        profile.full_name || 'User',
        user.email || ''
      );

      setRegistrationStatus(status);
      setAttendeeCount(prev => prev + 1);
      
      toast.success(status === 'interested' 
        ? 'Added to your interest list!' 
        : 'Successfully registered for class!'
      );
      
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatSchedule = (schedule: SteppingClass['schedule']) => {
    const startDate = new Date(schedule.startDate);
    const endDate = schedule.endDate ? new Date(schedule.endDate) : null;
    
    let scheduleText = '';
    
    if (schedule.type === 'single') {
      scheduleText = `One-time on ${startDate.toLocaleDateString()}`;
    } else if (schedule.type === 'weekly' && schedule.daysOfWeek?.length) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const days = schedule.daysOfWeek.map(day => dayNames[day]).join(', ');
      scheduleText = `Weekly on ${days}`;
      if (endDate) {
        scheduleText += ` until ${endDate.toLocaleDateString()}`;
      }
    } else if (schedule.type === 'monthly') {
      scheduleText = `Monthly`;
      if (endDate) {
        scheduleText += ` until ${endDate.toLocaleDateString()}`;
      }
    }
    
    return scheduleText;
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const primaryImage = classItem.images.find(img => img.isPrimary)?.url || 
                      classItem.images[0]?.url || 
                      '/placeholder.svg';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{classItem.title}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Image */}
            <div className="relative rounded-lg overflow-hidden">
              <img 
                src={primaryImage}
                alt={classItem.title}
                className="w-full h-64 object-cover"
              />
              <div className="absolute top-4 left-4 flex gap-2">
                <Badge className="bg-green-600 text-white">
                  {classItem.level}
                </Badge>
                <Badge variant="outline" className="bg-white">
                  {classItem.category}
                </Badge>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold mb-3">About This Class</h3>
              <p className="text-muted-foreground leading-relaxed">
                {classItem.description}
              </p>
            </div>

            {/* Prerequisites & What to Bring */}
            {(classItem.prerequisites || classItem.whatToBring) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {classItem.prerequisites && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center">
                      <Info className="w-4 h-4 mr-2" />
                      Prerequisites
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {classItem.prerequisites}
                    </p>
                  </div>
                )}
                
                {classItem.whatToBring && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center">
                      <Info className="w-4 h-4 mr-2" />
                      What to Bring
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {classItem.whatToBring}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Extras */}
            {classItem.extras && (
              <div>
                <h4 className="font-semibold mb-2">Additional Information</h4>
                <p className="text-sm text-muted-foreground">
                  {classItem.extras}
                </p>
              </div>
            )}

            {/* Tags */}
            {classItem.tags.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {classItem.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Booking Info */}
          <div className="space-y-4">
            {/* Price & Registration */}
            <Card>
              <CardContent className="p-4">
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    ${classItem.price}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    per person
                  </div>
                </div>

                <div className="space-y-3">
                  {registrationStatus === 'none' ? (
                    <>
                      <Button 
                        onClick={() => handleRegistration('registered')}
                        disabled={loading}
                        className="w-full"
                        size="lg"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 mr-2" />
                        )}
                        Register Now
                      </Button>
                      
                      <Button 
                        onClick={() => handleRegistration('interested')}
                        disabled={loading}
                        variant="outline"
                        className="w-full"
                      >
                        <Heart className="w-4 h-4 mr-2" />
                        Mark as Interested
                      </Button>
                    </>
                  ) : (
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <Check className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="font-semibold text-green-700 dark:text-green-400">
                        {registrationStatus === 'registered' ? 'Registered!' : 'Interested!'}
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-500">
                        {registrationStatus === 'registered' 
                          ? 'You\'re signed up for this class'
                          : 'Added to your interest list'
                        }
                      </p>
                    </div>
                  )}
                </div>

                <Separator className="my-4" />

                {/* Class Stats */}
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold">{attendeeCount}</div>
                    <div className="text-xs text-muted-foreground">Interested</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold flex items-center justify-center">
                      {classItem.averageRating.toFixed(1)}
                      <Star className="w-4 h-4 ml-1 fill-yellow-400 text-yellow-400" />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {classItem.totalRatings} reviews
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Schedule Info */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="font-semibold flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule
                </h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span>{formatTime(classItem.schedule.time)} ({classItem.schedule.duration} min)</span>
                  </div>
                  
                  <div className="flex items-start">
                    <Calendar className="w-4 h-4 mr-2 mt-0.5 text-muted-foreground" />
                    <span>{formatSchedule(classItem.schedule)}</span>
                  </div>
                </div>

                {classItem.schedule.notes && (
                  <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                    <AlertCircle className="w-4 h-4 inline mr-1 text-blue-600" />
                    {classItem.schedule.notes}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location Info */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="font-semibold flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  Location
                </h4>
                
                {classItem.location.type === 'online' ? (
                  <div className="text-sm">
                    <p className="text-green-600 font-medium">Online Class</p>
                    <p className="text-muted-foreground">
                      Link will be provided after registration
                    </p>
                  </div>
                ) : (
                  <div className="text-sm space-y-1">
                    {classItem.location.venue && (
                      <p className="font-medium">{classItem.location.venue}</p>
                    )}
                    {classItem.location.address && (
                      <p className="text-muted-foreground">{classItem.location.address}</p>
                    )}
                    {classItem.location.city && classItem.location.state && (
                      <p className="text-muted-foreground">
                        {classItem.location.city}, {classItem.location.state}
                      </p>
                    )}
                    {userLocation && classItem.location.coordinates && (
                      <p className="text-blue-600 text-xs">
                        {getDistanceText(userLocation, classItem.location.coordinates)} away
                      </p>
                    )}
                  </div>
                )}

                {classItem.location.specialInstructions && (
                  <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm">
                    <Info className="w-4 h-4 inline mr-1 text-yellow-600" />
                    {classItem.location.specialInstructions}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instructor Info */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="font-semibold flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Instructor
                </h4>
                
                <div className="text-sm">
                  <p className="font-medium">{classItem.instructorName}</p>
                  
                  {classItem.contactInfo.email && (
                    <div className="flex items-center mt-2">
                      <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {classItem.contactInfo.email}
                      </span>
                    </div>
                  )}
                  
                  {classItem.contactInfo.phone && (
                    <div className="flex items-center mt-1">
                      <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {classItem.contactInfo.phone}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Share */}
            <Button variant="outline" className="w-full">
              <Share2 className="w-4 h-4 mr-2" />
              Share Class
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}