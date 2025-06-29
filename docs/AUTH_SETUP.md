# Authentication Setup Guide

This document explains how to configure the authentication system for the Steppers platform.

## Overview

The application uses Supabase for authentication with support for:
- ✅ Email/Password authentication
- ✅ Magic link (passwordless) authentication  
- ✅ Google OAuth authentication

## Environment Variables Required

Add these variables to your `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_project_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## Supabase Configuration

### 1. Enable Authentication Providers

In your Supabase dashboard:

**Email/Password:**
- Navigate to Authentication > Settings
- Ensure "Enable email confirmations" is configured as needed

**Magic Links:**
- Already enabled by default with email/password auth

**Google OAuth:**
- Navigate to Authentication > Providers  
- Enable Google provider
- Add your Google OAuth credentials (Client ID & Client Secret)
- Set authorized redirect URI to: `https://your-project.supabase.co/auth/v1/callback`

### 2. Email Templates (Optional)

Customize email templates in Authentication > Email Templates:
- Confirm signup
- Magic Link
- Reset password

## Usage

### Protected Routes

Wrap any route that requires authentication with `ProtectedRoute`:

```tsx
<Route path="/create-event" element={
  <ProtectedRoute>
    <CreateEvent />
  </ProtectedRoute>
} />
```

### Authentication Context

Use the `useAuth` hook in components:

```tsx
import { useAuth } from '@/contexts/AuthContext'

const MyComponent = () => {
  const { user, signOut, loading } = useAuth()
  
  if (loading) return <div>Loading...</div>
  
  return (
    <div>
      {user ? (
        <div>
          Welcome {user.email}
          <button onClick={signOut}>Sign Out</button>
        </div>
      ) : (
        <div>Please sign in</div>
      )}
    </div>
  )
}
```

## Features Implemented

### ✅ Complete Authentication Flow
- Sign in/Sign up forms with tabs
- Error handling and loading states
- Success messages for email confirmation
- Responsive design optimized for mobile

### ✅ User Profile Component
- Avatar with initials fallback
- Dropdown menu with user info
- Sign out functionality
- Integrates with navigation bar

### ✅ Route Protection
- Automatic redirect to auth page for unauthenticated users
- Preserves intended destination after login
- Loading states during auth check

### ✅ Mobile-First Design
- Touch-friendly interface
- Responsive layouts
- Optimized for phone usage

## Security Notes

- Environment variables are properly scoped with `VITE_` prefix
- Supabase handles secure token management
- No sensitive data stored in local storage
- Proper error handling without exposing internal details

## Next Steps

1. Configure your Supabase project with the authentication providers
2. Update the environment variables
3. Test the authentication flow
4. Customize email templates as needed
5. Set up any additional OAuth providers if required