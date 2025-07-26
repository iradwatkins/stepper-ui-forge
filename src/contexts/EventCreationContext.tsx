/**
 * Event Creation Context
 * 
 * Centralized state management for the CreateEventWizard to prevent race conditions
 * and provide clear field ownership between components.
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { EventFormData } from '@/types/event-form';
import { SeatData, PriceCategory } from '@/types/seating';

// ===== STATE TYPES =====

interface EventCreationState {
  // Wizard Flow State
  currentStep: number;
  eventType: 'simple' | 'ticketed' | 'premium' | '';
  
  // Form Field Ownership (prevents race conditions)
  fieldOwnership: {
    venueLayoutId: string | null; // 'venue-selection' | 'seating-wizard'
    seats: string | null;
    seatCategories: string | null;
    venueImageUrl: string | null;
    hasVenueImage: string | null;
  };
  
  // Venue State
  venue: {
    selectedVenueId: string | null;
    selectedVenueData: any | null;
    hasCustomLayout: boolean;
  };
  
  // Seating State
  seating: {
    seats: SeatData[];
    categories: PriceCategory[];
    isConfigured: boolean;
    lastModified: Date | null;
  };
  
  // Synchronization State
  sync: {
    isUpdating: boolean;
    pendingUpdates: string[];
    lastSyncTime: Date | null;
    conflicts: string[];
  };
  
  // Debug Information
  debug: {
    componentUpdates: Array<{
      component: string;
      field: string;
      timestamp: Date;
      value: any;
    }>;
  };
}

// ===== ACTION TYPES =====

type EventCreationAction = 
  | { type: 'SET_EVENT_TYPE'; payload: EventCreationState['eventType'] }
  | { type: 'SET_CURRENT_STEP'; payload: number }
  | { type: 'CLAIM_FIELD_OWNERSHIP'; payload: { field: keyof EventCreationState['fieldOwnership']; component: string } }
  | { type: 'RELEASE_FIELD_OWNERSHIP'; payload: { field: keyof EventCreationState['fieldOwnership']; component: string } }
  | { type: 'SET_VENUE_SELECTION'; payload: { venueId: string | null; venueData: any | null } }
  | { type: 'SET_CUSTOM_LAYOUT'; payload: boolean }
  | { type: 'UPDATE_SEATING_DATA'; payload: { seats?: SeatData[]; categories?: PriceCategory[] } }
  | { type: 'SET_SEATING_CONFIGURED'; payload: boolean }
  | { type: 'START_SYNC'; payload: string[] }
  | { type: 'COMPLETE_SYNC'; payload: string[] }
  | { type: 'ADD_CONFLICT'; payload: string }
  | { type: 'CLEAR_CONFLICTS' }
  | { type: 'ADD_DEBUG_UPDATE'; payload: { component: string; field: string; value: any } }
  | { type: 'CLEAR_DEBUG' }
  | { type: 'RESET_STATE' };

// ===== INITIAL STATE =====

const initialState: EventCreationState = {
  currentStep: 1,
  eventType: '',
  fieldOwnership: {
    venueLayoutId: null,
    seats: null,
    seatCategories: null,
    venueImageUrl: null,
    hasVenueImage: null,
  },
  venue: {
    selectedVenueId: null,
    selectedVenueData: null,
    hasCustomLayout: false,
  },
  seating: {
    seats: [],
    categories: [],
    isConfigured: false,
    lastModified: null,
  },
  sync: {
    isUpdating: false,
    pendingUpdates: [],
    lastSyncTime: null,
    conflicts: [],
  },
  debug: {
    componentUpdates: [],
  },
};

// ===== REDUCER =====

function eventCreationReducer(state: EventCreationState, action: EventCreationAction): EventCreationState {
  switch (action.type) {
    case 'SET_EVENT_TYPE':
      return {
        ...state,
        eventType: action.payload,
      };

    case 'SET_CURRENT_STEP':
      return {
        ...state,
        currentStep: action.payload,
      };

    case 'CLAIM_FIELD_OWNERSHIP':
      const { field, component } = action.payload;
      const currentOwner = state.fieldOwnership[field];
      
      if (currentOwner && currentOwner !== component) {
        // Conflict detected - log it
        console.warn(`Field ownership conflict: ${field} claimed by ${component}, already owned by ${currentOwner}`);
        return {
          ...state,
          sync: {
            ...state.sync,
            conflicts: [...state.sync.conflicts, `${field}: ${currentOwner} vs ${component}`],
          },
        };
      }
      
      return {
        ...state,
        fieldOwnership: {
          ...state.fieldOwnership,
          [field]: component,
        },
      };

    case 'RELEASE_FIELD_OWNERSHIP':
      if (state.fieldOwnership[action.payload.field] === action.payload.component) {
        return {
          ...state,
          fieldOwnership: {
            ...state.fieldOwnership,
            [action.payload.field]: null,
          },
        };
      }
      return state;

    case 'SET_VENUE_SELECTION':
      return {
        ...state,
        venue: {
          ...state.venue,
          selectedVenueId: action.payload.venueId,
          selectedVenueData: action.payload.venueData,
        },
      };

    case 'SET_CUSTOM_LAYOUT':
      return {
        ...state,
        venue: {
          ...state.venue,
          hasCustomLayout: action.payload,
        },
      };

    case 'UPDATE_SEATING_DATA':
      return {
        ...state,
        seating: {
          ...state.seating,
          ...(action.payload.seats && { seats: action.payload.seats }),
          ...(action.payload.categories && { categories: action.payload.categories }),
          lastModified: new Date(),
        },
      };

    case 'SET_SEATING_CONFIGURED':
      return {
        ...state,
        seating: {
          ...state.seating,
          isConfigured: action.payload,
        },
      };

    case 'START_SYNC':
      return {
        ...state,
        sync: {
          ...state.sync,
          isUpdating: true,
          pendingUpdates: action.payload,
        },
      };

    case 'COMPLETE_SYNC':
      return {
        ...state,
        sync: {
          ...state.sync,
          isUpdating: false,
          pendingUpdates: state.sync.pendingUpdates.filter(
            update => !action.payload.includes(update)
          ),
          lastSyncTime: new Date(),
        },
      };

    case 'ADD_CONFLICT':
      return {
        ...state,
        sync: {
          ...state.sync,
          conflicts: [...state.sync.conflicts, action.payload],
        },
      };

    case 'CLEAR_CONFLICTS':
      return {
        ...state,
        sync: {
          ...state.sync,
          conflicts: [],
        },
      };

    case 'ADD_DEBUG_UPDATE':
      return {
        ...state,
        debug: {
          ...state.debug,
          componentUpdates: [
            ...state.debug.componentUpdates.slice(-49), // Keep last 50 updates
            {
              component: action.payload.component,
              field: action.payload.field,
              value: action.payload.value,
              timestamp: new Date(),
            },
          ],
        },
      };

    case 'CLEAR_DEBUG':
      return {
        ...state,
        debug: {
          componentUpdates: [],
        },
      };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}

// ===== CONTEXT =====

interface EventCreationContextValue {
  state: EventCreationState;
  
  // Field Ownership Management
  claimFieldOwnership: (field: keyof EventCreationState['fieldOwnership'], component: string) => boolean;
  releaseFieldOwnership: (field: keyof EventCreationState['fieldOwnership'], component: string) => void;
  canUpdateField: (field: keyof EventCreationState['fieldOwnership'], component: string) => boolean;
  
  // State Updates
  setEventType: (eventType: EventCreationState['eventType']) => void;
  setCurrentStep: (step: number) => void;
  setVenueSelection: (venueId: string | null, venueData?: any) => void;
  setCustomLayout: (hasCustom: boolean) => void;
  updateSeatingData: (data: { seats?: SeatData[]; categories?: PriceCategory[] }) => void;
  setSeatingConfigured: (isConfigured: boolean) => void;
  
  // Form Synchronization
  syncWithForm: (form: UseFormReturn<EventFormData>, updates: string[]) => Promise<void>;
  
  // Debug & Monitoring
  addDebugUpdate: (component: string, field: string, value: any) => void;
  clearConflicts: () => void;
  getFieldHistory: (field: string) => Array<{ component: string; timestamp: Date; value: any }>;
  
  // Utilities
  resetState: () => void;
}

const EventCreationContext = createContext<EventCreationContextValue | null>(null);

// ===== PROVIDER =====

interface EventCreationProviderProps {
  children: React.ReactNode;
}

export function EventCreationProvider({ children }: EventCreationProviderProps) {
  const [state, dispatch] = useReducer(eventCreationReducer, initialState);

  // Field Ownership Management
  const claimFieldOwnership = useCallback((field: keyof EventCreationState['fieldOwnership'], component: string): boolean => {
    const currentOwner = state.fieldOwnership[field];
    if (currentOwner && currentOwner !== component) {
      console.warn(`Cannot claim field ownership: ${field} is owned by ${currentOwner}`);
      return false;
    }
    
    dispatch({ type: 'CLAIM_FIELD_OWNERSHIP', payload: { field, component } });
    return true;
  }, [state.fieldOwnership]);

  const releaseFieldOwnership = useCallback((field: keyof EventCreationState['fieldOwnership'], component: string) => {
    dispatch({ type: 'RELEASE_FIELD_OWNERSHIP', payload: { field, component } });
  }, []);

  const canUpdateField = useCallback((field: keyof EventCreationState['fieldOwnership'], component: string): boolean => {
    const owner = state.fieldOwnership[field];
    return !owner || owner === component;
  }, [state.fieldOwnership]);

  // State Updates
  const setEventType = useCallback((eventType: EventCreationState['eventType']) => {
    dispatch({ type: 'SET_EVENT_TYPE', payload: eventType });
  }, []);

  const setCurrentStep = useCallback((step: number) => {
    dispatch({ type: 'SET_CURRENT_STEP', payload: step });
  }, []);

  const setVenueSelection = useCallback((venueId: string | null, venueData?: any) => {
    dispatch({ type: 'SET_VENUE_SELECTION', payload: { venueId, venueData } });
  }, []);

  const setCustomLayout = useCallback((hasCustom: boolean) => {
    dispatch({ type: 'SET_CUSTOM_LAYOUT', payload: hasCustom });
  }, []);

  const updateSeatingData = useCallback((data: { seats?: SeatData[]; categories?: PriceCategory[] }) => {
    dispatch({ type: 'UPDATE_SEATING_DATA', payload: data });
  }, []);

  const setSeatingConfigured = useCallback((isConfigured: boolean) => {
    dispatch({ type: 'SET_SEATING_CONFIGURED', payload: isConfigured });
  }, []);

  // Form Synchronization
  const syncWithForm = useCallback(async (form: UseFormReturn<EventFormData>, updates: string[]) => {
    dispatch({ type: 'START_SYNC', payload: updates });
    
    try {
      // Batch form updates to prevent race conditions
      const formUpdates: Partial<EventFormData> = {};
      
      if (updates.includes('venue') && state.venue.selectedVenueId) {
        formUpdates.venueLayoutId = state.venue.selectedVenueId;
      }
      
      if (updates.includes('seating')) {
        if (state.seating.seats.length > 0) {
          formUpdates.seats = state.seating.seats;
        }
        if (state.seating.categories.length > 0) {
          formUpdates.seatCategories = state.seating.categories;
        }
      }
      
      // Apply all updates at once
      Object.entries(formUpdates).forEach(([key, value]) => {
        form.setValue(key as keyof EventFormData, value as any);
      });
      
      // Trigger validation
      await form.trigger(Object.keys(formUpdates) as (keyof EventFormData)[]);
      
      dispatch({ type: 'COMPLETE_SYNC', payload: updates });
    } catch (error) {
      console.error('Form sync error:', error);
      dispatch({ type: 'ADD_CONFLICT', payload: `Sync failed: ${error}` });
    }
  }, [state.venue, state.seating]);

  // Debug & Monitoring
  const addDebugUpdate = useCallback((component: string, field: string, value: any) => {
    dispatch({ type: 'ADD_DEBUG_UPDATE', payload: { component, field, value } });
  }, []);

  const clearConflicts = useCallback(() => {
    dispatch({ type: 'CLEAR_CONFLICTS' });
  }, []);

  const getFieldHistory = useCallback((field: string) => {
    return state.debug.componentUpdates
      .filter(update => update.field === field)
      .slice(-10); // Last 10 updates for this field
  }, [state.debug.componentUpdates]);

  const resetState = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
  }, []);

  // Log conflicts to console for debugging
  useEffect(() => {
    if (state.sync.conflicts.length > 0) {
      console.warn('Event Creation State Conflicts:', state.sync.conflicts);
    }
  }, [state.sync.conflicts]);

  const value: EventCreationContextValue = {
    state,
    claimFieldOwnership,
    releaseFieldOwnership,
    canUpdateField,
    setEventType,
    setCurrentStep,
    setVenueSelection,
    setCustomLayout,
    updateSeatingData,
    setSeatingConfigured,
    syncWithForm,
    addDebugUpdate,
    clearConflicts,
    getFieldHistory,
    resetState,
  };

  return (
    <EventCreationContext.Provider value={value}>
      {children}
    </EventCreationContext.Provider>
  );
}

// ===== HOOK =====

export function useEventCreation() {
  const context = useContext(EventCreationContext);
  if (!context) {
    throw new Error('useEventCreation must be used within an EventCreationProvider');
  }
  return context;
}

// ===== DEBUG HOOK =====

export function useEventCreationDebug() {
  const { state, clearConflicts, getFieldHistory } = useEventCreation();
  
  return {
    conflicts: state.sync.conflicts,
    isUpdating: state.sync.isUpdating,
    pendingUpdates: state.sync.pendingUpdates,
    lastSyncTime: state.sync.lastSyncTime,
    fieldOwnership: state.fieldOwnership,
    recentUpdates: state.debug.componentUpdates.slice(-10),
    clearConflicts,
    getFieldHistory,
  };
}