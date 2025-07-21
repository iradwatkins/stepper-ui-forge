import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { setupInitialAdmin } from '@/lib/admin/setupAdmin'

export const useAdminSetup = () => {
  const { user } = useAuth()
  const [setupAttempted, setSetupAttempted] = useState(false)
  const [setupResult, setSetupResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  useEffect(() => {
    const performAdminSetup = async () => {
      if (!user || setupAttempted) return
      
      // Only attempt setup for the designated admin email
      if (user.email === import.meta.env.VITE_ADMIN_EMAIL) {
        console.log('Performing admin setup for designated admin user')
        setSetupAttempted(true)
        
        try {
          const result = await setupInitialAdmin()
          setSetupResult(result)
          
          if (result.success) {
            console.log('Admin setup completed successfully')
          } else {
            console.warn('Admin setup failed:', result.message)
          }
        } catch (error) {
          console.error('Admin setup error:', error)
          setSetupResult({
            success: false,
            message: 'Admin setup failed with an error'
          })
        }
      }
    }

    performAdminSetup()
  }, [user, setupAttempted])

  return {
    setupAttempted,
    setupResult,
    isDesignatedAdmin: user?.email === import.meta.env.VITE_ADMIN_EMAIL
  }
}