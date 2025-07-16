import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Star, 
  Heart,
  Share2,
  Clock,
  DollarSign,
  MessageCircle,
  ExternalLink,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Check,
  Loader2,
  User,
  Send
} from 'lucide-react';
import { CommunityBusiness, CommunityBusinessService } from '@/lib/services/CommunityBusinessService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getDistanceText, LocationCoordinates } from '@/services/locationSearchService';

interface BusinessDetailModalProps {
  business: CommunityBusiness | null;
  isOpen: boolean;
  onClose: () => void;
  userLocation?: LocationCoordinates | null;
}

export function BusinessDetailModal({ business, isOpen, onClose, userLocation }: BusinessDetailModalProps) {
  const { user, profile } = useAuth();
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactFormData, setContactFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    inquiryType: 'general'
  });
  const [submittingContact, setSubmittingContact] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    if (business && user && profile) {
      setContactFormData(prev => ({
        ...prev,
        name: profile.full_name || '',
        email: user.email || ''
      }));
    }
  }, [business, user, profile]);

  useEffect(() => {
    if (business && isOpen) {
      loadReviews();
    }
  }, [business, isOpen]);

  const loadReviews = async () => {
    if (!business) return;
    
    try {
      setLoadingReviews(true);
      const businessReviews = await CommunityBusinessService.getBusinessReviews(business.id);
      setReviews(businessReviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    if (!contactFormData.name || !contactFormData.email || !contactFormData.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmittingContact(true);
      
      await CommunityBusinessService.createInquiry({
        business_id: business.id,
        inquirer_email: contactFormData.email,
        inquirer_name: contactFormData.name,
        inquirer_phone: contactFormData.phone,
        subject: contactFormData.subject,
        message: contactFormData.message,
        inquiry_type: contactFormData.inquiryType,
        status: 'new'
      });

      toast.success('Message sent successfully!');
      setShowContactForm(false);
      setContactFormData(prev => ({
        ...prev,
        subject: '',
        message: '',
        phone: ''
      }));
      
    } catch (error) {
      console.error('Contact error:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSubmittingContact(false);
    }
  };

  if (!business) return null;

  const formatBusinessHours = (hours: any) => {
    if (!hours) return 'Hours not specified';
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    return days.map((day, index) => {
      const dayHours = hours[day];
      if (!dayHours || dayHours.closed) {
        return `${dayNames[index]}: Closed`;
      }
      return `${dayNames[index]}: ${dayHours.open} - ${dayHours.close}`;
    }).join(', ');
  };

  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook': return <Facebook className="w-4 h-4" />;
      case 'instagram': return <Instagram className="w-4 h-4" />;
      case 'twitter': return <Twitter className="w-4 h-4" />;
      case 'linkedin': return <Linkedin className="w-4 h-4" />;
      default: return <ExternalLink className="w-4 h-4" />;
    }
  };

  const categoryLabels = CommunityBusinessService.getBusinessCategories();
  const categoryInfo = categoryLabels.find(cat => cat.value === business.category);

  const primaryImage = business.gallery_images?.[0] || business.cover_image_url || '/placeholder.svg';
  const galleryImages = business.gallery_images?.slice(0, 4) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{business.business_name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Image */}
            <div className="relative rounded-lg overflow-hidden">
              <img 
                src={primaryImage}
                alt={business.business_name}
                className="w-full h-64 object-cover"
              />
              <div className="absolute top-4 left-4 flex gap-2">
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
              {business.price_range && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-black/70 text-white backdrop-blur-sm">
                    <DollarSign className="w-3 h-3 mr-1" />
                    {business.price_range}
                  </Badge>
                </div>
              )}
            </div>

            {/* Gallery */}
            {galleryImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {galleryImages.slice(1).map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`${business.business_name} gallery ${index + 1}`}
                    className="w-full h-20 object-cover rounded"
                  />
                ))}
              </div>
            )}

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold mb-3">About</h3>
              <p className="text-muted-foreground leading-relaxed">
                {business.description}
              </p>
            </div>

            {/* Specialties */}
            {business.specialties && business.specialties.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Specialties</h4>
                <div className="flex flex-wrap gap-2">
                  {business.specialties.map((specialty, index) => (
                    <Badge key={index} variant="secondary" className="text-sm">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {business.tags && business.tags.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Services</h4>
                <div className="flex flex-wrap gap-2">
                  {business.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Reviews</h3>
              {loadingReviews ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.slice(0, 3).map((review) => (
                    <Card key={review.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{review.reviewer_name}</p>
                              <div className="flex items-center">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3 h-3 ${
                                      i < review.rating 
                                        ? 'fill-yellow-400 text-yellow-400' 
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {review.review_text && (
                          <p className="text-sm text-muted-foreground">{review.review_text}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {reviews.length > 3 && (
                    <p className="text-sm text-muted-foreground text-center">
                      {reviews.length - 3} more reviews available
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
              )}
            </div>
          </div>

          {/* Right Column - Contact Info */}
          <div className="space-y-4">
            {/* Contact Card */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <h4 className="font-semibold">Contact Information</h4>
                
                {business.contact_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${business.contact_phone}`} className="hover:text-primary">
                      {business.contact_phone}
                    </a>
                  </div>
                )}
                
                {business.contact_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a href={`mailto:${business.contact_email}`} className="hover:text-primary">
                      {business.contact_email}
                    </a>
                  </div>
                )}
                
                {business.website_url && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <a 
                      href={business.website_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:text-primary flex items-center gap-1"
                    >
                      Visit Website
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                <Button 
                  onClick={() => setShowContactForm(!showContactForm)}
                  className="w-full"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Contact Business
                </Button>
              </CardContent>
            </Card>

            {/* Location Card */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="font-semibold flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  Location
                </h4>
                
                {business.address && (
                  <div className="text-sm space-y-1">
                    <p>{business.address}</p>
                    {business.city && business.state && (
                      <p className="text-muted-foreground">
                        {business.city}, {business.state} {business.zip_code}
                      </p>
                    )}
                    {userLocation && business.latitude && business.longitude && (
                      <p className="text-blue-600 text-xs">
                        {getDistanceText(userLocation, { lat: business.latitude, lng: business.longitude })} away
                      </p>
                    )}
                  </div>
                )}

                {business.service_area_radius && (
                  <div className="text-sm text-muted-foreground">
                    <p>Service area: {business.service_area_radius} miles</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hours Card */}
            {business.business_hours && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-semibold flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Hours
                  </h4>
                  <div className="text-sm">
                    <p className="text-muted-foreground">
                      {formatBusinessHours(business.business_hours)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Social Media */}
            {business.social_media && Object.keys(business.social_media).length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-semibold">Follow Us</h4>
                  <div className="flex gap-2">
                    {Object.entries(business.social_media).map(([platform, url]) => (
                      <Button
                        key={platform}
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a href={url as string} target="_blank" rel="noopener noreferrer">
                          {getSocialIcon(platform)}
                        </a>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats Card */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold flex items-center justify-center">
                      {business.rating_average?.toFixed(1) || '0.0'}
                      <Star className="w-4 h-4 ml-1 fill-yellow-400 text-yellow-400" />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {business.rating_count} reviews
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{business.view_count}</div>
                    <div className="text-xs text-muted-foreground">Views</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Share Button */}
            <Button variant="outline" className="w-full">
              <Share2 className="w-4 h-4 mr-2" />
              Share Business
            </Button>
          </div>
        </div>

        {/* Contact Form */}
        {showContactForm && (
          <Card className="mt-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Send a Message</h3>
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={contactFormData.name}
                      onChange={(e) => setContactFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={contactFormData.email}
                      onChange={(e) => setContactFormData(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={contactFormData.phone}
                      onChange={(e) => setContactFormData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={contactFormData.subject}
                      onChange={(e) => setContactFormData(prev => ({ ...prev, subject: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    rows={4}
                    value={contactFormData.message}
                    onChange={(e) => setContactFormData(prev => ({ ...prev, message: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button type="submit" disabled={submittingContact}>
                    {submittingContact ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Send Message
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowContactForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}