import { Button } from "@/components/ui/button";
import { HeartIcon, ShareIcon } from "lucide-react";
import { EventLikeService } from "@/lib/services/EventLikeService";
import { ShareService } from "@/lib/services/ShareService";
import { useToast } from "@/components/ui/use-toast";
import { useState, useEffect } from "react";
import { EventWithStats } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";

interface EventActionsProps {
  event: EventWithStats;
}

export const EventActions = ({ event }: EventActionsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likesLoading, setLikesLoading] = useState(false);

  // Load like status and count when component mounts
  useEffect(() => {
    if (!event || !user) return;

    const loadLikeInfo = async () => {
      try {
        // Get like status and count
        const [likeStatusResult, likeCountResult] = await Promise.all([
          EventLikeService.isEventLiked(event.id),
          EventLikeService.getEventLikeCount(event.id)
        ]);

        if (!likeStatusResult.error) {
          setIsLiked(likeStatusResult.isLiked);
        }

        if (!likeCountResult.error) {
          setLikeCount(likeCountResult.count);
        }
      } catch (error) {
        console.error('Error loading like info:', error);
      }
    };

    loadLikeInfo();
  }, [event, user]);

  // Handle like toggle
  const handleLikeToggle = async () => {
    if (!event || likesLoading) return;

    setLikesLoading(true);
    try {
      const result = await EventLikeService.toggleEventLike(event.id);
      
      if (result.success) {
        setIsLiked(result.isLiked);
        setLikeCount(prev => result.isLiked ? prev + 1 : prev - 1);
        
        toast({
          title: result.isLiked ? "Event Liked" : "Event Unliked",
          description: result.isLiked 
            ? "This event has been added to your liked events" 
            : "This event has been removed from your liked events",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update like status",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: "Failed to update like status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLikesLoading(false);
    }
  };

  // Handle enhanced share functionality
  const handleShare = async () => {
    if (!event) return;

    try {
      const currentUrl = window.location.href;
      const success = await ShareService.shareEvent(event, currentUrl, {
        includeImage: true,
        platform: 'generic'
      });

      if (success) {
        // Check if we used Web Share API or fallback
        if (navigator.share) {
          toast({
            title: "Shared Successfully",
            description: "Event has been shared with image and branding",
          });
        } else {
          toast({
            title: "Link Copied",
            description: "Rich event details copied to clipboard with branding",
          });
        }
      } else {
        // Final fallback - basic URL copy
        await navigator.clipboard.writeText(currentUrl);
        toast({
          title: "Link Copied",
          description: "Event link has been copied to your clipboard",
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // Ultra fallback - manual copy prompt
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link Copied",
          description: "Event link has been copied to your clipboard",
        });
      } catch (clipboardError) {
        toast({
          title: "Share Failed",
          description: "Unable to share or copy link. Please copy the URL manually.",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        className="flex-1" 
        onClick={handleLikeToggle}
        disabled={likesLoading}
      >
        <HeartIcon className={`w-4 h-4 mr-2 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
        {isLiked ? 'Liked' : 'Like'} {likeCount > 0 && `(${likeCount})`}
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        className="flex-1"
        onClick={handleShare}
      >
        <ShareIcon className="w-4 h-4 mr-2" />
        Share
      </Button>
    </div>
  );
};