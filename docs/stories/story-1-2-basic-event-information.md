# Story 1.2: Basic Event Information Form Enhancement

**Status:** Draft  
**Epic:** 1.0 Core Events System  
**Priority:** High  
**Estimate:** 5 points  

## User Story
**As an** event organizer  
**I want to** enter comprehensive event details in a well-designed form with proper validation  
**So that** I can provide all essential information for my event and ensure attendees have everything they need to know  

## Background Context
The existing CreateEvent.tsx has a basic event information form (Step 2), but it needs significant enhancement to meet production standards. The current implementation lacks proper validation, enhanced UX features, and comprehensive field coverage required for the 3-tier event system.

## Acceptance Criteria

### Must Have
- [ ] **Enhanced Form Structure**: Organized sections for different types of information
- [ ] **Comprehensive Validation**: Required field validation, format validation, and business rules
- [ ] **Event Title**: Required field with character limits and validation
- [ ] **Event Description**: Rich text area with character count and formatting guidance
- [ ] **Date & Time Handling**: Proper date/time validation with timezone support
- [ ] **Location Management**: Enhanced location input with validation
- [ ] **Event Categories**: Multi-select for event categories (Workshops, Sets, In the Park, Trips, Cruises, Holiday, Competitions)
- [ ] **Capacity Settings**: Optional capacity limits based on event type
- [ ] **Display Pricing**: For Simple Events, optional price display (informational only, no ticketing)
- [ ] **Form Persistence**: Auto-save draft functionality
- [ ] **Error Handling**: Clear error messages and field-level validation feedback
- [ ] **Progress Indication**: Clear progress through the wizard
- [ ] **Accessibility**: Full keyboard navigation and screen reader support

### Should Have  
- [ ] **Smart Defaults**: Pre-populate fields based on event type selection
- [ ] **Field Dependencies**: Show/hide fields based on event type (e.g., display price only for Simple Events, capacity for all types)
- [ ] **Rich Text Editor**: Basic formatting options for event description
- [ ] **Location Autocomplete**: Address suggestions for location field
- [ ] **Event Image Upload**: Upload 1-2 high-quality images (banner + optional postcard) with drag-and-drop and preview functionality
- [ ] **Automatic Image Optimization**: Client-side compression, resizing, format conversion, and progressive loading optimization
- [ ] **Duration Calculator**: Calculate event duration from start/end times
- [ ] **Character Counters**: Real-time character count for text fields

### Could Have
- [ ] **Template System**: Save and reuse event templates
- [ ] **Bulk Import**: Import event details from external sources
- [ ] **AI Assistance**: AI-powered suggestions for descriptions and titles
- [ ] **Social Media Integration**: Auto-generate social media posts

## Technical Requirements

### Form Schema & Validation
```typescript
interface EventFormData {
  title: string; // Required, 3-100 characters
  description: string; // Required, 10-2000 characters
  date: string; // Required, future date only
  time: string; // Required, valid time format
  endDate?: string; // Optional, must be after start date
  endTime?: string; // Optional, must be after start time
  location: string; // Required, 5-200 characters
  categories: string[]; // Required, one or more from predefined list
  capacity?: number; // Optional, positive integer
  displayPrice?: {
    amount: number; // For Simple Events only - display only
    currency: string; // Default USD
    label: string; // e.g., "Suggested donation", "Entry fee", "Cost"
  };
  isPublic: boolean; // Default true
  tags: string[]; // Optional, array of strings
  images: {
    banner?: {
      original: string; // Original optimized image URL
      medium: string;   // 800px width version
      small: string;    // 400px width version  
      thumbnail: string; // 200px width version
    };
    postcard?: {
      original: string; // Original optimized image URL
      medium: string;   // 800px width version
      small: string;    // 400px width version
      thumbnail: string; // 200px width version
    };
  };
  timezone: string; // Auto-detected, user can override
}
```

### Validation Rules
```typescript
const eventValidationSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title too long"),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000, "Description too long"),
  date: z.string().refine(date => new Date(date) > new Date(), "Event date must be in the future"),
  time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  location: z.string().min(5, "Location must be at least 5 characters").max(200, "Location too long"),
  categories: z.array(z.enum(["workshops", "sets", "in-the-park", "trips", "cruises", "holiday", "competitions"])).min(1, "At least one category must be selected"),
  capacity: z.number().positive().optional(),
  displayPrice: z.object({
    amount: z.number().min(0, "Price cannot be negative"),
    currency: z.string().default("USD"),
    label: z.string().min(1, "Price label is required")
  }).optional(), // Only for Simple Events
});
```

