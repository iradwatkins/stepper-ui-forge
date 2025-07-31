import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';
import { imageUploadService } from '@/lib/services/ImageUploadService';
import { 
  Plus, 
  Save, 
  Upload, 
  Download, 
  Copy, 
  Trash2, 
  Edit, 
  Grid, 
  Circle, 
  Square, 
  Move,
  RotateCw,
  Palette,
  Settings,
  Eye,
  Upload as UploadIcon,
  FileImage
} from 'lucide-react';

interface SeatPosition {
  id: string;
  x: number;
  y: number;
  seatNumber: string;
  row?: string;
  section?: string;
  priceCategory: string;
  isADA: boolean;
  status: 'available' | 'sold' | 'reserved' | 'blocked';
  price: number;
}

interface SeatingLayout {
  id: string;
  name: string;
  description: string;
  venueType: 'theater' | 'stadium' | 'arena' | 'table-service' | 'general-admission';
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  seats: SeatPosition[];
  priceCategories: PriceCategory[];
  capacity: number;
  createdAt: Date;
  updatedAt: Date;
  isTemplate: boolean;
  tags: string[];
}

interface PriceCategory {
  id: string;
  name: string;
  price: number;
  color: string;
  description?: string;
}

interface SeatingLayoutManagerProps {
  eventId?: string;
  onLayoutSaved?: (layout: SeatingLayout, imageFile?: File) => void;
  initialLayout?: SeatingLayout;
  mode?: 'create' | 'edit' | 'template';
  venueId?: string;
  venueName?: string;
}

