import { UnifiedAuthModal } from './UnifiedAuthModal'
import { Button } from '@/components/ui/button'
import { LogInIcon, UserPlusIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuthButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  children?: React.ReactNode
  mode?: 'unified' | 'signin' | 'signup'
}

export const AuthButton = ({ 
  variant = 'default',
  size = 'sm',
  className,
  children,
  mode = 'unified'
}: AuthButtonProps) => {
  
  // Button content based on mode
  const getButtonContent = () => {
    if (children) return children
    
    switch (mode) {
      case 'signin':
        return (
          <>
            <LogInIcon className="w-4 h-4 mr-2" />
            Sign In
          </>
        )
      case 'signup':
        return (
          <>
            <UserPlusIcon className="w-4 h-4 mr-2" />
            Join Now
          </>
        )
      default:
        return (
          <>
            <LogInIcon className="w-4 h-4 mr-2" />
            Sign In / Register
          </>
        )
    }
  }

  // Modal title based on mode
  const getModalTitle = () => {
    switch (mode) {
      case 'signin':
        return 'Welcome Back'
      case 'signup':
        return 'Join Steppers Life'
      default:
        return 'Sign In / Register'
    }
  }

  // Modal description based on mode
  const getModalDescription = () => {
    switch (mode) {
      case 'signin':
        return 'Sign in to access your dashboard and manage your events'
      case 'signup':
        return 'Join our community to discover and create amazing events'
      default:
        return 'Choose your preferred method to get started'
    }
  }

  const trigger = (
    <Button 
      variant={variant} 
      size={size} 
      className={cn("transition-all duration-200", className)}
    >
      {getButtonContent()}
    </Button>
  )

  return (
    <UnifiedAuthModal
      trigger={trigger}
      title={getModalTitle()}
      description={getModalDescription()}
    />
  )
}