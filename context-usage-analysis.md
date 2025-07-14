# React Context Usage Analysis

## Summary of createContext Usage in the Codebase

### Application Contexts (src/)

1. **AuthContext** (`src/contexts/AuthContext.tsx`)
   - Custom authentication context for the application

2. **CartContext** (`src/contexts/CartContext.tsx`)
   - Shopping cart state management context

3. **UI Component Contexts** (from shadcn/ui components):
   - **carousel.tsx** - `CarouselContext` for carousel state
   - **form.tsx** - Form context (likely from react-hook-form)
   - **sidebar.tsx** - Sidebar navigation context
   - **toggle-group.tsx** - Toggle group state context
   - **chart.tsx** - Chart component context

### Vendor Dependencies Creating Contexts

#### Major Libraries:

1. **next-themes** (`node_modules/next-themes`)
   - Creates a theme context for dark/light mode switching
   - Used via `ThemeProvider` in `src/App.tsx`

2. **@radix-ui** (Multiple packages)
   - Heavy context usage across all Radix UI primitives
   - `@radix-ui/react-context` - Core context utilities
   - Individual component contexts:
     - `@radix-ui/react-menubar`
     - `@radix-ui/react-tabs`
     - `@radix-ui/react-progress`
     - `@radix-ui/react-popper`
     - `@radix-ui/react-tooltip`
     - `@radix-ui/react-radio-group`
     - `@radix-ui/react-direction`
     - And many more...

3. **@tanstack/react-query**
   - `QueryClientProvider` context
   - `QueryErrorResetBoundary` context
   - Restore state context

4. **react-hook-form**
   - Form context for form state management

5. **react-day-picker**
   - Multiple contexts:
     - `DayPickerContext`
     - `ModifiersContext`
     - `NavigationContext`
     - `FocusContext`
     - `SelectSingleContext`
     - `SelectMultipleContext`
     - `SelectRangeContext`

6. **@paypal/react-paypal-js**
   - PayPal provider context

7. **react-transition-group**
   - `TransitionGroupContext`

8. **input-otp**
   - OTP input context

## Potential Vendor Bundle Issues

The most likely candidates causing vendor bundle issues are:

1. **@radix-ui packages** - They have extensive context usage and might be duplicated if different versions are installed
2. **next-themes** - Standalone theme context that might conflict with other theme solutions
3. **react-hook-form** - Large form management library with contexts
4. **@tanstack/react-query** - Multiple contexts for query state management

## Version Conflicts Found

Based on `npm ls` analysis:

1. **@radix-ui/react-context** has **multiple versions**:
   - Version 1.1.0 (used by react-collection, react-popper, react-progress, react-roving-focus)
   - Version 1.1.1 (used by most other Radix UI components)

This version mismatch is likely causing vendor bundle issues as multiple versions of the same context creation utilities are being bundled.

## Recommendations

1. **Fix Radix UI version conflicts** (PRIORITY):
   ```bash
   # Update all Radix UI packages to use consistent versions
   npm update @radix-ui/react-accordion @radix-ui/react-hover-card @radix-ui/react-menubar @radix-ui/react-progress
   
   # Or manually set versions in package.json to ensure consistency
   ```

2. **Deduplicate dependencies**:
   ```bash
   npm dedupe
   ```

3. **Consider using a resolution/override** in package.json:
   ```json
   {
     "overrides": {
       "@radix-ui/react-context": "1.1.1"
     }
   }
   ```

4. **Analyze bundle size** to identify which contexts are taking up the most space:
   ```bash
   npm run build
   npx vite-bundle-visualizer
   ```

5. **Consider lazy loading** heavy context providers that aren't needed immediately