### Dependencies
- **Form Management**: React Hook Form with proper validation
- **Validation**: Zod schema validation
- **UI Components**: Enhanced shadcn/ui components
- **Date Handling**: date-fns for date manipulation and validation
- **Icons**: Lucide React for form icons and visual feedback
- **File Upload**: For event image upload functionality (Supabase Storage integration)
- **Image Optimization**: Client-side compression and resizing libraries (browser-image-compression or similar)
- **Format Conversion**: WebP conversion for modern browsers with fallbacks

### Integration Points
- **Previous Step**: Receives selected event type from Story 1.1
- **Next Step**: Passes form data to ticketing/review steps
- **Data Persistence**: Auto-save to local storage or draft API
- **Supabase Integration**: Prepare for eventual database storage

## Design Requirements

### Visual Design
- **Card-Based Layout**: Organized sections within cards for better visual grouping
- **Two-Column Layout**: Efficient use of space on desktop
- **Progressive Disclosure**: Show relevant fields based on event type
- **Visual Hierarchy**: Clear section headers and field labels
- **Error States**: Inline error messages with clear styling
- **Success States**: Visual confirmation for validated fields

### User Experience
- **Auto-Save**: Save progress every 30 seconds or on field blur
- **Smart Focus**: Auto-focus on first empty required field
- **Tab Order**: Logical keyboard navigation flow
- **Field Hints**: Helper text for complex fields
- **Confirmation**: Clear indication when form is valid and ready to proceed

## Implementation Notes

### Existing Code Analysis
Current CreateEvent.tsx (lines 322-397) has:
- ✅ Basic form structure with Card layout
- ✅ Basic state management for form fields (lines 31-39)
- ✅ Simple validation (title and date required)
- ✅ Grid layout for date/time fields
- ⚠️ Current eventData structure needs enhancement to support:
  - Multi-select categories (currently single `category` field)
  - Display pricing for Simple Events
  - Image upload fields
  - Additional validation fields

### Required Enhancements
- **Enhanced Validation**: Replace simple checks with comprehensive Zod validation
- **Better UX**: Add character counters, helper text, and better error handling
- **Event Type Conditional Fields**: Show display price for Simple Events only (informational, no ticketing)
- **Additional Fields**: Add category, capacity, timezone, and comprehensive image upload
- **Form Management**: Integrate React Hook Form for better state management
- **Auto-Save**: Implement draft saving functionality
- **Responsive Design**: Improve mobile experience

### Event Categories Multi-Select
- **Categories Available**: 
  - "Workshops" - Educational and skill-building events
  - "Sets" - Performance or organized activity sessions
  - "In the Park" - Outdoor events and activities
  - "Trips" - Travel and excursion events
  - "Cruises" - Water-based events and boat trips
  - "Holiday" - Seasonal and celebration events
  - "Competitions" - Competitive events and contests
- **UI**: Multi-select component (checkboxes or multi-select dropdown)
- **Validation**: At least one category must be selected
- **Display**: Selected categories shown as tags/badges

### Display Price for Simple Events
- **Purpose**: Informational only - no payment processing or ticketing
- **Use Cases**: "Suggested donation: $10", "Entry fee: $5", "Free (donations welcome)"
- **Fields**: Amount (number), Currency (default USD), Label (custom text)
- **Validation**: Non-negative amounts, required label if price is set
- **UI**: Only visible when "Simple" event type is selected

### Image Upload & Optimization Specifications
- **Input File Types**: JPEG, PNG, WebP, HEIC (max 10MB per image)
- **Output Optimization**: 
  - Convert to WebP for modern browsers (90% smaller than JPEG)
  - Generate JPEG fallback for older browsers
  - Progressive JPEG encoding for faster perceived loading
- **Smart Resizing** (maintains aspect ratio):
  - Resize large images to maximum dimensions while preserving original proportions
  - Banner: Max 1200px width (maintains original aspect ratio)
  - Postcard: Max 600px width (maintains original aspect ratio)  
  - Generate multiple sizes: original optimized, medium (800px), small (400px), thumbnail (200px)
  - All resizing preserves original aspect ratio - no cropping or distortion
- **Compression Settings**:
  - WebP: 85% quality (optimal balance of quality/size)
  - JPEG fallback: 80% quality
  - Target file sizes: Banner <150KB, Postcard <100KB
- **Storage**: Supabase Storage with automatic CDN optimization
- **UX**: 
  - Drag-and-drop interface with click-to-upload fallback
  - Real-time compression progress indicator
  - Before/after file size comparison
  - Preview with optimization feedback (no cropping)
