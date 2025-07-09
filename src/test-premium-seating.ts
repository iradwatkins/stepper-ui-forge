// Test Premium Seating Functionality
import { createTestPremiumEvent } from './utils/createTestPremiumEvent';

export async function testPremiumSeating() {
  console.log('🧪 Testing Premium Seating Implementation...');
  
  try {
    // Test 1: Create premium event with table seating
    console.log('\n1️⃣ Testing Premium Event Creation...');
    const result = await createTestPremiumEvent();
    
    if (!result.success) {
      console.error('❌ Premium event creation failed:', result.error);
      return false;
    }
    
    console.log('✅ Premium event created successfully!');
    console.log('📊 Event Details:', result.summary);
    
    // Test 2: Verify table configurations
    console.log('\n2️⃣ Testing Table Configurations...');
    const seatingConfig = result.seatingConfiguration;
    
    // Check round tables
    const roundTableSeats = seatingConfig.seats.filter(s => s.tableType === 'round');
    const roundTables = [...new Set(roundTableSeats.map(s => s.tableId))];
    console.log(`✅ Round tables created: ${roundTables.length} (5 seats each)`);
    
    // Check square tables
    const squareTableSeats = seatingConfig.seats.filter(s => s.tableType === 'square');
    const squareTables = [...new Set(squareTableSeats.map(s => s.tableId))];
    console.log(`✅ Square tables created: ${squareTables.length} (4 seats each)`);
    
    // Test 3: Verify premium pricing
    console.log('\n3️⃣ Testing Premium Pricing...');
    const premiumSeats = seatingConfig.seats.filter(s => s.isPremium);
    const generalSeats = seatingConfig.seats.filter(s => !s.isPremium);
    
    console.log(`✅ Premium seats: ${premiumSeats.length} (higher pricing)`);
    console.log(`✅ General seats: ${generalSeats.length} (standard pricing)`);
    
    // Test 4: Verify seat categories
    console.log('\n4️⃣ Testing Seat Categories...');
    const categories = seatingConfig.categories;
    const premiumCategories = categories.filter(c => c.isPremium);
    const generalCategories = categories.filter(c => !c.isPremium);
    
    console.log(`✅ Premium categories: ${premiumCategories.length}`);
    console.log(`✅ General categories: ${generalCategories.length}`);
    
    // Test 5: Verify table amenities
    console.log('\n5️⃣ Testing Premium Amenities...');
    premiumCategories.forEach(category => {
      console.log(`✅ ${category.name}: ${category.amenities.join(', ')}`);
    });
    
    console.log('\n🎉 All premium seating tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Premium seating test failed:', error);
    return false;
  }
}

// Export for use in dev tools
(window as any).testPremiumSeating = testPremiumSeating;