import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UnifiedAuthModal } from './UnifiedAuthModal'
import { LogInIcon, UserPlusIcon, SparklesIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderAuthProps {
  className?: string
}

export const HeaderAuth = ({ className }: HeaderAuthProps) => {
  const [isHovered, setIsHovered] = useState(false)
  const [showSignUp, setShowSignUp] = useState(false)

  return (
    <div 
      className={cn("flex items-center gap-2", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Sign In Button */}
      <UnifiedAuthModal
        trigger={
          <Button 
            variant="ghost" 
            size="sm"
            className={cn(
              "relative h-9 px-4 font-medium transition-all duration-300",
              "hover:bg-primary/10 hover:text-primary",
              "focus:bg-primary/10 focus:text-primary",
              isHovered && "pr-3"
            )}
          >
            <LogInIcon className={cn(
              "w-4 h-4 transition-all duration-300",
              isHovered ? "mr-2" : "mr-1.5"
            )} />
            <span className={cn(
              "transition-all duration-300",
              isHovered && "font-semibold"
            )}>
              Sign In
            </span>
          </Button>
        }
        title="Welcome Back"
        description="Sign in to access your dashboard and manage your events"
        defaultMode="signin"
      />

      {/* Get Started Button - Shows on hover or mobile */}
      <div className={cn(
        "transition-all duration-300 ease-out",
        isHovered || showSignUp ? "opacity-100 scale-100" : "opacity-0 scale-95 w-0 overflow-hidden md:invisible"
      )}>
        <UnifiedAuthModal
          trigger={
            <Button 
              variant="default" 
              size="sm"
              className={cn(
                "h-9 px-4 font-medium bg-primary hover:bg-primary/90",
                "transition-all duration-300 shadow-sm hover:shadow-md",
                "relative overflow-hidden group"
              )}
              onFocus={() => setShowSignUp(true)}
              onBlur={() => setShowSignUp(false)}
            >
              {/* Animated background effect */}
              <span className="absolute inset-0 bg-gradient-to-r from-primary-foreground/10 to-primary-foreground/5 
                             translate-x-[-100%] group-hover:translate-x-[100%] 
                             transition-transform duration-700 ease-out" />
              
              <UserPlusIcon className="w-4 h-4 mr-2 relative z-10" />
              <span className="relative z-10">Get Started</span>
              
              {/* Sparkle effect */}
              <SparklesIcon className="w-3 h-3 ml-1 relative z-10 animate-pulse" />
            </Button>
          }
          title="Join Steppers Life"
          description="Create your account and join our vibrant community"
          defaultMode="signup"
        />
      </div>
    </div>
  )
}