import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Users, 
  DollarSign, 
  Clock, 
  MapPin,
  Eye,
  EyeOff,
  Filter,
  Star,
  Accessibility,
  Crown,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { useToast } from "@/components/ui/use-toast"
import { 
  SeatingService, 
  SeatingChart, 
  AvailableSeat, 
  BestAvailableSeat,
  SeatHold,
  SeatCategory 
} from "@/lib/services/SeatingService"

interface InteractiveSeatingChartProps {
  eventId: string
  seatingChartId: string
  onSeatsSelected?: (seats: AvailableSeat[]) => void
  onSeatHold?: (holdId: string, seats: AvailableSeat[]) => void
  maxSeats?: number
  className?: string
}

interface SeatPosition extends AvailableSeat {
  status: 'available' | 'selected' | 'held' | 'sold' | 'loading'
  holdExpiresAt?: Date
}

interface ViewSettings {
  zoom: number
  panX: number
  panY: number
  showLabels: boolean
  showPrices: boolean
  filterCategory?: string
  maxPrice?: number
}

interface HoldTimer {
  holdId: string
  expiresAt: Date
  seats: AvailableSeat[]
}

export function InteractiveSeatingChart({
  eventId,
  seatingChartId,
  onSeatsSelected,
  onSeatHold,
  maxSeats = 8,
  className
}: InteractiveSeatingChartProps) {
  const { toast } = useToast()
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // State management
  const [seatingChart, setSeatingChart] = useState<SeatingChart | null>(null)
  const [seats, setSeats] = useState<SeatPosition[]>([])
  const [categories, setCategories] = useState<SeatCategory[]>([])
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set())
  const [heldSeats, setHeldSeats] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // View controls
  const [viewSettings, setViewSettings] = useState<ViewSettings>({
    zoom: 1,
    panX: 0,
    panY: 0,
    showLabels: true,
    showPrices: false,
    filterCategory: undefined,
    maxPrice: undefined
  })
  
  // Hold management
  const [holdTimer, setHoldTimer] = useState<HoldTimer | null>(null)
  const [holdTimeRemaining, setHoldTimeRemaining] = useState<number>(0)
  
  // Interaction state
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [bestAvailableLoading, setBestAvailableLoading] = useState(false)

  /**
   * Load seating chart and available seats
   */
  const loadSeatingData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Load seating chart
      const chart = await SeatingService.getSeatingChart(seatingChartId)
      if (!chart) {
        throw new Error('Seating chart not found')
      }
      setSeatingChart(chart)

      // Load seat categories
      const chartCategories = await SeatingService.getSeatCategories(seatingChartId)
      setCategories(chartCategories)

      // Load available seats
      const availableSeats = await SeatingService.getAvailableSeats(eventId, seatingChartId)
      
      // Convert to seat positions
      const seatPositions: SeatPosition[] = availableSeats.map(seat => ({
        ...seat,
        status: 'available'
      }))
      
      setSeats(seatPositions)

      // Load any existing holds for this session
      const sessionId = SeatingService.getSessionId()
      const existingHolds = await SeatingService.getSessionSeatHolds(sessionId, eventId)
      
      if (existingHolds.length > 0) {
        const activeHold = existingHolds[0] // Use most recent hold
        const holdSeatIds = existingHolds.map(hold => hold.seat_id)
        
        setHeldSeats(new Set(holdSeatIds))
        setHoldTimer({
          holdId: activeHold.id,
          expiresAt: new Date(activeHold.expires_at),
          seats: availableSeats.filter(seat => holdSeatIds.includes(seat.seat_id))
        })
      }

    } catch (error) {
      console.error('Error loading seating data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load seating chart')
    } finally {
      setLoading(false)
    }
  }, [eventId, seatingChartId])

  /**
   * Initial load
   */
  useEffect(() => {
    loadSeatingData()
  }, [loadSeatingData])

  /**
   * Hold timer countdown
   */
  useEffect(() => {
    if (!holdTimer) return

    const updateTimer = () => {
      const remaining = holdTimer.expiresAt.getTime() - Date.now()
      setHoldTimeRemaining(Math.max(0, remaining))
      
      if (remaining <= 0) {
        // Hold expired
        setHoldTimer(null)
        setHeldSeats(new Set())
        toast({
          title: "Hold Expired",
          description: "Your seat selection has expired. Please select seats again.",
          variant: "destructive"
        })
        loadSeatingData() // Refresh seat availability
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    
    return () => clearInterval(interval)
  }, [holdTimer, toast, loadSeatingData])

  /**
   * Handle seat click
   */
  const handleSeatClick = useCallback((seat: SeatPosition) => {
    if (seat.status === 'sold' || seat.status === 'loading') return

    const seatId = seat.seat_id
    const newSelected = new Set(selectedSeats)

    if (selectedSeats.has(seatId)) {
      // Deselect seat
      newSelected.delete(seatId)
    } else {
      // Select seat
      if (selectedSeats.size >= maxSeats) {
        toast({
          title: "Maximum Seats",
          description: `You can select up to ${maxSeats} seats`,
          variant: "destructive"
        })
        return
      }
      newSelected.add(seatId)
    }

    setSelectedSeats(newSelected)
    
    // Update seat status
    setSeats(prev => prev.map(s => 
      s.seat_id === seatId 
        ? { ...s, status: newSelected.has(seatId) ? 'selected' : 'available' }
        : s
    ))

    // Notify parent
    const selectedSeatObjects = seats.filter(s => newSelected.has(s.seat_id))
    if (onSeatsSelected) {
      onSeatsSelected(selectedSeatObjects)
    }
  }, [selectedSeats, seats, maxSeats, toast, onSeatsSelected])

  /**
   * Hold selected seats
   */
  const holdSelectedSeats = async () => {
    if (selectedSeats.size === 0) {
      toast({
        title: "No Seats Selected",
        description: "Please select seats before holding them",
        variant: "destructive"
      })
      return
    }

    try {
      // Update seat status to loading
      setSeats(prev => prev.map(seat => 
        selectedSeats.has(seat.seat_id) 
          ? { ...seat, status: 'loading' }
          : seat
      ))

      const sessionId = SeatingService.getSessionId()
      const result = await SeatingService.holdSeats({
        seatIds: Array.from(selectedSeats),
        eventId,
        sessionId,
        holdDurationMinutes: 15
      })

      if (result.success && result.holdId) {
        // Successfully held seats
        const selectedSeatObjects = seats.filter(s => selectedSeats.has(s.seat_id))
        
        setHeldSeats(new Set(selectedSeats))
        setHoldTimer({
          holdId: result.holdId,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
          seats: selectedSeatObjects
        })

        // Update seat status
        setSeats(prev => prev.map(seat => 
          selectedSeats.has(seat.seat_id) 
            ? { ...seat, status: 'held' }
            : seat
        ))

        toast({
          title: "Seats Held",
          description: `${selectedSeats.size} seats held for 15 minutes`,
        })

        // Notify parent
        if (onSeatHold && result.holdId) {
          onSeatHold(result.holdId, selectedSeatObjects)
        }

        // Clear selection
        setSelectedSeats(new Set())

      } else {
        // Hold failed
        if (result.unavailableSeats && result.unavailableSeats.length > 0) {
          toast({
            title: "Seats Unavailable",
            description: `${result.unavailableSeats.length} seats are no longer available`,
            variant: "destructive"
          })
          
          // Refresh seat data
          loadSeatingData()
        } else {
          toast({
            title: "Hold Failed",
            description: result.error || "Failed to hold seats",
            variant: "destructive"
          })
        }

        // Reset seat status
        setSeats(prev => prev.map(seat => 
          selectedSeats.has(seat.seat_id) 
            ? { ...seat, status: 'available' }
            : seat
        ))
      }
    } catch (error) {
      console.error('Error holding seats:', error)
      toast({
        title: "Error",
        description: "Failed to hold seats",
        variant: "destructive"
      })

      // Reset seat status
      setSeats(prev => prev.map(seat => 
        selectedSeats.has(seat.seat_id) 
          ? { ...seat, status: 'available' }
          : seat
      ))
    }
  }

  /**
   * Get best available seats
   */
  const getBestAvailableSeats = async (quantity: number) => {
    setBestAvailableLoading(true)
    
    try {
      const bestSeats = await SeatingService.getBestAvailableSeats(
        eventId,
        seatingChartId,
        quantity,
        {
          preferTogether: true,
          maxPrice: viewSettings.maxPrice,
          sectionPreference: viewSettings.filterCategory
        }
      )

      if (bestSeats.length === 0) {
        toast({
          title: "No Seats Available",
          description: "No suitable seats found with your criteria",
          variant: "destructive"
        })
        return
      }

      // Clear current selection
      setSelectedSeats(new Set())
      
      // Select best seats
      const bestSeatIds = new Set(bestSeats.map(s => s.seat_id))
      setSelectedSeats(bestSeatIds)

      // Update seat status
      setSeats(prev => prev.map(seat => ({
        ...seat,
        status: bestSeatIds.has(seat.seat_id) ? 'selected' : 
                seat.status === 'selected' ? 'available' : seat.status
      })))

      // Center view on selected seats
      if (bestSeats.length > 0) {
        const avgX = bestSeats.reduce((sum, s) => sum + (s.x_position || 0), 0) / bestSeats.length
        const avgY = bestSeats.reduce((sum, s) => sum + (s.y_position || 0), 0) / bestSeats.length
        
        setViewSettings(prev => ({
          ...prev,
          panX: -avgX * prev.zoom + 200,
          panY: -avgY * prev.zoom + 200
        }))
      }

      toast({
        title: "Best Seats Selected",
        description: `Selected ${bestSeats.length} best available seats`,
      })

      // Notify parent
      if (onSeatsSelected) {
        onSeatsSelected(bestSeats)
      }

    } catch (error) {
      console.error('Error getting best seats:', error)
      toast({
        title: "Error",
        description: "Failed to find best available seats",
        variant: "destructive"
      })
    } finally {
      setBestAvailableLoading(false)
    }
  }

  /**
   * Handle zoom
   */
  const handleZoom = (delta: number) => {
    setViewSettings(prev => ({
      ...prev,
      zoom: Math.min(Math.max(prev.zoom + delta, 0.5), 3)
    }))
  }

  /**
   * Reset view
   */
  const resetView = () => {
    setViewSettings(prev => ({
      ...prev,
      zoom: 1,
      panX: 0,
      panY: 0
    }))
  }

  /**
   * Handle mouse events for panning
   */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true)
      setDragStart({ x: e.clientX - viewSettings.panX, y: e.clientY - viewSettings.panY })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setViewSettings(prev => ({
        ...prev,
        panX: e.clientX - dragStart.x,
        panY: e.clientY - dragStart.y
      }))
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  /**
   * Get seat color based on status and category
   */
  const getSeatColor = (seat: SeatPosition): string => {
    switch (seat.status) {
      case 'selected':
        return '#3B82F6' // Blue
      case 'held':
        return '#F59E0B' // Amber
      case 'sold':
        return '#6B7280' // Gray
      case 'loading':
        return '#8B5CF6' // Purple
      default:
        return seat.category_color || '#10B981' // Green or category color
    }
  }

  /**
   * Get filtered seats based on view settings
   */
  const getFilteredSeats = (): SeatPosition[] => {
    return seats.filter(seat => {
      if (viewSettings.filterCategory && seat.category_name !== viewSettings.filterCategory) {
        return false
      }
      if (viewSettings.maxPrice && (seat.current_price || 0) > viewSettings.maxPrice) {
        return false
      }
      return true
    })
  }

  /**
   * Format time remaining
   */
  const formatTimeRemaining = (ms: number): string => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading seating chart...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const filteredSeats = getFilteredSeats()
  const totalPrice = seats
    .filter(seat => selectedSeats.has(seat.seat_id))
    .reduce((sum, seat) => sum + (seat.current_price || 0), 0)

  return (
    <div className={className}>
      {/* Control Panel */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{seatingChart?.name}</CardTitle>
              <CardDescription>
                Select up to {maxSeats} seats • {seats.length} seats available
              </CardDescription>
            </div>
            
            {holdTimer && (
              <Alert className="w-auto">
                <Clock className="h-4 w-4" />
                <AlertDescription className="font-medium">
                  Hold expires in {formatTimeRemaining(holdTimeRemaining)}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            {/* View Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleZoom(0.2)}
                disabled={viewSettings.zoom >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleZoom(-0.2)}
                disabled={viewSettings.zoom <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetView}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            {/* Best Available */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => getBestAvailableSeats(2)}
                disabled={bestAvailableLoading}
              >
                <Star className="h-4 w-4 mr-1" />
                Best 2
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => getBestAvailableSeats(4)}
                disabled={bestAvailableLoading}
              >
                <Star className="h-4 w-4 mr-1" />
                Best 4
              </Button>
            </div>

            {/* View Options */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={viewSettings.showLabels}
                  onChange={(e) => setViewSettings(prev => ({ ...prev, showLabels: e.target.checked }))}
                />
                Labels
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={viewSettings.showPrices}
                  onChange={(e) => setViewSettings(prev => ({ ...prev, showPrices: e.target.checked }))}
                />
                Prices
              </label>
            </div>

            {/* Selection Summary */}
            {selectedSeats.size > 0 && (
              <div className="flex items-center gap-4 ml-auto">
                <div className="text-sm">
                  <span className="font-medium">{selectedSeats.size} seats selected</span>
                  <span className="text-muted-foreground ml-2">${totalPrice.toFixed(2)}</span>
                </div>
                <Button
                  onClick={holdSelectedSeats}
                  disabled={holdTimer !== null}
                >
                  Hold Seats
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Seating Chart */}
      <Card>
        <CardContent className="p-0">
          <div 
            ref={containerRef}
            className="relative overflow-hidden bg-gray-50 dark:bg-gray-900"
            style={{ height: '600px' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <svg
              ref={svgRef}
              className="w-full h-full cursor-move"
              viewBox="0 0 800 600"
              style={{
                transform: `translate(${viewSettings.panX}px, ${viewSettings.panY}px) scale(${viewSettings.zoom})`
              }}
            >
              {/* Background Image */}
              {seatingChart?.image_url && (
                <image
                  href={seatingChart.image_url}
                  x="0"
                  y="0"
                  width="800"
                  height="600"
                  opacity="0.3"
                />
              )}

              {/* Stage/Screen */}
              <rect
                x="200"
                y="50"
                width="400"
                height="20"
                fill="#374151"
                rx="4"
              />
              <text
                x="400"
                y="35"
                textAnchor="middle"
                className="fill-gray-600 text-sm font-medium"
              >
                STAGE
              </text>

              {/* Seats */}
              {filteredSeats.map((seat) => {
                const x = (seat.x_position || 0)
                const y = (seat.y_position || 0)
                const isSelected = selectedSeats.has(seat.seat_id)
                const isHeld = heldSeats.has(seat.seat_id)
                
                return (
                  <g key={seat.seat_id}>
                    {/* Seat Circle */}
                    <circle
                      cx={x}
                      cy={y}
                      r="8"
                      fill={getSeatColor(seat)}
                      stroke={isSelected ? "#1D4ED8" : "#fff"}
                      strokeWidth={isSelected ? "2" : "1"}
                      className="cursor-pointer hover:stroke-2 transition-all"
                      onClick={() => handleSeatClick(seat)}
                    />
                    
                    {/* Accessibility Icon */}
                    {seat.is_accessible && (
                      <text
                        x={x}
                        y={y + 20}
                        textAnchor="middle"
                        className="fill-blue-600 text-xs"
                      >
                        ♿
                      </text>
                    )}
                    
                    {/* Premium Icon */}
                    {seat.is_premium && (
                      <text
                        x={x + 12}
                        y={y - 8}
                        textAnchor="middle"
                        className="fill-yellow-500 text-xs"
                      >
                        ⭐
                      </text>
                    )}

                    {/* Seat Label */}
                    {viewSettings.showLabels && (
                      <text
                        x={x}
                        y={y + 3}
                        textAnchor="middle"
                        className="fill-white text-xs font-medium pointer-events-none"
                        style={{ fontSize: '10px' }}
                      >
                        {seat.seat_number}
                      </text>
                    )}

                    {/* Price Label */}
                    {viewSettings.showPrices && seat.current_price && (
                      <text
                        x={x}
                        y={y - 15}
                        textAnchor="middle"
                        className="fill-gray-700 text-xs font-medium pointer-events-none"
                        style={{ fontSize: '10px' }}
                      >
                        ${seat.current_price}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="mt-4">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-500 rounded-full"></div>
              <span>Held</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
              <span>Sold</span>
            </div>
            <div className="flex items-center gap-2">
              <Accessibility className="w-4 h-4 text-blue-600" />
              <span>Accessible</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span>Premium</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}