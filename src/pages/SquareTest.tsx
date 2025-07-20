import React, { useLayoutEffect, useRef } from 'react';

declare global {
  interface Window {
    Square: any;
  }
}

export default function SquareTest() {
  const cardRef = useRef<any>(null);
  const hasInitialized = useRef(false);

  useLayoutEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initSquare = async () => {
      try {
        console.log('[SquareTest] Window.Square:', !!window.Square);
        
        if (!window.Square) {
          document.getElementById('status')!.innerHTML = 
            '<div style="color: red;">Square.js not loaded! Check network tab.</div>';
          return;
        }

        const payments = window.Square.payments(
          import.meta.env.VITE_SQUARE_APP_ID || 'sq0idp-XG8irNWHf98C62-iqOwH6Q',
          import.meta.env.VITE_SQUARE_LOCATION_ID || 'L0Q2YC1SPBGD8'
        );
        
        const card = await payments.card();
        await card.attach('#test-card-container');
        
        cardRef.current = card;
        
        document.getElementById('status')!.innerHTML = 
          '<div style="color: green;">✅ Square loaded successfully!</div>';
        
        const button = document.getElementById('test-pay-button');
        if (button) button.removeAttribute('disabled');
        
      } catch (error) {
        console.error('[SquareTest] Error:', error);
        document.getElementById('status')!.innerHTML = 
          `<div style="color: red;">Error: ${error}</div>`;
      }
    };

    // Run immediately
    initSquare();

    return () => {
      if (cardRef.current?.destroy) {
        cardRef.current.destroy();
      }
    };
  }, []);

  const handlePayment = async () => {
    if (!cardRef.current) return;
    
    const result = await cardRef.current.tokenize();
    if (result.status === 'OK') {
      alert('Success! Token: ' + result.token);
    } else {
      alert('Error: ' + result.errors[0].message);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '500px', margin: '0 auto' }}>
      <h1>Square Payment Test</h1>
      
      <div id="status" style={{ marginBottom: '20px' }}>
        <div>Loading...</div>
      </div>
      
      <div 
        id="test-card-container" 
        style={{ 
          minHeight: '120px',
          border: '2px solid #ddd',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
          backgroundColor: '#f9f9f9'
        }}
      />
      
      <button 
        id="test-pay-button"
        onClick={handlePayment}
        disabled
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '18px',
          backgroundColor: '#006aff',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        Test Payment
      </button>
      
      <div style={{ marginTop: '40px', fontSize: '14px', color: '#666' }}>
        <h3>Debug Info:</h3>
        <p>Square.js loaded: {typeof window.Square !== 'undefined' ? 'YES' : 'NO'}</p>
        <p>App ID: {import.meta.env.VITE_SQUARE_APP_ID?.substring(0, 20)}...</p>
        <p>Environment: {import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox'}</p>
      </div>
    </div>
  );
}