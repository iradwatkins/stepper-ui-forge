import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function VenueManagementPremiumEventTest() {
  const navigate = useNavigate();
  
  return (
    <div className="p-6">
      <Button onClick={() => navigate('/dashboard/venues')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Venues
      </Button>
      <h1 className="text-2xl font-bold mt-4">Premium Event Creation Test</h1>
      <p>If you can see this, the routing is working.</p>
    </div>
  );
}