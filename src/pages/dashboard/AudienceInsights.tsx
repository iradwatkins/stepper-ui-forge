import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'
import {
  Users,
  TrendingUp,
  MapPin,
  Calendar,
  Clock,
  Heart,
  Share2,
  Download,
  Filter,
  UserCheck
} from 'lucide-react'

interface AudienceData {
  totalAttendees: number
  repeatAttendees: number
  averageAge: number
  genderDistribution: { male: number; female: number; other: number }
  locationDistribution: Array<{ city: string; count: number; percentage: number }>
  eventPreferences: Array<{ category: string; count: number; percentage: number }>
  attendancePattern: Array<{ month: string; count: number }>
  socialEngagement: {
    shares: number
    likes: number
    comments: number
    followers: number
  }
}

interface DemographicChart {
  name: string
  value: number
  color: string
}

export default function AudienceInsights() {
  const { user } = useAuth()
  const [audienceData, setAudienceData] = useState<AudienceData | null>(null)
  const [selectedEvent, setSelectedEvent] = useState('all')
  const [selectedPeriod, setSelectedPeriod] = useState('12m')
  const [isLoading, setIsLoading] = useState(true)

  // Load audience data from API
  useEffect(() => {
    const loadAudienceData = async () => {
      setIsLoading(true)
      
      try {
        // TODO: Replace with actual API calls
        // const audienceData = await AnalyticsService.getAudienceInsights(user?.id, selectedEvent, selectedPeriod)
        
        // For now, initialize with empty data
        setAudienceData({
          totalAttendees: 0,
          repeatAttendees: 0,
          averageAge: 0,
          genderDistribution: { male: 0, female: 0, other: 0 },
          locationDistribution: [],
          eventPreferences: [],
          attendancePattern: [],
          socialEngagement: {
            shares: 0,
            likes: 0,
            comments: 0,
            followers: 0
          }
        })
        
      } catch (error) {
        console.error('Error loading audience data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAudienceData()
  }, [selectedEvent, selectedPeriod, user?.id])

  const genderChartData: DemographicChart[] = audienceData ? [
    { name: 'Female', value: audienceData.genderDistribution.female, color: '#ec4899' },
    { name: 'Male', value: audienceData.genderDistribution.male, color: '#3b82f6' },
    { name: 'Other', value: audienceData.genderDistribution.other, color: '#10b981' }
  ] : []

  const COLORS = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading audience insights...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audience Insights</h1>
          <p className="mt-2 text-gray-600">
            Understand your audience demographics and behavior patterns
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="music">Music Events</SelectItem>
              <SelectItem value="tech">Tech Events</SelectItem>
              <SelectItem value="food">Food Events</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12m">Last 12 months</SelectItem>
              <SelectItem value="6m">Last 6 months</SelectItem>
              <SelectItem value="3m">Last 3 months</SelectItem>
              <SelectItem value="1m">Last month</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attendees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{audienceData?.totalAttendees.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last period
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repeat Attendees</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {audienceData && Math.round((audienceData.repeatAttendees / audienceData.totalAttendees) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {audienceData?.repeatAttendees.toLocaleString()} returning attendees
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Age</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{audienceData?.averageAge}</div>
            <p className="text-xs text-muted-foreground">
              Years old
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Social Followers</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{audienceData?.socialEngagement.followers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +{audienceData?.socialEngagement.likes.toLocaleString()} likes this period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="demographics" className="w-full">
        <TabsList>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="location">Location</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>
        
        <TabsContent value="demographics" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Gender Distribution</CardTitle>
                <CardDescription>Breakdown of attendee gender demographics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genderChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {genderChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Age Groups</CardTitle>
                <CardDescription>Distribution of attendees by age group</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { ageGroup: '18-24', count: 385 },
                        { ageGroup: '25-34', count: 1240 },
                        { ageGroup: '35-44', count: 890 },
                        { ageGroup: '45-54', count: 245 },
                        { ageGroup: '55+', count: 87 }
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="ageGroup" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="location" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Geographic Distribution</CardTitle>
              <CardDescription>Where your attendees are coming from</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {audienceData?.locationDistribution.map((location, index) => (
                  <div key={location.city} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <div>
                        <div className="font-medium">{location.city}</div>
                        <div className="text-sm text-gray-500">{location.count.toLocaleString()} attendees</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{location.percentage}%</div>
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${location.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Event Category Preferences</CardTitle>
              <CardDescription>What types of events your audience prefers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={audienceData?.eventPreferences}
                    layout="horizontal"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="category" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Trends</CardTitle>
              <CardDescription>Monthly attendance patterns over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={audienceData?.attendancePattern}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Social Shares</CardTitle>
                <Share2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{audienceData?.socialEngagement.shares.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  +15% from last period
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Likes</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{audienceData?.socialEngagement.likes.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  +8% from last period
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Comments</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{audienceData?.socialEngagement.comments.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  +22% from last period
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4.2%</div>
                <p className="text-xs text-muted-foreground">
                  Above industry average
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Engagement by Event Type</CardTitle>
              <CardDescription>How different event types perform in social engagement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { type: 'Music Events', engagement: 85, color: 'bg-blue-500' },
                  { type: 'Tech Conferences', engagement: 72, color: 'bg-green-500' },
                  { type: 'Food & Wine', engagement: 68, color: 'bg-yellow-500' },
                  { type: 'Arts & Culture', engagement: 61, color: 'bg-purple-500' },
                  { type: 'Sports Events', engagement: 45, color: 'bg-red-500' }
                ].map((item) => (
                  <div key={item.type} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      <span className="font-medium">{item.type}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${item.color}`}
                          style={{ width: `${item.engagement}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12">{item.engagement}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}