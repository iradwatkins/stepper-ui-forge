import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UnifiedAuthModal } from '@/components/auth/UnifiedAuthModal'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AvatarService } from '@/lib/avatars'
import { useEffect, useState } from 'react'
import { ProfileService } from '@/lib/profiles'
import { supabase } from '@/lib/supabase'
import { Loader2Icon, CheckCircleIcon, XCircleIcon } from 'lucide-react'

export default function AuthTest() {
  const { user, signOut, loading, refreshProfile } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [testResults, setTestResults] = useState<any>({})
  const [testing, setTesting] = useState(false)

  const addLog = (message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = `[${timestamp}] ${message}`
    console.log(logEntry, data || '')
    setLogs(prev => [...prev, logEntry])
  }

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        addLog('Loading profile for user', { userId: user.id, email: user.email })
        try {
          const profileData = await ProfileService.getProfile(user.id)
          setProfile(profileData)
          addLog('Profile loaded', profileData)
        } catch (error) {
          addLog('Error loading profile', error)
        }
      }
    }
    
    loadProfile()
  }, [user])

  // Run comprehensive tests
  const runTests = async () => {
    if (!user) {
      addLog('No user logged in - please login first')
      return
    }

    setTesting(true)
    const results: any = {}

    // Test 1: Check auth.users data
    try {
      addLog('Test 1: Checking auth.users data...')
      results.authUser = {
        id: user.id,
        email: user.email,
        provider: user.app_metadata?.provider,
        hasGoogleData: !!(user.user_metadata?.avatar_url || user.user_metadata?.picture),
        metadata: user.user_metadata,
        rawMetadata: user.raw_user_meta_data,
        identities: user.identities
      }
      addLog('Auth user data retrieved', results.authUser)
    } catch (error) {
      results.authUser = { error: error.message }
      addLog('Failed to get auth user data', error)
    }

    // Test 2: Check profile existence
    try {
      addLog('Test 2: Checking profile existence...')
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error
      
      results.profile = {
        exists: true,
        hasAvatar: !!profileData.avatar_url,
        hasFullName: !!profileData.full_name && profileData.full_name !== profileData.email.split('@')[0],
        data: profileData
      }
      addLog('Profile found', results.profile)
    } catch (error) {
      results.profile = { exists: false, error: error.message }
      addLog('Profile not found or error', error)
    }

    // Test 3: Try manual sync
    try {
      addLog('Test 3: Attempting manual profile sync...')
      const { data, error } = await supabase.rpc('sync_user_profile', { 
        user_id: user.id 
      })
      
      if (error) throw error
      
      results.syncResult = { success: true, data }
      addLog('Manual sync successful', data)
      
      // Refresh profile
      await refreshProfile()
    } catch (error) {
      results.syncResult = { success: false, error: error.message }
      addLog('Manual sync failed', error)
    }

    // Test 4: Check avatar URL
    try {
      addLog('Test 4: Testing avatar URL generation...')
      const avatarUrl = AvatarService.getAvatarUrl(user, profile)
      const initials = AvatarService.getInitials(user, profile)
      
      results.avatar = {
        url: avatarUrl,
        initials: initials,
        isGoogle: avatarUrl.includes('googleusercontent.com'),
        isFallback: avatarUrl.includes('dicebear.com')
      }
      addLog('Avatar URL generated', results.avatar)
    } catch (error) {
      results.avatar = { error: error.message }
      addLog('Avatar generation failed', error)
    }

    setTestResults(results)
    setTesting(false)
    addLog('All tests completed', results)
  }

  const userAvatarUrl = user && profile ? AvatarService.getAvatarUrl(user, profile) : null
  const userInitials = user && profile ? AvatarService.getInitials(user, profile) : 'U'

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">Google OAuth Authentication Test</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Authentication Status */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
            <CardDescription>
              Current user session information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2Icon className="w-8 h-8 animate-spin" />
              </div>
            ) : user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 ring-2 ring-primary">
                    <AvatarImage src={userAvatarUrl || undefined} />
                    <AvatarFallback className="text-2xl">{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-lg">
                      {user.user_metadata?.full_name || user.user_metadata?.name || profile?.full_name || 'No Name'}
                    </p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Provider: {user.app_metadata?.provider || 'email'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ID: {user.id}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={runTests} disabled={testing} variant="outline">
                    {testing ? (
                      <>
                        <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                        Running Tests...
                      </>
                    ) : (
                      'Run Diagnostic Tests'
                    )}
                  </Button>
                  <Button onClick={() => refreshProfile()} variant="outline">
                    Refresh Profile
                  </Button>
                  <Button onClick={signOut} variant="destructive">
                    Sign Out
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="mb-4 text-muted-foreground">Not authenticated</p>
                <UnifiedAuthModal 
                  trigger={
                    <Button size="lg">
                      Sign In with Google
                    </Button>
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Results */}
        {Object.keys(testResults).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>
                Diagnostic test outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Auth User Test */}
                <div className="flex items-start gap-2">
                  {testResults.authUser?.error ? (
                    <XCircleIcon className="w-5 h-5 text-red-500 mt-0.5" />
                  ) : (
                    <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">Auth User Data</p>
                    <p className="text-sm text-muted-foreground">
                      Provider: {testResults.authUser?.provider || 'Unknown'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Has Google Data: {testResults.authUser?.hasGoogleData ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>

                {/* Profile Test */}
                <div className="flex items-start gap-2">
                  {testResults.profile?.exists ? (
                    <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5" />
                  ) : (
                    <XCircleIcon className="w-5 h-5 text-red-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">Profile Status</p>
                    <p className="text-sm text-muted-foreground">
                      Exists: {testResults.profile?.exists ? 'Yes' : 'No'}
                    </p>
                    {testResults.profile?.exists && (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Has Avatar: {testResults.profile?.hasAvatar ? 'Yes' : 'No'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Has Full Name: {testResults.profile?.hasFullName ? 'Yes' : 'No'}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Sync Test */}
                <div className="flex items-start gap-2">
                  {testResults.syncResult?.success ? (
                    <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5" />
                  ) : (
                    <XCircleIcon className="w-5 h-5 text-red-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">Profile Sync</p>
                    <p className="text-sm text-muted-foreground">
                      {testResults.syncResult?.success ? 'Successful' : 'Failed'}
                    </p>
                    {testResults.syncResult?.error && (
                      <p className="text-sm text-red-500">
                        Error: {testResults.syncResult.error}
                      </p>
                    )}
                  </div>
                </div>

                {/* Avatar Test */}
                <div className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">Avatar Status</p>
                    <p className="text-sm text-muted-foreground">
                      Type: {testResults.avatar?.isGoogle ? 'Google' : testResults.avatar?.isFallback ? 'Fallback' : 'Custom'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Initials: {testResults.avatar?.initials}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Debug Logs */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Debug Logs</CardTitle>
          <CardDescription>
            Real-time authentication events and test results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button 
                onClick={() => setLogs([])} 
                variant="outline" 
                size="sm"
              >
                Clear Logs
              </Button>
              <Button 
                onClick={() => {
                  const authLogger = (window as any).authLogger
                  if (authLogger) {
                    const logs = authLogger.exportLogs()
                    console.log('📊 Full Auth Logs:', logs)
                    addLog('Auth logs exported to console - press F12 to view')
                  }
                }} 
                variant="outline" 
                size="sm"
              >
                Export Full Auth Logs
              </Button>
            </div>
            
            <div className="border rounded p-3 h-64 overflow-auto font-mono text-xs bg-muted">
              {logs.length > 0 ? (
                logs.map((log, i) => (
                  <div key={i} className="py-0.5">{log}</div>
                ))
              ) : (
                <div className="text-muted-foreground">No logs yet...</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Raw Data Display */}
      {user && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Raw Authentication Data</CardTitle>
            <CardDescription>
              Complete user metadata for debugging
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <h4 className="font-medium mb-2">User Metadata:</h4>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                  {JSON.stringify(user.user_metadata, null, 2)}
                </pre>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">App Metadata:</h4>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                  {JSON.stringify(user.app_metadata, null, 2)}
                </pre>
              </div>
              
              {profile && (
                <div>
                  <h4 className="font-medium mb-2">Profile Data:</h4>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                    {JSON.stringify(profile, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}