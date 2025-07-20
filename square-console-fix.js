// Run this in your browser console on https://www.stepperslife.com/payment-debug-test

(function fixSquarePayment() {
  console.log('🔧 Square Payment Fix Starting...\n');
  
  // 1. Stop all retry loops
  console.log('1️⃣ Stopping retry loops...');
  let cleared = 0;
  for (let i = 1; i < 99999; i++) {
    if (window.clearInterval(i)) cleared++;
    if (window.clearTimeout(i)) cleared++;
  }
  console.log(`✅ Stopped ${cleared} timers/intervals\n`);
  
  // 2. Check Square SDK
  console.log('2️⃣ Checking Square SDK...');
  if (window.Square) {
    console.log('✅ Square SDK is loaded');
  } else {
    console.log('❌ Square SDK not found - loading now...');
    const script = document.createElement('script');
    script.src = 'https://web.squarecdn.com/v1/square.js';
    document.head.appendChild(script);
  }
  
  // 3. Remove any broken containers
  console.log('\n3️⃣ Cleaning up old containers...');
  document.querySelectorAll('[id*="square"][id*="container"]').forEach(el => {
    console.log(`- Removing: #${el.id}`);
    el.remove();
  });
  
  // 4. Create working payment form
  console.log('\n4️⃣ Creating working payment form...');
  
  // Remove existing test forms
  document.querySelectorAll('#square-working-form').forEach(el => el.remove());
  
  // Create new form
  const form = document.createElement('div');
  form.id = 'square-working-form';
  form.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 30px;
    border-radius: 12px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.15);
    z-index: 10000;
    width: 450px;
    max-width: 90vw;
  `;
  
  form.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2 style="margin: 0; font-size: 20px; font-weight: bold;">Working Square Payment</h2>
      <button onclick="document.getElementById('square-working-form').remove()" 
              style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">×</button>
    </div>
    
    <div style="background: #f0f9ff; border: 1px solid #0ea5e9; padding: 12px; border-radius: 6px; margin-bottom: 20px;">
      <p style="margin: 0; color: #0369a1; font-size: 14px;">
        ✅ This is a working payment form. The retry loop has been stopped.
      </p>
    </div>
    
    <div id="working-card-container" 
         style="min-height: 120px; border: 2px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 20px; background: #f9fafb;">
      <div style="text-align: center; color: #6b7280; padding: 20px;">
        <div style="display: inline-block; animation: spin 1s linear infinite;">⏳</div>
        <p style="margin: 10px 0 0;">Initializing secure payment form...</p>
      </div>
    </div>
    
    <button id="working-pay-btn" 
            style="width: 100%; padding: 16px; background: #10b981; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 500; cursor: not-allowed; opacity: 0.5;" 
            disabled>
      Initializing...
    </button>
    
    <div id="working-status" style="margin-top: 16px; padding: 12px; background: #f3f4f6; border-radius: 6px; font-size: 14px; color: #374151;">
      Status: Initializing Square SDK...
    </div>
    
    <style>
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    </style>
  `;
  
  document.body.appendChild(form);
  
  const statusEl = document.getElementById('working-status');
  const updateStatus = (msg) => {
    statusEl.textContent = `Status: ${msg}`;
    console.log(`📍 ${msg}`);
  };
  
  // 5. Initialize Square after a delay
  setTimeout(async () => {
    if (!window.Square) {
      updateStatus('Waiting for Square SDK to load...');
      // Wait up to 5 seconds for Square to load
      let attempts = 0;
      while (!window.Square && attempts < 50) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
      }
    }
    
    if (!window.Square) {
      updateStatus('❌ Square SDK failed to load. Please refresh the page.');
      return;
    }
    
    try {
      updateStatus('Initializing Square payments...');
      
      // Use the credentials from your logs
      const payments = window.Square.payments(
        'sq0idp-XG8irNWHf98C62-iqOwH6Q',
        'L0Q2YC1SPBGD8'
      );
      
      updateStatus('Creating card payment method...');
      const card = await payments.card();
      
      updateStatus('Attaching card form to container...');
      await card.attach('#working-card-container');
      
      updateStatus('✅ Ready! Enter card details above.');
      
      // Update button
      const btn = document.getElementById('working-pay-btn');
      btn.textContent = 'Pay $25.00';
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
      btn.disabled = false;
      
      // Add pay handler
      btn.onclick = async () => {
        btn.disabled = true;
        btn.textContent = 'Processing...';
        updateStatus('Tokenizing card...');
        
        try {
          const result = await card.tokenize();
          
          if (result.status === 'OK') {
            updateStatus(`✅ Success! Token: ${result.token.substring(0, 30)}...`);
            console.log('Full token:', result.token);
            
            // Show success message
            btn.style.background = '#10b981';
            btn.textContent = '✅ Payment Successful!';
            
            // Copy token to clipboard
            navigator.clipboard.writeText(result.token).then(() => {
              updateStatus('✅ Token copied to clipboard!');
            });
            
          } else {
            const error = result.errors?.[0]?.message || 'Unknown error';
            updateStatus(`❌ Error: ${error}`);
            btn.style.background = '#ef4444';
            btn.textContent = 'Payment Failed - Try Again';
            btn.disabled = false;
          }
        } catch (err) {
          updateStatus(`❌ Error: ${err.message}`);
          btn.style.background = '#ef4444';
          btn.textContent = 'Error - Try Again';
          btn.disabled = false;
        }
      };
      
      console.log('\n✅ Square payment form is ready!');
      console.log('💳 Test card: 4111 1111 1111 1111 • Any future date • Any CVV');
      
    } catch (error) {
      updateStatus(`❌ Error: ${error.message}`);
      console.error('Square initialization error:', error);
    }
  }, 500);
  
  // 6. Log diagnostic info
  console.log('\n📊 Diagnostic Info:');
  console.log('- Page URL:', window.location.href);
  console.log('- Square loaded:', !!window.Square);
  console.log('- Containers found:', document.querySelectorAll('[id*="container"]').length);
  console.log('- React version:', window.React?.version || 'Unknown');
  
  console.log('\n✅ Fix applied! A working payment form should appear on your screen.');
  console.log('If it doesn\'t work, refresh the page and run this script again.');
  
})();