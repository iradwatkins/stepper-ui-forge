import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useIsAdmin } from '@/lib/hooks/useAdminPermissions'
import { useAdminSetup } from '@/hooks/useAdminSetup'
import { Shield } from 'lucide-react'
import { UnifiedAuthModal } from '@/components/auth/UnifiedAuthModal'
import { Button } from '@/components/ui/button'

export default function AdminAuth() {
  const { user } = useAuth()
  const { isAdmin, loading } = useIsAdmin()
  const { setupAttempted, setupResult, isDesignatedAdmin } = useAdminSetup()
  const navigate = useNavigate()

  useEffect(() => {
    if (user && !loading) {
      if (isAdmin) {
        // Redirect admins to dashboard where admin panel is integrated
        navigate('/dashboard')
      } else {
        // Redirect non-admin users to events page
        navigate('/events')
      }
    }
  }, [user, isAdmin, loading, navigate])

  if (user && loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Verifying admin access...</p>
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
      title="Admin Portal Access"
      description="Sign in with your administrator credentials"
      defaultMode="signin"
    />
  )
}