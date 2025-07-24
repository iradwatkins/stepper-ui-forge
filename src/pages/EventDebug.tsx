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
        
        // Test 2: Direct database query
        setStatus("Testing direct database query...");
        const { data: directData, error: directError } = await supabase
          .from('events')
          .select('id, title, date, status, is_public')
          .eq('is_public', true)
          .eq('status', 'published')
          .limit(5);
          
        if (directError) {
          throw directError;
        }
        
        console.log("Direct query results:", directData);
        
        // Test 3: EventsService.getPublicEvents
        setStatus("Testing EventsService.getPublicEvents...");
        const publicEvents = await EventsService.getPublicEvents(5, 0, false);
        console.log("EventsService results:", publicEvents);
        
        setStatus("All tests completed successfully!");
        setResults({
          user: user?.email || "Not authenticated",
          directQueryCount: directData?.length || 0,
          directQueryData: directData,
          serviceEventCount: publicEvents?.length || 0,
          serviceEventData: publicEvents
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