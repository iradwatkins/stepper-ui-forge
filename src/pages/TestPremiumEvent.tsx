import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Users, 
  MapPin, 
  Calendar, 
  Clock,
  DollarSign,
  Ticket,
  Info,
  Loader2
} from 'lucide-react';
import { createTestPremiumEvent } from '@/utils/createTestPremiumEvent';

interface EventSummary {
  event: {
    id: string;
    title: string;
    type: string;
    status: string;
    maxAttendees: number;
    location: string;
    date: string;
    time: string;
  };
  ticketTypes: Array<{
    name: string;
    price: number;
    quantity: number;
    description: string;
  }>;
  seating: {
    totalSeats: number;
    generalAdmission: number;
    vipSeats: number;
    adaSeats: number;
    categories: number;
  };
}

export default function TestPremiumEvent() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    success: boolean;
    summary?: EventSummary;
    error?: string;
  } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const runTest = async () => {
    setIsRunning(true);
    setProgress(0);
    setResult(null);
    setLogs([]);

    // Intercept console.log to capture logs
    const originalLog = console.log;
    const capturedLogs: string[] = [];
    
    console.log = (...args) => {
      const message = args.join(' ');
      capturedLogs.push(message);
      setLogs([...capturedLogs]);
      originalLog(...args);
    };

    try {
      // Simulate progress steps
      const steps = [
        'Authenticating user...',
        'Creating event configuration...',
        'Generating 100 seats...',
        'Creating event in database...',
        'Creating ticket types...',
        'Storing seating configuration...',
        'Verifying event creation...',
        'Test completed!'
      ];

      for (let i = 0; i < steps.length; i++) {
        setProgress((i / steps.length) * 100);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const testResult = await createTestPremiumEvent();
      setResult(testResult);
      setProgress(100);

    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      console.log = originalLog; // Restore original console.log
      setIsRunning(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Premium Event Creation Test</h1>
        <p className="text-muted-foreground mb-6">
          Complete end-to-end test of Premium event creation with 100 seats
        </p>
      </div>

      {/* Test Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Test Configuration
          </CardTitle>
          <CardDescription>
            This test will create a complete Premium event with real database entries
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Event Details</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Event Type: Premium</li>
                <li>• Total Capacity: 100 seats</li>
                <li>• Venue: The Grand Theater</li>
                <li>• Date: December 15, 2024</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Ticket Configuration</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• General Admission: $50 (50 seats)</li>
                <li>• VIP Experience: $100 (50 seats)</li>
                <li>• ADA Accessible: 5 seats total</li>
                <li>• Sections: 2 (General + VIP)</li>
              </ul>
            </div>
          </div>

          <Button 
            onClick={runTest} 
            disabled={isRunning}
            className="w-full"
            size="lg"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Test...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Premium Event Creation Test
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Progress */}
      {isRunning && (
        <Card>
          <CardHeader>
            <CardTitle>Test Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="mb-2" />
            <p className="text-sm text-muted-foreground">
              {progress}% complete
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.success && result.summary ? (
              <div className="space-y-6">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Premium event created successfully! All database operations completed.
                  </AlertDescription>
                </Alert>

                {/* Event Details */}
                <div>
                  <h4 className="font-semibold mb-3">Event Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{result.summary.event.type.toUpperCase()}</Badge>
                        <Badge variant={result.summary.event.status === 'published' ? 'default' : 'secondary'}>
                          {result.summary.event.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="font-medium">{result.summary.event.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {result.summary.event.location}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {result.summary.event.date}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {result.summary.event.time}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4" />
                        <span>Max Attendees: {result.summary.event.maxAttendees}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Event ID: {result.summary.event.id}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Ticket Types */}
                <div>
                  <h4 className="font-semibold mb-3">Ticket Types</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.summary.ticketTypes.map((ticket, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h5 className="font-medium">{ticket.name}</h5>
                              <p className="text-sm text-muted-foreground">{ticket.description}</p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-lg font-bold">
                                <DollarSign className="h-4 w-4" />
                                {ticket.price}
                              </div>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Ticket className="h-3 w-3" />
                                {ticket.quantity} available
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Seating Summary */}
                <div>
                  <h4 className="font-semibold mb-3">Seating Configuration</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{result.summary.seating.totalSeats}</div>
                      <div className="text-sm text-muted-foreground">Total Seats</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{result.summary.seating.generalAdmission}</div>
                      <div className="text-sm text-muted-foreground">General Admission</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{result.summary.seating.vipSeats}</div>
                      <div className="text-sm text-muted-foreground">VIP Seats</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{result.summary.seating.adaSeats}</div>
                      <div className="text-sm text-muted-foreground">ADA Accessible</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  Test failed: {result.error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Execution Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-md max-h-60 overflow-y-auto">
              <code className="text-sm">
                {logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))}
              </code>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}