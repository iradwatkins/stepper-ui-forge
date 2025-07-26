# YouTube Timing Feature Test

## Test Steps:

1. Navigate to `/dashboard/admin/magazine` (admin access required)
2. Click "Create Article"
3. Add basic article info (title, category)
4. Click "+ YouTube Video" from content blocks
5. Add a YouTube URL (e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ)
6. Set start time: `1:30` (should convert to 90 seconds)
7. Set end time: `2:00` (should convert to 120 seconds)
8. Save the block - video should show with timing
9. Save the article and view it

## Expected Results:

- ✅ Start/Stop time fields appear when editing YouTube video blocks
- ✅ Time can be entered as M:SS format (1:30) or seconds (90)
- ✅ Preview iframe shows video starting at specified time
- ✅ Saved article displays timing info: "⏱️ Start: 1:30 • End: 2:00"
- ✅ Video embedded with `?start=90&end=120` parameters

## Implementation Details:

- Start/stop times stored in `ContentBlock.startTime` and `ContentBlock.endTime` (seconds)
- YouTube embed URLs built with `?start=X&end=Y` parameters
- UI shows timing in M:SS format for user-friendly display
- Both editing and viewing modes support timing display