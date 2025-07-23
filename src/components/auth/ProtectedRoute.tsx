import { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { UnifiedAuthModal } from './UnifiedAuthModal'
import { Loader2Icon } from 'lucide-react'

interface ProtectedRouteProps {
  children: ReactNode
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2Icon className="w-6 h-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <UnifiedAuthModal isOpen={true} onOpenChange={() => {}} />
  }

  return <>{children}</>
}