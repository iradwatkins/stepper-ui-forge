import { useState, useEffect } from 'react';
import { classService, SteppingClass, ClassSubmissionData, ClassAttendee, VODClass } from '@/services/classService';
import { useAuth } from '@/contexts/AuthContext';

export const useClasses = () => {
  const [classes, setClasses] = useState<SteppingClass[]>([]);
  const [vodClasses, setVodClasses] = useState<VODClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Load all public classes
  const loadClasses = async (filters?: {
    level?: string;
    category?: string;
    location?: string;
    search?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const data = await classService.getAllClasses(filters);
      setClasses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  // Load instructor's classes
  const loadInstructorClasses = async (instructorId?: string) => {
    if (!instructorId && !user) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await classService.getInstructorClasses(instructorId || user!.id);
      setClasses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load instructor classes');
    } finally {
      setLoading(false);
    }
  };

  // Create new class
  const createClass = async (data: ClassSubmissionData): Promise<SteppingClass | null> => {
    if (!user) {
      setError('Must be logged in to create classes');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      const newClass = await classService.createClass(data, user.id, user.email || 'Instructor');
      setClasses(prev => [...prev, newClass]);
      return newClass;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create class');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update existing class
  const updateClass = async (classId: string, data: Partial<ClassSubmissionData>): Promise<SteppingClass | null> => {
    try {
      setLoading(true);
      setError(null);
      const updatedClass = await classService.updateClass(classId, data);
      setClasses(prev => prev.map(cls => cls.id === classId ? updatedClass : cls));
      return updatedClass;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update class');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Delete class
  const deleteClass = async (classId: string): Promise<boolean> => {
    if (!user) {
      setError('Must be logged in to delete classes');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      const success = await classService.deleteClass(classId, user.id);
      if (success) {
        setClasses(prev => prev.filter(cls => cls.id !== classId));
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete class');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Confirm class (for validity notifications)
  const confirmClass = async (classId: string): Promise<SteppingClass | null> => {
    if (!user) {
      setError('Must be logged in to confirm classes');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      const confirmedClass = await classService.confirmClass(classId, user.id);
      setClasses(prev => prev.map(cls => cls.id === classId ? confirmedClass : cls));
      return confirmedClass;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm class');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Register for class
  const registerForClass = async (classId: string, status: 'interested' | 'registered'): Promise<ClassAttendee | null> => {
    if (!user) {
      setError('Must be logged in to register for classes');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      const attendee = await classService.registerForClass(classId, user.id, status);
      
      // Update class attendee count
      setClasses(prev => prev.map(cls => {
        if (cls.id === classId) {
          return {
            ...cls,
            attendeeCount: status === 'registered' ? cls.attendeeCount + 1 : cls.attendeeCount,
            interestedCount: status === 'interested' ? cls.interestedCount + 1 : cls.interestedCount
          };
        }
        return cls;
      }));
      
      return attendee;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register for class');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get class attendees (for instructors)
  const getClassAttendees = async (classId: string): Promise<ClassAttendee[]> => {
    try {
      setLoading(true);
      setError(null);
      const attendees = await classService.getClassAttendees(classId);
      return attendees;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attendees');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Load VOD classes
  const loadVODClasses = async (filters?: {
    level?: string;
    category?: string;
    search?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const data = await classService.getAllVODClasses(filters);
      setVodClasses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load VOD classes');
    } finally {
      setLoading(false);
    }
  };

  // Load instructor's VOD classes
  const loadInstructorVODClasses = async (instructorId?: string) => {
    if (!instructorId && !user) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await classService.getInstructorVODClasses(instructorId || user!.id);
      setVodClasses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load instructor VOD classes');
    } finally {
      setLoading(false);
    }
  };

  // Upload class images
  const uploadClassImages = async (classId: string, files: File[]) => {
    try {
      setLoading(true);
      setError(null);
      const images = await classService.uploadClassImages(classId, files);
      
      // Update class with new images
      setClasses(prev => prev.map(cls => {
        if (cls.id === classId) {
          return {
            ...cls,
            images: [...cls.images, ...images]
          };
        }
        return cls;
      }));
      
      return images;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload images');
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    classes,
    vodClasses,
    loading,
    error,
    loadClasses,
    loadInstructorClasses,
    createClass,
    updateClass,
    deleteClass,
    confirmClass,
    registerForClass,
    getClassAttendees,
    loadVODClasses,
    loadInstructorVODClasses,
    uploadClassImages,
    clearError: () => setError(null)
  };
};