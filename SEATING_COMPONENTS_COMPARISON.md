# Seating Components Comparison Report

## Overview
This report compares seating-related components between the `steppers-safe-v2-3-main` folder and the current project to identify unique features before deletion.

## Components in steppers-safe-v2-3-main/src/components/

### 1. CustomerSeatingSelector.tsx
**Key Features:**
- Hold timer functionality with visual countdown
- Seat recommendations based on features (e.g., "Best View", "Close to Stage")
- Price filtering with visual toggles
- Hover tooltips showing seat details
- Zoom controls (zoom in/out/reset)
- Premium seat indicators with stars
- Seat features and recommendations metadata
- Real-time hold expiration warnings
- Support for different venue types
- Grouping recommendations (couples, groups, premium experience)

### 2. EnhancedSeatingChartSelector.tsx
**Key Features:**
- Integration with inventory management system (`useInventory` hook)
- Real-time seat availability updates
- WebSocket-ready polling for inventory changes
- Hold management with session tracking
- Multi-gateway failover support
- Touch-friendly pan and drag controls
- Zoom dialog with preset levels (50%, 100%, 150%, etc.)
- Processing state management
- Error handling for inventory operations
- Hold expiration tracking per seat

### 3. SeatingChartSelector.tsx
**Key Features:**
- Basic seating chart with clickable seats
- Simple seat selection/deselection
- Price category color coding
- ADA seat indicators
- Selection summary with categorized pricing
- Minimal dependencies (no external hooks)

### 4. SeatingLayoutManager.tsx
**Key Features:**
- Complete seat layout designer tool
- Import/export layout functionality
- Row creation tools
- Drag-and-drop seat placement
- Multi-tab interface (Design, Properties, Pricing, Preview)
- Revenue potential calculations
- Template saving capability
- Venue type selection
- Tags and metadata management
- Batch seat operations

## Components in Current Project (src/components/seating/)

### 1. CustomerSeatingChart.tsx
**Key Features:**
- Canvas-based rendering for performance
- Advanced filtering (section, price range, view quality)
- Sortable seat lists
- Pan and zoom with mouse/touch support
- Real-time statistics
- Detailed tooltips
- High-DPI display support
- Image loading states

### 2. EnhancedSeatingChartSelector.tsx
**Key Features:**
- Coordinate system utilities
- Ticket type integration
- Seat assignment progress tracking
- Multiple tabs (Setup, Configure, Place, Info)
- Venue information management
- Canvas-based seat placement
- Category-based seat creation
- Real-time seat counting

### 3. Other Components
- InteractiveSeatingChart.tsx
- PremiumSeatingManager.tsx
- SeatingChart.tsx
- SeatingLayoutManager.tsx
- SimpleSeatingChart.tsx

## Unique Features to Preserve

### From CustomerSeatingSelector.tsx (steppers-safe):
1. **Hold Timer System** - Visual countdown with progress bar
2. **Seat Recommendations** - AI-like suggestions based on features
3. **Seat Features Metadata** - "Best View", "Close to Stage" tags
4. **Group Recommendations** - Suggestions for couples, groups
5. **Price Range Filtering UI** - Interactive price filter buttons

### From EnhancedSeatingChartSelector.tsx (steppers-safe):
1. **Inventory Integration** - `useInventory` hook system
2. **Real-time Updates** - WebSocket-ready polling
3. **Session-based Holds** - Track holds by session/user
4. **Multi-gateway Support** - Payment failover system
5. **Zoom Presets Dialog** - Quick zoom level selection

### From SeatingLayoutManager.tsx (steppers-safe):
1. **Import/Export Layouts** - JSON format support
2. **Row Creation Tool** - Batch seat creation
3. **Revenue Calculations** - Automatic revenue potential
4. **Template System** - Save layouts as templates
5. **Venue Type Presets** - Theater, stadium, arena, etc.

## Recommendations

1. **Copy Hold Timer System** - The visual countdown and progress bar from CustomerSeatingSelector would enhance user experience
2. **Integrate Inventory Hook** - The `useInventory` system from EnhancedSeatingChartSelector provides better backend integration
3. **Add Recommendations Engine** - The seat recommendation features would improve conversion
4. **Import/Export Feature** - The layout import/export from SeatingLayoutManager is valuable for reusability
5. **Revenue Analytics** - The revenue calculation features would help event organizers

## Files to Backup Features From

Priority features to extract before deletion:
1. Hold timer implementation (CustomerSeatingSelector.tsx lines 94-111, 196-207)
2. Seat recommendations logic (CustomerSeatingSelector.tsx lines 169-174, 416-447)
3. Inventory integration (EnhancedSeatingChartSelector.tsx lines 91-98, 169-215)
4. Import/Export functions (SeatingLayoutManager.tsx lines 249-280)
5. Revenue calculations (SeatingLayoutManager.tsx lines 756-777)