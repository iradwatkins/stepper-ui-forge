import { Badge } from "@/components/ui/badge";
import { EventWithStats } from "@/types/database";

interface EventAboutProps {
  event: EventWithStats;
}

export const EventAbout = ({ event }: EventAboutProps) => {
  const getCleanDescription = (): string => {
    if (!event.description) return '';
    
    // Remove [PRICE:...] tags for simple events
    let cleanDescription = event.description.replace(/\[PRICE:.*?\]/g, '');
    
    // Clean up any extra whitespace
    cleanDescription = cleanDescription.trim();
    
    return cleanDescription;
  };

  return (
    <div className="mt-16 border-t border-gray-200 pt-10">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">About the event</h2>
        <div className="text-gray-700 space-y-4">
          <p className="whitespace-pre-line leading-relaxed">{getCleanDescription()}</p>
          
          {/* Categories */}
          {event.categories && event.categories.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {event.categories.map((category, index) => (
                  <Badge key={index} variant="secondary" className="px-3 py-1 text-sm">
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};