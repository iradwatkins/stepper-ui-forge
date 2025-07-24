
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
import { LoginDialog } from './LoginDialog'
import { RegisterDialog } from './RegisterDialog'
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
  const [showLogin, setShowLogin] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  
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
  
  // Show sign-in and join buttons for non-authenticated users
  if (!user) {
    console.log('👤 UserProfile: Rendering sign-in/join buttons (no user)')
    return (
      <>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 px-3 text-xs sm:text-sm"
          onClick={() => setShowLogin(true)}
        >
          Sign In / Register
        </Button>
        
        <LoginDialog 
          isOpen={showLogin} 
          onClose={() => setShowLogin(false)}
        />
        
        <RegisterDialog 
          isOpen={showRegister} 
          onClose={() => setShowRegister(false)}
        />
      </>
    )
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
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium leading-none">
                {user.user_metadata?.full_name || profile?.full_name || 'User'}
              </p>
              {isNewlyAuthenticated && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                  Welcome!
                </Badge>
              )}
            </div>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
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
        
        {/* Profile section with emphasis */}
        <DropdownMenuItem asChild>
          <Link to="/dashboard/profile" className="flex items-center">
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Profile</span>
            {isNewlyAuthenticated && (
              <Badge variant="outline" className="ml-auto text-xs">
                Start here
              </Badge>
            )}
            {showCompletionPrompt && profileCompletion < 100 && (
              <AlertCircleIcon className="ml-auto h-3 w-3 text-orange-500" />
            )}
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link to="/dashboard">
            <LayoutDashboardIcon className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <Link to="/my-tickets">
            <TicketIcon className="mr-2 h-4 w-4" />
            <span>My Tickets</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/dashboard/notifications">
            <BellIcon className="mr-2 h-4 w-4" />
            <span>Notifications</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/dashboard/settings">
            <SettingsIcon className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-600 focus:text-red-600"
          onClick={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOutIcon className="mr-2 h-4 w-4" />
          )}
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
