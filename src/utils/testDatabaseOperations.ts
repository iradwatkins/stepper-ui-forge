// Database operations test utility
// This file helps verify that our services are properly saving and retrieving data

import { classService } from '@/services/classService';
import { CommunityBusinessService } from '@/lib/services/CommunityBusinessService';
import { supabase } from '@/integrations/supabase/client';

export interface TestResults {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export class DatabaseTestUtils {
  
  // Test class operations
  static async testClassOperations(): Promise<TestResults[]> {
    const results: TestResults[] = [];
    
    try {
      // Test 1: Fetch all classes
      console.log('🧪 Testing: Fetch all classes...');
      const allClasses = await classService.getAllClasses();
      results.push({
        success: allClasses.length > 0,
        message: `Fetched ${allClasses.length} classes from database`,
        data: { count: allClasses.length, sample: allClasses[0]?.title }
      });

      // Test 2: Fetch classes with filters
      console.log('🧪 Testing: Fetch classes with filters...');
      const beginnerClasses = await classService.getAllClasses({ level: 'Beginner' });
      results.push({
        success: true,
        message: `Filtered to ${beginnerClasses.length} beginner classes`,
        data: { count: beginnerClasses.length }
      });

      // Test 3: Search classes
      console.log('🧪 Testing: Search classes...');
      const searchResults = await classService.getAllClasses({ search: 'stepping' });
      results.push({
        success: true,
        message: `Found ${searchResults.length} classes matching 'stepping'`,
        data: { count: searchResults.length }
      });

      // Test 4: Test class attendees (for first class if available)
      if (allClasses.length > 0) {
        console.log('🧪 Testing: Fetch class attendees...');
        const attendees = await classService.getClassAttendees(allClasses[0].id);
        results.push({
          success: true,
          message: `Fetched ${attendees.length} attendees for "${allClasses[0].title}"`,
          data: { count: attendees.length }
        });
      }

      // Test 5: Test direct database query
      console.log('🧪 Testing: Direct database query...');
      const { data: dbClasses, error } = await supabase
        .from('stepping_classes')
        .select('id, title, instructor_name, status')
        .limit(3);
      
      if (error) {
        results.push({
          success: false,
          message: 'Direct database query failed',
          error: error.message
        });
      } else {
        results.push({
          success: true,
          message: `Direct query returned ${dbClasses?.length || 0} classes`,
          data: { classes: dbClasses }
        });
      }

    } catch (error) {
      results.push({
        success: false,
        message: 'Class operations test failed',
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return results;
  }

  // Test business operations
  static async testBusinessOperations(): Promise<TestResults[]> {
    const results: TestResults[] = [];
    
    try {
      // Test 1: Fetch all businesses
      console.log('🧪 Testing: Fetch all businesses...');
      const { businesses, total } = await CommunityBusinessService.getBusinesses();
      results.push({
        success: businesses.length > 0,
        message: `Fetched ${businesses.length} businesses from database (total: ${total})`,
        data: { count: businesses.length, sample: businesses[0]?.business_name }
      });

      // Test 2: Fetch businesses with filters
      console.log('🧪 Testing: Fetch businesses with category filter...');
      const fitnessBusinesses = await CommunityBusinessService.getBusinesses({ 
        category: 'fitness_sports' 
      });
      results.push({
        success: true,
        message: `Filtered to ${fitnessBusinesses.businesses.length} fitness businesses`,
        data: { count: fitnessBusinesses.businesses.length }
      });

      // Test 3: Search businesses
      console.log('🧪 Testing: Search businesses...');
      const searchResults = await CommunityBusinessService.searchBusinesses('dance');
      results.push({
        success: true,
        message: `Found ${searchResults.businesses.length} businesses matching 'dance'`,
        data: { count: searchResults.businesses.length }
      });

      // Test 4: Fetch featured businesses
      console.log('🧪 Testing: Fetch featured businesses...');
      const featured = await CommunityBusinessService.getFeaturedBusinesses(5);
      results.push({
        success: true,
        message: `Fetched ${featured.length} featured businesses`,
        data: { count: featured.length }
      });

      // Test 5: Test business reviews (for first business if available)
      if (businesses.length > 0) {
        console.log('🧪 Testing: Fetch business reviews...');
        const reviews = await CommunityBusinessService.getBusinessReviews(businesses[0].id);
        results.push({
          success: true,
          message: `Fetched ${reviews.length} reviews for "${businesses[0].business_name}"`,
          data: { count: reviews.length }
        });
      }

      // Test 6: Test direct database query
      console.log('🧪 Testing: Direct database query...');
      const { data: dbBusinesses, error } = await supabase
        .from('community_businesses')
        .select('id, business_name, category, status')
        .limit(3);
      
      if (error) {
        results.push({
          success: false,
          message: 'Direct database query failed',
          error: error.message
        });
      } else {
        results.push({
          success: true,
          message: `Direct query returned ${dbBusinesses?.length || 0} businesses`,
          data: { businesses: dbBusinesses }
        });
      }

    } catch (error) {
      results.push({
        success: false,
        message: 'Business operations test failed',
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return results;
  }

  // Test database connection
  static async testDatabaseConnection(): Promise<TestResults> {
    try {
      console.log('🧪 Testing: Database connection...');
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      if (error) {
        return {
          success: false,
          message: 'Database connection failed',
          error: error.message
        };
      }

      return {
        success: true,
        message: 'Database connection successful',
        data: { connected: true }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Database connection test failed',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Test sample data creation
  static async testCreateSampleClass(): Promise<TestResults> {
    try {
      console.log('🧪 Testing: Create sample class...');
      
      // Create a test class
      const testClass = await classService.createClass({
        title: 'Test Class - Delete Me',
        description: 'This is a test class created by the database test utility. Please delete.',
        classType: 'Regular Class',
        level: 'Beginner',
        category: 'Stepping',
        location: {
          type: 'physical',
          venue: 'Test Venue',
          address: '123 Test St',
          city: 'Chicago',
          state: 'IL',
          zipCode: '60601'
        },
        schedule: {
          type: 'single',
          startDate: '2024-03-01',
          time: '19:00',
          duration: 60
        },
        price: 25,
        hasRSVP: true,
        contactInfo: {
          email: 'test@example.com',
          preferredContact: 'email'
        },
        tags: ['test', 'sample']
      }, 'test-instructor-id', 'Test Instructor');

      return {
        success: true,
        message: 'Successfully created test class',
        data: { classId: testClass.id, title: testClass.title }
      };
      
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create test class',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Run all tests
  static async runAllTests(): Promise<{
    connection: TestResults;
    classes: TestResults[];
    businesses: TestResults[];
    creation: TestResults;
    summary: {
      total: number;
      passed: number;
      failed: number;
    };
  }> {
    console.log('🚀 Starting database operations tests...\n');

    const connection = await this.testDatabaseConnection();
    const classes = await this.testClassOperations();
    const businesses = await this.testBusinessOperations();
    const creation = await this.testCreateSampleClass();

    const allResults = [connection, ...classes, ...businesses, creation];
    const passed = allResults.filter(r => r.success).length;
    const failed = allResults.filter(r => !r.success).length;

    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Total: ${allResults.length}`);

    return {
      connection,
      classes,
      businesses,
      creation,
      summary: {
        total: allResults.length,
        passed,
        failed
      }
    };
  }

  // Helper to format results for display
  static formatResults(results: TestResults[]): string {
    return results.map(result => {
      const status = result.success ? '✅' : '❌';
      const error = result.error ? ` (Error: ${result.error})` : '';
      return `${status} ${result.message}${error}`;
    }).join('\n');
  }
}

// Console-friendly test runner
export const runDatabaseTests = async () => {
  const results = await DatabaseTestUtils.runAllTests();
  
  console.log('\n🔍 Detailed Results:');
  console.log('\n📡 Connection Test:');
  console.log(DatabaseTestUtils.formatResults([results.connection]));
  
  console.log('\n📚 Classes Tests:');
  console.log(DatabaseTestUtils.formatResults(results.classes));
  
  console.log('\n🏢 Businesses Tests:');
  console.log(DatabaseTestUtils.formatResults(results.businesses));
  
  console.log('\n✨ Creation Test:');
  console.log(DatabaseTestUtils.formatResults([results.creation]));
  
  return results;
};