import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useIsAdmin } from '@/lib/hooks/useAdminPermissions'
import { User } from 'lucide-react'
import { UnifiedAuthModal } from '@/components/auth/UnifiedAuthModal'

export default function AccountAuth() {
  const { user } = useAuth()
  const { loading } = useIsAdmin()
  const navigate = useNavigate()

  useEffect(() => {
    if (user && !loading) {
      // Both admin and regular users go to events page after authentication
      navigate('/events')
    }
  }, [user, loading, navigate])

  if (user && loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Signing you in...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return null
  }

  return (
    <UnifiedAuthModal
      mode="page"
      title="Welcome to Steppers Life"
      description="Sign in to your account or create a new one to get started"
      defaultMode="signin"
    />
  )
}