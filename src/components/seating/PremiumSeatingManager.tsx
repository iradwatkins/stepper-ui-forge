import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  MapPin, 
  DollarSign, 
  Users, 
  MousePointer,
  Trash2,
  Check,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  Palette,
  Info
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  calculateImageDrawInfo,
  clientToPercentageCoordinates,
  percentageToCanvasCoordinates,
  ImageDrawInfo,
  Point
} from '@/lib/utils/coordinateUtils';
import { SeatData, SeatCategory } from '@/types/seating';

interface PremiumSeatingManagerProps {
  venueImageUrl?: string;
  onImageUpload: (file: File) => void;
  onSeatingConfigurationChange: (seats: SeatData[], categories: SeatCategory[]) => void;
  initialSeats?: SeatData[];
  initialCategories?: SeatCategory[];
  maxTotalSeats?: number;
  ticketTypes?: Array<{ id: string; name: string; quantity: number; price: number; color?: string }>;
  startingTab?: 'setup' | 'configure' | 'place' | 'info';
  showOnlyTab?: 'setup' | 'configure' | 'place' | 'info';
}

export default function PremiumSeatingManager({
  venueImageUrl,
  onImageUpload,
  onSeatingConfigurationChange,
  initialSeats = [],
  initialCategories = [],
  maxTotalSeats,
  ticketTypes = [],
  startingTab = 'setup',
  showOnlyTab
}: PremiumSeatingManagerProps) {
  // Determine initial tab
  const getInitialTab = () => {
    if (showOnlyTab) return showOnlyTab;
    if (venueImageUrl) return 'place';
    return startingTab;
  };

  // State
  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [seats, setSeats] = useState<SeatData[]>(initialSeats);
  const [categories, setCategories] = useState<SeatCategory[]>(() => {
    if (initialCategories.length > 0) return initialCategories;
    
    // Convert ticket types to categories
    return ticketTypes.map((ticket, index) => ({
      id: ticket.id,
      name: ticket.name,
      color: ticket.color || ['#10B981', '#F59E0B', '#8B5CF6', '#3B82F6'][index % 4],
      basePrice: ticket.price,
      maxCapacity: ticket.quantity,
      amenities: ['Standard seating'],
      viewQuality: 'good' as const
    }));
  });
  
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [tool, setTool] = useState<'pan' | 'place'>('place');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Image state
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageDrawInfo, setImageDrawInfo] = useState<ImageDrawInfo | null>(null);

  // Auto-select first category
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0].id);
    }
  }, [categories, selectedCategory]);

  // Calculate progress
  const totalSeatsNeeded = maxTotalSeats || ticketTypes.reduce((total, ticket) => total + ticket.quantity, 0);
  const seatProgress = {
    placed: seats.length,
    remaining: Math.max(0, totalSeatsNeeded - seats.length),
    percentage: totalSeatsNeeded > 0 ? (seats.length / totalSeatsNeeded) * 100 : 0,
    total: totalSeatsNeeded
  };

  // Load image
  useEffect(() => {
    if (!venueImageUrl) {
      setLoadedImage(null);
      setImageLoading(false);
      setImageError(null);
      return;
    }

    setImageLoading(true);
    setImageError(null);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      setLoadedImage(img);
      setImageLoading(false);
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Venue image loaded:', img.width, 'x', img.height);
      }
    };
    
    img.onerror = () => {
      console.error('❌ Failed to load venue image');
      setImageError('Failed to load venue image');
      setImageLoading(false);
      setLoadedImage(null);
    };
    
    img.src = venueImageUrl;
  }, [venueImageUrl]);

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      // Recalculate image draw info when canvas size changes
      updateImageDrawInfo();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [updateImageDrawInfo]);

  // Calculate and cache image draw info
  const updateImageDrawInfo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loadedImage) {
      setImageDrawInfo(null);
      return;
    }

    const newImageDrawInfo = calculateImageDrawInfo(
      loadedImage.width,
      loadedImage.height,
      canvas.width,
      canvas.height
    );
    setImageDrawInfo(newImageDrawInfo);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📐 Updated image draw info:', newImageDrawInfo);
    }
  }, [loadedImage]);

  // Update image draw info when canvas or image changes
  useEffect(() => {
    updateImageDrawInfo();
  }, [updateImageDrawInfo]);

  // Draw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !loadedImage || !imageDrawInfo) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context
    ctx.save();
    
    // Apply zoom and pan
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    
    // Draw background image using cached draw info
    ctx.drawImage(
      loadedImage,
      imageDrawInfo.drawX,
      imageDrawInfo.drawY,
      imageDrawInfo.drawWidth,
      imageDrawInfo.drawHeight
    );
    
    // Draw seats
    seats.forEach((seat, index) => {
      // Convert percentage coordinates to canvas coordinates using utility
      const seatPos = percentageToCanvasCoordinates(
        seat.x,
        seat.y,
        imageDrawInfo
      );
      
      const radius = 8;
      const isSelected = selectedCategory === seat.category;

      // Draw seat circle
      ctx.beginPath();
      ctx.arc(seatPos.x, seatPos.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = seat.categoryColor;
      ctx.fill();
      
      // Draw border
      ctx.strokeStyle = isSelected ? '#000' : '#fff';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();

      // Draw seat number
      if (seat.seatNumber) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(seat.seatNumber, seatPos.x, seatPos.y);
      }
      
      // Draw placement order for first 10 seats
      if (index < 10) {
        ctx.fillStyle = '#333';
        ctx.font = 'bold 8px Arial';
        ctx.fillText((index + 1).toString(), seatPos.x + radius + 5, seatPos.y - radius);
      }
    });

    // Restore context
    ctx.restore();
  }, [loadedImage, imageDrawInfo, seats, zoom, pan, selectedCategory]);

  // Redraw canvas when dependencies change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Canvas event handlers
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || tool !== 'place' || !loadedImage || !imageDrawInfo) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Use centralized coordinate conversion
    const percentageCoords = clientToPercentageCoordinates(
      event.clientX,
      event.clientY,
      canvas,
      imageDrawInfo,
      { zoom, pan }
    );
    
    // Check if click is valid (within image bounds)
    if (percentageCoords.x < 0 || percentageCoords.y < 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🚫 Click outside image bounds');
      }
      return;
    }
    
    // Check if clicking on existing seat (remove it)
    const clickedSeat = seats.find(seat => {
      const dx = Math.abs(seat.x - percentageCoords.x);
      const dy = Math.abs(seat.y - percentageCoords.y);
      return dx < 3 && dy < 3; // 3% tolerance
    });

    if (clickedSeat) {
      // Remove seat
      const newSeats = seats.filter(s => s.id !== clickedSeat.id);
      setSeats(newSeats);
      onSeatingConfigurationChange(newSeats, categories);
      if (process.env.NODE_ENV === 'development') {
        console.log(`🗑️ Removed seat: ${clickedSeat.seatNumber}`);
      }
    } else {
      // Check if we can add more seats
      if (totalSeatsNeeded > 0 && seats.length >= totalSeatsNeeded) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`⚠️ Cannot place more seats. Maximum ${totalSeatsNeeded} seats allowed.`);
        }
        return;
      }
      
      // Add new seat
      const category = categories.find(c => c.id === selectedCategory);
      if (!category) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ No category selected for seat placement');
        }
        return;
      }

      const newSeat: SeatData = {
        id: `seat_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        x: percentageCoords.x,
        y: percentageCoords.y,
        seatNumber: `${category.name.charAt(0)}${seats.length + 1}`,
        category: selectedCategory,
        categoryColor: category.color,
        price: category.basePrice,
        isADA: false,
        status: 'available',
        section: category.name,
        viewQuality: category.viewQuality
      };

      const newSeats = [...seats, newSeat];
      setSeats(newSeats);
      onSeatingConfigurationChange(newSeats, categories);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Placed seat: ${newSeat.seatNumber} at (${percentageCoords.x.toFixed(1)}%, ${percentageCoords.y.toFixed(1)}%)`);
      }
    }
  }, [tool, pan, zoom, seats, categories, selectedCategory, onSeatingConfigurationChange, loadedImage, imageDrawInfo, totalSeatsNeeded]);

  const handleCanvasMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'pan') {
      setIsDragging(true);
      setLastMousePos({ x: event.clientX, y: event.clientY });
    }
  }, [tool]);

  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging && tool === 'pan') {
      const deltaX = event.clientX - lastMousePos.x;
      const deltaY = event.clientY - lastMousePos.y;
      
      setPan(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      setLastMousePos({ x: event.clientX, y: event.clientY });
    }
  }, [isDragging, tool, lastMousePos]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // File upload handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
  };

  // View controls
  const zoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const zoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.5));
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  const clearAllSeats = () => {
    setSeats([]);
    onSeatingConfigurationChange([], categories);
  };

  return (
    <div className="w-full space-y-6">
      <Tabs value={activeTab} onValueChange={showOnlyTab ? undefined : setActiveTab} className="w-full">
        {!showOnlyTab && (
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="setup" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Setup
            </TabsTrigger>
            <TabsTrigger value="configure" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Configure
            </TabsTrigger>
            <TabsTrigger value="place" className="flex items-center gap-2">
              <MousePointer className="h-4 w-4" />
              Place Seats
            </TabsTrigger>
          </TabsList>
        )}

        {/* Setup Tab */}
        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Venue Layout</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    Click to upload venue layout image
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG up to 10MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                {venueImageUrl && (
                  <div className="mt-4">
                    <img 
                      src={venueImageUrl} 
                      alt="Venue layout" 
                      className="max-w-full h-auto rounded-lg border"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configure Tab */}
        <TabsContent value="configure" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Seat Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-6 h-6 rounded-full border-2"
                        style={{ backgroundColor: category.color }}
                      />
                      <div>
                        <h4 className="font-medium">{category.name}</h4>
                        <p className="text-sm text-gray-600">
                          ${category.basePrice} • Max {category.maxCapacity} seats
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{category.viewQuality}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Seats Placed: {seatProgress.placed}</span>
                  <span>Remaining: {seatProgress.remaining}</span>
                </div>
                <Progress value={seatProgress.percentage} className="h-2" />
                <div className="text-center text-sm text-gray-600">
                  {seatProgress.percentage.toFixed(0)}% Complete ({seatProgress.placed}/{seatProgress.total})
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Place Seats Tab */}
        <TabsContent value="place" className="space-y-4">
          {imageError ? (
            <Card>
              <CardContent className="text-center py-8">
                <X className="mx-auto h-12 w-12 text-red-400" />
                <p className="mt-2 text-red-600 font-medium">Image Loading Error</p>
                <p className="text-sm text-gray-600 mt-1">{imageError}</p>
              </CardContent>
            </Card>
          ) : imageLoading ? (
            <Card>
              <CardContent className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading venue image...</p>
              </CardContent>
            </Card>
          ) : venueImageUrl && loadedImage ? (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Controls Panel */}
              <div className="lg:col-span-1 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Tools</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant={tool === 'pan' ? 'default' : 'outline'}
                        onClick={() => setTool('pan')}
                      >
                        <Move className="h-3 w-3 mr-1" />
                        Pan
                      </Button>
                      <Button
                        size="sm"
                        variant={tool === 'place' ? 'default' : 'outline'}
                        onClick={() => setTool('place')}
                      >
                        <MousePointer className="h-3 w-3 mr-1" />
                        Place
                      </Button>
                    </div>

                    <Separator />

                    {/* Progress */}
                    {totalSeatsNeeded > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs">Seat Assignment Progress</Label>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span>Placed: {seatProgress.placed}</span>
                            <span>Remaining: {seatProgress.remaining}</span>
                          </div>
                          <Progress value={seatProgress.percentage} className="h-2" />
                          <div className="text-xs text-center text-gray-600">
                            {seatProgress.percentage.toFixed(0)}% Complete
                          </div>
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Category Selection */}
                    <div className="space-y-2">
                      <Label className="text-xs">Seat Category</Label>
                      {selectedCategory && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <div 
                            className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: categories.find(c => c.id === selectedCategory)?.color }}
                          />
                          <span>{categories.find(c => c.id === selectedCategory)?.name}</span>
                        </div>
                      )}
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded"
                                  style={{ backgroundColor: cat.color }}
                                />
                                {cat.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    {/* View Controls */}
                    <div className="space-y-2">
                      <Label className="text-xs">View Controls</Label>
                      <div className="grid grid-cols-3 gap-1">
                        <Button size="sm" variant="outline" onClick={zoomIn}>
                          <ZoomIn className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={zoomOut}>
                          <ZoomOut className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={resetView}>
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={clearAllSeats}
                      className="w-full"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear All
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Canvas */}
              <div className="lg:col-span-3">
                <Card>
                  <CardContent className="p-4">
                    <div ref={containerRef} className="relative w-full h-96 overflow-hidden rounded-lg border">
                      <canvas
                        ref={canvasRef}
                        className="w-full h-full cursor-pointer"
                        onClick={handleCanvasClick}
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        onMouseLeave={handleCanvasMouseUp}
                        style={{ 
                          cursor: tool === 'place' ? 'crosshair' : 
                                 tool === 'pan' ? (isDragging ? 'grabbing' : 'grab') : 'default' 
                        }}
                      />
                    </div>
                    
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>
                          {tool === 'place' ? (
                            totalSeatsNeeded > 0 && seats.length >= totalSeatsNeeded ? 
                              '⚠️ Maximum seats reached' : 
                              selectedCategory ? 
                                `🎯 Click to place ${categories.find(c => c.id === selectedCategory)?.name} seats` :
                                '🎯 Select a category first'
                          ) : 'Drag to pan around'}
                        </span>
                        <span>
                          Zoom: {Math.round(zoom * 100)}% | Seats: {seats.length}
                          {totalSeatsNeeded > 0 && `/${totalSeatsNeeded}`}
                        </span>
                      </div>
                      {tool === 'place' && totalSeatsNeeded > 0 && (
                        <div className="text-xs text-center">
                          {seats.length < totalSeatsNeeded ? (
                            <span className="text-blue-600">
                              Place {totalSeatsNeeded - seats.length} more seats to complete assignment
                            </span>
                          ) : (
                            <span className="text-green-600 font-medium">
                              ✅ All {totalSeatsNeeded} tickets have assigned seats!
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-600">Please upload a venue layout first</p>
                <p className="text-sm text-gray-500 mt-1">Use the "Setup" tab to upload your venue image</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}