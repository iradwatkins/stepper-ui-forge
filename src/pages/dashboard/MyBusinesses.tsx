import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Edit, 
  Eye, 
  MapPin, 
  Star, 
  Calendar,
  Car,
  Laptop,
  Building,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CommunityBusinessService, CommunityBusiness } from '@/lib/services/CommunityBusinessService';
import { toast } from 'sonner';

export default function MyBusinesses() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<CommunityBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMyBusinesses();
  }, [user]);

  const loadMyBusinesses = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      const result = await CommunityBusinessService.getBusinesses({
        ownerId: user.id
      });
      setBusinesses(result.businesses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load businesses');
      toast.error('Failed to load your businesses');
    } finally {
      setLoading(false);
    }
  };

  const getBusinessTypeIcon = (type: string) => {
    switch (type) {
      case 'physical_business':
      case 'venue':
        return Building;
      case 'service_provider':
        return Calendar;
      case 'mobile_service':
        return Car;
      case 'online_business':
        return Laptop;
      default:
        return Building;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </Badge>
        );
      case 'suspended':
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Suspended
          </Badge>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">Error Loading Businesses</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadMyBusinesses}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Businesses & Services</h1>
          <p className="text-muted-foreground">
            Manage your business listings and service offerings
          </p>
        </div>
        <Link to="/dashboard/businesses/create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add New Listing
          </Button>
        </Link>
      </div>

      {/* Business Cards */}
      {businesses.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Businesses Listed Yet</h3>
            <p className="text-muted-foreground mb-6">
              List your business or service to connect with the stepping community
            </p>
            <Link to="/dashboard/businesses/create">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Listing
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {businesses.map((business) => {
            const TypeIcon = getBusinessTypeIcon(business.business_type || 'physical_business');
            
            return (
              <Card key={business.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Business Image */}
                {business.gallery_images?.[0] && (
                  <img 
                    src={business.gallery_images[0]} 
                    alt={business.business_name}
                    className="w-full h-48 object-cover"
                  />
                )}
                
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-1">
                        {business.business_name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <TypeIcon className="w-4 h-4" />
                        <span>{CommunityBusinessService.getBusinessTypeLabel(business.business_type || 'physical_business')}</span>
                      </div>
                    </div>
                    {getStatusBadge(business.status)}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {business.description}
                  </p>
                  
                  {/* Location or Service Area */}
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 mr-2" />
                    {business.city && business.state ? (
                      <span>{business.city}, {business.state}</span>
                    ) : business.service_area_radius ? (
                      <span>{business.service_area_radius} mile service area</span>
                    ) : (
                      <span>Online service</span>
                    )}
                  </div>
                  
                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center text-muted-foreground">
                        <Eye className="w-4 h-4 mr-1" />
                        <span>{business.view_count || 0} views</span>
                      </div>
                      {business.rating_count > 0 && (
                        <div className="flex items-center text-muted-foreground">
                          <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                          <span>{business.rating_average?.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Link to={`/dashboard/businesses/${business.id}/edit`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                    <Link to={`/stores/${business.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}