import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useIsAdmin } from '@/lib/hooks/useAdminPermissions'
import { UnifiedAuthModal } from '@/components/auth/UnifiedAuthModal'
import { User } from 'lucide-react'

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
    <div className="relative">
      <UnifiedAuthModal 
        mode="page"
        title="Welcome to Steppers"
        description="Sign in to your account or create a new one"
      />
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          Administrator? <a href="/admin" className="text-primary hover:underline">Admin login</a>
        </p>
      </div>
    </div>
  )
}