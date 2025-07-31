
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { UserIcon, LogOutIcon, Loader2Icon, LayoutDashboardIcon, TicketIcon, BellIcon, SettingsIcon, SparklesIcon, AlertCircleIcon } from 'lucide-react'
import { HeaderAuth } from './HeaderAuth'
import { ProfileService } from '@/lib/profiles'
import { Database } from '@/types/database'
import { AvatarService } from '@/lib/avatars'

type Profile = Database['public']['Tables']['profiles']['Row']

export const UserProfile = () => {
  const { user, signOut, loading, authStateId } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isNewlyAuthenticated, setIsNewlyAuthenticated] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileCompletion, setProfileCompletion] = useState(0)
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false)
  
  // Calculate profile completion percentage
  const calculateProfileCompletion = (profileData: Profile | null) => {
    if (!profileData) return 0
    
    const criteria = [
      !!profileData.full_name,
      !!profileData.avatar_url,
      !!profileData.bio,
      !!profileData.location,
      !!profileData.phone,
      !!profileData.website || !!profileData.social_links?.twitter || !!profileData.social_links?.instagram,
    ]
    
    const completedCriteria = criteria.filter(Boolean).length
    return Math.round((completedCriteria / criteria.length) * 100)
  }
  
  // Load profile data for completion check
  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        try {
          const profileData = await ProfileService.getProfile(user.id)
          setProfile(profileData)
          const completion = calculateProfileCompletion(profileData)
          setProfileCompletion(completion)
          
          // Show completion prompt if profile is less than 50% complete
          if (completion < 50) {
            setShowCompletionPrompt(true)
          }
        } catch (error) {
          console.error('Error loading profile:', error)
        }
      }
    }
    
    loadProfile()
  }, [user])
  
  // Debug logging for user state changes with improved logic
  useEffect(() => {
    console.log('👤 UserProfile: State changed - Loading:', loading, 'User:', user ? 'USER_PRESENT' : 'USER_NULL', 'AuthStateId:', authStateId)
    
    if (user) {
      console.log('👤 UserProfile: User email:', user.email)
      console.log('👤 UserProfile: Provider:', user.app_metadata?.provider)
      console.log('👤 UserProfile: Google data:', {
        avatar_url: user.user_metadata?.avatar_url || user.raw_user_meta_data?.avatar_url,
        picture: user.user_metadata?.picture || user.raw_user_meta_data?.picture,
        full_name: user.user_metadata?.full_name || user.raw_user_meta_data?.full_name,
        name: user.user_metadata?.name || user.raw_user_meta_data?.name
      })
      console.log('✅ Authentication successful - User profile loaded!')
      
      // Show highlight for newly authenticated users
      setIsNewlyAuthenticated(true)
      const timer = setTimeout(() => setIsNewlyAuthenticated(false), 8000)
      return () => clearTimeout(timer)
    }
  }, [user, loading, authStateId])

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setIsSigningOut(false)
    }
  }

  // Show loading spinner while auth state is being determined
  if (loading) {
    console.log('👤 UserProfile: Rendering loading state')
    return (
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
      </Button>
    )
  }
  
  // Show HeaderAuth for non-authenticated users
  if (!user) {
    console.log('👤 UserProfile: Rendering HeaderAuth for non-authenticated user')
    return <HeaderAuth />
  }
  
  console.log('👤 UserProfile: Rendering user dropdown (user present)')
  console.log('✅ HEADER UPDATE: Sign In button changed to user profile dropdown!')

  // Get user avatar and initials using the AvatarService
  const userAvatarUrl = AvatarService.getAvatarUrl(user, profile)
  const userInitials = AvatarService.getInitials(user, profile)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className={`relative h-8 w-8 rounded-full transition-all duration-300 ${
            isNewlyAuthenticated 
              ? 'ring-2 ring-primary ring-offset-2 ring-offset-background animate-pulse' 
              : ''
          }`}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={userAvatarUrl} alt={user.email || ''} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
          {isNewlyAuthenticated && (
            <Badge 
              variant="secondary" 
              className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs bg-green-500 hover:bg-green-600 text-white"
            >
              <SparklesIcon className="h-2 w-2" />
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" forceMount>
        {/* User Profile Header */}
        <div className="px-4 py-3 bg-gradient-to-br from-primary/5 to-primary/10 border-b">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
              <AvatarImage src={userAvatarUrl} alt={user.email || ''} />
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold leading-none">
                  {user.user_metadata?.full_name || profile?.full_name || 'Stepper'}
                </p>
                {isNewlyAuthenticated && (
                  <Badge variant="secondary" className="text-xs bg-green-500 text-white animate-pulse">
                    <SparklesIcon className="w-3 h-3 mr-1" />
                    New
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
              {profile?.location && (
                <p className="text-xs text-muted-foreground flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                  {profile.location}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Profile completion section */}
        {showCompletionPrompt && profileCompletion < 100 && (
          <div className="px-2 py-2 text-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-muted-foreground">Profile completion</span>
              <span className="text-xs text-muted-foreground">{profileCompletion}%</span>
            </div>
            <Progress value={profileCompletion} className="h-1 mb-2" />
            <p className="text-xs text-muted-foreground">
              {profileCompletion < 50 ? 'Complete your profile to unlock all features' : 'Almost done!'}
            </p>
          </div>
        )}
        
        {/* Quick Actions */}
        <div className="p-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Link to="/dashboard">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <LayoutDashboardIcon className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link to="/my-tickets">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <TicketIcon className="mr-2 h-4 w-4" />
                Tickets
              </Button>
            </Link>
          </div>
        </div>
        
        <DropdownMenuSeparator />
        
        {/* Main Menu */}
        <div className="p-1">
          <DropdownMenuItem asChild>
            <Link to="/dashboard/profile" className="flex items-center px-3 py-2 rounded-md cursor-pointer">
              <UserIcon className="mr-3 h-4 w-4 text-muted-foreground" />
              <span className="flex-1">Profile</span>
              {showCompletionPrompt && profileCompletion < 100 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{profileCompletion}%</span>
                  <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${profileCompletion}%` }}
                    />
                  </div>
                </div>
              )}
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <Link to="/dashboard/notifications" className="flex items-center px-3 py-2 rounded-md cursor-pointer">
              <BellIcon className="mr-3 h-4 w-4 text-muted-foreground" />
              <span className="flex-1">Notifications</span>
              <Badge variant="secondary" className="text-xs">3</Badge>
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <Link to="/dashboard/settings" className="flex items-center px-3 py-2 rounded-md cursor-pointer">
              <SettingsIcon className="mr-3 h-4 w-4 text-muted-foreground" />
              <span>Account Settings</span>
            </Link>
          </DropdownMenuItem>
        </div>
        
        <DropdownMenuSeparator />
        
        {/* Sign Out */}
        <div className="p-1">
          <DropdownMenuItem
            className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 px-3 py-2 rounded-md cursor-pointer"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <Loader2Icon className="mr-3 h-4 w-4 animate-spin" />
            ) : (
              <LogOutIcon className="mr-3 h-4 w-4" />
            )}
            <span>Sign out</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
