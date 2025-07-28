import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Zap, 
  Image, 
  FileCode, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Gauge
} from 'lucide-react'
import { SystemMonitoringService } from '@/lib/services/SystemMonitoringService'
import { toast } from 'sonner'

interface PerformanceMetric {
  name: string
  value: number
  unit: string
  target: number
  status: 'good' | 'warning' | 'poor'
  description: string
}

interface ResourceAnalysis {
  type: 'images' | 'scripts' | 'styles'
  total: number
  totalSize: number
  issues: string[]
  recommendations: string[]
}

export function PerformanceAudit() {
  const [loading, setLoading] = useState(false)
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])
  const [resources, setResources] = useState<ResourceAnalysis[]>([])
  const [overallScore, setOverallScore] = useState(0)
  const [recommendations, setRecommendations] = useState<string[]>([])
  const [lastAudit, setLastAudit] = useState<Date | null>(null)

  const runAudit = async () => {
    setLoading(true)
    try {
      // Get performance metrics
      const perfData = await SystemMonitoringService.getPagePerformance()
      const analysis = await SystemMonitoringService.analyzePerformance()
      const detailedMetrics = await SystemMonitoringService.getDetailedMetrics()

      if (perfData) {
        const performanceMetrics: PerformanceMetric[] = [
          {
            name: 'Page Load Time',
            value: perfData.pageLoadTime,
            unit: 'ms',
            target: 3000,
            status: perfData.pageLoadTime < 1000 ? 'good' : perfData.pageLoadTime < 3000 ? 'warning' : 'poor',
            description: 'Time to fully load the page'
          },
          {
            name: 'Time to First Byte',
            value: perfData.timeToFirstByte,
            unit: 'ms',
            target: 600,
            status: perfData.timeToFirstByte < 200 ? 'good' : perfData.timeToFirstByte < 600 ? 'warning' : 'poor',
            description: 'Server response time'
          },
          {
            name: 'DOM Content Loaded',
            value: perfData.domContentLoaded,
            unit: 'ms',
            target: 1500,
            status: perfData.domContentLoaded < 800 ? 'good' : perfData.domContentLoaded < 1500 ? 'warning' : 'poor',
            description: 'Time to parse HTML and build DOM'
          }
        ]

        if (perfData.firstContentfulPaint) {
          performanceMetrics.push({
            name: 'First Contentful Paint',
            value: perfData.firstContentfulPaint,
            unit: 'ms',
            target: 1800,
            status: perfData.firstContentfulPaint < 1000 ? 'good' : perfData.firstContentfulPaint < 1800 ? 'warning' : 'poor',
            description: 'Time to first visual content'
          })
        }

        if (perfData.largestContentfulPaint) {
          performanceMetrics.push({
            name: 'Largest Contentful Paint',
            value: perfData.largestContentfulPaint,
            unit: 'ms',
            target: 2500,
            status: perfData.largestContentfulPaint < 1500 ? 'good' : perfData.largestContentfulPaint < 2500 ? 'warning' : 'poor',
            description: 'Time to largest content element'
          })
        }

        setMetrics(performanceMetrics)
      }

      // Set resource analysis
      const resourceAnalysis: ResourceAnalysis[] = [
        {
          type: 'images',
          total: detailedMetrics.images.total,
          totalSize: detailedMetrics.images.totalSize,
          issues: detailedMetrics.images.unoptimized.map(img => `Large image: ${img}`),
          recommendations: [
            'Use WebP format for better compression',
            'Implement lazy loading for below-fold images',
            'Use responsive images with srcset',
            'Compress images before uploading'
          ]
        },
        {
          type: 'scripts',
          total: detailedMetrics.scripts.total,
          totalSize: detailedMetrics.scripts.totalSize,
          issues: detailedMetrics.scripts.renderBlocking > 0 ? 
            [`${detailedMetrics.scripts.renderBlocking} render-blocking scripts`] : [],
          recommendations: [
            'Use code splitting to reduce bundle size',
            'Lazy load non-critical components',
            'Minify and compress JavaScript files',
            'Use async/defer for script loading'
          ]
        },
        {
          type: 'styles',
          total: detailedMetrics.styles.total,
          totalSize: detailedMetrics.styles.totalSize,
          issues: detailedMetrics.styles.renderBlocking > 0 ? 
            [`${detailedMetrics.styles.renderBlocking} render-blocking stylesheets`] : [],
          recommendations: [
            'Remove unused CSS',
            'Inline critical CSS',
            'Use CSS modules for better tree-shaking',
            'Optimize CSS delivery'
          ]
        }
      ]

      setResources(resourceAnalysis)
      setOverallScore(analysis.scores.overall || 0)
      setRecommendations(analysis.recommendations)
      setLastAudit(new Date())

      toast.success('Performance audit completed')
    } catch (error) {
      console.error('Error running audit:', error)
      toast.error('Failed to complete performance audit')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runAudit()
  }, [])

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'poor':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const exportAudit = () => {
    const report = {
      timestamp: new Date().toISOString(),
      overallScore,
      metrics,
      resources,
      recommendations
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `performance-audit-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    toast.success('Audit report exported')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Audit</h2>
          <p className="text-muted-foreground">
            Analyze website speed and identify optimization opportunities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={runAudit} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Run Audit
          </Button>
          <Button onClick={exportAudit} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Performance Score
          </CardTitle>
          <CardDescription>
            Overall website performance based on key metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`text-6xl font-bold ${getScoreColor(overallScore)}`}>
                {overallScore}
              </div>
              <div>
                <p className="text-lg font-medium">
                  {overallScore >= 90 ? 'Excellent' : 
                   overallScore >= 70 ? 'Good' : 
                   overallScore >= 50 ? 'Needs Improvement' : 'Poor'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {lastAudit ? `Last audit: ${lastAudit.toLocaleTimeString()}` : 'No audit data'}
                </p>
              </div>
            </div>
            <Progress value={overallScore} className="w-32" />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
          <TabsTrigger value="resources">Resource Analysis</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Performance Metrics */}
        <TabsContent value="metrics">
          <Card>
            <CardHeader>
              <CardTitle>Core Web Vitals</CardTitle>
              <CardDescription>
                Key metrics that impact user experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.map((metric, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(metric.status)}
                        <h4 className="font-medium">{metric.name}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${
                          metric.status === 'good' ? 'text-green-600' :
                          metric.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {metric.value}{metric.unit}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          / {metric.target}{metric.unit}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{metric.description}</p>
                    <Progress 
                      value={Math.min(100, (metric.target / metric.value) * 100)} 
                      className="mt-2 h-2" 
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resource Analysis */}
        <TabsContent value="resources">
          <div className="grid gap-4 md:grid-cols-3">
            {resources.map((resource, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {resource.type === 'images' ? <Image className="h-5 w-5" /> :
                     resource.type === 'scripts' ? <FileCode className="h-5 w-5" /> :
                     <FileCode className="h-5 w-5" />}
                    {resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-2xl font-bold">{resource.total}</p>
                      <p className="text-sm text-muted-foreground">
                        Total size: {formatBytes(resource.totalSize)}
                      </p>
                    </div>
                    
                    {resource.issues.length > 0 && (
                      <Alert className="py-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          {resource.issues[0]}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Quick fixes:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {resource.recommendations.slice(0, 2).map((rec, i) => (
                          <li key={i}>• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Recommendations */}
        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle>Optimization Recommendations</CardTitle>
              <CardDescription>
                Actionable steps to improve performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recommendations.length > 0 ? (
                  recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5" />
                      <p className="text-sm">{rec}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Run an audit to get recommendations
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}