import React from 'react';
import { useParams } from 'react-router-dom';

const TestSeatingPage = () => {
  const { eventId } = useParams<{ eventId: string }>();
  
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Test Seating Page</h1>
        <p className="text-lg">Event ID: {eventId}</p>
        <p className="text-muted-foreground">This is a test page to verify routing works.</p>
      </div>
    </div>
  );
};

export default TestSeatingPage;