const SeatingLayoutManager: React.FC<SeatingLayoutManagerProps> = ({
  eventId,
  onLayoutSaved,
  initialLayout,
  mode = 'create',
  venueId,
  venueName
}) => {
  const [layout, setLayout] = useState<SeatingLayout>(
    initialLayout || {
      id: '',
      name: '',
      description: '',
      venueType: 'theater',
      imageUrl: '',
      imageWidth: 800,
      imageHeight: 600,
      seats: [],
      priceCategories: [
        { id: 'cat1', name: 'Premium', price: 150, color: '#FFD700' },
        { id: 'cat2', name: 'Standard', price: 100, color: '#4169E1' },
        { id: 'cat3', name: 'Economy', price: 75, color: '#32CD32' }
      ],
      capacity: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      isTemplate: mode === 'template',
      tags: []
    }
  );

  const [currentTool, setCurrentTool] = useState<'select' | 'add-seat' | 'add-row' | 'add-section'>('select');
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [currentPriceCategory, setCurrentPriceCategory] = useState('cat1');
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [rowConfig, setRowConfig] = useState({ seatCount: 10, rowLetter: 'A', startNumber: 1 });
  const [showPreview, setShowPreview] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-calculate capacity when seats change
  useEffect(() => {
    setLayout(prev => ({
      ...prev,
      capacity: prev.seats.length,
      updatedAt: new Date()
    }));
  }, [layout.seats]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Store the file for later upload
    setImageFile(file);

    // If we have a venueId (edit mode), upload to Supabase storage immediately
    if (venueId) {
      try {
        toast.loading('Uploading venue image...');
        
        // Upload the image with the venue name
        const result = await imageUploadService.uploadVenueImage(
          file, 
          venueId,
          venueName || layout.name || undefined
        );

        if (result.success && result.url) {
          // Get image dimensions
          const img = new Image();
          img.onload = () => {
            setLayout(prev => ({
              ...prev,
              imageUrl: result.url!,
              imageWidth: img.width,
              imageHeight: img.height
            }));
            toast.dismiss();
            toast.success('Venue image uploaded successfully');
          };
          img.onerror = () => {
            toast.dismiss();
            toast.error('Failed to load uploaded image');
          };
          img.src = result.url;
        } else {
          toast.dismiss();
          toast.error(result.error || 'Failed to upload image');
        }
      } catch (error) {
        toast.dismiss();
        toast.error('Failed to upload image');
        console.error('Image upload error:', error);
      }
    } else {
      // For create mode, convert to data URL for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setLayout(prev => ({
            ...prev,
            imageUrl: e.target?.result as string,
            imageWidth: img.width,
            imageHeight: img.height
          }));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCanvasClick = (event: React.MouseEvent) => {
    if (!canvasRef.current || currentTool === 'select') return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    if (currentTool === 'add-seat') {
      addSingleSeat(x, y);
    }
  };

  const addSingleSeat = (x: number, y: number) => {
    const newSeat: SeatPosition = {
      id: `seat_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      x,
      y,
      seatNumber: `${layout.seats.length + 1}`,
      priceCategory: currentPriceCategory,
      isADA: false,
      status: 'available',
      price: layout.priceCategories.find(cat => cat.id === currentPriceCategory)?.price || 100
    };

    setLayout(prev => ({
      ...prev,
      seats: [...prev.seats, newSeat]
    }));
  };

  const addRow = () => {
    const { seatCount, rowLetter, startNumber } = rowConfig;
    const newSeats: SeatPosition[] = [];
    
    // Calculate row positioning (for now, center horizontally)
    const startX = 20; // 20% from left
    const endX = 80; // 80% from left
    const y = 30 + (layout.seats.filter(s => s.row === rowLetter).length > 0 ? 0 : Object.keys(layout.seats.reduce((acc, seat) => {
      if (seat.row) acc[seat.row] = true;
      return acc;
    }, {} as Record<string, boolean>)).length * 8);

    for (let i = 0; i < seatCount; i++) {
      const x = startX + (i * (endX - startX) / (seatCount - 1));
      const seatNumber = (startNumber + i).toString();
      
      newSeats.push({
        id: `seat_${Date.now()}_${i}_${Math.random().toString(36).substring(2)}`,
        x,
        y,
        seatNumber,
        row: rowLetter,
        priceCategory: currentPriceCategory,
        isADA: false,
        status: 'available',
        price: layout.priceCategories.find(cat => cat.id === currentPriceCategory)?.price || 100
      });
    }

    setLayout(prev => ({
      ...prev,
      seats: [...prev.seats, ...newSeats]
    }));

    setIsAddingRow(false);
  };

  const deleteSeat = (seatId: string) => {
    setLayout(prev => ({
      ...prev,
      seats: prev.seats.filter(seat => seat.id !== seatId)
    }));
    setSelectedSeats(prev => prev.filter(id => id !== seatId));
  };

  const updateSelectedSeats = (updates: Partial<SeatPosition>) => {
    setLayout(prev => ({
      ...prev,
      seats: prev.seats.map(seat => 
        selectedSeats.includes(seat.id) ? { ...seat, ...updates } : seat
      )
    }));
  };

  const handleSeatClick = (seatId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (currentTool === 'select') {
      if (event.ctrlKey || event.metaKey) {
        // Multi-select
        setSelectedSeats(prev => 
          prev.includes(seatId) 
            ? prev.filter(id => id !== seatId)
            : [...prev, seatId]
        );
      } else {
        // Single select
        setSelectedSeats([seatId]);
      }
    }
  };

  const exportLayout = () => {
    const dataStr = JSON.stringify(layout, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `seating-layout-${layout.name.replace(/[^a-zA-Z0-9]/g, '-')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importLayout = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedLayout = JSON.parse(e.target?.result as string);
        setLayout({
          ...importedLayout,
          id: '', // Reset ID for new layout
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } catch (error) {
        alert('Error importing layout file');
      }
    };
    reader.readAsText(file);
  };

  const saveLayout = () => {
    const savedLayout = {
      ...layout,
      id: layout.id || `layout_${Date.now()}`,
      updatedAt: new Date()
    };

    // Pass the image file if we're in create mode and have one
    const fileToPass = (!venueId && imageFile && layout.imageUrl?.startsWith('data:')) ? imageFile : undefined;
    
    console.log('Saving layout:', savedLayout);
    onLayoutSaved?.(savedLayout, fileToPass);
  };

  const addPriceCategory = () => {
    const newCategory: PriceCategory = {
      id: `cat_${Date.now()}`,
      name: 'New Category',
      price: 100,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      description: ''
    };

    setLayout(prev => ({
      ...prev,
      priceCategories: [...prev.priceCategories, newCategory]
    }));
  };

  const updatePriceCategory = (categoryId: string, updates: Partial<PriceCategory>) => {
    setLayout(prev => ({
      ...prev,
      priceCategories: prev.priceCategories.map(cat => 
        cat.id === categoryId ? { ...cat, ...updates } : cat
      )
    }));
  };

  const deletePriceCategory = (categoryId: string) => {
    setLayout(prev => ({
      ...prev,
      priceCategories: prev.priceCategories.filter(cat => cat.id !== categoryId),
      seats: prev.seats.map(seat => 
        seat.priceCategory === categoryId 
          ? { ...seat, priceCategory: prev.priceCategories[0]?.id || '' }
          : seat
      )
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Seating Layout Manager</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <UploadIcon className="w-4 h-4 mr-2" />
                Import Layout
              </Button>
              <Button variant="outline" size="sm" onClick={exportLayout}>
                <Download className="w-4 h-4 mr-2" />
                Export Layout
              </Button>
              <Button onClick={saveLayout}>
                <Save className="w-4 h-4 mr-2" />
                Save Layout
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="design" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="design">Design</TabsTrigger>
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="design" className="space-y-4">
              {/* Layout Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Layout Name</label>
                  <Input
                    value={layout.name}
                    onChange={(e) => setLayout(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter layout name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Venue Type</label>
                  <Select 
                    value={layout.venueType} 
                    onValueChange={(value) => setLayout(prev => ({ ...prev, venueType: value as SeatingLayout['venueType'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="theater">Theater</SelectItem>
                      <SelectItem value="stadium">Stadium</SelectItem>
                      <SelectItem value="arena">Arena</SelectItem>
                      <SelectItem value="table-service">Table Service</SelectItem>
                      <SelectItem value="general-admission">General Admission</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Total Capacity</label>
                  <Input value={layout.capacity} readOnly />
                </div>
              </div>

              <Separator />

              {/* Tools */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Tool:</span>
                  <div className="flex border rounded">
                    <Button 
                      variant={currentTool === 'select' ? 'default' : 'ghost'} 
                      size="sm"
                      onClick={() => setCurrentTool('select')}
                    >
                      <Move className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant={currentTool === 'add-seat' ? 'default' : 'ghost'} 
                      size="sm"
                      onClick={() => setCurrentTool('add-seat')}
                    >
                      <Circle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Price Category:</span>
                  <Select value={currentPriceCategory} onValueChange={setCurrentPriceCategory}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {layout.priceCategories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded" 
                              style={{ backgroundColor: category.color }}
                            />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button variant="outline" size="sm" onClick={() => setIsAddingRow(true)}>
                  <Grid className="w-4 h-4 mr-2" />
                  Add Row
                </Button>

                {selectedSeats.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => selectedSeats.forEach(deleteSeat)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected ({selectedSeats.length})
                  </Button>
                )}
              </div>

              <Separator />

              {/* Canvas Area */}
              <div className="space-y-4">
                {!layout.imageUrl ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <FileImage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Upload a venue floor plan to start designing</p>
                    <Button onClick={() => document.getElementById('image-upload')?.click()}>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Image
                    </Button>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div 
                    ref={canvasRef}
                    className="relative border rounded-lg overflow-hidden bg-gray-50 cursor-crosshair"
                    style={{ height: '500px' }}
                    onClick={handleCanvasClick}
                  >
                    <img 
                      ref={imageRef}
                      src={layout.imageUrl}
                      alt="Venue layout"
                      className="w-full h-full object-contain"
                    />
                    
                    {/* Render seats */}
                    {layout.seats.map(seat => (
                      <div
                        key={seat.id}
                        className={`absolute w-6 h-6 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-xs font-bold text-white cursor-pointer transition-all ${
                          selectedSeats.includes(seat.id) ? 'ring-2 ring-blue-500 scale-110' : ''
                        }`}
                        style={{
                          left: `${seat.x}%`,
                          top: `${seat.y}%`,
                          backgroundColor: layout.priceCategories.find(cat => cat.id === seat.priceCategory)?.color || '#3B82F6'
                        }}
                        onClick={(e) => handleSeatClick(seat.id, e)}
                        title={`${seat.seatNumber} ${seat.row ? `Row ${seat.row}` : ''} - $${seat.price}`}
                      >
                        {seat.isADA ? '♿' : seat.seatNumber.slice(-2)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Seat Properties */}
              {selectedSeats.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Selected Seats ({selectedSeats.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-sm font-medium">Price Category</label>
                        <Select 
                          value={currentPriceCategory} 
                          onValueChange={(value) => {
                            setCurrentPriceCategory(value);
                            updateSelectedSeats({ priceCategory: value });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {layout.priceCategories.map(category => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="ada-accessible"
                          onChange={(e) => updateSelectedSeats({ isADA: e.target.checked })}
                        />
                        <label htmlFor="ada-accessible" className="text-sm">ADA Accessible</label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="properties" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Layout Name</label>
                    <Input
                      value={layout.name}
                      onChange={(e) => setLayout(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={layout.description}
                      onChange={(e) => setLayout(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Tags (comma separated)</label>
                    <Input
                      value={layout.tags.join(', ')}
                      onChange={(e) => setLayout(prev => ({ 
                        ...prev, 
                        tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                      }))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Venue Type</label>
                    <Select 
                      value={layout.venueType} 
                      onValueChange={(value) => setLayout(prev => ({ ...prev, venueType: value as SeatingLayout['venueType'] }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="theater">Theater</SelectItem>
                        <SelectItem value="stadium">Stadium</SelectItem>
                        <SelectItem value="arena">Arena</SelectItem>
                        <SelectItem value="table-service">Table Service</SelectItem>
                        <SelectItem value="general-admission">General Admission</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is-template"
                      checked={layout.isTemplate}
                      onChange={(e) => setLayout(prev => ({ ...prev, isTemplate: e.target.checked }))}
                    />
                    <label htmlFor="is-template" className="text-sm">Save as Template</label>
                  </div>

                  <div className="p-4 bg-gray-50 rounded space-y-2">
                    <div className="text-sm"><strong>Total Seats:</strong> {layout.seats.length}</div>
                    <div className="text-sm"><strong>Price Categories:</strong> {layout.priceCategories.length}</div>
                    <div className="text-sm"><strong>ADA Seats:</strong> {layout.seats.filter(s => s.isADA).length}</div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Price Categories</h3>
                <Button onClick={addPriceCategory}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              </div>

              <div className="space-y-4">
                {layout.priceCategories.map(category => (
                  <Card key={category.id}>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                        <div>
                          <label className="text-sm font-medium">Name</label>
                          <Input
                            value={category.name}
                            onChange={(e) => updatePriceCategory(category.id, { name: e.target.value })}
                          />
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium">Price</label>
                          <Input
                            type="number"
                            value={category.price}
                            onChange={(e) => updatePriceCategory(category.id, { price: Number(e.target.value) })}
                          />
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium">Color</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={category.color}
                              onChange={(e) => updatePriceCategory(category.id, { color: e.target.value })}
                              className="w-10 h-10 rounded border"
                            />
                            <Input
                              value={category.color}
                              onChange={(e) => updatePriceCategory(category.id, { color: e.target.value })}
                              className="flex-1"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium">Seats</label>
                          <div className="text-sm text-gray-600">
                            {layout.seats.filter(s => s.priceCategory === category.id).length} seats
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => deletePriceCategory(category.id)}
                            disabled={layout.priceCategories.length === 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Layout Preview</h3>
                <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
                  <Eye className="w-4 h-4 mr-2" />
                  {showPreview ? 'Hide' : 'Show'} Interactive Preview
                </Button>
              </div>

              {showPreview && layout.imageUrl && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div 
                    className="relative border rounded overflow-hidden bg-white"
                    style={{ height: '400px' }}
                  >
                    <img 
                      src={layout.imageUrl}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                    
                    {layout.seats.map(seat => (
                      <div
                        key={seat.id}
                        className="absolute w-4 h-4 rounded-full border border-white transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-xs font-bold text-white"
                        style={{
                          left: `${seat.x}%`,
                          top: `${seat.y}%`,
                          backgroundColor: layout.priceCategories.find(cat => cat.id === seat.priceCategory)?.color || '#3B82F6'
                        }}
                        title={`${seat.seatNumber} - $${seat.price}`}
                      >
                        {seat.isADA ? '♿' : ''}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">Layout Summary</h4>
                    <div className="space-y-1 text-sm">
                      <div>Total Seats: {layout.seats.length}</div>
                      <div>Venue Type: {layout.venueType}</div>
                      <div>Price Categories: {layout.priceCategories.length}</div>
                      <div>ADA Accessible: {layout.seats.filter(s => s.isADA).length}</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">Revenue Potential</h4>
                    <div className="space-y-1 text-sm">
                      {layout.priceCategories.map(category => {
                        const seatCount = layout.seats.filter(s => s.priceCategory === category.id).length;
                        const revenue = seatCount * category.price;
                        return (
                          <div key={category.id} className="flex justify-between">
                            <span>{category.name}:</span>
                            <span>${revenue.toLocaleString()}</span>
                          </div>
                        );
                      })}
                      <div className="border-t pt-1 font-medium flex justify-between">
                        <span>Total:</span>
                        <span>${layout.seats.reduce((total, seat) => {
                          const category = layout.priceCategories.find(cat => cat.id === seat.priceCategory);
                          return total + (category?.price || 0);
                        }, 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">Distribution</h4>
                    <div className="space-y-2">
                      {layout.priceCategories.map(category => {
                        const seatCount = layout.seats.filter(s => s.priceCategory === category.id).length;
                        const percentage = layout.seats.length > 0 ? (seatCount / layout.seats.length) * 100 : 0;
                        return (
                          <div key={category.id} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{category.name}</span>
                              <span>{seatCount} ({percentage.toFixed(1)}%)</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="h-2 rounded-full" 
                                style={{ 
                                  width: `${percentage}%`,
                                  backgroundColor: category.color 
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add Row Dialog */}
      <Dialog open={isAddingRow} onOpenChange={setIsAddingRow}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Row of Seats</DialogTitle>
            <DialogDescription>
              Configure the row of seats to add to your layout
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Row Letter</label>
                <Input
                  value={rowConfig.rowLetter}
                  onChange={(e) => setRowConfig(prev => ({ ...prev, rowLetter: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Seat Count</label>
                <Input
                  type="number"
                  value={rowConfig.seatCount}
                  onChange={(e) => setRowConfig(prev => ({ ...prev, seatCount: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Start Number</label>
                <Input
                  type="number"
                  value={rowConfig.startNumber}
                  onChange={(e) => setRowConfig(prev => ({ ...prev, startNumber: Number(e.target.value) }))}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddingRow(false)}>
                Cancel
              </Button>
              <Button onClick={addRow}>
                Add Row
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={importLayout}
        className="hidden"
      />
    </div>
  );
};

export default SeatingLayoutManager;