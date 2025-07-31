import { Skeleton } from "@/components/ui/skeleton";

export const EventCardSkeleton = () => {
  return (
    <div className="bg-card rounded-xl border-2 border-border overflow-hidden">
      {/* Image skeleton */}
      <Skeleton className="w-full h-56" />
      
      {/* Content skeleton */}
      <div className="p-6 flex flex-col gap-4">
        {/* Title */}
        <Skeleton className="h-8 w-3/4" />
        
        {/* Date */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </div>
        
        {/* Location */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-5 w-40" />
        </div>
        
        {/* Organizer */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-5 w-36" />
        </div>
        
        {/* Followers */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-5 w-24" />
        </div>
        
        {/* Button */}
        <Skeleton className="w-full h-12 rounded-full mt-4" />
      </div>
    </div>
  );
};

export const EventListSkeleton = () => {
  return (
    <div className="bg-card rounded-xl border-2 border-border p-4 md:p-6 flex flex-col sm:flex-row gap-4 md:gap-6">
      {/* Image skeleton */}
      <Skeleton className="w-full sm:w-32 h-48 sm:h-32 flex-shrink-0 rounded-lg" />
      
      {/* Content skeleton */}
      <div className="flex-1">
        <div className="flex justify-between items-start mb-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>
          
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-36" />
          </div>
          
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const EventMasonrySkeleton = () => {
  return (
    <div className="group relative overflow-hidden rounded-lg shadow-sm">
      <Skeleton className="w-full aspect-[4/5]" />
    </div>
  );
};

export const FeaturedEventSkeleton = () => {
  return (
    <div className="mb-12">
      <div className="bg-card rounded-3xl border-2 border-border overflow-hidden shadow-lg">
        <div className="relative">
          {/* Hero image skeleton */}
          <Skeleton className="h-96 md:h-[500px] w-full" />
          
          {/* Content overlay skeleton */}
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="max-w-4xl">
              <Skeleton className="h-12 md:h-14 w-3/4 mb-4" />
              
              <div className="flex flex-wrap gap-6 mb-6">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-6 w-40" />
                </div>
                
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-6 w-48" />
                </div>
              </div>
              
              <Skeleton className="h-6 w-full max-w-2xl mb-2" />
              <Skeleton className="h-6 w-3/4 max-w-2xl mb-6" />
              
              <Skeleton className="h-14 w-40 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};