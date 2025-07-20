/**
 * Payment System Diagnostic Tool
 * Run this to check for conflicts and validate your payment setup
 */

export const runPaymentDiagnostic = () => {
  console.group('🔍 === Square Payment System Diagnostic ===');
  
  // Check for conflicting SDKs
  console.group('SDK Status:');
  console.log('✅ Square SDK loaded:', !!(window as any).Square);
  console.log('❌ Cash App SDK loaded:', !!(window as any).CashApp, 
    (window as any).CashApp ? '⚠️ THIS SHOULD BE REMOVED!' : '✅ Good - not loaded');
  console.groupEnd();
  
  // Find all payment-related scripts
  console.group('Script Analysis:');
  const scripts = document.querySelectorAll('script');
  let hasConflicts = false;
  
  scripts.forEach(script => {
    if (script.src.includes('cash.app') || script.src.includes('pay.js')) {
      console.error('❌ CONFLICT: Cash App SDK found:', script.src);
      console.log('   This script should be removed!');
      hasConflicts = true;
    }
    if (script.src.includes('square.js')) {
      console.log('✅ Square SDK found:', script.src);
    }
  });
  
  if (!hasConflicts) {
    console.log('✅ No conflicting scripts found');
  }
  console.groupEnd();
  
  // Check for duplicate containers
  console.group('Payment Containers:');
  const containers = document.querySelectorAll('[id*="card"], [id*="cash"], [id*="square"]');
  console.log('Total containers found:', containers.length);
  containers.forEach(c => console.log(`- ${c.id} (${c.className})`));
  console.groupEnd();
  
  // Check environment configuration
  console.group('Environment Configuration:');
  console.log('Square App ID:', import.meta.env.VITE_SQUARE_APP_ID ? '✅ Set' : '❌ Missing');
  console.log('Square Location ID:', import.meta.env.VITE_SQUARE_LOCATION_ID ? '✅ Set' : '❌ Missing');
  console.log('Square Environment:', import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox');
  console.log('Cash App uses Square ID:', '✅ Yes (no separate client ID needed)');
  console.groupEnd();
  
  // Check for global payment managers
  console.group('Payment Managers:');
  console.log('paymentManager:', !!(window as any).paymentManager);
  console.log('unifiedPaymentManager:', !!(window as any).unifiedPaymentManager);
  console.groupEnd();
  
  // Recommendations
  console.group('📋 Recommendations:');
  if ((window as any).CashApp) {
    console.warn('1. Remove all references to Cash App SDK (kit.cash.app)');
  }
  if (!import.meta.env.VITE_SQUARE_APP_ID) {
    console.warn('2. Set VITE_SQUARE_APP_ID in your .env file');
  }
  if (!import.meta.env.VITE_SQUARE_LOCATION_ID) {
    console.warn('3. Set VITE_SQUARE_LOCATION_ID in your .env file');
  }
  console.log('4. Use Square Application ID for both card and Cash App payments');
  console.log('5. Ensure each payment container has a unique ID');
  console.groupEnd();
  
  console.groupEnd();
};

// Auto-run in development
if (import.meta.env.DEV) {
  // Run diagnostic after page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runPaymentDiagnostic);
  } else {
    // DOM already loaded
    setTimeout(runPaymentDiagnostic, 1000);
  }
}

// Export for manual use
export default runPaymentDiagnostic;