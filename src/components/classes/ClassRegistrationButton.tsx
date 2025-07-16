import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Heart, Check, Loader2, User } from 'lucide-react';
import { SteppingClass, classService } from '@/services/classService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ClassRegistrationButtonProps {
  classItem: SteppingClass;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  showInterested?: boolean;
  onRegistrationChange?: (status: 'none' | 'interested' | 'registered') => void;
}

export function ClassRegistrationButton({ 
  classItem, 
  variant = 'default',
  size = 'default',
  showInterested = true,
  onRegistrationChange
}: ClassRegistrationButtonProps) {
  const { user, profile } = useAuth();
  const [registrationStatus, setRegistrationStatus] = useState<'none' | 'interested' | 'registered'>('none');
  const [loading, setLoading] = useState(false);

  const handleRegistration = async (status: 'interested' | 'registered') => {
    if (!user || !profile) {
      toast.error('Please sign in to register for classes');
      return;
    }

    try {
      setLoading(true);
      
      await classService.registerForClass(
        classItem.id,
        user.id,
        status,
        profile.full_name || 'User',
        user.email || ''
      );

      setRegistrationStatus(status);
      onRegistrationChange?.(status);
      
      toast.success(status === 'interested' 
        ? 'Added to your interest list!' 
        : 'Successfully registered for class!'
      );
      
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRegister = () => {
    if (registrationStatus === 'none') {
      handleRegistration('registered');
    }
  };

  const handleToggleInterested = () => {
    if (registrationStatus === 'interested') {
      setRegistrationStatus('none');
      onRegistrationChange?.('none');
      toast.success('Removed from interest list');
    } else {
      handleRegistration('interested');
    }
  };

  if (registrationStatus === 'registered') {
    return (
      <Button 
        variant="outline" 
        size={size}
        disabled
        className="text-green-600 border-green-600 bg-green-50 dark:bg-green-900/20"
      >
        <Check className="w-4 h-4 mr-2" />
        Registered
      </Button>
    );
  }

  return (
    <div className="flex gap-2">
      <Button 
        onClick={handleQuickRegister}
        disabled={loading}
        variant={variant}
        size={size}
        className="flex-1"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <User className="w-4 h-4 mr-2" />
        )}
        Register
      </Button>
      
      {showInterested && (
        <Button
          onClick={handleToggleInterested}
          disabled={loading}
          variant="outline"
          size={size}
          className={registrationStatus === 'interested' 
            ? 'text-red-600 border-red-600 bg-red-50 dark:bg-red-900/20' 
            : ''
          }
        >
          <Heart 
            className={`w-4 h-4 ${registrationStatus === 'interested' ? 'fill-current' : ''}`} 
          />
        </Button>
      )}
    </div>
  );
}