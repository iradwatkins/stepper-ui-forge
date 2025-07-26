/**
 * Venue Query Hooks
 * 
 * Optimized React Query hooks for venue loading with intelligent caching,
 * background refetching, and optimistic updates.
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { VenueService, type VenueLayout } from '@/lib/services/VenueService';
import { toast } from 'sonner';

// ===== QUERY KEYS =====

export const venueQueryKeys = {
  all: ['venues'] as const,
  lists: () => [...venueQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...venueQueryKeys.lists(), { filters }] as const,
  details: () => [...venueQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...venueQueryKeys.details(), id] as const,
  userVenues: (userId: string) => [...venueQueryKeys.all, 'user', userId] as const,
  templates: () => [...venueQueryKeys.all, 'templates'] as const,
};

// ===== QUERY CONFIGURATION =====

const defaultQueryConfig = {
  staleTime: 5 * 60 * 1000, // 5 minutes - venues don't change frequently
  gcTime: 10 * 60 * 1000, // 10 minutes - keep cached data longer
  refetchOnWindowFocus: false, // Don't refetch on window focus
  refetchOnReconnect: true, // Refetch when reconnecting
  retry: 2, // Retry failed requests twice
};

const backgroundRefreshConfig = {
  ...defaultQueryConfig,
  refetchInterval: 15 * 60 * 1000, // Background refresh every 15 minutes
  refetchIntervalInBackground: false, // Don't refetch when tab is in background
};

// ===== VENUE LIST QUERIES =====

/**
 * Fetch all user venues with optimized caching
 */
export const useUserVenues = (userId: string | null, options = {}) => {
  return useQuery({
    queryKey: venueQueryKeys.userVenues(userId || ''),
    queryFn: async () => {
      if (!userId) return [];
      
      const startTime = performance.now();
      const venues = await VenueService.getUserVenues(userId);
      const endTime = performance.now();
      
      console.log(`[useUserVenues] Loaded ${venues.length} venues in ${(endTime - startTime).toFixed(2)}ms`);
      return venues;
    },
    enabled: !!userId,
    ...defaultQueryConfig,
    ...options,
  });
};

/**
 * Fetch venue templates with background refresh
 */
export const useVenueTemplates = (options = {}) => {
  return useQuery({
    queryKey: venueQueryKeys.templates(),
    queryFn: async () => {
      const startTime = performance.now();
      const templates = await VenueService.getVenueTemplates();
      const endTime = performance.now();
      
      console.log(`[useVenueTemplates] Loaded ${templates.length} templates in ${(endTime - startTime).toFixed(2)}ms`);
      return templates;
    },
    ...backgroundRefreshConfig,
    ...options,
  });
};

/**
 * Fetch all venues with filters
 */
