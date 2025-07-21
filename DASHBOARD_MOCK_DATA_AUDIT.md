# Dashboard Mock Data Audit Report

## Overview
This audit identifies all dashboard components and pages that contain mock data, hardcoded values, or test data that should be replaced with real database queries.

## Files with Mock/Placeholder Data

### 1. **SalesDashboard.tsx** (`/src/pages/dashboard/SalesDashboard.tsx`)
- **Lines 66-79**: TODO comment indicates data should come from `CommissionService.getUserSales()` and `CommissionService.getUserSalesStats()`
- **Current State**: Returns empty data structure with zeros
- **Required Actions**:
  - Implement `getUserSales()` method in CommissionService
  - Implement `getUserSalesStats()` method in CommissionService
  - Connect to real commission and sales data from database

### 2. **LiveAnalytics.tsx** (`/src/pages/dashboard/LiveAnalytics.tsx`)
- **Lines 41-46**: TODO comment for loading real event data
- **Lines 188-191**: Development note indicates WebSocket connections needed for production
- **Current State**: Returns static "No event selected" and inactive status
- **Required Actions**:
  - Implement real event data fetching
  - Set up WebSocket connections for real-time updates
  - Connect to actual event monitoring data

### 3. **VenueManagement.tsx** (`/src/pages/dashboard/VenueManagement.tsx`)
- **Lines 69-84**: Uses localStorage for mock data storage instead of database
- **Current State**: All venue data is stored in browser localStorage
- **Required Actions**:
  - Create database tables for venue layouts
  - Implement API endpoints for venue CRUD operations
  - Replace localStorage with Supabase database calls

### 4. **RealTimeAnalyticsDashboard.tsx** (`/src/components/dashboard/RealTimeAnalyticsDashboard.tsx`)
- **Lines 83-120**: Extensive mock data for stats, alerts, and staff performance
- **Current State**: Returns hardcoded mock analytics data
- **Required Actions**:
  - Implement real-time analytics service
  - Connect to actual check-in data
  - Implement duplicate detection system
  - Create staff performance tracking

### 5. **AudienceInsights.tsx** (`/src/pages/dashboard/AudienceInsights.tsx`)
- **Lines 76-94**: TODO comment indicates need for `AnalyticsService.getAudienceInsights()`
- **Current State**: Returns empty data structure
- **Required Actions**:
  - Implement audience analytics tracking
  - Create demographic data collection
  - Build location and preference tracking systems

### 6. **TicketAnalytics.tsx** (`/src/pages/dashboard/TicketAnalytics.tsx`)
- **Lines 50-52**: Uses real `AnalyticsService.getTicketAnalytics()` (GOOD!)
- **Lines 202-203, 214-218**: Hardcoded conversion rate (12.3%) and trend percentages
- **Required Actions**:
  - Calculate real conversion rates from data
  - Implement period-over-period comparisons
  - Remove hardcoded trend percentages

## Files with Real Data Implementation (Good Examples)

### 1. **UnifiedDashboardHome.tsx** (`/src/components/dashboard/UnifiedDashboardHome.tsx`)
- ✅ Uses real data from multiple services
- ✅ Properly handles different user roles
- ✅ Fetches actual commission, event, and follower data
- Minor issues: Some hardcoded trend percentages (lines 229, 285, 301)

### 2. **AnalyticsService.ts** (`/src/lib/services/AnalyticsService.ts`)
- ✅ Fully implemented with real database queries
- ✅ Properly aggregates data from tickets, events, and ticket_types tables
- ✅ Handles date ranges and data export
- Note: `getConversionFunnel()` method returns placeholder data (lines 282-290)

## Summary of Required Database Implementations

### New Tables Needed:
1. **venue_layouts** - Store venue seating configurations
2. **analytics_events** - Track user interactions for conversion funnel
3. **audience_demographics** - Store attendee demographic data
4. **real_time_checkins** - Track live check-in data with duplicate detection

### Services to Implement/Update:
1. **CommissionService**:
   - `getUserSales(userId, period)`
   - `getUserSalesStats(userId, period)`

2. **AnalyticsService**:
   - `getAudienceInsights(userId, eventId, period)`
   - `getConversionFunnel(organizerId, eventId)` (currently placeholder)

3. **New Services Needed**:
   - **VenueService** - CRUD operations for venue layouts
   - **RealTimeAnalyticsService** - Live event monitoring
   - **AudienceAnalyticsService** - Demographic and preference tracking

### WebSocket Implementations Needed:
1. Live check-in monitoring
2. Real-time duplicate detection alerts
3. Staff performance tracking
4. Current attendance rates

## Priority Recommendations

### High Priority (Business Critical):
1. Replace SalesDashboard mock data - directly impacts seller earnings visibility
2. Implement venue management database storage - currently using localStorage
3. Fix hardcoded conversion rates in TicketAnalytics

### Medium Priority (User Experience):
1. Implement real-time analytics for LiveAnalytics page
2. Add audience insights data collection
3. Complete conversion funnel tracking

### Low Priority (Nice to Have):
1. WebSocket connections for real-time updates
2. Trend percentage calculations
3. System health monitoring

## Code Quality Notes
- Most files properly handle loading states and errors
- Good separation of concerns with service layer
- Consistent use of TypeScript interfaces
- Some components could benefit from React Query for data fetching