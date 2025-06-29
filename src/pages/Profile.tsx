import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ProfileService } from '@/lib/profiles'
import { Profile as ProfileType } from '@/types/database'
import { SupabaseStatus } from '@/components/SupabaseStatus'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import {
  User,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  Upload,
  Save,
  Shield,
  Bell,
  Eye,
  EyeOff
} from 'lucide-react'

export default function Profile() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [profile, setProfile] = useState<ProfileType | null>(null)

  // Profile form state
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    bio: '',
    website: '',
    phone: '',
    location: '',
    organization: '',
    socialLinks: {
      twitter: '',
      instagram: '',
      linkedin: '',
      facebook: ''
    }
  })

  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailMarketing: true,
    emailUpdates: true,
    emailTickets: true,
    pushNotifications: true,
    smsNotifications: false
  })

  // Privacy settings
  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    showEmail: false,
    showPhone: false,
    showEvents: true
  })

  // Load profile data on mount
  useEffect(() => {
    if (user?.id) {
      loadProfile()
    }
  }, [user?.id])

  const loadProfile = async () => {
    if (!user?.id) return

    try {
      const profileData = await ProfileService.getProfile(user.id)
      if (profileData) {
        setProfile(profileData)
        setProfileData({
          fullName: profileData.full_name || '',
          email: profileData.email,
          bio: profileData.bio || '',
          website: profileData.website || '',
          phone: profileData.phone || '',
          location: profileData.location || '',
          organization: profileData.organization || '',
          socialLinks: {
            twitter: (profileData.social_links as Record<string, string>)?.twitter || '',
            instagram: (profileData.social_links as Record<string, string>)?.instagram || '',
            linkedin: (profileData.social_links as Record<string, string>)?.linkedin || '',
            facebook: (profileData.social_links as Record<string, string>)?.facebook || ''
          }
        })
        setNotifications(profileData.notification_preferences)
        setPrivacy(profileData.privacy_settings)
      } else {
        // Create initial profile if it doesn't exist
        const newProfile = await ProfileService.createProfile({
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || '',
        })
        if (newProfile) {
          setProfile(newProfile)
          setProfileData(prev => ({
            ...prev,
            fullName: newProfile.full_name || '',
            email: newProfile.email
          }))
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      toast({
        title: "Error loading profile",
        description: "Failed to load profile data. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleProfileUpdate = async () => {
    if (!user?.id) return

    setIsLoading(true)
    try {
      const updates = {
        full_name: profileData.fullName,
        bio: profileData.bio,
        website: profileData.website,
        phone: profileData.phone,
        location: profileData.location,
        organization: profileData.organization,
        social_links: profileData.socialLinks
      }

      const updatedProfile = await ProfileService.updateProfile(user.id, updates)
      if (updatedProfile) {
        setProfile(updatedProfile)
        toast({
          title: "Profile updated",
          description: "Your profile has been successfully updated.",
        })
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleNotificationsUpdate = async () => {
    if (!user?.id) return

    try {
      await ProfileService.updateNotificationPreferences(user.id, notifications)
      toast({
        title: "Notifications updated",
        description: "Your notification preferences have been saved.",
      })
    } catch (error) {
      console.error('Error updating notifications:', error)
      toast({
        title: "Update failed",
        description: "Failed to update notification preferences.",
        variant: "destructive"
      })
    }
  }

  const handlePrivacyUpdate = async () => {
    if (!user?.id) return

    try {
      await ProfileService.updatePrivacySettings(user.id, privacy)
      toast({
        title: "Privacy settings updated",
        description: "Your privacy settings have been saved.",
      })
    } catch (error) {
      console.error('Error updating privacy settings:', error)
      toast({
        title: "Update failed",
        description: "Failed to update privacy settings.",
        variant: "destructive"
      })
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user?.id || !event.target.files?.[0]) return

    const file = event.target.files[0]
    
    try {
      setIsLoading(true)
      const avatarUrl = await ProfileService.uploadAvatar(user.id, file)
      if (avatarUrl && profile) {
        setProfile({ ...profile, avatar_url: avatarUrl })
        toast({
          title: "Avatar uploaded",
          description: "Your profile picture has been updated.",
        })
      }
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast({
        title: "Upload failed",
        description: "Failed to upload avatar. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Supabase Status */}
      <SupabaseStatus />

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage
                  src={profile?.avatar_url || user?.user_metadata?.avatar_url}
                  alt={profileData.fullName || profileData.email}
                />
                <AvatarFallback className="text-lg">
                  {profileData.fullName
                    ? profileData.fullName
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase()
                    : profileData.email[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute -bottom-2 -right-2 cursor-pointer"
              >
                <Button
                  size="sm"
                  variant="secondary"
                  className="pointer-events-none"
                  disabled={isLoading}
                >
                  <Upload className="h-3 w-3" />
                </Button>
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {profileData.fullName || 'User Profile'}
              </h1>
              <p className="text-gray-600">{profileData.email}</p>
              {profileData.organization && (
                <p className="text-sm text-gray-500 mt-1">
                  {profileData.organization}
                </p>
              )}
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="secondary">Event Organizer</Badge>
                <Badge variant="outline">Verified</Badge>
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-500">Member since</p>
              <p className="font-medium">
                {new Date(user?.created_at || Date.now()).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your profile information and public details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={profileData.fullName}
                    onChange={(e) => setProfileData(prev => ({
                      ...prev,
                      fullName: e.target.value
                    }))}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">
                    Email cannot be changed from this page
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData(prev => ({
                      ...prev,
                      phone: e.target.value
                    }))}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={profileData.location}
                    onChange={(e) => setProfileData(prev => ({
                      ...prev,
                      location: e.target.value
                    }))}
                    placeholder="City, State, Country"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={profileData.website}
                    onChange={(e) => setProfileData(prev => ({
                      ...prev,
                      website: e.target.value
                    }))}
                    placeholder="https://yourwebsite.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organization">Organization</Label>
                  <Input
                    id="organization"
                    value={profileData.organization}
                    onChange={(e) => setProfileData(prev => ({
                      ...prev,
                      organization: e.target.value
                    }))}
                    placeholder="Company or organization name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profileData.bio}
                  onChange={(e) => setProfileData(prev => ({
                    ...prev,
                    bio: e.target.value
                  }))}
                  placeholder="Tell us about yourself..."
                  rows={4}
                />
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-4">Social Links</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(profileData.socialLinks).map(([platform, url]) => (
                    <div key={platform} className="space-y-2">
                      <Label htmlFor={platform} className="capitalize">
                        {platform}
                      </Label>
                      <Input
                        id={platform}
                        value={url}
                        onChange={(e) => setProfileData(prev => ({
                          ...prev,
                          socialLinks: {
                            ...prev.socialLinks,
                            [platform]: e.target.value
                          }
                        }))}
                        placeholder={`Your ${platform} URL`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleProfileUpdate} disabled={isLoading}>
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account security and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Security</h4>
                <div className="space-y-3">
                  <Button variant="outline" className="justify-start">
                    <Shield className="mr-2 h-4 w-4" />
                    Change Password
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Shield className="mr-2 h-4 w-4" />
                    Enable Two-Factor Authentication
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Account Actions</h4>
                <div className="space-y-3">
                  <Button variant="outline" className="justify-start">
                    <User className="mr-2 h-4 w-4" />
                    Download Account Data
                  </Button>
                  <Button variant="destructive" className="justify-start">
                    <User className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified about updates and activities.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(notifications).map(([key, enabled]) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </p>
                    <p className="text-sm text-gray-500">
                      Receive notifications about this activity
                    </p>
                  </div>
                  <Button
                    variant={enabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNotifications(prev => ({
                      ...prev,
                      [key]: !enabled
                    }))}
                  >
                    {enabled ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
              ))}
              
              <div className="flex justify-end">
                <Button onClick={handleNotificationsUpdate}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Notification Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>
                Control what information is visible to others.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(privacy).map(([key, enabled]) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {enabled ? (
                      <Eye className="h-4 w-4 text-green-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </p>
                      <p className="text-sm text-gray-500">
                        {enabled ? 'Visible to others' : 'Hidden from others'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={enabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPrivacy(prev => ({
                      ...prev,
                      [key]: !enabled
                    }))}
                  >
                    {enabled ? 'Public' : 'Private'}
                  </Button>
                </div>
              ))}
              
              <div className="flex justify-end">
                <Button onClick={handlePrivacyUpdate}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Privacy Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}