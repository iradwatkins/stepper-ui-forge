// Follower Management Dashboard Page
// Full page view for managing followers and their permissions

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { FollowerManagementDashboard } from "@/components/dashboard/FollowerManagementDashboard"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function FollowerManagementPage() {
  const { user, loading } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      setError("Please sign in to access follower management")
    }
  }, [user, loading])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please sign in to access follower management.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Follower Management</h1>
        <p className="text-muted-foreground">
          Manage your followers and their permissions
        </p>
      </div>
      
      <FollowerManagementDashboard organizerId={user.id} />
    </div>
  )
}