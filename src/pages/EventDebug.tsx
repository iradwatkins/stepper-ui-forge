import { useState, useEffect } from "react";
import { EventsService } from "@/lib/events-db";
import { supabase } from "@/lib/supabase";

const EventDebug = () => {
  const [status, setStatus] = useState("Testing connection...");
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const testEventLoading = async () => {
      try {
        // Test 1: Check Supabase connection
        setStatus("Testing Supabase connection...");
        const { data: { user } } = await supabase.auth.getUser();
        console.log("Current user:", user);
        
        // Test 2: Check current date filtering logic
        setStatus("Testing current date filtering...");
        const currentDate = new Date().toISOString().split('T')[0];
        console.log("🗓️ Current date for filtering:", currentDate);
        console.log("🗓️ Current date object:", new Date());
        console.log("🗓️ Test date 2026-10-23 comparison:", currentDate, "<=", "2026-10-23", "result:", currentDate <= "2026-10-23");
        
        // Test 3: Direct database query for ALL events (no date filter)
        setStatus("Testing direct database query (all events)...");
        const { data: allEvents, error: allError } = await supabase
          .from('events')
          .select('id, title, date, status, is_public, created_at')
          .eq('is_public', true)
          .eq('status', 'published')
          .order('date', { ascending: true });
          
        if (allError) {
          throw allError;
        }
        
        console.log("📊 All published events:", allEvents);
        console.log("📊 Events with 2026 dates:", allEvents?.filter(e => e.date?.includes('2026')));
        
        // Test 4: Direct database query with date filter (like getPublicEvents)
        setStatus("Testing direct database query (with date filter)...");
        const { data: filteredEvents, error: filteredError } = await supabase
          .from('events')
          .select('id, title, date, status, is_public, created_at')
          .eq('is_public', true)
          .eq('status', 'published')
          .gte('date', currentDate)
          .order('date', { ascending: true });
          
        if (filteredError) {
          throw filteredError;
        }
        
        console.log("📊 Date-filtered events:", filteredEvents);
        console.log("📊 Date-filtered events with 2026:", filteredEvents?.filter(e => e.date?.includes('2026')));
        
        // Test 5: EventsService.getPublicEvents without date filter
        setStatus("Testing EventsService.getPublicEvents (include past)...");
        const publicEventsWithPast = await EventsService.getPublicEvents(50, 0, true);
        console.log("📊 EventsService results (with past):", publicEventsWithPast);
        console.log("📊 EventsService 2026 events (with past):", publicEventsWithPast?.filter(e => e.date?.includes('2026')));
        
        // Test 6: EventsService.getPublicEvents with date filter (default)
        setStatus("Testing EventsService.getPublicEvents (exclude past)...");
        const publicEventsNoPast = await EventsService.getPublicEvents(50, 0, false);
        console.log("📊 EventsService results (no past):", publicEventsNoPast);
        console.log("📊 EventsService 2026 events (no past):", publicEventsNoPast?.filter(e => e.date?.includes('2026')));
        
        setStatus("All tests completed successfully!");
        setResults({
          user: user?.email || "Not authenticated",
          currentDate: currentDate,
          allEventsCount: allEvents?.length || 0,
          allEvents2026: allEvents?.filter(e => e.date?.includes('2026')) || [],
          filteredEventsCount: filteredEvents?.length || 0,
          filteredEvents2026: filteredEvents?.filter(e => e.date?.includes('2026')) || [],
          serviceEventsWithPastCount: publicEventsWithPast?.length || 0,
          serviceEvents2026WithPast: publicEventsWithPast?.filter(e => e.date?.includes('2026')) || [],
          serviceEventsNoPastCount: publicEventsNoPast?.length || 0,
          serviceEvents2026NoPast: publicEventsNoPast?.filter(e => e.date?.includes('2026')) || []
        });
        
      } catch (err: any) {
        console.error("Error during testing:", err);
        setStatus("Error occurred during testing");
        setError(err);
      }
    };

    testEventLoading();
  }, []);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Event Loading Debug</h1>
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Status:</h2>
        <p className={error ? "text-red-500" : "text-green-500"}>{status}</p>
      </div>
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 rounded">
          <h2 className="text-lg font-semibold text-red-700">Error Details:</h2>
          <pre className="text-sm text-red-600 whitespace-pre-wrap">
            {JSON.stringify(error, null, 2)}
          </pre>
        </div>
      )}
      
      {results && (
        <div className="space-y-4">
          <div className="p-4 bg-gray-100 rounded">
            <h2 className="text-lg font-semibold">Test Results:</h2>
            <pre className="text-sm whitespace-pre-wrap">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        </div>
      )}
      
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Instructions:</h2>
        <ol className="list-decimal list-inside space-y-1">
          <li>Open browser console (F12) to see detailed logs</li>
          <li>Check for any CORS errors or network failures</li>
          <li>Verify the Supabase URL and anon key are correct</li>
          <li>Look for any RLS (Row Level Security) policy errors</li>
        </ol>
      </div>
    </div>
  );
};

export default EventDebug;