- **Validation**: File type, size, dimension, and compression success validation
- **Performance**: 
  - Client-side processing to reduce server load
  - Lazy loading for image previews
  - Progressive enhancement for older browsers

### Technical Constraints
- **Bundle Size**: Keep form dependencies reasonable
- **Performance**: 
  - Image processing should not block UI (<3 seconds for 10MB image)
  - Ensure smooth interactions with validation and image processing
  - Target bundle size increase <50KB for optimization libraries
- **Accessibility**: Maintain full WCAG 2.1 AA compliance
- **Mobile Experience**: Optimize for touch interactions and mobile camera uploads
- **SEO**: Optimized images improve page load scores and user experience

## Definition of Done
- [ ] Form includes all required fields with proper validation
- [ ] Zod schema validation implemented and working
- [ ] React Hook Form integration complete
- [ ] Auto-save functionality working
- [ ] Error handling provides clear, actionable feedback
- [ ] All fields have appropriate input types and constraints
- [ ] Form adapts based on selected event type
- [ ] Multi-select category functionality working with validation
- [ ] Character counters and helper text implemented
- [ ] Event image upload functionality working (banner + optional postcard)
- [ ] Automatic image optimization implemented (WebP conversion, compression, resizing)
- [ ] Multiple image sizes generated and stored correctly
- [ ] Image preview functionality implemented (no cropping/editing)
- [ ] File validation and error handling for images working
- [ ] Optimization progress indicators and file size comparisons working
- [ ] Responsive design works across all screen sizes
- [ ] Accessibility requirements met (WCAG 2.1 AA)
- [ ] Form submission passes data correctly to next step
- [ ] TypeScript compilation passes without errors
- [ ] Manual testing completed on multiple devices
- [ ] Integration with existing wizard flow works seamlessly

## Dependencies & Blockers
- **Depends on**: Story 1.1 (Event Type Selection) - ✅ Complete
- **Blocks**: Story 1.3 (Wizard Navigation) and subsequent stories
- **External Dependencies**: None

## Test Cases

### Functional Tests
1. **Required Field Validation**: Empty required fields show appropriate errors
2. **Format Validation**: Invalid dates, times, and formats are rejected
3. **Character Limits**: Fields respect minimum and maximum character constraints
4. **Business Rules**: Future dates only, valid time ranges, positive capacity
5. **Auto-Save**: Form data persists across page refreshes
6. **Event Type Integration**: Form adapts based on selected event type
7. **Category Selection**: User can select one or more categories from the predefined list
8. **Display Price Logic**: For Simple Events, price field appears for informational display only
9. **Image Upload**: Successfully uploads and processes 1-2 event images
10. **Image Optimization**: Images are automatically compressed and converted to WebP with JPEG fallbacks
11. **Multiple Image Sizes**: System generates 4 sizes (original, medium, small, thumbnail) for each image
12. **Image Preview**: Uploaded images display with preview functionality and file size comparison (no cropping)
13. **Form Submission**: Valid form data including optimized images passes to next wizard step

### UX Tests
1. **Progressive Enhancement**: Form works without JavaScript
2. **Keyboard Navigation**: All fields accessible via keyboard
3. **Screen Reader**: All fields properly announced
4. **Mobile Touch**: Form inputs work properly on touch devices
5. **Category Multi-Select**: Users can select/deselect multiple categories easily
6. **Error Recovery**: Users can easily fix validation errors
7. **Visual Feedback**: Loading states and success indicators work

### Integration Tests
1. **Wizard Flow**: Back/forward navigation preserves form state
2. **Event Type Changes**: Form updates appropriately when event type changes
3. **Data Persistence**: Form data integrates with overall event creation flow
4. **Error Boundaries**: Form errors don't crash the application

### Image Optimization Performance Targets
- **Compression Ratio**: Achieve 70-90% file size reduction while maintaining visual quality
- **Processing Speed**: <3 seconds for 10MB source image on modern devices
- **Format Support**: WebP for 95%+ modern browsers, JPEG fallback for older browsers
- **CDN Integration**: Automatic upload to Supabase Storage with CDN distribution
- **User Feedback**: Real-time progress bars and before/after size comparisons

## Future Considerations
- **AI-Powered Optimization**: Smart quality optimization and format detection
- **Bulk Upload**: Multiple image processing for event galleries
- **Template System**: Allow users to save form templates for future events
- **Import/Export**: Bulk event creation from CSV/JSON
- **AI Enhancement**: Smart suggestions for titles and descriptions
- **Advanced Location**: Integration with mapping services
- **Multi-language**: Support for international events with multiple languages
- **Collaboration**: Multiple organizers editing the same event