/**
 * Coordinate System Utilities for Seating Charts
 * 
 * This module provides consistent coordinate conversion utilities to ensure
 * seat positions are accurately maintained between placement and display components.
 * 
 * All coordinates are stored as percentages (0-100) relative to the actual image dimensions,
 * which allows for consistent positioning regardless of canvas or display size.
 */

export interface Point {
  x: number;
  y: number;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface CanvasTransform {
  pan: Point;
  zoom: number;
}

export interface ImageDrawInfo {
  drawX: number;
  drawY: number;
  drawWidth: number;
  drawHeight: number;
  scaleX: number;
  scaleY: number;
}

/**
 * Calculate how an image should be drawn on canvas while preserving aspect ratio
 */
export function calculateImageDrawInfo(
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number
): ImageDrawInfo {
  const imageAspectRatio = imageWidth / imageHeight;
  const canvasAspectRatio = canvasWidth / canvasHeight;
  
  let drawWidth: number;
  let drawHeight: number;
  let drawX: number;
  let drawY: number;
  
  if (imageAspectRatio > canvasAspectRatio) {
    // Image is wider than canvas - fit to width, center vertically
    drawWidth = canvasWidth;
    drawHeight = canvasWidth / imageAspectRatio;
    drawX = 0;
    drawY = (canvasHeight - drawHeight) / 2;
  } else {
    // Image is taller than canvas - fit to height, center horizontally
    drawHeight = canvasHeight;
    drawWidth = canvasHeight * imageAspectRatio;
    drawX = (canvasWidth - drawWidth) / 2;
    drawY = 0;
  }
  
  return {
    drawX,
    drawY,
    drawWidth,
    drawHeight,
    scaleX: drawWidth / imageWidth,
    scaleY: drawHeight / imageHeight
  };
}

/**
 * Convert mouse/touch coordinates to percentage coordinates (0-100) relative to the image
 */
export function clientToPercentageCoordinates(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  imageDrawInfo: ImageDrawInfo,
  transform: CanvasTransform
): Point {
  // Input validation
  if (!canvas || !imageDrawInfo) {
    console.error('Invalid canvas or imageDrawInfo provided to coordinate conversion');
    return { x: -1, y: -1 }; // Return invalid coordinates
  }

  const rect = canvas.getBoundingClientRect();
  
  // Validate canvas dimensions
  if (rect.width <= 0 || rect.height <= 0 || canvas.width <= 0 || canvas.height <= 0) {
    console.error('Invalid canvas dimensions');
    return { x: -1, y: -1 };
  }
  
  // Account for canvas scaling (CSS vs actual canvas dimensions)
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  // Convert client coordinates to canvas coordinates
  const rawCanvasX = (clientX - rect.left) * scaleX;
  const rawCanvasY = (clientY - rect.top) * scaleY;
  
  // Apply transform (pan and zoom)
  const zoom = Math.max(0.1, transform.zoom); // Prevent division by zero
  const canvasX = (rawCanvasX - transform.pan.x) / zoom;
  const canvasY = (rawCanvasY - transform.pan.y) / zoom;
  
  // Convert to image coordinates (relative to actual image area)
  const imageX = (canvasX - imageDrawInfo.drawX) / imageDrawInfo.scaleX;
  const imageY = (canvasY - imageDrawInfo.drawY) / imageDrawInfo.scaleY;
  
  // Convert to percentage coordinates (0-100)
  const originalImageWidth = imageDrawInfo.drawWidth / imageDrawInfo.scaleX;
  const originalImageHeight = imageDrawInfo.drawHeight / imageDrawInfo.scaleY;
  
  // Validate image dimensions
  if (originalImageWidth <= 0 || originalImageHeight <= 0) {
    console.error('Invalid image dimensions for coordinate conversion');
    return { x: -1, y: -1 };
  }
  
  const percentageX = (imageX / originalImageWidth) * 100;
  const percentageY = (imageY / originalImageHeight) * 100;
  
  // Debug logging (disabled in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('Coordinate conversion debug:', {
      clientX, clientY,
      canvasRect: { width: rect.width, height: rect.height },
      canvasSize: { width: canvas.width, height: canvas.height },
      scaleFactors: { scaleX, scaleY },
      rawCanvas: { x: rawCanvasX, y: rawCanvasY },
      transformedCanvas: { x: canvasX, y: canvasY },
      imageCoords: { x: imageX, y: imageY },
      originalImageSize: { width: originalImageWidth, height: originalImageHeight },
      percentageResult: { x: percentageX, y: percentageY }
    });
  }
  
  // Validate and clamp to valid range
  const finalX = isNaN(percentageX) ? -1 : Math.max(-5, Math.min(105, percentageX)); // Allow slight overflow for edge detection
  const finalY = isNaN(percentageY) ? -1 : Math.max(-5, Math.min(105, percentageY));
  
  return { x: finalX, y: finalY };
}

/**
 * Convert percentage coordinates (0-100) to canvas pixel coordinates
 */
