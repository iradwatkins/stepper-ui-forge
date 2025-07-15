# Service Error Handling Migration Guide

This guide explains how to migrate existing services to use the new standardized error handling system.

## Overview

The new error handling system provides:
- **Consistent response format** across all services
- **Categorized errors** for better handling
- **User-friendly messages** for UI display
- **Structured logging** for debugging
- **Retry logic** indicators

## New Response Format

All service methods now return a `ServiceResponse<T>` object:

```typescript
interface ServiceResponse<T = any> {
  success: boolean
  data?: T
  error?: ServiceError
  timestamp: Date
}
```

## Migration Steps

### 1. Update Service Class

**Before:**
```typescript
export class MyService {
  static async someOperation(param: string): Promise<{ success: boolean; error?: string }> {
    try {
      // operation logic
      return { success: true };
    } catch (error) {
      console.error('Error:', error);
      return { success: false, error: error.message };
    }
  }
}
```

**After:**
```typescript
import { BaseService, ServiceResponse } from '@/lib/utils/ServiceResponse'

export class MyService extends BaseService {
  protected static serviceName = 'MyService'

  static async someOperation(param: string): Promise<ServiceResponse<ResultType>> {
    return this.executeOperation('someOperation', async () => {
      // Validate parameters
      const validation = this.validateRequired({ param })
      if (validation) throw validation

      // Validate auth if needed
      const authResult = await this.validateAuth()
      if (!authResult.success) throw authResult

      // Your operation logic here
      const result = await performOperation(param)
      
      return result
    }, { param })
  }
}
```

### 2. Update Method Return Types

**Before:**
```typescript
// Various inconsistent return types
Promise<{ success: boolean; data?: T; error?: string }>
Promise<T | null>
Promise<T> // throws on error
```

**After:**
```typescript
// Consistent return type
Promise<ServiceResponse<T>>
```

### 3. Update Error Handling

**Before:**
```typescript
try {
  const result = await someOperation()
  // Direct database query
} catch (error) {
  console.error('Error:', error)
  return { success: false, error: error.message }
}
```

**After:**
```typescript
// Wrapped in executeOperation - automatic error handling
return this.executeOperation('methodName', async () => {
  // Your logic here
  // Errors are automatically caught and formatted
  return result
})
```

### 4. Update Calling Code

**Before:**
```typescript
const result = await MyService.someOperation(param)
if (!result.success) {
  toast({
    title: "Error",
    description: result.error,
    variant: "destructive"
  })
  return
}
// Use result data directly
```

**After:**
```typescript
const response = await MyService.someOperation(param)
if (!response.success) {
  toast({
    title: "Error", 
    description: response.error?.userMessage || response.error?.message,
    variant: "destructive"
  })
  
  // Check if retryable
  if (response.error?.isRetryable) {
    // Show retry option
  }
  return
}
// Use response.data
const result = response.data
```

## Error Categories and Codes

Use predefined error codes for consistency:

```typescript
import { ErrorCodes, ServiceResponseBuilder } from '@/lib/utils/ServiceResponse'

// Authentication errors
ServiceResponseBuilder.error(
  ErrorCodes.AUTH_REQUIRED,
  'User must be signed in',
  'authentication'
)

// Validation errors  
ServiceResponseBuilder.error(
  ErrorCodes.INVALID_INPUT,
  'Email format is invalid',
  'validation',
  { userMessage: 'Please enter a valid email address' }
)

// Business logic errors
ServiceResponseBuilder.error(
  ErrorCodes.BUSINESS_RULE_VIOLATION,
  'Cannot delete event with active tickets',
  'business_logic',
  { userMessage: 'This event cannot be deleted because it has active tickets' }
)
```

## Logging Best Practices

Use the ServiceLogger for consistent logging:

```typescript
import { ServiceLogger } from '@/lib/utils/ServiceResponse'

// Info logging
ServiceLogger.info(this.serviceName, 'methodName', 'Operation completed', { userId })

// Warning logging
ServiceLogger.warn(this.serviceName, 'methodName', 'Deprecated API used', { apiVersion })

// Error logging (automatic in executeOperation)
ServiceLogger.error(this.serviceName, 'methodName', error, { context })

// Debug logging (development only)
ServiceLogger.debug(this.serviceName, 'methodName', 'Processing step 1', { data })
```

## Common Patterns

### 1. Authentication Validation
```typescript
// Validate auth is required
const authResult = await this.validateAuth()
if (!authResult.success) throw authResult

const userId = authResult.data!.userId
```

### 2. Parameter Validation
```typescript
// Validate required parameters
const validation = this.validateRequired({ param1, param2 })
if (validation) throw validation
```

### 3. Supabase Error Handling
```typescript
// Automatic Supabase error handling
const { data, error } = await supabase.from('table').select()
if (error) {
  throw ServiceResponseBuilder.fromSupabaseError(error, 'Failed to fetch data')
}
```

### 4. Business Logic Errors
```typescript
if (someBusinessRule) {
  throw ServiceResponseBuilder.error(
    ErrorCodes.BUSINESS_RULE_VIOLATION,
    'Business rule violated',
    'business_logic',
    {
      userMessage: 'This action is not allowed at this time',
      details: { rule: 'no_weekend_operations' }
    }
  )
}
```

## Benefits

1. **Consistency**: All services use the same error format
2. **User Experience**: Better error messages for users
3. **Debugging**: Structured logging with context
4. **Reliability**: Automatic retry logic indicators
5. **Maintainability**: Centralized error handling logic

## Migration Checklist

- [ ] Extend BaseService class
- [ ] Update return types to ServiceResponse<T>
- [ ] Wrap operations in executeOperation()
- [ ] Use validateAuth() and validateRequired()
- [ ] Update calling code to handle new response format
- [ ] Replace console.error with ServiceLogger
- [ ] Use predefined ErrorCodes
- [ ] Add user-friendly error messages
- [ ] Test error scenarios

## Examples

See `EventLikeServiceV2.ts` for a complete example of a migrated service.