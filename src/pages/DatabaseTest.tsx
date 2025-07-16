import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Database, 
  Play, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  RefreshCw,
  AlertTriangle,
  Info
} from 'lucide-react';
import { DatabaseTestUtils, TestResults } from '@/utils/testDatabaseOperations';
import { DatabaseSeeder, SeedResult } from '@/utils/seedDatabaseData';

export default function DatabaseTest() {
  const [testing, setTesting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [results, setResults] = useState<{
    connection: TestResults;
    classes: TestResults[];
    businesses: TestResults[];
    creation: TestResults;
    summary: {
      total: number;
      passed: number;
      failed: number;
    };
  } | null>(null);
  const [seedResults, setSeedResults] = useState<{
    classes: SeedResult;
    businesses: SeedResult;
    summary: {
      totalCreated: number;
      successful: number;
      failed: number;
    };
  } | null>(null);
  const [seedStatus, setSeedStatus] = useState<{
    classes: { count: number; needsSeeding: boolean };
    businesses: { count: number; needsSeeding: boolean };
  } | null>(null);

  const runTests = async () => {
    setTesting(true);
    try {
      const testResults = await DatabaseTestUtils.runAllTests();
      setResults(testResults);
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      setTesting(false);
    }
  };

  const runSeeding = async () => {
    setSeeding(true);
    try {
      const seedingResults = await DatabaseSeeder.seedAll();
      setSeedResults(seedingResults);
      
      // Refresh seed status
      const status = await DatabaseSeeder.checkSeedStatus();
      setSeedStatus(status);
    } catch (error) {
      console.error('Seeding failed:', error);
    } finally {
      setSeeding(false);
    }
  };

  const checkSeedStatus = async () => {
    try {
      const status = await DatabaseSeeder.checkSeedStatus();
      setSeedStatus(status);
    } catch (error) {
      console.error('Failed to check seed status:', error);
    }
  };

  // Check seed status on component mount
  React.useEffect(() => {
    checkSeedStatus();
  }, []);

  const renderTestResult = (result: TestResults, index?: number) => (
    <div key={index || result.message} className="flex items-start gap-3 p-3 rounded-lg border">
      {result.success ? (
        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
      ) : (
        <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
      )}
      <div className="flex-1">
        <p className="font-medium">{result.message}</p>
        {result.error && (
          <p className="text-sm text-red-600 mt-1">Error: {result.error}</p>
        )}
        {result.data && (
          <pre className="text-xs text-muted-foreground mt-2 bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-x-auto">
            {JSON.stringify(result.data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-8">
        <Database className="w-16 h-16 mx-auto mb-4 text-green-600" />
        <h1 className="text-3xl font-bold mb-2">Database Operations Test</h1>
        <p className="text-muted-foreground">
          Test the database integration for classes and community businesses
        </p>
      </div>

      {/* Warning Notice */}
      <Card className="mb-6 border-orange-200 bg-orange-50 dark:bg-orange-900/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                Test Environment Only
              </h3>
              <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                This page is for testing database operations. It will create sample data 
                which should be cleaned up after testing. Do not use in production.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Data Status */}
      {seedStatus && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Sample Data Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <h4 className="font-medium">Classes</h4>
                  <p className="text-sm text-muted-foreground">
                    {seedStatus.classes.count} classes in database
                  </p>
                </div>
                <Badge variant={seedStatus.classes.needsSeeding ? "destructive" : "default"}>
                  {seedStatus.classes.needsSeeding ? 'Needs Seeding' : 'Has Data'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <h4 className="font-medium">Businesses</h4>
                  <p className="text-sm text-muted-foreground">
                    {seedStatus.businesses.count} businesses in database
                  </p>
                </div>
                <Badge variant={seedStatus.businesses.needsSeeding ? "destructive" : "default"}>
                  {seedStatus.businesses.needsSeeding ? 'Needs Seeding' : 'Has Data'}
                </Badge>
              </div>
            </div>
            
            <div className="flex gap-4">
              <Button 
                onClick={runSeeding} 
                disabled={seeding || (!seedStatus.classes.needsSeeding && !seedStatus.businesses.needsSeeding)}
                className="flex items-center gap-2"
              >
                {seeding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Database className="w-4 h-4" />
                )}
                {seeding ? 'Seeding Database...' : 'Add Sample Data'}
              </Button>
              
              <Button 
                onClick={checkSeedStatus} 
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Status
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Test Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              onClick={runTests} 
              disabled={testing}
              className="flex items-center gap-2"
            >
              {testing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {testing ? 'Running Tests...' : 'Run All Tests'}
            </Button>
            
            {results && (
              <Button 
                onClick={() => setResults(null)} 
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Clear Results
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Seeding Results */}
      {seedResults && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Seeding Results Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                <div className="text-2xl font-bold text-green-600">
                  {seedResults.summary.successful}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">
                  Operations Successful
                </div>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                <div className="text-2xl font-bold text-red-600">
                  {seedResults.summary.failed}
                </div>
                <div className="text-sm text-red-700 dark:text-red-300">
                  Operations Failed
                </div>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <div className="text-2xl font-bold text-blue-600">
                  {seedResults.summary.totalCreated}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  Items Created
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg border">
                {seedResults.classes.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">Classes: {seedResults.classes.message}</p>
                  {seedResults.classes.error && (
                    <p className="text-sm text-red-600 mt-1">Error: {seedResults.classes.error}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 rounded-lg border">
                {seedResults.businesses.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">Businesses: {seedResults.businesses.message}</p>
                  {seedResults.businesses.error && (
                    <p className="text-sm text-red-600 mt-1">Error: {seedResults.businesses.error}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Results Summary */}
      {results && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Results Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                <div className="text-2xl font-bold text-green-600">
                  {results.summary.passed}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">
                  Tests Passed
                </div>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                <div className="text-2xl font-bold text-red-600">
                  {results.summary.failed}
                </div>
                <div className="text-sm text-red-700 dark:text-red-300">
                  Tests Failed
                </div>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <div className="text-2xl font-bold text-blue-600">
                  {results.summary.total}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  Total Tests
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-center">
              <Badge 
                variant={results.summary.failed === 0 ? "default" : "destructive"}
                className="text-sm px-4 py-1"
              >
                {results.summary.failed === 0 
                  ? '✅ All Tests Passed' 
                  : `❌ ${results.summary.failed} Test(s) Failed`
                }
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Results */}
      {results && (
        <div className="space-y-6">
          {/* Connection Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Database Connection
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderTestResult(results.connection)}
            </CardContent>
          </Card>

          {/* Classes Tests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📚 Classes Operations ({results.classes.length} tests)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.classes.map((result, index) => renderTestResult(result, index))}
            </CardContent>
          </Card>

          {/* Businesses Tests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🏢 Business Operations ({results.businesses.length} tests)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.businesses.map((result, index) => renderTestResult(result, index))}
            </CardContent>
          </Card>

          {/* Creation Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ✨ Data Creation Test
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderTestResult(results.creation)}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Instructions */}
      {!results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              What This Test Does
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Database Connection Test</h4>
              <p className="text-sm text-muted-foreground">
                Verifies that the app can connect to Supabase and perform basic queries.
              </p>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-semibold mb-2">Classes Operations Test</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Fetch all classes from database</li>
                <li>• Test filtering by level and search terms</li>
                <li>• Retrieve class attendees</li>
                <li>• Direct database queries</li>
              </ul>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-semibold mb-2">Business Operations Test</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Fetch all businesses from database</li>
                <li>• Test category filtering and search</li>
                <li>• Retrieve featured businesses</li>
                <li>• Get business reviews and ratings</li>
              </ul>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-semibold mb-2">Data Creation Test</h4>
              <p className="text-sm text-muted-foreground">
                Creates a sample class to test the complete create/read cycle.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}