export function percentageToCanvasCoordinates(
  percentageX: number,
  percentageY: number,
  imageDrawInfo: ImageDrawInfo
): Point {
  // Input validation
  if (!imageDrawInfo || imageDrawInfo.scaleX === 0 || imageDrawInfo.scaleY === 0) {
    console.error('Invalid imageDrawInfo provided to percentage conversion');
    return { x: 0, y: 0 };
  }

  // Validate percentage inputs
  if (isNaN(percentageX) || isNaN(percentageY)) {
    console.error('Invalid percentage coordinates:', { percentageX, percentageY });
    return { x: 0, y: 0 };
  }

  // Convert percentage to image coordinates
  const imageWidth = imageDrawInfo.drawWidth / imageDrawInfo.scaleX;
  const imageHeight = imageDrawInfo.drawHeight / imageDrawInfo.scaleY;
  
  // Validate image dimensions
  if (imageWidth <= 0 || imageHeight <= 0) {
    console.error('Invalid computed image dimensions:', { imageWidth, imageHeight });
    return { x: 0, y: 0 };
  }
  
  const imageX = (percentageX / 100) * imageWidth;
  const imageY = (percentageY / 100) * imageHeight;
  
  // Convert to canvas coordinates
  const canvasX = imageDrawInfo.drawX + (imageX * imageDrawInfo.scaleX);
  const canvasY = imageDrawInfo.drawY + (imageY * imageDrawInfo.scaleY);
  
  // Validate final coordinates
  const finalX = isNaN(canvasX) ? 0 : canvasX;
  const finalY = isNaN(canvasY) ? 0 : canvasY;
  
  return { x: finalX, y: finalY };
}

/**
 * Check if a percentage coordinate point is within the valid image bounds
 */
export function isPointInImageBounds(
  percentageX: number,
  percentageY: number,
  canvasX: number,
  canvasY: number,
  imageDrawInfo: ImageDrawInfo
): boolean {
  return (
    canvasX >= imageDrawInfo.drawX &&
    canvasX <= imageDrawInfo.drawX + imageDrawInfo.drawWidth &&
    canvasY >= imageDrawInfo.drawY &&
    canvasY <= imageDrawInfo.drawY + imageDrawInfo.drawHeight &&
    percentageX >= 0 && percentageX <= 100 &&
    percentageY >= 0 && percentageY <= 100
  );
}

/**
 * Get actual image dimensions from an image file or URL
 */
export function getImageDimensions(source: File | string): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    if (source instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(source);
    } else {
      img.src = source;
    }
  });
}

/**
 * Convert legacy coordinate format to standardized percentage format
 */
export function convertLegacyCoordinates(
  x: number,
  y: number,
  legacyCanvasWidth: number,
  legacyCanvasHeight: number,
  actualImageWidth: number,
  actualImageHeight: number
): Point {
  // Assume legacy coordinates were pixel-based on a fixed canvas
  const legacyImageDrawInfo = calculateImageDrawInfo(
    actualImageWidth,
    actualImageHeight,
    legacyCanvasWidth,
    legacyCanvasHeight
  );
  
  // Convert legacy pixel coordinates back to image coordinates
  const imageX = (x - legacyImageDrawInfo.drawX) / legacyImageDrawInfo.scaleX;
  const imageY = (y - legacyImageDrawInfo.drawY) / legacyImageDrawInfo.scaleY;
  
  // Convert to percentage
  const percentageX = (imageX / actualImageWidth) * 100;
  const percentageY = (imageY / actualImageHeight) * 100;
  
  return {
    x: Math.max(0, Math.min(100, percentageX)),
    y: Math.max(0, Math.min(100, percentageY))
  };
}

/**
 * Calculate the distance between two points in percentage coordinates
 */
export function calculatePercentageDistance(point1: Point, point2: Point): number {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Generate a unique seat identifier based on position and section
 */
export function generateSeatIdentifier(
  sectionName: string,
  rowNumber: number,
  seatNumber: number
): string {
  return `${sectionName.toUpperCase()}-R${rowNumber}-S${seatNumber}`;
}

/**
 * Validate coordinate data for consistency
 */
export function validateCoordinateData(coordinates: Point[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  coordinates.forEach((coord, index) => {
    if (coord.x < 0 || coord.x > 100) {
      errors.push(`Coordinate ${index}: X value ${coord.x} is outside valid range (0-100)`);
    }
    if (coord.y < 0 || coord.y > 100) {
      errors.push(`Coordinate ${index}: Y value ${coord.y} is outside valid range (0-100)`);
    }
    if (isNaN(coord.x) || isNaN(coord.y)) {
      errors.push(`Coordinate ${index}: Contains invalid NaN values`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Snap coordinates to a grid for alignment
 */
export function snapToGrid(
  point: Point,
  gridSize: number = 1 // Grid size in percentage points
): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize
  };
}

/**
 * Batch convert multiple coordinates
 */
export function batchConvertCoordinates(
  coordinates: Point[],
  imageDrawInfo: ImageDrawInfo
): Point[] {
  return coordinates.map(coord => 
    percentageToCanvasCoordinates(coord.x, coord.y, imageDrawInfo)
  );
}