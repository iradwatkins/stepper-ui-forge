// Test file to verify Square SDK initialization format

export async function testSquareInit() {
  console.log('=== Square SDK Initialization Test ===');
  
  // Test 1: Check if SDK is loaded
  if (!window.Square) {
    console.error('❌ Square SDK not loaded');
    return;
  }
  console.log('✅ Square SDK loaded');
  
  // Test 2: Check SDK version and methods
  console.log('Square object:', window.Square);
  console.log('Available methods:', Object.keys(window.Square));
  
  // Test 3: Try different initialization formats
  const appId = 'sq0idp-XG8irNWHf98C62-iqOwH6Q';
  const locationId = 'L0Q2YC1SPBGD8';
  
  // Format 1: Object with applicationId
  try {
    console.log('\nTesting Format 1: Object with applicationId...');
    const payments1 = window.Square.payments({
      applicationId: appId,
      locationId: locationId
    });
    console.log('✅ Format 1 successful:', payments1);
  } catch (error: any) {
    console.error('❌ Format 1 failed:', error.message);
  }
  
  // Format 2: Direct parameters (older format)
  try {
    console.log('\nTesting Format 2: Direct parameters...');
    const payments2 = window.Square.payments(appId, locationId);
    console.log('✅ Format 2 successful:', payments2);
  } catch (error: any) {
    console.error('❌ Format 2 failed:', error.message);
  }
  
  // Format 3: Check if we need to call a different method
  try {
    console.log('\nChecking for alternative initialization methods...');
    if (window.Square.init) {
      console.log('Found Square.init method');
    }
    if (window.Square.setup) {
      console.log('Found Square.setup method');
    }
    if (window.Square.configure) {
      console.log('Found Square.configure method');
    }
  } catch (error: any) {
    console.error('Error checking methods:', error);
  }
  
  // Test 4: Validate the application ID format
  console.log('\n=== Application ID Validation ===');
  console.log('App ID:', appId);
  console.log('Length:', appId.length);
  console.log('Starts with sq0idp-:', appId.startsWith('sq0idp-'));
  console.log('Contains spaces:', appId.includes(' '));
  console.log('Contains special chars:', /[^a-zA-Z0-9\-_]/.test(appId));
  
  // Test 5: Try with trimmed values
  try {
    console.log('\nTesting with trimmed values...');
    const payments3 = window.Square.payments({
      applicationId: appId.trim(),
      locationId: locationId.trim()
    });
    console.log('✅ Trimmed values successful:', payments3);
  } catch (error: any) {
    console.error('❌ Trimmed values failed:', error.message);
  }
}

declare global {
  interface Window {
    Square: any;
  }
}