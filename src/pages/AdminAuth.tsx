import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useIsAdmin } from '@/lib/hooks/useAdminPermissions'
import { useAdminSetup } from '@/hooks/useAdminSetup'
import { Auth as AuthComponent } from '@/components/auth/Auth'
import { Shield } from 'lucide-react'

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
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Admin Portal
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Restricted access for administrators only
          </p>
        </div>
        <AuthComponent />
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Regular user? <a href="/account" className="text-primary hover:underline">Login here</a>
          </p>
        </div>
      </div>
    </div>
  )
}