export const useVenues = (filters: {
  userId?: string;
  includeTemplates?: boolean;
  venueType?: string;
  search?: string;
} = {}, options = {}) => {
  return useQuery({
    queryKey: venueQueryKeys.list(filters),
    queryFn: async () => {
      const startTime = performance.now();
      
      let venues: VenueLayout[] = [];
      
      if (filters.userId) {
        venues = await VenueService.getUserVenues(filters.userId);
      }
      
      if (filters.includeTemplates) {
        const templates = await VenueService.getVenueTemplates();
        venues = [...venues, ...templates];
      }
      
      // Apply client-side filters for better performance
      if (filters.venueType) {
        venues = venues.filter(venue => venue.venueType === filters.venueType);
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        venues = venues.filter(venue => 
          venue.name.toLowerCase().includes(searchLower) ||
          venue.description.toLowerCase().includes(searchLower) ||
          venue.tags.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }
      
      const endTime = performance.now();
      console.log(`[useVenues] Loaded and filtered ${venues.length} venues in ${(endTime - startTime).toFixed(2)}ms`);
      
      return venues;
    },
    ...defaultQueryConfig,
    ...options,
  });
};

// ===== VENUE DETAIL QUERIES =====

/**
 * Fetch single venue by ID with aggressive caching
 */
export const useVenue = (venueId: string | null, options = {}) => {
  return useQuery({
    queryKey: venueQueryKeys.detail(venueId || ''),
    queryFn: async () => {
      if (!venueId) return null;
      
      const startTime = performance.now();
      const venue = await VenueService.getVenue(venueId);
      const endTime = performance.now();
      
      console.log(`[useVenue] Loaded venue "${venue?.name}" in ${(endTime - startTime).toFixed(2)}ms`);
      return venue;
    },
    enabled: !!venueId,
    ...defaultQueryConfig,
    staleTime: 10 * 60 * 1000, // 10 minutes for individual venues
    ...options,
  });
};

// ===== OPTIMISTIC MUTATIONS =====

/**
 * Create venue with optimistic updates
 */
export const useCreateVenue = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: VenueService.createVenue,
    onMutate: async (newVenue) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: venueQueryKeys.all });
      
      // Snapshot previous value
      const previousVenues = queryClient.getQueryData(venueQueryKeys.lists());
      
      // Optimistically update to new value
      const optimisticVenue: VenueLayout = {
        id: `temp-${Date.now()}`,
        ...newVenue.layout_data,
        name: newVenue.name,
        description: newVenue.description,
        createdAt: new Date(),
        updatedAt: new Date(),
        user_id: newVenue.user_id,
      } as VenueLayout;
      
      queryClient.setQueryData(venueQueryKeys.lists(), (old: VenueLayout[] = []) => 
        [...old, optimisticVenue]
      );
      
      console.log('[useCreateVenue] Optimistic update applied');
      
      return { previousVenues };
    },
    onError: (error, newVenue, context) => {
      // Rollback optimistic update
      if (context?.previousVenues) {
        queryClient.setQueryData(venueQueryKeys.lists(), context.previousVenues);
      }
      
      toast.error('Failed to create venue');
      console.error('[useCreateVenue] Error:', error);
    },
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: venueQueryKeys.all });
      toast.success('Venue created successfully');
      
      console.log('[useCreateVenue] Success, invalidating queries');
    },
  });
};

/**
 * Update venue with optimistic updates
 */
export const useUpdateVenue = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<VenueLayout> }) =>
      VenueService.updateVenue(id, updates),
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: venueQueryKeys.detail(id) });
      
      // Snapshot previous value
      const previousVenue = queryClient.getQueryData(venueQueryKeys.detail(id));
      
      // Optimistically update
      queryClient.setQueryData(venueQueryKeys.detail(id), (old: VenueLayout | undefined) => 
        old ? { ...old, ...updates, updatedAt: new Date() } : undefined
      );
      
      console.log(`[useUpdateVenue] Optimistic update applied for venue ${id}`);
      
      return { previousVenue, id };
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousVenue && context?.id) {
        queryClient.setQueryData(venueQueryKeys.detail(context.id), context.previousVenue);
      }
      
      toast.error('Failed to update venue');
      console.error('[useUpdateVenue] Error:', error);
    },
    onSuccess: (data, { id }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: venueQueryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: venueQueryKeys.lists() });
      
      toast.success('Venue updated successfully');
      console.log(`[useUpdateVenue] Success, invalidating queries for venue ${id}`);
    },
  });
};

/**
 * Delete venue with optimistic updates
 */
