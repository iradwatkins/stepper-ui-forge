import { cn } from '@/lib/utils';

interface EventCardSkeletonProps {
  className?: string;
  view?: 'grid' | 'list' | 'masonry';
}

export function EventCardSkeleton({ className, view = 'grid' }: EventCardSkeletonProps) {
  if (view === 'list') {
    return (
      <div className={cn("bg-card rounded-xl border-2 border-border p-4 md:p-6 flex flex-col sm:flex-row gap-4 md:gap-6", className)}>
        <div className="w-full sm:w-32 h-48 sm:h-32 flex-shrink-0 bg-muted animate-pulse rounded-lg" />
        <div className="flex-1 space-y-3">
          <div className="flex justify-between items-start">
            <div className="h-6 bg-muted animate-pulse rounded w-2/3" />
            <div className="h-6 bg-muted animate-pulse rounded-full w-20" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
            <div className="h-4 bg-muted animate-pulse rounded w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  if (view === 'masonry') {
    return (
      <div className={cn("relative overflow-hidden rounded-lg shadow-sm", className)}>
        <div className="aspect-[4/3] bg-muted animate-pulse" />
        <div className="absolute bottom-3 left-3 h-6 bg-black/50 backdrop-blur-sm rounded-full w-24 animate-pulse" />
        <div className="absolute bottom-3 right-3 h-6 bg-black/50 backdrop-blur-sm rounded-full w-16 animate-pulse" />
      </div>
    );
  }

  // Default grid view skeleton
  return (
    <div className={cn("bg-card rounded-xl border-2 border-border overflow-hidden", className)}>
      <div className="relative">
        <div className="w-full h-56 bg-muted animate-pulse" />
        <div className="absolute top-3 left-3 h-6 bg-card/90 backdrop-blur-sm rounded-full w-16 animate-pulse" />
      </div>
      <div className="p-6 space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded w-3/4" />
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-1/4" />
          </div>
        </div>
        <div className="w-full h-12 bg-muted animate-pulse rounded-full mt-4" />
      </div>
    </div>
  );
}