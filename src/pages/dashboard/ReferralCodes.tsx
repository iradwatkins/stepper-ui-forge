import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  Copy,
  Edit,
  Trash2,
  MoreHorizontal,
  QrCode,
  Share,
  TrendingUp,
  Calendar,
  DollarSign,
  Users
} from 'lucide-react'

interface ReferralCode {
  id: string
  code: string
  eventTitle: string
  eventId: string
  commissionRate: number
  usageLimit?: number
  usageCount: number
  totalEarnings: number
  isActive: boolean
  createdDate: string
  expiryDate?: string
}

interface ReferralStats {
  totalCodes: number
  activeCodes: number
  totalEarnings: number
  totalUses: number
}

export default function ReferralCodes() {
  const { user } = useAuth()
  const [codes, setCodes] = useState<ReferralCode[]>([])
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newCode, setNewCode] = useState({
    code: '',
    eventId: '',
    commissionRate: 10,
    usageLimit: undefined as number | undefined,
    expiryDate: ''
  })

  // Load referral codes from API
  useEffect(() => {
    const loadReferralData = async () => {
      setIsLoading(true)
      
      try {
        // TODO: Replace with actual API calls
        // const referralData = await ReferralService.getUserReferralCodes(user?.id)
        // const referralStats = await ReferralService.getUserReferralStats(user?.id)
        
        // For now, initialize with empty data
        setStats({
          totalCodes: 0,
          activeCodes: 0,
          totalEarnings: 0,
          totalUses: 0
        })
        setCodes([])
        
      } catch (error) {
        console.error('Error loading referral data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadReferralData()
  }, [user?.id])

  const handleCreateCode = () => {
    // Generate a random code if none provided
    const code = newCode.code || `SELLER${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    
    const newReferralCode: ReferralCode = {
      id: Date.now().toString(),
      code,
      eventTitle: 'Selected Event', // Would come from event selection
      eventId: newCode.eventId || 'event-selected',
      commissionRate: newCode.commissionRate,
      usageLimit: newCode.usageLimit,
      usageCount: 0,
      totalEarnings: 0,
      isActive: true,
      createdDate: new Date().toISOString().split('T')[0],
      expiryDate: newCode.expiryDate
    }
    
    setCodes(prev => [newReferralCode, ...prev])
    setIsCreateDialogOpen(false)
    setNewCode({
      code: '',
      eventId: '',
      commissionRate: 10,
      usageLimit: undefined,
      expiryDate: ''
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // Could add toast notification here
  }

  const toggleCodeStatus = (id: string) => {
    setCodes(prev => prev.map(code => 
      code.id === id ? { ...code, isActive: !code.isActive } : code
    ))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading referral codes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Referral Codes</h1>
          <p className="mt-2 text-gray-600">
            Manage your referral codes and track commission earnings
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Code
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Referral Code</DialogTitle>
              <DialogDescription>
                Generate a referral code to earn commissions on ticket sales
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="code">Custom Code (optional)</Label>
                <Input
                  id="code"
                  placeholder="Leave blank to auto-generate"
                  value={newCode.code}
                  onChange={(e) => setNewCode(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="commission">Commission Rate (%)</Label>
                <Input
                  id="commission"
                  type="number"
                  min="1"
                  max="50"
                  value={newCode.commissionRate}
                  onChange={(e) => setNewCode(prev => ({ ...prev, commissionRate: Number(e.target.value) }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="limit">Usage Limit (optional)</Label>
                <Input
                  id="limit"
                  type="number"
                  placeholder="Unlimited if blank"
                  value={newCode.usageLimit || ''}
                  onChange={(e) => setNewCode(prev => ({ ...prev, usageLimit: e.target.value ? Number(e.target.value) : undefined }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expiry">Expiry Date (optional)</Label>
                <Input
                  id="expiry"
                  type="date"
                  value={newCode.expiryDate}
                  onChange={(e) => setNewCode(prev => ({ ...prev, expiryDate: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateCode}>Create Code</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Codes</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCodes}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeCodes} active
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From referral sales
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Uses</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUses}</div>
            <p className="text-xs text-muted-foreground">
              Successful referrals
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Performing</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-primary">SUMMER2024</div>
            <p className="text-xs text-muted-foreground">
              23 uses, $230.50 earned
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Codes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referral Codes</CardTitle>
          <CardDescription>
            Manage and track all your referral codes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Earnings</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map((code) => (
                <TableRow key={code.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-bold">{code.code}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(code.code)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{code.eventTitle}</div>
                    {code.expiryDate && (
                      <div className="text-sm text-gray-500">
                        Expires: {new Date(code.expiryDate).toLocaleDateString()}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{code.commissionRate}%</TableCell>
                  <TableCell>
                    {code.usageCount}
                    {code.usageLimit && ` / ${code.usageLimit}`}
                  </TableCell>
                  <TableCell className="text-green-600 font-medium">
                    ${code.totalEarnings.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={code.isActive ? "default" : "secondary"}>
                        {code.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Switch
                        checked={code.isActive}
                        onCheckedChange={() => toggleCodeStatus(code.id)}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(code.createdDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => copyToClipboard(code.code)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Code
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Share className="mr-2 h-4 w-4" />
                          Share Link
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <QrCode className="mr-2 h-4 w-4" />
                          Generate QR
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Code
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Code
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}