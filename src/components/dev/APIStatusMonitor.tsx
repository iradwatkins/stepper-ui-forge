/**
 * API Status Monitor Component
 * 
 * Development tool to monitor Claude API fallback system status
 * and manually control API switching for testing.
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  RotateCcw, 
  Zap,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { claudeClient, testClaudeAPIs } from '@/lib/api/claude-client'

interface APIStatus {
  currentApi: 'primary' | 'secondary'
  lastSwitch?: Date
  switchReason?: string
  totalSwitches: number
  primaryHealthy: boolean
  secondaryHealthy: boolean
  primaryErrors: number
  secondaryErrors: number
  primaryLastUsed?: Date
  secondaryLastUsed?: Date
}

export function APIStatusMonitor() {
  const [status, setStatus] = useState<APIStatus | null>(null)
  const [testResults, setTestResults] = useState<any>(null)
  const [isTestingAPIs, setIsTestingAPIs] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Refresh status
  const refreshStatus = () => {
    const currentStatus = claudeClient.getStatus()
    setStatus(currentStatus)
    setLastUpdate(new Date())
  }

  // Auto-refresh every 10 seconds
  useEffect(() => {
    refreshStatus()
    const interval = setInterval(refreshStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  // Test both APIs
  const handleTestAPIs = async () => {
    setIsTestingAPIs(true)
    try {
      const results = await testClaudeAPIs()
      setTestResults(results)
      refreshStatus()
    } catch (error) {
      console.error('API test failed:', error)
    } finally {
      setIsTestingAPIs(false)
    }
  }

  // Manual API switch
  const handleSwitchAPI = () => {
    claudeClient.switchToBackup('Manual switch from monitor')
    refreshStatus()
  }

  // Reset system
  const handleReset = () => {
    claudeClient.reset()
    setTestResults(null)
    refreshStatus()
  }

  if (!status) {
    return (
      <Card className="w-full max-w-4xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="animate-spin h-6 w-6 mr-2" />
            Loading API status...
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatDate = (date?: Date) => {
    if (!date) return 'Never'
    return date.toLocaleString()
  }

  const getHealthBadge = (healthy: boolean, errors: number) => {
    if (healthy && errors === 0) {
      return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Healthy</Badge>
    } else if (errors > 0) {
      return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />{errors} Errors</Badge>
    } else {
      return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Unknown</Badge>
    }
  }

  return (
    <div className="w-full max-w-6xl space-y-4">
      {/* Main Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Claude API Fallback Status
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={refreshStatus}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleTestAPIs} disabled={isTestingAPIs}>
                <Zap className="h-4 w-4 mr-1" />
                {isTestingAPIs ? 'Testing...' : 'Test APIs'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Current Active API */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-600">Current Active API</h4>
              <Badge variant={status.currentApi === 'primary' ? 'default' : 'secondary'} className="text-sm">
                {status.currentApi.toUpperCase()}
              </Badge>
            </div>

            {/* Total Switches */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-600">Total Switches</h4>
              <div className="text-2xl font-bold">{status.totalSwitches}</div>
            </div>

            {/* Last Switch */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-600">Last Switch</h4>
              <div className="text-sm">{formatDate(status.lastSwitch)}</div>
              {status.switchReason && (
                <div className="text-xs text-gray-500 italic">{status.switchReason}</div>
              )}
            </div>

            {/* Last Update */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-600">Last Update</h4>
              <div className="text-sm flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {lastUpdate.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Details Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Primary API Card */}
        <Card className={status.currentApi === 'primary' ? 'ring-2 ring-blue-500' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Primary API</span>
              {getHealthBadge(status.primaryHealthy, status.primaryErrors)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm font-medium">Status: </span>
              <span className={status.currentApi === 'primary' ? 'text-green-600 font-medium' : 'text-gray-500'}>
                {status.currentApi === 'primary' ? 'ACTIVE' : 'Standby'}
              </span>
            </div>
            <div>
              <span className="text-sm font-medium">Error Count: </span>
              <span className={status.primaryErrors > 0 ? 'text-red-600' : 'text-green-600'}>
                {status.primaryErrors}
              </span>
            </div>
            <div>
              <span className="text-sm font-medium">Last Used: </span>
              <span className="text-sm">{formatDate(status.primaryLastUsed)}</span>
            </div>
            {testResults?.primary && (
              <div>
                <span className="text-sm font-medium">Test Result: </span>
                <Badge variant={testResults.primary.working ? 'default' : 'destructive'} className="ml-1">
                  {testResults.primary.working ? 'Working' : 'Failed'}
                </Badge>
                {!testResults.primary.working && testResults.primary.error && (
                  <div className="text-xs text-red-500 mt-1">{testResults.primary.error}</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Secondary API Card */}
        <Card className={status.currentApi === 'secondary' ? 'ring-2 ring-blue-500' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Secondary API</span>
              {getHealthBadge(status.secondaryHealthy, status.secondaryErrors)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm font-medium">Status: </span>
              <span className={status.currentApi === 'secondary' ? 'text-green-600 font-medium' : 'text-gray-500'}>
                {status.currentApi === 'secondary' ? 'ACTIVE' : 'Standby'}
              </span>
            </div>
            <div>
              <span className="text-sm font-medium">Error Count: </span>
              <span className={status.secondaryErrors > 0 ? 'text-red-600' : 'text-green-600'}>
                {status.secondaryErrors}
              </span>
            </div>
            <div>
              <span className="text-sm font-medium">Last Used: </span>
              <span className="text-sm">{formatDate(status.secondaryLastUsed)}</span>
            </div>
            {testResults?.secondary && (
              <div>
                <span className="text-sm font-medium">Test Result: </span>
                <Badge variant={testResults.secondary.working ? 'default' : 'destructive'} className="ml-1">
                  {testResults.secondary.working ? 'Working' : 'Failed'}
                </Badge>
                {!testResults.secondary.working && testResults.secondary.error && (
                  <div className="text-xs text-red-500 mt-1">{testResults.secondary.error}</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleSwitchAPI}
              className="flex items-center"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Switch to {status.currentApi === 'primary' ? 'Secondary' : 'Primary'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleReset}
              className="flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset System
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>API Test Results:</strong> Primary: {testResults.primary.working ? '✅ Working' : '❌ Failed'}, 
            Secondary: {testResults.secondary.working ? '✅ Working' : '❌ Failed'}
            {(!testResults.primary.working || !testResults.secondary.working) && (
              <div className="mt-2 text-sm">
                ⚠️ One or more APIs are not responding. Check your API keys and network connection.
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}