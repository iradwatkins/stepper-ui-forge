import { isEventPast7Days, isEventPast } from '@/lib/utils/eventDateUtils';
import { cn } from '@/lib/utils';

interface PastEventImageProps {
  eventDate: string;
  imageUrl?: string;
  alt: string;
  className?: string;
  isOrganizer?: boolean;
  showPlaceholder?: boolean;
}

export const PastEventImage = ({ 
  eventDate, 
  imageUrl, 
  alt, 
  className, 
  isOrganizer = false,
  showPlaceholder = true 
}: PastEventImageProps) => {
  const shouldHideImage = isEventPast7Days(eventDate) && !isOrganizer;
  const isPastEvent = isEventPast(eventDate);
  
  if (shouldHideImage) {
    // For events past 7 days, show a placeholder instead of the image
    return (
      <div className={cn(
        "bg-muted flex items-center justify-center relative",
        className
      )}>
        <div className="text-center p-6">
          <div className="text-4xl mb-2 text-muted-foreground">📅</div>
          <p className="text-sm font-medium text-muted-foreground">Event has ended</p>
          <p className="text-xs text-muted-foreground mt-1">
            Images are no longer available
          </p>
        </div>
      </div>
    );
  }
  
  if (!imageUrl) {
    return showPlaceholder ? (
      <div className={cn(
        "bg-muted flex items-center justify-center",
        className
      )}>
        <span className="text-sm text-muted-foreground">No image</span>
      </div>
    ) : null;
  }
  
  return (
    <div className="relative">
      <img
        src={imageUrl}
        alt={alt}
        className={cn(
          isPastEvent && !isOrganizer ? "opacity-75" : "",
          className
        )}
        loading="lazy"
      />
      {isPastEvent && !isOrganizer && (
        <div className="absolute top-2 right-2 bg-yellow-500/90 text-yellow-900 px-3 py-1 rounded-full text-xs font-medium">
          Past Event
        </div>
      )}
    </div>
  );
};