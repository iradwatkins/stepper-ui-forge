// Intent-aware signup prompt component
// Shows contextual signup messages based on user intentions

import { useSignupIntent } from '@/lib/hooks/useSignupIntent'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserPlus, ShoppingCart, Calendar, Users, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface IntentAwareSignupPromptProps {
  className?: string
  showAsModal?: boolean
  onClose?: () => void
}

export const IntentAwareSignupPrompt: React.FC<IntentAwareSignupPromptProps> = ({ 
  className,
  showAsModal = false,
  onClose 
}) => {
  const { 
    shouldShowSignupPrompt, 
    signupPromptMessage, 
    intentType,
    isExecutingIntent,
    intentMessage 
  } = useSignupIntent()
  const navigate = useNavigate()

  if (!shouldShowSignupPrompt && !isExecutingIntent && !intentMessage) {
    return null
  }

  // Show success/error message after intent execution
  if (intentMessage) {
    return (
      <Alert className={className}>
        <AlertDescription>{intentMessage}</AlertDescription>
      </Alert>
    )
  }

  // Show loading state during intent execution
  if (isExecutingIntent) {
    return (
      <Alert className={className}>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <AlertDescription>Setting up your account...</AlertDescription>
      </Alert>
    )
  }

  const getIcon = () => {
    switch (intentType) {
      case 'follow_organizer':
        return <Users className="h-6 w-6" />
      case 'purchase_tickets':
        return <ShoppingCart className="h-6 w-6" />
      case 'create_event':
        return <Calendar className="h-6 w-6" />
      default:
        return <UserPlus className="h-6 w-6" />
    }
  }

  const getTitle = () => {
    switch (intentType) {
      case 'follow_organizer':
        return 'Follow This Organizer'
      case 'purchase_tickets':
        return 'Complete Your Purchase'
      case 'create_event':
        return 'Create Your Event'
      case 'referral_click':
        return 'Welcome!'
      default:
        return 'Join SteppersLife'
    }
  }

  const getDescription = () => {
    switch (intentType) {
      case 'follow_organizer':
        return 'Create an account to follow this organizer and get notified about their events.'
      case 'purchase_tickets':
        return 'Create an account to complete your ticket purchase securely.'
      case 'create_event':
        return 'Create an account to start organizing your own events.'
      case 'referral_click':
        return 'Create an account to access exclusive content and offers.'
      default:
        return 'Join our community to access all features.'
    }
  }

  const handleSignUp = () => {
    navigate('/auth')
    onClose?.()
  }

  const handleSignIn = () => {
    navigate('/auth')
    onClose?.()
  }

  const content = (
    <Card className={className}>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          {getIcon()}
        </div>
        <CardTitle className="text-xl">{getTitle()}</CardTitle>
        <CardDescription className="text-base">
          {signupPromptMessage}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          {getDescription()}
        </p>
        <div className="space-y-3">
          <Button 
            onClick={handleSignUp}
            className="w-full"
            size="lg"
          >
            Sign Up
          </Button>
          <Button 
            onClick={handleSignIn}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Sign In
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  if (showAsModal) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="max-w-md w-full">
          {content}
        </div>
      </div>
    )
  }

  return content
}

// Compact version for inline use
export const CompactSignupPrompt: React.FC<{ className?: string }> = ({ className }) => {
  const { shouldShowSignupPrompt, signupPromptMessage } = useSignupIntent()
  const navigate = useNavigate()

  if (!shouldShowSignupPrompt) {
    return null
  }

  return (
    <Alert className={className}>
      <UserPlus className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{signupPromptMessage}</span>
        <div className="space-x-2 ml-4">
          <Button 
            size="sm" 
            onClick={() => navigate('/auth')}
          >
            Sign Up
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => navigate('/auth')}
          >
            Sign In
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}

// Hook for showing signup prompt in existing components
export const useSignupPrompt = () => {
  const { shouldShowSignupPrompt, signupPromptMessage, intentType } = useSignupIntent()
  const navigate = useNavigate()

  const showSignupModal = () => {
    navigate('/auth')
  }

  const showSigninModal = () => {
    navigate('/auth')
  }

  return {
    shouldShow: shouldShowSignupPrompt,
    message: signupPromptMessage,
    intentType,
    showSignupModal,
    showSigninModal
  }
}