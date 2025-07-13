// Hold Timer Component
// Created for B-011: Real-time Inventory Management System

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HoldTimerProps {
  expiresAt: Date;
  onExpired?: () => void;
  onExtend?: () => void;
  showExtendButton?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'inline' | 'prominent';
}

export function HoldTimer({
  expiresAt,
  onExpired,
  onExtend,
  showExtendButton = false,
  className = '',
  size = 'md',
  variant = 'badge'
}: HoldTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, expiresAt.getTime() - now);
      
      setTimeRemaining(remaining);
      
      if (remaining === 0 && !isExpired) {
        setIsExpired(true);
        onExpired?.();
      }
    };

    // Update immediately
    updateTimer();

    // Set up interval to update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, isExpired, onExpired]);

  const formatTime = (ms: number): string => {
    if (ms === 0) return '0:00';
    
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getUrgencyLevel = (): 'normal' | 'warning' | 'critical' | 'expired' => {
    if (isExpired || timeRemaining === 0) return 'expired';
    if (timeRemaining <= 60000) return 'critical'; // Last minute
    if (timeRemaining <= 300000) return 'warning'; // Last 5 minutes
    return 'normal';
  };

  const urgencyLevel = getUrgencyLevel();
  const formattedTime = formatTime(timeRemaining);

  // Styling based on variant and urgency
  const getStyles = () => {
    const baseStyles = {
      normal: 'text-green-600 bg-green-50 border-green-200',
      warning: 'text-orange-600 bg-orange-50 border-orange-200',
      critical: 'text-red-600 bg-red-50 border-red-200 animate-pulse',
      expired: 'text-gray-500 bg-gray-50 border-gray-200'
    };

    const sizeStyles = {
      sm: 'text-xs px-2 py-1',
      md: 'text-sm px-3 py-1.5',
      lg: 'text-base px-4 py-2'
    };

    return {
      badge: cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        baseStyles[urgencyLevel],
        sizeStyles[size],
        className
      ),
      inline: cn(
        'inline-flex items-center gap-1 text-sm font-medium',
        urgencyLevel === 'expired' ? 'text-gray-500' :
        urgencyLevel === 'critical' ? 'text-red-600' :
        urgencyLevel === 'warning' ? 'text-orange-600' : 'text-green-600',
        className
      ),
      prominent: cn(
        'flex items-center gap-2 p-3 rounded-lg border',
        baseStyles[urgencyLevel],
        className
      )
    };
  };

  const getIcon = () => {
    if (urgencyLevel === 'expired') return null;
    if (urgencyLevel === 'critical' || urgencyLevel === 'warning') {
      return <AlertCircle className="h-4 w-4" />;
    }
    return <Clock className="h-4 w-4" />;
  };

  const getMessage = () => {
    switch (urgencyLevel) {
      case 'expired':
        return 'Time expired';
      case 'critical':
        return `⚠️ ${formattedTime} left!`;
      case 'warning':
        return `${formattedTime} remaining`;
      default:
        return `${formattedTime} remaining`;
    }
  };

  if (variant === 'badge') {
    return (
      <Badge className={getStyles().badge}>
        {getIcon()}
        {getMessage()}
      </Badge>
    );
  }

  if (variant === 'inline') {
    return (
      <span className={getStyles().inline}>
        {getIcon()}
        {getMessage()}
      </span>
    );
  }

  // Prominent variant
  return (
    <div className={getStyles().prominent}>
      <div className="flex items-center gap-2 flex-1">
        {getIcon()}
        <div>
          <div className="font-semibold">
            {urgencyLevel === 'expired' ? 'Hold Expired' : 'Time Remaining'}
          </div>
          <div className="text-sm">
            {urgencyLevel === 'expired' ? 
              'Your ticket hold has expired. Please start over.' : 
              getMessage()
            }
          </div>
        </div>
      </div>
      
      {showExtendButton && !isExpired && urgencyLevel !== 'expired' && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onExtend}
          className="whitespace-nowrap"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Extend
        </Button>
      )}
    </div>
  );
}

// Utility component for multiple holds
interface HoldTimerSummaryProps {
  holds: Array<{ id: string; expiresAt: Date; ticketTypeName?: string }>;
  onHoldExpired?: (holdId: string) => void;
  className?: string;
}

export function HoldTimerSummary({ 
  holds, 
  onHoldExpired, 
  className = '' 
}: HoldTimerSummaryProps) {
  if (holds.length === 0) return null;

  // Find the hold that expires soonest
  const soonestHold = holds.reduce((earliest, current) => 
    current.expiresAt < earliest.expiresAt ? current : earliest
  );

  return (
    <div className={cn('space-y-2', className)}>
      {holds.length === 1 ? (
        <HoldTimer
          expiresAt={soonestHold.expiresAt}
          onExpired={() => onHoldExpired?.(soonestHold.id)}
          variant="prominent"
        />
      ) : (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="font-semibold text-blue-900">
              {holds.length} Active Holds
            </span>
          </div>
          <div className="text-sm text-blue-700">
            Earliest expiry: 
            <HoldTimer
              expiresAt={soonestHold.expiresAt}
              onExpired={() => onHoldExpired?.(soonestHold.id)}
              variant="inline"
              className="ml-1"
            />
          </div>
          {soonestHold.ticketTypeName && (
            <div className="text-xs text-blue-600 mt-1">
              {soonestHold.ticketTypeName}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HoldTimer;