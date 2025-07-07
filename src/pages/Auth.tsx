import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useIsAdmin } from '@/lib/hooks/useAdminPermissions'

export default function Auth() {
  const { user } = useAuth()
  const { isAdmin, loading } = useIsAdmin()
  const navigate = useNavigate()

  useEffect(() => {
    if (user && !loading) {
      if (isAdmin) {
        navigate('/admin')
      } else {
        navigate('/dashboard')
      }
    }
  }, [user, isAdmin, loading, navigate])

  if (user && loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return null
  }

  // Redirect to account login
  if (typeof window !== 'undefined') {
    window.location.href = '/account'
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <p>Redirecting to login...</p>
      </div>
    </div>
  )
}