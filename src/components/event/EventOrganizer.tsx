import { Button } from "@/components/ui/button";
import { UserPlusIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { FollowerService } from "@/lib/services/FollowerService";
import { useToast } from "@/components/ui/use-toast";
import { useState, useEffect } from "react";
import { EventWithStats } from "@/types/database";

interface EventOrganizerProps {
  event: EventWithStats;
}

export const EventOrganizer = ({ event }: EventOrganizerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Load follow status when component mounts
  useEffect(() => {
    if (!event || !user) return;

    const checkFollowStatus = async () => {
      try {
        const followStatus = await FollowerService.isFollowing(user.id, event.owner_id);
        setIsFollowing(followStatus);
      } catch (error) {
        console.error('Error checking follow status:', error);
      }
    };

    checkFollowStatus();
  }, [event, user]);

  // Handle follow toggle
  const handleFollowToggle = async () => {
    if (!event || !user || followLoading) return;

    setFollowLoading(true);
    try {
      let result;
      if (isFollowing) {
        result = await FollowerService.unfollowOrganizer(user.id, event.owner_id);
      } else {
        result = await FollowerService.followOrganizer(user.id, event.owner_id);
      }
      
      if (result.success) {
        setIsFollowing(!isFollowing);
        
        toast({
          title: isFollowing ? "Unfollowed" : "Following",
          description: isFollowing 
            ? "You are no longer following this organizer" 
            : "You are now following this organizer",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update follow status",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast({
        title: "Error",
        description: "Failed to update follow status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setFollowLoading(false);
    }
  };

  return (
    <div className="border-t border-gray-200 pt-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-4">
            <span className="text-lg font-bold text-white">
              {event.organization_name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{event.organization_name}</h3>
            <p className="text-sm text-gray-500">For exchanges, refunds, tax receipts, and any event-related requests, please contact the organizer through your ticket confirmation email.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={isFollowing ? "outline" : "default"} 
            className={isFollowing 
              ? "border border-gray-300 rounded-full px-6 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition whitespace-nowrap"
              : "bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-2 text-sm font-semibold transition whitespace-nowrap"
            }
            onClick={handleFollowToggle}
            disabled={followLoading || !user}
          >
            <UserPlusIcon className="w-4 h-4 mr-2" />
            {followLoading ? "..." : isFollowing ? "Following" : "Follow"}
          </Button>
        </div>
      </div>
    </div>
  );
};