export const useDeleteVenue = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: VenueService.deleteVenue,
    onMutate: async (venueId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: venueQueryKeys.all });
      
      // Snapshot previous values
      const previousVenues = queryClient.getQueryData(venueQueryKeys.lists());
      const previousVenue = queryClient.getQueryData(venueQueryKeys.detail(venueId));
      
      // Optimistically remove venue from lists
      queryClient.setQueryData(venueQueryKeys.lists(), (old: VenueLayout[] = []) => 
        old.filter(venue => venue.id !== venueId)
      );
      
      // Remove venue detail
      queryClient.removeQueries({ queryKey: venueQueryKeys.detail(venueId) });
      
      console.log(`[useDeleteVenue] Optimistic removal applied for venue ${venueId}`);
      
      return { previousVenues, previousVenue, venueId };
    },
    onError: (error, venueId, context) => {
      // Rollback optimistic updates
      if (context?.previousVenues) {
        queryClient.setQueryData(venueQueryKeys.lists(), context.previousVenues);
      }
      if (context?.previousVenue && context?.venueId) {
        queryClient.setQueryData(venueQueryKeys.detail(context.venueId), context.previousVenue);
      }
      
      toast.error('Failed to delete venue');
      console.error('[useDeleteVenue] Error:', error);
    },
    onSuccess: (data, venueId) => {
      // Confirm removal by invalidating queries
      queryClient.invalidateQueries({ queryKey: venueQueryKeys.all });
      toast.success('Venue deleted successfully');
      
      console.log(`[useDeleteVenue] Success, venue ${venueId} removed`);
    },
  });
};

// ===== PREFETCHING UTILITIES =====

/**
 * Prefetch venue templates for faster loading
 */
export const usePrefetchVenueTemplates = () => {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.prefetchQuery({
      queryKey: venueQueryKeys.templates(),
      queryFn: VenueService.getVenueTemplates,
      staleTime: backgroundRefreshConfig.staleTime,
    });
    
    console.log('[usePrefetchVenueTemplates] Prefetching venue templates');
  };
};

/**
 * Prefetch user venues for faster dashboard loading
 */
export const usePrefetchUserVenues = () => {
  const queryClient = useQueryClient();
  
  return (userId: string) => {
    queryClient.prefetchQuery({
      queryKey: venueQueryKeys.userVenues(userId),
      queryFn: () => VenueService.getUserVenues(userId),
      staleTime: defaultQueryConfig.staleTime,
    });
    
    console.log(`[usePrefetchUserVenues] Prefetching venues for user ${userId}`);
  };
};

// ===== CACHE UTILITIES =====

/**
 * Get cached venue without triggering network request
 */
export const useCachedVenue = (venueId: string | null) => {
  const queryClient = useQueryClient();
  
  if (!venueId) return null;
  
  return queryClient.getQueryData(venueQueryKeys.detail(venueId)) as VenueLayout | undefined;
};

/**
 * Get cached venues list without triggering network request
 */
export const useCachedVenues = (filters = {}) => {
  const queryClient = useQueryClient();
  
  return queryClient.getQueryData(venueQueryKeys.list(filters)) as VenueLayout[] | undefined;
};

/**
 * Invalidate all venue caches
 */
export const useInvalidateVenueCaches = () => {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: venueQueryKeys.all });
    console.log('[useInvalidateVenueCaches] All venue caches invalidated');
  };
};

// ===== PERFORMANCE MONITORING =====

/**
 * Hook to monitor venue query performance
 */
export const useVenueQueryMetrics = () => {
  const queryClient = useQueryClient();
  
  const getQueryMetrics = () => {
    const cache = queryClient.getQueryCache();
    const venueQueries = cache.findAll({ queryKey: venueQueryKeys.all });
    
    const metrics = {
      totalQueries: venueQueries.length,
      staleQueries: venueQueries.filter(q => q.isStale()).length,
      fetchingQueries: venueQueries.filter(q => q.isFetching()).length,
      errorQueries: venueQueries.filter(q => q.state.status === 'error').length,
      successQueries: venueQueries.filter(q => q.state.status === 'success').length,
      cacheHitRatio: 0,
    };
    
    const successCount = metrics.successQueries;
    const totalCount = metrics.totalQueries;
    metrics.cacheHitRatio = totalCount > 0 ? (successCount / totalCount) * 100 : 0;
    
    return metrics;
  };
  
  return { getQueryMetrics };
};