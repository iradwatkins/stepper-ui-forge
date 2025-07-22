// AuthGuard Component - Enforces authentication-first policy
// Wraps interactive elements to require login for ANY user interaction

import React, { ReactNode, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Lock, UserPlus, Heart, Users, ShoppingCart, Calendar } from 'lucide-react'
import { Auth } from './Auth'

interface AuthGuardProps {
  children: ReactNode
  action?: 'follow' | 'like' | 'share' | 'cart' | 'register' | 'interact'
  fallback?: ReactNode
  className?: string
}

interface LoginPromptProps {
  action: string
  icon: ReactNode
  title: string
  description: string
}

const LoginPrompt: React.FC<LoginPromptProps> = ({ action, icon, title, description }) => (
  <Card className="w-full max-w-md">
    <CardHeader className="text-center">
      <div className="flex justify-center mb-2">
        <div className="p-3 bg-primary/10 rounded-full">
          {icon}
        </div>
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <Auth />
    </CardContent>
  </Card>
)

const getActionConfig = (action: string) => {
  switch (action) {
    case 'follow':
      return {
        icon: <Users className="h-6 w-6 text-primary" />,
        title: 'Login to Follow',
        description: 'Create an account or sign in to follow organizers and stay updated on their events.'
      }
    case 'like':
      return {
        icon: <Heart className="h-6 w-6 text-primary" />,
        title: 'Login to Like Events',
        description: 'Create an account or sign in to like events and build your personal collection.'
      }
    case 'share':
      return {
        icon: <Calendar className="h-6 w-6 text-primary" />,
        title: 'Login to Share',
        description: 'Create an account or sign in to share events with your network.'
      }
    case 'cart':
      return {
        icon: <ShoppingCart className="h-6 w-6 text-primary" />,
        title: 'Login to Purchase',
        description: 'Create an account or sign in to register for events and purchase tickets.'
      }
    case 'register':
      return {
        icon: <Calendar className="h-6 w-6 text-primary" />,
        title: 'Login to Register',
        description: 'Create an account or sign in to register for this event.'
      }
    default:
      return {
        icon: <Lock className="h-6 w-6 text-primary" />,
        title: 'Login Required',
        description: 'Create an account or sign in to access this feature.'
      }
  }
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  action = 'interact',
  fallback,
  className
}) => {
  const { user, loading } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const config = getActionConfig(action)

  // Show loading state
  if (loading) {
    return (
      <div className={className}>
        <div className="animate-pulse bg-gray-200 rounded h-8 w-20"></div>
      </div>
    )
  }

  // If user is authenticated, render the children normally
  if (user) {
    return <>{children}</>
  }

  // For anonymous users, show fallback or login prompt
  if (fallback) {
    return <>{fallback}</>
  }

  // Default: Show a disabled version that opens login dialog
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className={className}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(true)}
            className="opacity-60 hover:opacity-80"
          >
            <Lock className="h-4 w-4 mr-2" />
            Login to {action}
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="sr-only">{config.title}</DialogTitle>
        <LoginPrompt
          action={action}
          icon={config.icon}
          title={config.title}
          description={config.description}
        />
      </DialogContent>
    </Dialog>
  )
}

// Higher-order component version for easier usage
export const withAuthGuard = <P extends object>(
  Component: React.ComponentType<P>,
  action?: AuthGuardProps['action']
) => {
  return (props: P) => (
    <AuthGuard action={action}>
      <Component {...props} />
    </AuthGuard>
  )
}

// Pre-configured AuthGuard components for common actions
export const FollowGuard: React.FC<Omit<AuthGuardProps, 'action'>> = (props) => (
  <AuthGuard {...props} action="follow" />
)

export const LikeGuard: React.FC<Omit<AuthGuardProps, 'action'>> = (props) => (
  <AuthGuard {...props} action="like" />
)

export const ShareGuard: React.FC<Omit<AuthGuardProps, 'action'>> = (props) => (
  <AuthGuard {...props} action="share" />
)

export const CartGuard: React.FC<Omit<AuthGuardProps, 'action'>> = (props) => (
  <AuthGuard {...props} action="cart" />
)

export const RegisterGuard: React.FC<Omit<AuthGuardProps, 'action'>> = (props) => (
  <AuthGuard {...props} action="register" />
)