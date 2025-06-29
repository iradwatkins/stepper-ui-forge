# Events System - Backend API Design

## **1. API Response Format**

All API responses will follow a consistent structure.

```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; };
  timestamp: string;
}