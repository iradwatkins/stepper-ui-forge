import React, { useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Upload, 
  FileImage, 
  Grid, 
  Settings, 
  MapPin, 
  Users, 
  DollarSign, 
  Eye, 
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle,
  Download
} from 'lucide-react'
import { useToast } from "@/components/ui/use-toast"
import { SeatingService, Venue, SeatingChart, SeatCategory } from "@/lib/services/SeatingService"

interface VenueLayoutUploaderProps {
  venueId?: string
  eventId?: string
  onSeatingChartCreated?: (chart: SeatingChart) => void
  className?: string
}

interface SeatDefinition {
  identifier: string
  section: string
  row: string
  number: string
  x: number
  y: number
  category: string
  price: number
}

interface CategoryDefinition {
  name: string
  color: string
  price: number
  isAccessible: boolean
  isPremium: boolean
}

interface UploadProgress {
  stage: 'uploading' | 'processing' | 'creating_seats' | 'complete'
  progress: number
  message: string
}

export function VenueLayoutUploader({ 
  venueId, 
  eventId, 
  onSeatingChartCreated, 
  className 
}: VenueLayoutUploaderProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // State management
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  
  // Chart configuration
  const [chartName, setChartName] = useState('')
  const [chartDescription, setChartDescription] = useState('')
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null)
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>('')
  
  // Seat data
  const [seatData, setSeatData] = useState<SeatDefinition[]>([])
  const [categories, setCategories] = useState<CategoryDefinition[]>([
    { name: 'General', color: '#3B82F6', price: 50, isAccessible: false, isPremium: false },
    { name: 'VIP', color: '#F59E0B', price: 100, isAccessible: false, isPremium: true },
    { name: 'Accessible', color: '#10B981', price: 50, isAccessible: true, isPremium: false }
  ])
  
  // Form state
  const [activeTab, setActiveTab] = useState('upload')
  const [errors, setErrors] = useState<string[]>([])

  /**
   * Load venues when component mounts
   */
  React.useEffect(() => {
    loadVenues()
  }, [])

  /**
   * Set selected venue if venueId prop is provided
   */
  React.useEffect(() => {
    if (venueId && venues.length > 0) {
      const venue = venues.find(v => v.id === venueId)
      if (venue) {
        setSelectedVenue(venue)
      }
    }
  }, [venueId, venues])

  /**
   * Load available venues
   */
  const loadVenues = async () => {
    try {
      const venueList = await SeatingService.listVenues()
      setVenues(venueList)
    } catch (error) {
      console.error('Error loading venues:', error)
      toast({
        title: "Error",
        description: "Failed to load venues",
        variant: "destructive"
      })
    }
  }

  /**
   * Handle background image upload
   */
  const handleBackgroundImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file",
          variant: "destructive"
        })
        return
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 10MB",
          variant: "destructive"
        })
        return
      }

      setBackgroundImage(file)
      
      // Create preview URL
      const reader = new FileReader()
      reader.onload = (e) => {
        setBackgroundImageUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }, [toast])

  /**
   * Handle CSV file upload for seat data
   */
  const handleSeatDataUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please select a CSV file",
        variant: "destructive"
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string
        const seats = parseCSVSeatData(csv)
        setSeatData(seats)
        setActiveTab('configure')
        
        toast({
          title: "Success",
          description: `Loaded ${seats.length} seats from CSV`,
        })
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to parse CSV file",
          variant: "destructive"
        })
      }
    }
    reader.readAsText(file)
  }, [toast])

  /**
   * Parse CSV seat data
   */
  const parseCSVSeatData = (csv: string): SeatDefinition[] => {
    const lines = csv.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    
    // Validate required headers
    const requiredHeaders = ['identifier', 'section', 'row', 'number', 'x', 'y', 'category', 'price']
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
    
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`)
    }

    const seats: SeatDefinition[] = []
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      
      if (values.length !== headers.length) {
        throw new Error(`Row ${i + 1}: Invalid number of columns`)
      }

      const seat: SeatDefinition = {
        identifier: values[headers.indexOf('identifier')],
        section: values[headers.indexOf('section')],
        row: values[headers.indexOf('row')],
        number: values[headers.indexOf('number')],
        x: parseFloat(values[headers.indexOf('x')]),
        y: parseFloat(values[headers.indexOf('y')]),
        category: values[headers.indexOf('category')],
        price: parseFloat(values[headers.indexOf('price')])
      }

      // Validate seat data
      if (!seat.identifier || isNaN(seat.x) || isNaN(seat.y) || isNaN(seat.price)) {
        throw new Error(`Row ${i + 1}: Invalid seat data`)
      }

      seats.push(seat)
    }

    return seats
  }

  /**
   * Generate sample CSV data
   */
  const generateSampleCSV = () => {
    const sampleData = [
      'identifier,section,row,number,x,y,category,price',
      'A-1-1,A,1,1,100,100,General,50',
      'A-1-2,A,1,2,120,100,General,50',
      'A-2-1,A,2,1,100,120,General,50',
      'VIP-1-1,VIP,1,1,200,80,VIP,100',
      'VIP-1-2,VIP,1,2,220,80,VIP,100',
      'ACC-1-1,Accessible,1,1,50,150,Accessible,50'
    ].join('\n')

    const blob = new Blob([sampleData], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = 'sample_seating_layout.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * Add new category
   */
  const addCategory = () => {
    setCategories([
      ...categories,
      {
        name: `Category ${categories.length + 1}`,
        color: '#6B7280',
        price: 50,
        isAccessible: false,
        isPremium: false
      }
    ])
  }

  /**
   * Update category
   */
  const updateCategory = (index: number, updates: Partial<CategoryDefinition>) => {
    const updated = [...categories]
    updated[index] = { ...updated[index], ...updates }
    setCategories(updated)
  }

  /**
   * Remove category
   */
  const removeCategory = (index: number) => {
    if (categories.length <= 1) {
      toast({
        title: "Cannot Remove",
        description: "At least one category is required",
        variant: "destructive"
      })
      return
    }

    setCategories(categories.filter((_, i) => i !== index))
  }

  /**
   * Validate seating chart data
   */
  const validateData = (): string[] => {
    const errors: string[] = []

    if (!chartName.trim()) {
      errors.push('Chart name is required')
    }

    if (!selectedVenue) {
      errors.push('Venue selection is required')
    }

    if (seatData.length === 0) {
      errors.push('Seat data is required')
    }

    if (categories.length === 0) {
      errors.push('At least one seat category is required')
    }

    // Validate seat data references valid categories
    const categoryNames = new Set(categories.map(c => c.name))
    const invalidSeats = seatData.filter(seat => !categoryNames.has(seat.category))
    
    if (invalidSeats.length > 0) {
      errors.push(`${invalidSeats.length} seats reference invalid categories`)
    }

    // Check for duplicate seat identifiers
    const identifiers = new Set()
    const duplicates = seatData.filter(seat => {
      if (identifiers.has(seat.identifier)) {
        return true
      }
      identifiers.add(seat.identifier)
      return false
    })

    if (duplicates.length > 0) {
      errors.push(`Duplicate seat identifiers found: ${duplicates.map(s => s.identifier).join(', ')}`)
    }

    return errors
  }

  /**
   * Create seating chart
   */
  const createSeatingChart = async () => {
    setLoading(true)
    setUploadProgress({ stage: 'uploading', progress: 10, message: 'Validating data...' })
    setErrors([])

    try {
      // Validate data
      const validationErrors = validateData()
      if (validationErrors.length > 0) {
        setErrors(validationErrors)
        return
      }

      setUploadProgress({ stage: 'uploading', progress: 30, message: 'Creating seating chart...' })

      // Upload background image if provided
      let imageUrl = ''
      if (backgroundImage) {
        // In a real implementation, you would upload to a file storage service
        // For now, we'll use the data URL
        imageUrl = backgroundImageUrl
      }

      // Create seating chart
      const chartData = {
        layout: {
          backgroundImage: imageUrl,
          seats: seatData,
          categories: categories
        },
        seats: seatData,
        categories: categories
      }

      const seatingChart = await SeatingService.uploadSeatingChart({
        venue_id: selectedVenue!.id,
        event_id: eventId,
        name: chartName,
        description: chartDescription,
        chart_data: chartData,
        image_url: imageUrl,
        is_active: true,
        total_seats: seatData.length
      })

      setUploadProgress({ stage: 'processing', progress: 60, message: 'Processing seating data...' })

      // Process seating chart data (create seats and categories)
      await SeatingService.processSeatingChartData(seatingChart.id, chartData)

      setUploadProgress({ stage: 'complete', progress: 100, message: 'Seating chart created successfully!' })

      toast({
        title: "Success",
        description: `Seating chart "${chartName}" created successfully with ${seatData.length} seats`,
      })

      // Reset form
      setChartName('')
      setChartDescription('')
      setBackgroundImage(null)
      setBackgroundImageUrl('')
      setSeatData([])
      setActiveTab('upload')

      // Notify parent component
      if (onSeatingChartCreated) {
        onSeatingChartCreated(seatingChart)
      }

    } catch (error) {
      console.error('Error creating seating chart:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create seating chart",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
      setTimeout(() => setUploadProgress(null), 3000)
    }
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Venue Layout Uploader
          </CardTitle>
          <CardDescription>
            Upload seating charts and configure seat layouts for your venue
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {uploadProgress && (
            <Alert className="mb-6">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p>{uploadProgress.message}</p>
                  <Progress value={uploadProgress.progress} className="w-full" />
                </div>
              </AlertDescription>
            </Alert>
          )}

          {errors.length > 0 && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Please fix the following errors:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="configure">Configure</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="create">Create</TabsTrigger>
            </TabsList>

            {/* Upload Tab */}
            <TabsContent value="upload" className="space-y-6">
              {/* Venue Selection */}
              <div className="space-y-2">
                <Label htmlFor="venue">Select Venue</Label>
                <Select
                  value={selectedVenue?.id || ''}
                  onValueChange={(value) => {
                    const venue = venues.find(v => v.id === value)
                    setSelectedVenue(venue || null)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a venue" />
                  </SelectTrigger>
                  <SelectContent>
                    {venues.map((venue) => (
                      <SelectItem key={venue.id} value={venue.id}>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{venue.name}</span>
                          {venue.city && <span className="text-muted-foreground">({venue.city})</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Chart Information */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chartName">Chart Name</Label>
                  <Input
                    id="chartName"
                    placeholder="e.g., Main Floor Layout"
                    value={chartName}
                    onChange={(e) => setChartName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="chartDescription">Description (Optional)</Label>
                  <Textarea
                    id="chartDescription"
                    placeholder="Describe this seating layout..."
                    value={chartDescription}
                    onChange={(e) => setChartDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              {/* Background Image Upload */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Background Image (Optional)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileImage className="h-4 w-4 mr-2" />
                    Upload Image
                  </Button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBackgroundImageUpload}
                  className="hidden"
                />

                {backgroundImageUrl && (
                  <div className="relative">
                    <img
                      src={backgroundImageUrl}
                      alt="Background preview"
                      className="w-full max-w-md h-40 object-cover rounded border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setBackgroundImage(null)
                        setBackgroundImageUrl('')
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Seat Data Upload */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Seat Data (CSV)</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateSampleCSV}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Sample CSV
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.createElement('input')
                        input.type = 'file'
                        input.accept = '.csv'
                        input.onchange = handleSeatDataUpload
                        input.click()
                      }}
                    >
                      <Grid className="h-4 w-4 mr-2" />
                      Upload CSV
                    </Button>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    CSV should include columns: identifier, section, row, number, x, y, category, price
                  </AlertDescription>
                </Alert>

                {seatData.length > 0 && (
                  <div className="p-4 bg-muted rounded">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{seatData.length} seats loaded</span>
                      <Badge variant="secondary">
                        {new Set(seatData.map(s => s.section)).size} sections
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Configure Tab */}
            <TabsContent value="configure" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Seat Categories</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addCategory}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                </div>

                <ScrollArea className="h-96">
                  <div className="space-y-4 pr-4">
                    {categories.map((category, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Name</Label>
                              <Input
                                value={category.name}
                                onChange={(e) => updateCategory(index, { name: e.target.value })}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Color</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="color"
                                  value={category.color}
                                  onChange={(e) => updateCategory(index, { color: e.target.value })}
                                  className="w-16 h-10"
                                />
                                <Input
                                  value={category.color}
                                  onChange={(e) => updateCategory(index, { color: e.target.value })}
                                  placeholder="#3B82F6"
                                />
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Base Price ($)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={category.price}
                                onChange={(e) => updateCategory(index, { price: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Options</Label>
                              <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={category.isAccessible}
                                    onChange={(e) => updateCategory(index, { isAccessible: e.target.checked })}
                                  />
                                  <span className="text-sm">Accessible</span>
                                </label>
                                <label className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={category.isPremium}
                                    onChange={(e) => updateCategory(index, { isPremium: e.target.checked })}
                                  />
                                  <span className="text-sm">Premium</span>
                                </label>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex justify-end mt-4">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeCategory(index)}
                              disabled={categories.length <= 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Layout Preview</h3>
                
                {seatData.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{seatData.length}</div>
                        <div className="text-sm text-muted-foreground">Total Seats</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{new Set(seatData.map(s => s.section)).size}</div>
                        <div className="text-sm text-muted-foreground">Sections</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{categories.length}</div>
                        <div className="text-sm text-muted-foreground">Categories</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          ${Math.min(...seatData.map(s => s.price))}-${Math.max(...seatData.map(s => s.price))}
                        </div>
                        <div className="text-sm text-muted-foreground">Price Range</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">Categories</h4>
                      <div className="flex flex-wrap gap-2">
                        {categories.map((category, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            style={{ borderColor: category.color, color: category.color }}
                          >
                            {category.name} (${category.price})
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">Sections</h4>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(new Set(seatData.map(s => s.section))).map(section => (
                          <Badge key={section} variant="secondary">
                            {section} ({seatData.filter(s => s.section === section).length} seats)
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No seat data available. Please upload a CSV file in the Upload tab.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>

            {/* Create Tab */}
            <TabsContent value="create" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Create Seating Chart</h3>
                
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Ready to create seating chart "{chartName}" with {seatData.length} seats and {categories.length} categories.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span className="font-medium">Venue</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {selectedVenue?.name || 'No venue selected'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span className="font-medium">Capacity</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {seatData.length} seats total
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Button
                    onClick={createSeatingChart}
                    disabled={loading || seatData.length === 0 || !selectedVenue}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Settings className="h-4 w-4 mr-2 animate-spin" />
                        Creating Seating Chart...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Create Seating Chart
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}