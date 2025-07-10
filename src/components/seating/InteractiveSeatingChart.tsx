import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  ShoppingCart, 
  Clock,
  Users,
  DollarSign,
  UserCheck,
  MapPin,
  Eye,
  Star,
  AlertCircle
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { 
  calculateImageDrawInfo, 
  clientToPercentageCoordinates, 
  percentageToCanvasCoordinates,
  getImageDimensions,
  type ImageDrawInfo,
  type Point,
  type ImageDimensions
} from '@/lib/utils/coordinateUtils';

import { SeatData, PriceCategory } from '@/types/seating';

interface InteractiveSeatingChartProps {
  venueImageUrl: string;
  seats: SeatData[];
  priceCategories: PriceCategory[];
  selectedSeats?: string[];
  onSeatSelection?: (seatIds: string[]) => void;
  onPurchaseClick?: () => void;
  maxSelectableSeats?: number;
  showPurchaseButton?: boolean;
  disabled?: boolean;
  className?: string;
  eventType?: 'simple' | 'ticketed' | 'premium';
  eventId?: string;
}

export default function InteractiveSeatingChart({
  venueImageUrl,
  seats,
  priceCategories,
  selectedSeats = [],
  onSeatSelection,
  onPurchaseClick,
  maxSelectableSeats = 10,
  showPurchaseButton = true,
  disabled = false,
  className = '',
  eventType = 'simple',
  eventId
}: InteractiveSeatingChartProps) {
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);
  const [tooltipData, setTooltipData] = useState<{
    seat: SeatData;
    x: number;
    y: number;
    visible: boolean;
  } | null>(null);
  const [filterSection, setFilterSection] = useState<string>('all');
  const [filterPriceRange, setFilterPriceRange] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState<'price' | 'section' | 'availability'>('price');
  
  // Canvas and image refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [dragStartPan, setDragStartPan] = useState({ x: 0, y: 0 });
  
  // Image loading state
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
  const [imageDrawInfo, setImageDrawInfo] = useState<ImageDrawInfo | null>(null);

  // Image loading effect
  useEffect(() => {
    if (!venueImageUrl) {
      setImageLoaded(false);
      setImageError(true);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      console.log('✅ Image loaded successfully:', { width: img.width, height: img.height });
      imageRef.current = img;
      setImageLoaded(true);
      setImageError(false);
      
      const dimensions = getImageDimensions(img);
      setImageDimensions(dimensions);
      
      // Calculate draw info for canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const drawInfo = calculateImageDrawInfo(dimensions, {
          width: canvas.width,
          height: canvas.height
        });
        setImageDrawInfo(drawInfo);
        console.log('📐 Image draw info calculated:', drawInfo);
      }
    };
    
    img.onerror = () => {
      console.error('❌ Failed to load image:', venueImageUrl);
      setImageLoaded(false);
      setImageError(true);
      imageRef.current = null;
    };
    
    img.src = venueImageUrl;
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [venueImageUrl]);

  // Canvas resize effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageDimensions) return;

    const drawInfo = calculateImageDrawInfo(imageDimensions, {
      width: canvas.width,
      height: canvas.height
    });
    setImageDrawInfo(drawInfo);
  }, [imageDimensions]);

  // Premium event validation
  const validatePremiumEventAccess = useCallback(() => {
    if (eventType !== 'premium') {
      return {
        valid: false,
        message: 'Airline-style seat selection is only available for premium events. Please upgrade your event type to access advanced seating features.'
      };
    }
    return { valid: true };
  }, [eventType]);

  // Premium seating validation
  const validatePremiumSeatSelection = useCallback((seat: SeatData) => {
    // First check if this is a premium event
    const eventValidation = validatePremiumEventAccess();
    if (!eventValidation.valid) {
      return eventValidation;
    }
    
    if (!seat.isPremium) return { valid: true };
    
    // Check if user is trying to select individual seats from a table
    if (seat.tableId && seat.tableCapacity) {
      const tableSeats = seats.filter(s => s.tableId === seat.tableId);
      const selectedTableSeats = tableSeats.filter(s => selectedSeats.includes(s.id));
      
      // For premium tables, must book entire table
      if (selectedTableSeats.length > 0 && selectedTableSeats.length !== seat.tableCapacity) {
        return {
          valid: false,
          message: `Premium ${seat.tableType} tables must be booked entirely (${seat.tableCapacity} seats)`
        };
      }
    }
    
    return { valid: true };
  }, [seats, selectedSeats, validatePremiumEventAccess]);

  // Premium pricing calculation
  const calculatePremiumPrice = useCallback((seat: SeatData) => {
    if (!seat.isPremium) return seat.price;
    
    // Apply premium multiplier or fixed premium pricing
    const basePrice = seat.price;
    const premiumMultiplier = seat.tableType === 'round' ? 1.2 : 1.1;
    
    return Math.round(basePrice * premiumMultiplier);
  }, []);

  // Adjacency detection for multi-seat selection
  const findAdjacentSeats = useCallback((seatId: string) => {
    const seat = seats.find(s => s.id === seatId);
    if (!seat) return [];
    
    const adjacentSeats: SeatData[] = [];
    const adjacencyThreshold = 20; // Distance threshold for adjacency
    
    seats.forEach(otherSeat => {
      if (otherSeat.id === seatId) return;
      
      // Calculate distance between seats
      const distance = Math.sqrt(
        Math.pow(seat.x - otherSeat.x, 2) + Math.pow(seat.y - otherSeat.y, 2)
      );
      
      // Check if seats are adjacent (same row or very close)
      const sameRow = seat.row === otherSeat.row;
      const sameSection = seat.section === otherSeat.section;
      const closeDistance = distance < adjacencyThreshold;
      
      if (sameSection && (sameRow || closeDistance)) {
        adjacentSeats.push(otherSeat);
      }
    });
    
    return adjacentSeats.sort((a, b) => {
      // Sort by distance from original seat
      const distA = Math.sqrt(Math.pow(seat.x - a.x, 2) + Math.pow(seat.y - a.y, 2));
      const distB = Math.sqrt(Math.pow(seat.x - b.x, 2) + Math.pow(seat.y - b.y, 2));
      return distA - distB;
    });
  }, [seats]);

  // Smart multi-seat selection with adjacency preference
  const selectAdjacentSeats = useCallback((baseSeat: SeatData, quantity: number) => {
    const adjacentSeats = findAdjacentSeats(baseSeat.id);
    const availableAdjacent = adjacentSeats.filter(s => s.status === 'available');
    
    const selectedIds = [baseSeat.id];
    let needed = quantity - 1;
    
    // Try to select adjacent seats first
    for (const seat of availableAdjacent) {
      if (needed <= 0) break;
      if (!selectedSeats.includes(seat.id)) {
        selectedIds.push(seat.id);
        needed--;
      }
    }
    
    // If not enough adjacent seats, show warning
    if (needed > 0) {
      const message = `Only ${selectedIds.length} adjacent seats available. Continue with non-adjacent selection?`;
      if (!confirm(message)) {
        return selectedSeats;
      }
    }
    
    return selectedIds;
  }, [seats, selectedSeats, findAdjacentSeats]);

  // Check if selected seats are adjacent
  const areSeatsAdjacent = useCallback((seatIds: string[]) => {
    if (seatIds.length <= 1) return true;
    
    const seatPositions = seatIds.map(id => seats.find(s => s.id === id)).filter(Boolean);
    if (seatPositions.length !== seatIds.length) return false;
    
    for (let i = 0; i < seatPositions.length; i++) {
      const currentSeat = seatPositions[i];
      const hasAdjacentSeat = seatPositions.some(otherSeat => {
        if (otherSeat.id === currentSeat.id) return false;
        const distance = Math.sqrt(
          Math.pow(currentSeat.x - otherSeat.x, 2) + Math.pow(currentSeat.y - otherSeat.y, 2)
        );
        return distance < 20 && currentSeat.section === otherSeat.section;
      });
      
      if (!hasAdjacentSeat && seatPositions.length > 1) {
        return false;
      }
    }
    
    return true;
  }, [seats]);

  // Memoized calculations
  const sections = useMemo(() => {
    const sectionSet = new Set(seats.map(seat => seat.section).filter(Boolean));
    return ['all', ...Array.from(sectionSet)];
  }, [seats]);

  const filteredSeats = useMemo(() => {
    return seats.filter(seat => {
      if (filterSection !== 'all' && seat.section !== filterSection) return false;
      if (seat.price < filterPriceRange[0] || seat.price > filterPriceRange[1]) return false;
      return true;
    });
  }, [seats, filterSection, filterPriceRange]);

  const sortedSeats = useMemo(() => {
    return [...filteredSeats].sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.price - b.price;
        case 'section':
          return (a.section || '').localeCompare(b.section || '');
        case 'availability':
          const statusOrder = { available: 0, held: 1, reserved: 2, sold: 3, selected: 4 };
          return statusOrder[a.status] - statusOrder[b.status];
        default:
          return 0;
      }
    });
  }, [filteredSeats, sortBy]);

  const statistics = useMemo(() => {
    const total = seats.length;
    const available = seats.filter(s => s.status === 'available').length;
    const selected = selectedSeats.length;
    const sold = seats.filter(s => s.status === 'sold').length;
    const avgPrice = selected > 0 
      ? seats.filter(s => selectedSeats.includes(s.id)).reduce((sum, s) => sum + s.price, 0) / selected
      : 0;
    const totalPrice = seats.filter(s => selectedSeats.includes(s.id)).reduce((sum, s) => sum + s.price, 0);

    return { total, available, selected, sold, avgPrice, totalPrice };
  }, [seats, selectedSeats]);

  // Simple seat click handler based on reference implementation
  const handleSeatClick = useCallback((seat: SeatData) => {
    console.log('🖱️ Seat clicked:', seat.seatNumber, seat.id);
    
    if (disabled || seat.status !== 'available') {
      console.log('🚫 Click ignored - disabled or seat not available', { disabled, status: seat.status });
      return;
    }

    const isSelected = selectedSeats.includes(seat.id);

    if (isSelected) {
      // Deselect seat
      const newSelection = selectedSeats.filter(id => id !== seat.id);
      console.log('❌ Deselecting seat:', seat.id, 'New selection:', newSelection);
      onSeatSelection?.(newSelection);
    } else if (selectedSeats.length < maxSelectableSeats) {
      // Select seat
      const newSelection = [...selectedSeats, seat.id];
      console.log('✅ Selecting seat:', seat.id, 'New selection:', newSelection);
      onSeatSelection?.(newSelection);
    } else {
      console.log('⚠️ Max seats reached:', maxSelectableSeats);
    }
  }, [disabled, selectedSeats, maxSelectableSeats, onSeatSelection]);

  // Helper functions from reference implementation
  const getPriceCategoryColor = (categoryId: string) => {
    return priceCategories.find(cat => cat.id === categoryId)?.color || '#3B82F6';
  };

  const getSeatDisplayColor = (seat: SeatData) => {
    const isSelected = selectedSeats.includes(seat.id);
    
    if (isSelected) return '#10B981'; // Green for selected
    
    switch (seat.status) {
      case 'available': return seat.categoryColor || getPriceCategoryColor(seat.category);
      case 'sold': return '#EF4444';
      case 'reserved': return '#F59E0B';
      case 'held': return '#6B7280';
      default: return '#3B82F6';
    }
  };

  const getTotalPrice = () => {
    return seats
      .filter(seat => selectedSeats.includes(seat.id))
      .reduce((total, seat) => total + seat.price, 0);
  };

  const getSeatsByCategory = () => {
    const categoryCounts: { [key: string]: number } = {};
    seats
      .filter(seat => selectedSeats.includes(seat.id))
      .forEach(seat => {
        const categoryName = priceCategories.find(cat => cat.id === seat.category)?.name || 'Unknown';
        categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
      });
    return categoryCounts;
  };

  // Canvas drawing function
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current || !imageDrawInfo) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context
    ctx.save();

    // Apply zoom and pan
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw background image with proper aspect ratio
    ctx.drawImage(
      imageRef.current,
      imageDrawInfo.drawX,
      imageDrawInfo.drawY,
      imageDrawInfo.drawWidth,
      imageDrawInfo.drawHeight
    );

    // Draw tables first (behind seats)
    const drawnTables = new Set<string>();
    sortedSeats.forEach(seat => {
      if (!seat.tableId || drawnTables.has(seat.tableId)) return;
      
      // Get all seats for this table
      const tableSeats = sortedSeats.filter(s => s.tableId === seat.tableId);
      if (tableSeats.length === 0) return;
      
      // Calculate table center based on seat positions
      const centerX = tableSeats.reduce((sum, s) => sum + s.x, 0) / tableSeats.length;
      const centerY = tableSeats.reduce((sum, s) => sum + s.y, 0) / tableSeats.length;
      
      const centerCoords = percentageToCanvasCoordinates(
        centerX,
        centerY,
        imageDrawInfo
      );
      
      const tableRadius = 25 / zoom;
      
      // Draw table based on type
      ctx.beginPath();
      if (seat.tableType === 'round') {
        ctx.arc(centerCoords.x, centerCoords.y, tableRadius, 0, 2 * Math.PI);
      } else if (seat.tableType === 'square') {
        ctx.rect(
          centerCoords.x - tableRadius,
          centerCoords.y - tableRadius,
          tableRadius * 2,
          tableRadius * 2
        );
      }
      
      // Table styling
      ctx.fillStyle = seat.isPremium ? 'rgba(245, 158, 11, 0.2)' : 'rgba(156, 163, 175, 0.2)';
      ctx.fill();
      ctx.strokeStyle = seat.isPremium ? '#F59E0B' : '#6B7280';
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();
      
      // Table label
      ctx.fillStyle = seat.isPremium ? '#F59E0B' : '#6B7280';
      ctx.font = `bold ${10 / zoom}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(
        seat.tableType === 'round' ? '●' : '■',
        centerCoords.x,
        centerCoords.y + 3 / zoom
      );
      
      drawnTables.add(seat.tableId);
    });
    
    // Draw seats using percentage coordinates
    sortedSeats.forEach(seat => {
      if (!seat) return;

      // Convert percentage coordinates to canvas coordinates
      const canvasCoords = percentageToCanvasCoordinates(
        seat.x,
        seat.y,
        imageDrawInfo
      );
      
      const seatWidth = 16 / zoom; // Airline-style seat width
      const seatHeight = 14 / zoom; // Airline-style seat height
      const cornerRadius = 3 / zoom; // Rounded corners
      const isSelected = selectedSeats.includes(seat.id);
      const isHovered = hoveredSeat === seat.id;

      // Helper function to draw rounded rectangle (airline seat shape)
      const drawRoundedRect = (x: number, y: number, width: number, height: number, radius: number) => {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
      };

      // Airline-style seat shape
      if (seat.isPremium && seat.tableType) {
        // Premium table seats get special treatment
        if (seat.tableType === 'round') {
          // Round table seats remain circular but larger
          ctx.beginPath();
          ctx.arc(canvasCoords.x, canvasCoords.y, seatWidth / 2, 0, 2 * Math.PI);
        } else if (seat.tableType === 'square') {
          // Square table seats get rounded squares
          drawRoundedRect(
            canvasCoords.x - seatWidth / 2,
            canvasCoords.y - seatHeight / 2,
            seatWidth,
            seatHeight,
            cornerRadius
          );
        }
      } else {
        // Standard airline-style rectangular seats with rounded corners
        drawRoundedRect(
          canvasCoords.x - seatWidth / 2,
          canvasCoords.y - seatHeight / 2,
          seatWidth,
          seatHeight,
          cornerRadius
        );
      }

      // Fill color based on status
      switch (seat.status) {
        case 'available':
          ctx.fillStyle = isSelected ? '#22C55E' : seat.categoryColor;
          break;
        case 'selected':
          ctx.fillStyle = '#22C55E';
          break;
        case 'sold':
          ctx.fillStyle = '#DC2626';
          break;
        case 'reserved':
          ctx.fillStyle = '#F59E0B';
          break;
        case 'held':
          ctx.fillStyle = '#8B5CF6';
          break;
        default:
          ctx.fillStyle = seat.categoryColor;
      }
      ctx.fill();

      // Enhanced seat border with adjacency indicators
      ctx.strokeStyle = isSelected ? '#000' : isHovered ? '#333' : '#fff';
      ctx.lineWidth = isSelected ? 3 : isHovered ? 2 : 1;
      ctx.stroke();
      
      // Show adjacent seat indicators when hovering
      if (isHovered && selectedSeats.length > 0) {
        const adjacentSeats = findAdjacentSeats(seat.id);
        const isAdjacent = adjacentSeats.some(adjSeat => selectedSeats.includes(adjSeat.id));
        
        if (isAdjacent) {
          // Draw connection line to adjacent selected seats
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          
          adjacentSeats.forEach(adjSeat => {
            if (selectedSeats.includes(adjSeat.id)) {
              const adjCoords = percentageToCanvasCoordinates(
                adjSeat.x,
                adjSeat.y,
                imageDrawInfo
              );
              ctx.moveTo(canvasCoords.x, canvasCoords.y);
              ctx.lineTo(adjCoords.x, adjCoords.y);
            }
          });
          
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Hover glow effect (airline-style)
      if (isHovered && seat.status === 'available') {
        ctx.save();
        ctx.shadowColor = 'rgba(34, 197, 94, 0.6)';
        ctx.shadowBlur = 8 / zoom;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Draw glow outline
        ctx.beginPath();
        ctx.moveTo(canvasCoords.x - seatWidth / 2 - 2 + cornerRadius + 1, canvasCoords.y - seatHeight / 2 - 2);
        ctx.lineTo(canvasCoords.x + seatWidth / 2 + 2 - cornerRadius - 1, canvasCoords.y - seatHeight / 2 - 2);
        ctx.quadraticCurveTo(canvasCoords.x + seatWidth / 2 + 2, canvasCoords.y - seatHeight / 2 - 2, canvasCoords.x + seatWidth / 2 + 2, canvasCoords.y - seatHeight / 2 - 2 + cornerRadius + 1);
        ctx.lineTo(canvasCoords.x + seatWidth / 2 + 2, canvasCoords.y + seatHeight / 2 + 2 - cornerRadius - 1);
        ctx.quadraticCurveTo(canvasCoords.x + seatWidth / 2 + 2, canvasCoords.y + seatHeight / 2 + 2, canvasCoords.x + seatWidth / 2 + 2 - cornerRadius - 1, canvasCoords.y + seatHeight / 2 + 2);
        ctx.lineTo(canvasCoords.x - seatWidth / 2 - 2 + cornerRadius + 1, canvasCoords.y + seatHeight / 2 + 2);
        ctx.quadraticCurveTo(canvasCoords.x - seatWidth / 2 - 2, canvasCoords.y + seatHeight / 2 + 2, canvasCoords.x - seatWidth / 2 - 2, canvasCoords.y + seatHeight / 2 + 2 - cornerRadius - 1);
        ctx.lineTo(canvasCoords.x - seatWidth / 2 - 2, canvasCoords.y - seatHeight / 2 - 2 + cornerRadius + 1);
        ctx.quadraticCurveTo(canvasCoords.x - seatWidth / 2 - 2, canvasCoords.y - seatHeight / 2 - 2, canvasCoords.x - seatWidth / 2 - 2 + cornerRadius + 1, canvasCoords.y - seatHeight / 2 - 2);
        ctx.closePath();
        
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      // Premium indicator (airline-style)
      if (seat.isPremium) {
        ctx.fillStyle = '#FFD700';
        ctx.font = `bold ${6 / zoom}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', canvasCoords.x - seatWidth / 2 + 4 / zoom, canvasCoords.y - seatHeight / 2 + 4 / zoom);
      }
      
      // ADA indicator (airline-style)
      if (seat.isADA) {
        ctx.fillStyle = '#0066CC';
        ctx.font = `bold ${8 / zoom}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♿', canvasCoords.x + seatWidth / 2 - 4 / zoom, canvasCoords.y - seatHeight / 2 + 4 / zoom);
      }

      // Hold timer indicator
      if (seat.status === 'held' && seat.holdExpiry) {
        const timeLeft = seat.holdExpiry.getTime() - Date.now();
        if (timeLeft > 0) {
          ctx.fillStyle = '#fff';
          ctx.font = `${8 / zoom}px Arial`;
          ctx.textAlign = 'center';
          ctx.fillText('⏱', canvasCoords.x, canvasCoords.y - seatHeight / 2 - 8 / zoom);
        }
      }

      // Seat number (always visible for airline-style)
      if (seat.seatNumber) {
        ctx.fillStyle = seat.status === 'sold' ? '#fff' : '#000';
        ctx.font = `bold ${8 / zoom}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Display seat number inside the seat
        ctx.fillText(seat.seatNumber, canvasCoords.x, canvasCoords.y - 2 / zoom);
        
        // Display row information above seat if hovered
        if (isHovered && seat.row) {
          ctx.fillStyle = '#666';
          ctx.font = `${7 / zoom}px Arial`;
          ctx.fillText(`Row ${seat.row}`, canvasCoords.x, canvasCoords.y - seatHeight / 2 - 8 / zoom);
        }
        
        // Show adjacency hint for multi-selection
        if (isHovered && selectedSeats.length > 0 && seat.status === 'available') {
          const adjacentSeats = findAdjacentSeats(seat.id);
          const hasAdjacentSelected = adjacentSeats.some(adjSeat => selectedSeats.includes(adjSeat.id));
          
          if (hasAdjacentSelected) {
            ctx.fillStyle = '#22C55E';
            ctx.font = `${6 / zoom}px Arial`;
            ctx.fillText('✓', canvasCoords.x + seatWidth / 2 - 2 / zoom, canvasCoords.y - seatHeight / 2 + 2 / zoom);
          }
        }
      }

      // Enhanced price display for hovered seats
      if (isHovered && seat.status === 'available') {
        const priceText = `$${seat.price}`;
        const sectionText = seat.section || 'General';
        const tableText = seat.tableType ? `${seat.tableType} table` : '';
        
        // Background box
        const boxWidth = 60 / zoom;
        const boxHeight = seat.isPremium ? 30 / zoom : 20 / zoom;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(
          canvasCoords.x - boxWidth / 2,
          canvasCoords.y + seatHeight / 2 + 5 / zoom,
          boxWidth,
          boxHeight
        );
        
        // Price text
        ctx.fillStyle = seat.isPremium ? '#FFD700' : '#fff';
        ctx.font = `bold ${10 / zoom}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(priceText, canvasCoords.x, canvasCoords.y + seatHeight / 2 + 15 / zoom);
        
        // Premium details
        if (seat.isPremium && tableText) {
          ctx.fillStyle = '#999';
          ctx.font = `${8 / zoom}px Arial`;
          ctx.fillText(tableText, canvasCoords.x, canvasCoords.y + seatHeight / 2 + 25 / zoom);
        }
      }
    });

    // Restore context
    ctx.restore();
  }, [sortedSeats, selectedSeats, hoveredSeat, zoom, pan, imageDrawInfo]);

  // Animation loop for smooth updates
  useEffect(() => {
    const animate = () => {
      drawCanvas();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawCanvas]);

  // Enhanced seat selection with premium validation and adjacency detection
  const handleSeatSelection = useCallback((seat: SeatData, multiSelectMode = false) => {
    if (!seat || seat.status !== 'available' || disabled) return;
    
    // Validate premium event access first
    const eventValidation = validatePremiumEventAccess();
    if (!eventValidation.valid) {
      // Show premium upgrade modal or redirect
      const upgradeModal = document.createElement('div');
      upgradeModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      upgradeModal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md mx-4">
          <h3 class="text-lg font-semibold mb-4">Premium Feature</h3>
          <p class="text-gray-600 mb-6">${eventValidation.message}</p>
          <div class="flex justify-end gap-3">
            <button class="px-4 py-2 text-gray-600 hover:text-gray-800" onclick="this.closest('.fixed').remove()">Cancel</button>
            <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onclick="window.location.href='/upgrade-event?eventId=${eventId}'">Upgrade Event</button>
          </div>
        </div>
      `;
      document.body.appendChild(upgradeModal);
      return;
    }
    
    // Validate premium seat selection
    const validation = validatePremiumSeatSelection(seat);
    if (!validation.valid) {
      alert(validation.message);
      return;
    }
    
    const isCurrentlySelected = selectedSeats.includes(seat.id);
    let newSelection: string[];
    
    if (seat.tableId && seat.tableCapacity) {
      // Handle table selection
      const tableSeats = seats.filter(s => s.tableId === seat.tableId && s.status === 'available');
      const tableSeatIds = tableSeats.map(s => s.id);
      
      if (isCurrentlySelected) {
        // Deselect entire table
        newSelection = selectedSeats.filter(id => !tableSeatIds.includes(id));
      } else {
        // Select entire table
        newSelection = [...selectedSeats.filter(id => !tableSeatIds.includes(id)), ...tableSeatIds];
      }
    } else {
      // Handle individual seat selection with adjacency detection
      if (isCurrentlySelected) {
        newSelection = selectedSeats.filter(id => id !== seat.id);
      } else {
        if (selectedSeats.length >= maxSelectableSeats) {
          alert(`Maximum ${maxSelectableSeats} seats can be selected`);
          return;
        }
        
        // Multi-select mode with adjacency preference
        if (multiSelectMode && selectedSeats.length > 0) {
          const remainingSlots = maxSelectableSeats - selectedSeats.length;
          const adjacentSelection = selectAdjacentSeats(seat, Math.min(remainingSlots + 1, 4));
          newSelection = [...selectedSeats.filter(id => !adjacentSelection.includes(id)), ...adjacentSelection];
        } else {
          newSelection = [...selectedSeats, seat.id];
        }
      }
    }
    
    // Check adjacency and show warning if seats are not adjacent
    if (newSelection.length > 1 && !areSeatsAdjacent(newSelection)) {
      const nonAdjacentWarning = document.createElement('div');
      nonAdjacentWarning.className = 'bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded';
      nonAdjacentWarning.innerHTML = `
        <strong>Notice:</strong> Selected seats are not adjacent. 
        <button onclick="this.parentElement.remove()" class="ml-2 text-yellow-800 hover:text-yellow-900">✕</button>
      `;
      
      // Add warning to UI (this would be better as a proper React component)
      setTimeout(() => {
        const container = document.querySelector('.seating-warnings');
        if (container) {
          container.appendChild(nonAdjacentWarning);
          setTimeout(() => nonAdjacentWarning.remove(), 5000);
        }
      }, 100);
    }
    
    onSeatSelection?.(newSelection);
  }, [seats, selectedSeats, maxSelectableSeats, disabled, validatePremiumSeatSelection, selectAdjacentSeats, areSeatsAdjacent, onSeatSelection]);

  // Canvas event handlers using new coordinate system
  const getCanvasCoordinates = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageDrawInfo) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Account for canvas scaling (CSS vs actual canvas dimensions)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Convert client coordinates to actual canvas coordinates
    const rawX = (event.clientX - rect.left) * scaleX;
    const rawY = (event.clientY - rect.top) * scaleY;
    
    // Apply inverse transform to get coordinates in the original coordinate space
    const x = (rawX - pan.x) / zoom;
    const y = (rawY - pan.y) / zoom;
    
    return { x, y };
  }, [pan, zoom, imageDrawInfo]);

  const findSeatAtPosition = useCallback((canvasX: number, canvasY: number) => {
    if (!imageDrawInfo) {
      console.log('❌ No imageDrawInfo available for seat finding');
      return null;
    }

    console.log('🔍 Finding seat at position:', { canvasX, canvasY, totalSeats: sortedSeats.length });

    const foundSeat = sortedSeats.find(seat => {
      // Convert seat percentage coordinates to canvas coordinates
      const seatCanvasCoords = percentageToCanvasCoordinates(
        seat.x,
        seat.y,
        imageDrawInfo
      );
      
      const distance = Math.sqrt(
        (canvasX - seatCanvasCoords.x) ** 2 + (canvasY - seatCanvasCoords.y) ** 2
      );
      
      if (distance <= 15) {
        console.log('🎯 Found seat within tolerance:', {
          seatId: seat.id,
          seatNumber: seat.seatNumber,
          seatCoords: seatCanvasCoords,
          clickCoords: { x: canvasX, y: canvasY },
          distance,
          tolerance: 15
        });
      }
      
      return distance <= 15; // 15px click tolerance
    });

    if (!foundSeat) {
      console.log('❌ No seat found at position. Closest seats:');
      const closestSeats = sortedSeats
        .map(seat => {
          const seatCanvasCoords = percentageToCanvasCoordinates(seat.x, seat.y, imageDrawInfo);
          const distance = Math.sqrt((canvasX - seatCanvasCoords.x) ** 2 + (canvasY - seatCanvasCoords.y) ** 2);
          return { seat, distance, coords: seatCanvasCoords };
        })
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3);
      
      console.log(closestSeats);
    }

    return foundSeat;
  }, [sortedSeats, imageDrawInfo]);

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    console.log('🖱️ Canvas click detected', { disabled, isDragging });
    
    if (disabled || isDragging) {
      console.log('🚫 Click ignored - disabled or dragging', { disabled, isDragging });
      return;
    }

    const { x, y } = getCanvasCoordinates(event);
    console.log('📍 Canvas coordinates:', { x, y });
    
    const clickedSeat = findSeatAtPosition(x, y);
    console.log('🪑 Clicked seat:', clickedSeat);

    if (clickedSeat && clickedSeat.status === 'available') {
      console.log('✅ Valid seat click:', clickedSeat.id, clickedSeat.seatNumber);
      
      // Check for multi-select mode (Ctrl/Cmd + Click)
      const multiSelectMode = event.ctrlKey || event.metaKey;
      handleSeatSelection(clickedSeat, multiSelectMode);
    } else {
      console.log('❌ No valid seat found or seat not available');
    }
  }, [disabled, isDragging, getCanvasCoordinates, findSeatAtPosition, handleSeatSelection]);

  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const deltaX = (event.clientX - lastMousePos.x) * scaleX;
        const deltaY = (event.clientY - lastMousePos.y) * scaleY;
        
        setPan(prev => ({ 
          x: Math.min(100, Math.max(-200, prev.x + deltaX)), 
          y: Math.min(100, Math.max(-200, prev.y + deltaY))
        }));
        setLastMousePos({ x: event.clientX, y: event.clientY });
      }
    } else {
      // Handle seat hover with tooltip
      const { x, y } = getCanvasCoordinates(event);
      const hoveredSeat = findSeatAtPosition(x, y);
      setHoveredSeat(hoveredSeat?.id || null);
      
      // Update tooltip data
      if (hoveredSeat) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltipData({
            seat: hoveredSeat,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            visible: true
          });
        }
      } else {
        setTooltipData(null);
      }
    }
  }, [isDragging, lastMousePos, getCanvasCoordinates, findSeatAtPosition]);

  const handleCanvasMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setLastMousePos({ x: event.clientX, y: event.clientY });
    setDragStartPan(pan);
  }, [pan]);

  const handleCanvasMouseUp = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // Only trigger click if we didn't drag much
    const dragDistance = Math.sqrt(
      (event.clientX - lastMousePos.x) ** 2 + (event.clientY - lastMousePos.y) ** 2
    );
    
    if (dragDistance < 5) {
      handleCanvasClick(event);
    }
    
    setIsDragging(false);
  }, [lastMousePos, handleCanvasClick]);

  // Zoom and pan controls
  const zoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const zoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.5));
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Touch support for mobile
  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      setIsDragging(true);
      setLastMousePos({ x: touch.clientX, y: touch.clientY });
      setDragStartPan(pan);
    }
  }, [pan]);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (event.touches.length === 1 && isDragging) {
      const touch = event.touches[0];
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const deltaX = (touch.clientX - lastMousePos.x) * scaleX;
        const deltaY = (touch.clientY - lastMousePos.y) * scaleY;
        
        setPan(prev => ({ 
          x: Math.min(100, Math.max(-200, prev.x + deltaX)), 
          y: Math.min(100, Math.max(-200, prev.y + deltaY))
        }));
        setLastMousePos({ x: touch.clientX, y: touch.clientY });
      }
    }
  }, [isDragging, lastMousePos]);

  const handleTouchEnd = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    if (event.changedTouches.length === 1) {
      const touch = event.changedTouches[0];
      const dragDistance = Math.sqrt(
        (touch.clientX - lastMousePos.x) ** 2 + (touch.clientY - lastMousePos.y) ** 2
      );
      
      if (dragDistance < 10) {
        // Simulate click for tap using proper coordinate transformation
        const canvas = canvasRef.current;
        if (canvas && imageDrawInfo) {
          const rect = canvas.getBoundingClientRect();
          
          // Apply same coordinate transformation as mouse events
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          
          const rawX = (touch.clientX - rect.left) * scaleX;
          const rawY = (touch.clientY - rect.top) * scaleY;
          
          const x = (rawX - pan.x) / zoom;
          const y = (rawY - pan.y) / zoom;
          
          const clickedSeat = findSeatAtPosition(x, y);
          
          if (clickedSeat && clickedSeat.status === 'available') {
            if (selectedSeats.includes(clickedSeat.id)) {
              const newSelection = selectedSeats.filter(id => id !== clickedSeat.id);
              onSeatSelection?.(newSelection);
            } else if (selectedSeats.length < maxSelectableSeats) {
              const newSelection = [...selectedSeats, clickedSeat.id];
              onSeatSelection?.(newSelection);
            }
          }
        }
      }
    }
    setIsDragging(false);
  }, [lastMousePos, pan, zoom, imageDrawInfo, findSeatAtPosition, selectedSeats, maxSelectableSeats, onSeatSelection]);

  return (
    <div className={`w-full space-y-4 ${className}`}>
      {/* Controls Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={zoomOut}
              disabled={disabled}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600 min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={zoomIn}
              disabled={disabled}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={resetView}
              disabled={disabled}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="h-4 w-4" />
            <span>{statistics.selected} / {maxSelectableSeats} selected</span>
          </div>
        </div>

        {showPurchaseButton && statistics.selected > 0 && (
          <Button 
            onClick={onPurchaseClick}
            disabled={disabled || statistics.selected === 0}
            className="flex items-center gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            Purchase ${statistics.totalPrice}
          </Button>
        )}
        
        {/* Multi-select instructions */}
        {statistics.selected === 0 && eventType === 'premium' && (
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <span>💡 Tip: Hold Ctrl/Cmd + Click for smart adjacent selection</span>
          </div>
        )}
        
        {/* Non-premium event notice */}
        {eventType !== 'premium' && (
          <div className="text-xs text-blue-600 flex items-center gap-1">
            <span>ℹ️ Upgrade to Premium for airline-style seat selection</span>
          </div>
        )}
        
        {/* Premium event badge */}
        {eventType === 'premium' && (
          <div className="text-xs text-green-600 flex items-center gap-1">
            <span>✈️ Premium Event: Airline-style seat selection enabled</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Filters and Legend */}
        <div className="lg:col-span-1 space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-medium">Section</label>
                <Select value={filterSection} onValueChange={setFilterSection}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => (
                      <SelectItem key={section} value={section}>
                        {section === 'all' ? 'All Sections' : section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Price Range</label>
                <Slider
                  value={filterPriceRange}
                  onValueChange={(value) => setFilterPriceRange(value as [number, number])}
                  max={1000}
                  step={10}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-600">
                  <span>${filterPriceRange[0]}</span>
                  <span>${filterPriceRange[1]}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Sort By</label>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price">Price</SelectItem>
                    <SelectItem value="section">Section</SelectItem>
                    <SelectItem value="availability">Availability</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Airline-Style Seat Legend */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Seat Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Seat Categories */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-700">Seat Categories</p>
                {priceCategories.map((category) => (
                  <div key={category.id} className="flex items-center gap-2">
                    <div 
                      className="w-5 h-4 rounded-sm border border-gray-300 relative"
                      style={{ backgroundColor: category.color }}
                    >
                      {category.isPremium && (
                        <span className="absolute top-0 left-0 text-yellow-500 text-xs leading-none">★</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-medium">{category.name}</span>
                      <span className="text-xs text-gray-600 ml-2">${category.basePrice}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <Separator className="my-2" />
              
              {/* Seat Status */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-700">Seat Status</p>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-4 rounded-sm bg-green-600 border border-gray-300 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">A1</span>
                    </div>
                    <span>Available - Click to select</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-4 rounded-sm bg-blue-600 border border-gray-300 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">A2</span>
                    </div>
                    <span>Selected by you</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-4 rounded-sm bg-red-600 border border-gray-300 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">A3</span>
                    </div>
                    <span>Sold / Unavailable</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-4 rounded-sm bg-yellow-500 border border-gray-300 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">A4</span>
                    </div>
                    <span>Reserved</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-4 rounded-sm bg-purple-600 border border-gray-300 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">A5</span>
                    </div>
                    <span>Held by another user</span>
                  </div>
                </div>
              </div>
              
              <Separator className="my-2" />
              
              {/* Seat Features */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-700">Seat Features</p>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500 text-sm">★</span>
                    <span>Premium seat with extra amenities</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 text-sm">♿</span>
                    <span>ADA accessible seating</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-sm">●</span>
                    <span>Round table seating (5 seats)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-sm">■</span>
                    <span>Square table seating (4 seats)</span>
                  </div>
                </div>
              </div>
              
              <Separator className="my-2" />
              
              {/* Instructions */}
              <div className="bg-blue-50 p-2 rounded-md">
                <p className="text-xs text-blue-800">
                  <strong>How to select seats:</strong><br/>
                  1. Click on available seats to select<br/>
                  2. Premium tables must be booked entirely<br/>
                  3. Selected seats are held for 15 minutes<br/>
                  4. Complete purchase to confirm booking
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Available</span>
                  <span>{statistics.available} / {statistics.total}</span>
                </div>
                <Progress value={(statistics.available / statistics.total) * 100} className="h-2" />
              </div>

              {statistics.selected > 0 && (
                <>
                  <Separator />
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Selected Seats</span>
                      <span>{statistics.selected}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Price</span>
                      <span>${Math.round(statistics.avgPrice)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span>${statistics.totalPrice}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Canvas */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-4">
              <div 
                ref={containerRef} 
                className="relative w-full h-96 lg:h-[500px] overflow-hidden rounded-lg border bg-gray-50"
              >
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={600}
                  className={`w-full h-full ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  onClick={handleCanvasClick}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={() => {
                    setIsDragging(false);
                    setHoveredSeat(null);
                    setTooltipData(null);
                  }}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                />
                
                {/* Airline-Style Seat Tooltip */}
                {tooltipData && tooltipData.visible && (
                  <div 
                    className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 max-w-xs pointer-events-none"
                    style={{
                      left: Math.min(tooltipData.x + 10, 800 - 250),
                      top: Math.max(tooltipData.y - 80, 10),
                      transform: tooltipData.x > 600 ? 'translateX(-100%)' : 'translateX(0)'
                    }}
                  >
                    <div className="space-y-2">
                      {/* Seat Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-5 h-4 rounded-sm border border-gray-300 flex items-center justify-center"
                            style={{ backgroundColor: tooltipData.seat.categoryColor }}
                          >
                            <span className="text-white text-xs font-bold">
                              {tooltipData.seat.seatNumber}
                            </span>
                          </div>
                          <span className="font-medium text-sm">
                            Seat {tooltipData.seat.seatNumber}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {tooltipData.seat.isPremium && (
                            <span className="text-yellow-500 text-sm">★</span>
                          )}
                          {tooltipData.seat.isADA && (
                            <span className="text-blue-600 text-sm">♿</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Seat Details */}
                      <div className="text-xs text-gray-600 space-y-1">
                        {tooltipData.seat.section && (
                          <div>Section: <span className="font-medium">{tooltipData.seat.section}</span></div>
                        )}
                        {tooltipData.seat.row && (
                          <div>Row: <span className="font-medium">{tooltipData.seat.row}</span></div>
                        )}
                        <div>Category: <span className="font-medium">{tooltipData.seat.category}</span></div>
                        {tooltipData.seat.tableType && (
                          <div>Table: <span className="font-medium">{tooltipData.seat.tableType} ({tooltipData.seat.tableCapacity} seats)</span></div>
                        )}
                        {tooltipData.seat.viewQuality && (
                          <div>View: <span className="font-medium capitalize">{tooltipData.seat.viewQuality}</span></div>
                        )}
                      </div>
                      
                      {/* Price */}
                      <div className="border-t pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Price:</span>
                          <span className="text-lg font-bold text-green-600">
                            ${tooltipData.seat.price}
                          </span>
                        </div>
                      </div>
                      
                      {/* Amenities */}
                      {tooltipData.seat.amenities && tooltipData.seat.amenities.length > 0 && (
                        <div className="border-t pt-2">
                          <div className="text-xs text-gray-600 mb-1">Amenities:</div>
                          <div className="flex flex-wrap gap-1">
                            {tooltipData.seat.amenities.map((amenity, index) => (
                              <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                {amenity}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Status */}
                      <div className="border-t pt-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            tooltipData.seat.status === 'available' ? 'bg-green-500' :
                            tooltipData.seat.status === 'selected' ? 'bg-blue-500' :
                            tooltipData.seat.status === 'sold' ? 'bg-red-500' :
                            tooltipData.seat.status === 'reserved' ? 'bg-yellow-500' :
                            'bg-purple-500'
                          }`} />
                          <span className="text-xs capitalize">
                            {tooltipData.seat.status === 'available' ? 'Available - Click to select' :
                             tooltipData.seat.status === 'selected' ? 'Selected by you' :
                             tooltipData.seat.status === 'sold' ? 'Sold' :
                             tooltipData.seat.status === 'reserved' ? 'Reserved' :
                             'Held by another user'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Premium Table Info */}
                      {tooltipData.seat.isPremium && tooltipData.seat.tableId && (
                        <div className="border-t pt-2 bg-yellow-50 rounded p-2">
                          <div className="text-xs text-yellow-800">
                            <strong>Premium Table:</strong> Must book entire table ({tooltipData.seat.tableCapacity} seats)
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Loading overlay */}
                {!imageLoaded && !imageError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-600">Loading venue...</p>
                    </div>
                  </div>
                )}
                
                {/* Error overlay */}
                {imageError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                      <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                      <p className="mt-2 text-sm text-gray-600">Failed to load venue image</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
                <span>
                  {disabled ? 'Preview mode' : 'Click seats to select • Drag to pan'}
                </span>
                <span>
                  Showing {filteredSeats.length} of {seats.length} seats
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Selected Seats Summary */}
      {statistics.selected > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Selected Seats ({statistics.selected})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-24">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {selectedSeats.map(seatId => {
                  const seat = seats.find(s => s.id === seatId);
                  if (!seat) return null;
                  
                  return (
                    <div key={seatId} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: seat.categoryColor }}
                        />
                        <span>{seat.seatNumber}</span>
                        {seat.section && <Badge variant="outline" className="text-xs">{seat.section}</Badge>}
                      </div>
                      <span className="font-medium">${seat.price}</span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}