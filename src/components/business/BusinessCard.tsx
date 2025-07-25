import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Star,
  Heart,
  Eye,
  Check,
  ExternalLink,
  MessageCircle,
  Calendar,
  Car,
  Laptop,
  Building,
  Clock
} from 'lucide-react';
import { CommunityBusiness, CommunityBusinessService } from '@/lib/services/CommunityBusinessService';
import { BusinessDetailModal } from './BusinessDetailModal';
import { getDistanceText, LocationCoordinates } from '@/services/locationSearchService';

interface BusinessCardProps {
  business: CommunityBusiness;
  userLocation?: LocationCoordinates | null;
  size?: 'default' | 'large';
  showContactButton?: boolean;
}

export function BusinessCard({ 
  business, 
  userLocation, 
  size = 'default',
  showContactButton = true 
}: BusinessCardProps) {
  const [showDetail, setShowDetail] = useState(false);

  const categoryLabels = CommunityBusinessService.getBusinessCategories();
  const categoryInfo = categoryLabels.find(cat => cat.value === business.category);

  const primaryImage = business.gallery_images?.[0] || 
                      business.cover_image_url || 
                      business.logo_url || 
                      '/placeholder.svg';

  const isLarge = size === 'large';

  const handleQuickContact = (e: React.MouseEvent, type: 'phone' | 'email' | 'website') => {
    e.stopPropagation();
    
    switch (type) {
      case 'phone':
        if (business.contact_phone) {
          window.open(`tel:${business.contact_phone}`);
        }
        break;
      case 'email':
        if (business.contact_email) {
          window.open(`mailto:${business.contact_email}`);
        }
        break;
      case 'website':
        if (business.website_url) {
          window.open(business.website_url, '_blank');
        }
        break;
    }
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 group">
        <div className="relative">
          <img 
            src={primaryImage}
            alt={business.business_name}
            className={`w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
              isLarge ? 'h-64' : 'h-48'
            }`}
          />
          
          {/* Overlay badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge className="bg-green-600 text-white">
              {categoryInfo?.label || business.category}
            </Badge>
            {business.is_verified && (
              <Badge className="bg-blue-600 text-white">
                <Check className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
            {business.featured && (
              <Badge className="bg-purple-600 text-white">
                Featured
              </Badge>
            )}
          </div>

          {/* Price/Rate display based on type */}
          <div className="absolute top-3 right-3">
            {business.business_type === 'service_provider' && business.hourly_rate ? (
              <Badge className="bg-black/70 text-white backdrop-blur-sm">
                ${business.hourly_rate}/{business.service_rate_type || 'hr'}
              </Badge>
            ) : business.price_range ? (
              <Badge className="bg-black/70 text-white backdrop-blur-sm">
                {business.price_range}
              </Badge>
            ) : null}
          </div>

          {/* Quick action overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
            <Button 
              onClick={() => setShowDetail(true)}
              variant="secondary"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm"
            >
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </Button>
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Title and Category */}
          <div>
            <h3 className={`font-bold text-gray-900 dark:text-gray-100 line-clamp-2 ${
              isLarge ? 'text-xl mb-2' : 'text-lg mb-1'
            }`}>
              {business.business_name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{categoryInfo?.description || business.subcategory || business.category}</span>
              {/* Business Type Icon */}
              <span className="flex items-center gap-1 text-xs">
                {business.business_type === 'physical_business' && <Building className="w-3 h-3" />}
                {business.business_type === 'service_provider' && <Calendar className="w-3 h-3" />}
                {business.business_type === 'mobile_service' && <Car className="w-3 h-3" />}
                {business.business_type === 'online_business' && <Laptop className="w-3 h-3" />}
                {business.business_type === 'venue' && <Building className="w-3 h-3" />}
                {CommunityBusinessService.getBusinessTypeLabel(business.business_type || 'physical_business')}
              </span>
            </div>
          </div>

          {/* Description */}
          <p className={`text-muted-foreground line-clamp-2 text-sm ${
            isLarge ? 'text-base' : ''
          }`}>
            {business.description}
          </p>

          {/* Location or Service Area */}
          <div className="flex items-center text-sm text-muted-foreground">
            {CommunityBusinessService.requiresPhysicalAddress(business.business_type || 'physical_business') ? (
              <>
                <MapPin className="w-4 h-4 mr-2" />
                <span className="flex-1">
                  {business.city}, {business.state}
                </span>
                {userLocation && business.latitude && business.longitude && (
                  <span className="text-blue-600 text-xs ml-2">
                    {getDistanceText(userLocation, { lat: business.latitude, lng: business.longitude })}
                  </span>
                )}
              </>
            ) : business.service_area_radius ? (
              <>
                <Car className="w-4 h-4 mr-2" />
                <span className="flex-1">
                  {business.service_area_radius} mile service area
                  {business.city && ` • ${business.city}, ${business.state}`}
                </span>
              </>
            ) : business.business_type === 'online_business' ? (
              <>
                <Laptop className="w-4 h-4 mr-2" />
                <span className="flex-1">Online Service</span>
              </>
            ) : null}
          </div>

          {/* Rating and Views */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              {business.rating_count > 0 ? (
                <div className="flex items-center text-muted-foreground">
                  <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                  <span>{business.rating_average?.toFixed(1)} ({business.rating_count})</span>
                </div>
              ) : (
                <span className="text-muted-foreground text-xs">No reviews yet</span>
              )}
              
              <div className="flex items-center text-muted-foreground">
                <Eye className="w-4 h-4 mr-1" />
                <span>{business.view_count}</span>
              </div>
            </div>
          </div>

          {/* Specialties/Tags or Service Offerings */}
          {(business.service_offerings && business.service_offerings.length > 0) ? (
            <div className="flex flex-wrap gap-1">
              {business.service_offerings.slice(0, 2).map((service, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {service}
                </Badge>
              ))}
              {business.service_offerings.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{business.service_offerings.length - 2} more services
                </Badge>
              )}
            </div>
          ) : business.specialties && business.specialties.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {business.specialties.slice(0, 2).map((specialty, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {specialty}
                </Badge>
              ))}
              {business.specialties.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{business.specialties.length - 2} more
                </Badge>
              )}
            </div>
          ) : null}
          
          {/* Online Booking Indicator */}
          {business.accepts_online_booking && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <Clock className="w-3 h-3 mr-1" />
              Online Booking Available
            </Badge>
          )}

          {/* Quick Contact Actions */}
          <div className="flex gap-2 pt-2">
            {showContactButton && (
              <Button 
                onClick={() => setShowDetail(true)}
                size="sm"
                className="flex-1"
              >
                {business.accepts_online_booking && <Calendar className="w-4 h-4 mr-2" />}
                {!business.accepts_online_booking && <MessageCircle className="w-4 h-4 mr-2" />}
                {business.business_type === 'service_provider' && business.accepts_online_booking ? 'Book Now' : 
                 business.business_type === 'service_provider' ? 'Request Quote' :
                 business.business_type === 'venue' ? 'Check Availability' :
                 business.business_type === 'online_business' ? 'Learn More' :
                 'Contact'}
              </Button>
            )}
            
            <div className="flex gap-1">
              {business.contact_phone && (
                <Button
                  onClick={(e) => handleQuickContact(e, 'phone')}
                  variant="outline"
                  size="sm"
                  className="p-2"
                  title="Call"
                >
                  <Phone className="w-4 h-4" />
                </Button>
              )}
              
              {business.contact_email && (
                <Button
                  onClick={(e) => handleQuickContact(e, 'email')}
                  variant="outline"
                  size="sm"
                  className="p-2"
                  title="Email"
                >
                  <Mail className="w-4 h-4" />
                </Button>
              )}
              
              {business.website_url && (
                <Button
                  onClick={(e) => handleQuickContact(e, 'website')}
                  variant="outline"
                  size="sm"
                  className="p-2"
                  title="Website"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <BusinessDetailModal
        business={business}
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        userLocation={userLocation}
      />
    </>
  );
}