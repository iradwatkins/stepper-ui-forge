import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Clock, 
  Calendar, 
  DollarSign, 
  Users, 
  Star,
  User,
  Globe,
  Heart,
  Eye,
  Edit
} from 'lucide-react';
import { SteppingClass } from '@/services/classService';
import { ClassDetailModal } from './ClassDetailModal';
import { ClassRegistrationButton } from './ClassRegistrationButton';
import { getDistanceText, LocationCoordinates } from '@/services/locationSearchService';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface ClassCardProps {
  classItem: SteppingClass;
  userLocation?: LocationCoordinates | null;
  size?: 'default' | 'large';
  showRegistration?: boolean;
}

export function ClassCard({ 
  classItem, 
  userLocation, 
  size = 'default',
  showRegistration = true 
}: ClassCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const canEdit = user?.id === classItem.instructorId || user?.email?.includes('admin');

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatSchedule = (schedule: SteppingClass['schedule']) => {
    if (schedule.type === 'single') {
      const date = new Date(schedule.startDate);
      return `${date.toLocaleDateString()}`;
    } else if (schedule.type === 'weekly' && schedule.daysOfWeek?.length) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const days = schedule.daysOfWeek.map(day => dayNames[day]).join(', ');
      return `${days}`;
    }
    return 'Custom Schedule';
  };

  const primaryImage = classItem.images.find(img => img.isPrimary)?.url || 
                      classItem.images[0]?.url || 
                      '/placeholder.svg';

  const isLarge = size === 'large';

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 group">
        <div className="relative">
          <img 
            src={primaryImage}
            alt={classItem.title}
            className={`w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
              isLarge ? 'h-64' : 'h-48'
            }`}
          />
          
          {/* Overlay badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge className="bg-green-600 text-white">
              {classItem.level}
            </Badge>
            <Badge variant="outline" className="bg-white/90 backdrop-blur-sm">
              {classItem.category}
            </Badge>
          </div>

          {/* Price badge */}
          <div className="absolute top-3 right-3">
            <Badge className="bg-black/70 text-white backdrop-blur-sm">
              <DollarSign className="w-3 h-3 mr-1" />
              {classItem.price}
            </Badge>
          </div>

          {/* Quick action overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center gap-2">
            <Button 
              onClick={() => setShowDetail(true)}
              variant="secondary"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm"
            >
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </Button>
            {canEdit && (
              <Button 
                onClick={() => navigate(`/edit-class/${classItem.id}`)}
                variant="secondary"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Title and Instructor */}
          <div>
            <h3 className={`font-bold text-gray-900 dark:text-gray-100 line-clamp-2 ${
              isLarge ? 'text-xl mb-2' : 'text-lg mb-1'
            }`}>
              {classItem.title}
            </h3>
            <div className="flex items-center text-sm text-muted-foreground">
              <User className="w-4 h-4 mr-1" />
              {classItem.instructorName}
            </div>
          </div>

          {/* Description */}
          <p className={`text-muted-foreground line-clamp-2 text-sm ${
            isLarge ? 'text-base' : ''
          }`}>
            {classItem.description}
          </p>

          {/* Schedule & Location */}
          <div className="space-y-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{formatSchedule(classItem.schedule)}</span>
              <Clock className="w-4 h-4 ml-4 mr-1" />
              <span>{formatTime(classItem.schedule.time)}</span>
            </div>
            
            <div className="flex items-center text-sm text-muted-foreground">
              {classItem.location.type === 'online' ? (
                <>
                  <Globe className="w-4 h-4 mr-2" />
                  <span>Online Class</span>
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 mr-2" />
                  <span className="flex-1">
                    {classItem.location.city}, {classItem.location.state}
                  </span>
                  {userLocation && classItem.location.coordinates && (
                    <span className="text-blue-600 text-xs ml-2">
                      {getDistanceText(userLocation, classItem.location.coordinates)}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-muted-foreground">
                <Users className="w-4 h-4 mr-1" />
                <span>{classItem.attendeeCount + classItem.interestedCount}</span>
              </div>
              
              {classItem.totalRatings > 0 && (
                <div className="flex items-center text-muted-foreground">
                  <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                  <span>{classItem.averageRating.toFixed(1)} ({classItem.totalRatings})</span>
                </div>
              )}
            </div>

            <Badge variant="secondary" className="text-xs">
              {classItem.classType}
            </Badge>
          </div>

          {/* Tags */}
          {classItem.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {classItem.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {classItem.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{classItem.tags.length - 3} more
                </Badge>
              )}
            </div>
          )}

          {/* Registration Button */}
          {showRegistration && (
            <div className="pt-2">
              <ClassRegistrationButton 
                classItem={classItem}
                size="sm"
                showInterested={true}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <ClassDetailModal
        classItem={classItem}
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        userLocation={userLocation}
      />
    </>
  );
}