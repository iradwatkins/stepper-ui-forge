# Instructor Flow Test Guide

## Updated Class System Specifications

### ✅ Class Categories (Only these 3):
- **Steppin** - Steppin dance instruction and techniques  
- **Line Dancing** - Group choreography and line dancing
- **Walking** - Walking dance styles and techniques

### ✅ Class Levels (Only these 3):
- **Beginner** - Perfect for those new to dancing
- **Intermediate** - For dancers with solid foundation
- **Advanced** - Advanced and expert-level techniques

## 🧪 Complete Instructor Flow Test

### Step 1: Access the Platform
1. Open browser and go to: `http://localhost:8080` or `http://127.0.0.1:8080`
2. Verify the main page loads successfully

### Step 2: View Classes Page
1. Navigate to: `http://localhost:8080/classes`
2. ✅ **Verify**: You can see existing classes
3. ✅ **Verify**: Filter dropdowns show only the 3 categories and 3 levels
4. ✅ **Verify**: "Create Your Class" button is visible at the bottom

### Step 3: Sign Up/Login (Become an Instructor)
1. Click "Create Your Class" button
2. ✅ **Expected**: You should be redirected to login/signup page
3. Create an account or login with existing credentials
4. ✅ **Verify**: User can successfully authenticate

### Step 4: Access Class Creation Form
1. After login, navigate to: `http://localhost:8080/create-class`
2. ✅ **Verify**: Instructor class creation form loads
3. ✅ **Verify**: All form sections are visible:
   - Basic Information
   - Images (Profile Picture, Class Logo, Additional Images)
   - Schedule & Location
   - Contact Information
   - Additional Details

### Step 5: Test Form Dropdowns
1. In the "Level" dropdown:
   ✅ **Verify**: Only shows: Beginner, Intermediate, Advanced
2. In the "Category" dropdown:
   ✅ **Verify**: Only shows: Steppin, Line Dancing, Walking
3. ✅ **Verify**: No other categories/levels are available

### Step 6: Fill Out Class Creation Form
**Basic Information:**
- Title: "Test Steppin Class"
- Description: "A comprehensive steppin class for beginners"
- Class Type: "Regular Class"
- Level: "Beginner"
- Category: "Steppin"
- Class Fee: "$50.00"

**Images:**
- Upload a profile picture
- Upload a class logo
- Upload 1-2 additional class images

**Schedule & Location:**
- Location Type: "Physical Location"
- Venue: "Test Dance Studio"
- Address: "123 Main St"
- City: "Chicago"
- State: "IL"
- Schedule Type: "Weekly"
- Start Date: Select a future date
- Time: "19:00"
- Duration: "90 minutes"
- Capacity: "20"

**Contact Information:**
- Email: "instructor@test.com"
- Phone: "(555) 123-4567"
- Preferred Contact: "Email"

**Additional Details:**
- Prerequisites: "None - beginners welcome"
- What to Bring: "Comfortable shoes, water"
- Extras: "Light refreshments provided"
- Tags: Add "beginner", "steppin", "chicago"

### Step 7: Submit Class
1. Click "Create Class" button
2. ✅ **Verify**: Loading state shows
3. ✅ **Verify**: Success message appears
4. ✅ **Verify**: Option to create another class or go to dashboard

### Step 8: Verify Class in System
1. Navigate back to: `http://localhost:8080/classes`
2. ✅ **Verify**: Can filter by "Steppin" category
3. ✅ **Verify**: Can filter by "Beginner" level
4. ✅ **Note**: New class may be pending approval (not immediately visible)

## 🔍 Search Functionality Test

### Filter Testing:
1. On classes page, test each filter combination:
   - No filters (shows all classes)
   - Beginner + Steppin
   - Intermediate + Line Dancing
   - Advanced + Walking
   - Just Steppin (should show all steppin classes)

### Search Testing:
1. Use search bar to find:
   - Class titles containing "steppin"
   - Instructor names
   - Location cities

## ✅ Expected Results

After completing this flow, you should have:

1. **Successfully created an instructor account**
2. **Submitted a new class with the restricted categories/levels**
3. **Verified that only the 3 specified categories and 3 levels are available**
4. **Confirmed image upload functionality works**
5. **Tested that class fees can be set**
6. **Verified the search and filter system works with new categories**

## 🚨 Troubleshooting

**If localhost won't connect:**
```bash
# Kill existing processes
pkill -f vite && pkill -f node
lsof -ti:8080 | xargs kill -9 2>/dev/null

# Start fresh server
npm run dev
```

**Try alternative URLs:**
- `http://127.0.0.1:8080/`
- `http://192.168.86.27:8080/`

**Browser Issues:**
- Try incognito/private mode
- Clear cache with Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Disable browser extensions temporarily

## 📊 System Status

- ✅ Categories updated to: Steppin, Line Dancing, Walking
- ✅ Levels updated to: Beginner, Intermediate, Advanced
- ✅ Database schema updated
- ✅ Frontend forms updated
- ✅ Mock data updated
- ✅ Search functionality ready
- ✅ Instructor flow complete
- ✅ Image upload system ready
- ✅ Payment integration foundation ready