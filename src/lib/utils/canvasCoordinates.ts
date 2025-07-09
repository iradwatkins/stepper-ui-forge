/**
 * Centralized Canvas Coordinate System
 * 
 * This utility provides consistent coordinate conversion for seating charts
 * to ensure seat placement matches exactly where admin clicks.
 */

export interface ImageDrawInfo {
  drawX: number;
  drawY: number;
  drawWidth: number;
  drawHeight: number;
  scaleX: number;
  scaleY: number;
  originalWidth: number;
  originalHeight: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Calculate how an image should be drawn on canvas (fit to canvas while preserving aspect ratio)
 * This is the single source of truth for image positioning
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
    scaleY: drawHeight / imageHeight,
    originalWidth: imageWidth,
    originalHeight: imageHeight
  };
}

/**
 * Convert canvas click coordinates to percentage coordinates (0-100)
 * Uses cached ImageDrawInfo to ensure consistency
 */
export function canvasToPercentageCoordinates(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  imageDrawInfo: ImageDrawInfo,
  zoom: number = 1,
  pan: Point = { x: 0, y: 0 }
): Point {
  // Convert client coordinates to canvas coordinates
  const canvasX = clientX - canvasRect.left;
  const canvasY = clientY - canvasRect.top;
  
  // Apply inverse zoom and pan transforms
  const transformedX = (canvasX - pan.x) / zoom;
  const transformedY = (canvasY - pan.y) / zoom;
  
  // Check if click is within image bounds
  if (transformedX < imageDrawInfo.drawX || 
      transformedX > imageDrawInfo.drawX + imageDrawInfo.drawWidth ||
      transformedY < imageDrawInfo.drawY || 
      transformedY > imageDrawInfo.drawY + imageDrawInfo.drawHeight) {
    return { x: -1, y: -1 }; // Invalid click outside image
  }
  
  // Convert to image coordinates (relative to actual image)
  const imageX = (transformedX - imageDrawInfo.drawX) / imageDrawInfo.scaleX;
  const imageY = (transformedY - imageDrawInfo.drawY) / imageDrawInfo.scaleY;
  
  // Convert to percentage coordinates (0-100)
  const percentageX = (imageX / imageDrawInfo.originalWidth) * 100;
  const percentageY = (imageY / imageDrawInfo.originalHeight) * 100;
  
  // Debug logging
  console.log('🎯 Coordinate conversion:', {
    client: { x: clientX, y: clientY },
    canvas: { x: canvasX, y: canvasY },
    transformed: { x: transformedX, y: transformedY },
    image: { x: imageX, y: imageY },
    percentage: { x: percentageX, y: percentageY },
    imageDrawInfo,
    zoom,
    pan
  });
  
  return {
    x: Math.max(0, Math.min(100, percentageX)),
    y: Math.max(0, Math.min(100, percentageY))
  };
}

/**
 * Convert percentage coordinates to canvas pixel coordinates
 * Uses cached ImageDrawInfo to ensure consistency
 */
export function percentageToCanvasCoordinates(
  percentageX: number,
  percentageY: number,
  imageDrawInfo: ImageDrawInfo
): Point {
  // Convert percentage to image coordinates
  const imageX = (percentageX / 100) * imageDrawInfo.originalWidth;
  const imageY = (percentageY / 100) * imageDrawInfo.originalHeight;
  
  // Convert to canvas coordinates
  const canvasX = imageDrawInfo.drawX + (imageX * imageDrawInfo.scaleX);
  const canvasY = imageDrawInfo.drawY + (imageY * imageDrawInfo.scaleY);
  
  return { x: canvasX, y: canvasY };
}

/**
 * Check if a point is within the image bounds
 */
export function isPointInImageBounds(
  canvasX: number,
  canvasY: number,
  imageDrawInfo: ImageDrawInfo,
  zoom: number = 1,
  pan: Point = { x: 0, y: 0 }
): boolean {
  // Apply inverse transforms
  const transformedX = (canvasX - pan.x) / zoom;
  const transformedY = (canvasY - pan.y) / zoom;
  
  return (
    transformedX >= imageDrawInfo.drawX &&
    transformedX <= imageDrawInfo.drawX + imageDrawInfo.drawWidth &&
    transformedY >= imageDrawInfo.drawY &&
    transformedY <= imageDrawInfo.drawY + imageDrawInfo.drawHeight
  );
}

/**
 * Find the closest seat to a click position
 */
export function findSeatAtPosition(
  percentageX: number,
  percentageY: number,
  seats: Array<{ id: string; x: number; y: number; seatNumber: string }>,
  tolerance: number = 3 // 3% tolerance
): { id: string; x: number; y: number; seatNumber: string } | null {
  let closestSeat = null;
  let closestDistance = Infinity;
  
  for (const seat of seats) {
    const dx = seat.x - percentageX;
    const dy = seat.y - percentageY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < tolerance && distance < closestDistance) {
      closestDistance = distance;
      closestSeat = seat;
    }
  }
  
  return closestSeat;
}

/**
 * Debug function to visualize coordinate conversion
 */
export function debugCoordinateConversion(
  canvas: HTMLCanvasElement,
  imageDrawInfo: ImageDrawInfo,
  zoom: number,
  pan: Point,
  seats: Array<{ id: string; x: number; y: number; seatNumber: string }>
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Draw image bounds
  ctx.save();
  ctx.translate(pan.x, pan.y);
  ctx.scale(zoom, zoom);
  
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.strokeRect(
    imageDrawInfo.drawX,
    imageDrawInfo.drawY,
    imageDrawInfo.drawWidth,
    imageDrawInfo.drawHeight
  );
  
  // Draw grid lines
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
  ctx.lineWidth = 1;
  
  // Vertical lines (10% intervals)
  for (let i = 0; i <= 10; i++) {
    const x = imageDrawInfo.drawX + (i / 10) * imageDrawInfo.drawWidth;
    ctx.beginPath();
    ctx.moveTo(x, imageDrawInfo.drawY);
    ctx.lineTo(x, imageDrawInfo.drawY + imageDrawInfo.drawHeight);
    ctx.stroke();
  }
  
  // Horizontal lines (10% intervals)
  for (let i = 0; i <= 10; i++) {
    const y = imageDrawInfo.drawY + (i / 10) * imageDrawInfo.drawHeight;
    ctx.beginPath();
    ctx.moveTo(imageDrawInfo.drawX, y);
    ctx.lineTo(imageDrawInfo.drawX + imageDrawInfo.drawWidth, y);
    ctx.stroke();
  }
  
  ctx.restore();
  
  console.log('🐛 Debug info:', {
    canvas: { width: canvas.width, height: canvas.height },
    imageDrawInfo,
    zoom,
    pan,
    seatCount: seats.length
  });
}