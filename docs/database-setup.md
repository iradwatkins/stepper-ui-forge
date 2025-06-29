# Database Setup Instructions

## Setting up Supabase Database

To set up the complete database schema for the Steppers event platform, follow these steps:

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

### 2. Set Environment Variables
Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Execute Database Schema
In your Supabase dashboard:

1. Go to **SQL Editor**
2. Copy and paste the entire contents of `/supabase/schema.sql`
3. Click **Run** to execute the schema

This will create:
- All necessary tables (profiles, events, tickets, orders, etc.)
- Row Level Security (RLS) policies
- Indexes for performance
- Triggers for automatic timestamps
- Storage bucket for avatars

### 4. Set up Storage (Optional)
For avatar uploads to work:

1. Go to **Storage** in Supabase dashboard
2. Create a new bucket called `avatars`
3. Set bucket to **Public**
4. Configure RLS policies for the bucket

### 5. Test the Setup
1. Start your development server: `npm run dev`
2. Sign up for a new account
3. Navigate to `/dashboard/profile` to test profile creation
4. Try creating an event to test the events system

## Database Features

The database schema includes:

### Core Tables
- **profiles** - Extended user information
- **events** - Event data with ownership
- **ticket_types** - Ticket tiers for events
- **tickets** - Individual ticket instances
- **orders** - Payment tracking
- **team_members** - Collaborative event management

### Security Features
- Row Level Security (RLS) on all tables
- User-based access control
- Secure data isolation

### Performance Features
- Optimized indexes
- Automatic updated_at timestamps
- Efficient foreign key relationships

### Automatic Features
- Profile creation on user signup
- QR code generation for tickets
- Revenue and attendance tracking

## Next Steps

Once the database is set up:

1. **Test Profile Management**: Create and update user profiles
2. **Test Event Creation**: Create events and verify ownership
3. **Test Dashboard**: Check analytics and stats
4. **Test Team Features**: Invite team members (future feature)

The application will automatically handle:
- Creating user profiles on first login
- Linking events to authenticated users
- Calculating dashboard statistics
- Managing event ownership and permissions