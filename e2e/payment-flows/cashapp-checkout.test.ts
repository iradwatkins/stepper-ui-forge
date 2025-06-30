/**
 * End-to-End Tests for Cash App Payment Flow
 * 
 * These tests verify the complete Cash App Pay integration in the checkout flow.
 * They test the user journey from ticket selection through Cash App payment completion.
 * 
 * Prerequisites:
 * - Development server running on localhost:5173
 * - Cash App Pay sandbox environment configured
 * - Test event data available
 * 
 * To run these tests:
 * 1. Install Playwright: npm install -D @playwright/test
 * 2. Configure playwright.config.ts
 * 3. Run: npx playwright test e2e/payment-flows/cashapp-checkout.test.ts
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const TEST_CONFIG = {
  baseURL: 'http://localhost:5173',
  timeout: 30000,
  testEvent: {
    name: 'E2E Test Event',
    ticketPrice: 25.00,
    quantity: 2,
  },
};

// Helper functions
async function navigateToTicketSelection(page: Page) {
  await page.goto(TEST_CONFIG.baseURL);
  
  // Navigate to events and select a test event
  await page.click('[data-testid="events-nav"]');
  await page.waitForSelector('[data-testid="event-card"]');
  await page.click('[data-testid="event-card"]:first-child');
  
  // Wait for event details page
  await page.waitForSelector('[data-testid="ticket-selector"]');
}

async function addTicketsToCart(page: Page, quantity: number = 2) {
  // Select ticket quantity
  const quantitySelector = page.locator('[data-testid="quantity-selector"]');
  await quantitySelector.selectOption(quantity.toString());
  
  // Add to cart
  await page.click('[data-testid="add-to-cart-btn"]');
  
  // Verify cart update
  const cartBadge = page.locator('[data-testid="cart-badge"]');
  await expect(cartBadge).toContainText(quantity.toString());
}

async function proceedToCheckout(page: Page) {
  // Open cart
  await page.click('[data-testid="cart-button"]');
  await page.waitForSelector('[data-testid="cart-drawer"]');
  
  // Proceed to checkout
  await page.click('[data-testid="checkout-btn"]');
  await page.waitForSelector('[data-testid="checkout-modal"]');
}

async function selectCashAppPayment(page: Page) {
  // Wait for payment methods to load
  await page.waitForSelector('[data-testid="payment-methods"]');
  
  // Select Cash App Pay
  const cashAppOption = page.locator('[data-testid="payment-method-cashapp"]');
  await expect(cashAppOption).toBeVisible();
  await cashAppOption.click();
  
  // Verify Cash App Pay is selected
  await expect(cashAppOption).toHaveClass(/selected|active/);
}

describe('Cash App Pay E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for payment tests
    test.setTimeout(TEST_CONFIG.timeout);
    
    // Mock Square Web SDK for testing environment
    await page.addInitScript(() => {
      (window as any).Square = {
        payments: () => ({
          cashAppPay: async () => ({
            attach: async () => {},
            addEventListener: (event: string, callback: Function) => {
              // Mock successful tokenization after 2 seconds
              if (event === 'ontokenization') {
                setTimeout(() => {
                  callback({
                    detail: {
                      tokenResult: {
                        status: 'OK',
                        token: 'mock-cashapp-token-' + Date.now(),
                      },
                    },
                  });
                }, 2000);
              }
            },
          }),
        }),
      };
    });
  });

  test('should complete Cash App Pay checkout flow successfully', async ({ page }) => {
    // Step 1: Navigate to ticket selection
    await navigateToTicketSelection(page);
    
    // Step 2: Add tickets to cart
    await addTicketsToCart(page, TEST_CONFIG.testEvent.quantity);
    
    // Step 3: Proceed to checkout
    await proceedToCheckout(page);
    
    // Step 4: Select Cash App Pay
    await selectCashAppPayment(page);
    
    // Step 5: Verify Cash App Pay button is rendered
    const cashAppButton = page.locator('[data-testid="cashapp-pay-button"]');
    await expect(cashAppButton).toBeVisible();
    
    // Step 6: Click Cash App Pay button
    await cashAppButton.click();
    
    // Step 7: Wait for Cash App Pay processing
    await page.waitForSelector('[data-testid="payment-processing"]', { timeout: 5000 });
    
    // Step 8: Verify payment success
    await page.waitForSelector('[data-testid="payment-success"]', { timeout: 10000 });
    const successMessage = page.locator('[data-testid="payment-success-message"]');
    await expect(successMessage).toContainText('Payment Successful');
    
    // Step 9: Verify transaction details
    const transactionId = page.locator('[data-testid="transaction-id"]');
    await expect(transactionId).toBeVisible();
    await expect(transactionId).toContainText('cashapp-');
    
    // Step 10: Verify cart is cleared
    const cartBadge = page.locator('[data-testid="cart-badge"]');
    await expect(cartBadge).not.toBeVisible();
  });

  test('should handle Cash App Pay initialization errors', async ({ page }) => {
    // Mock Square SDK failure
    await page.addInitScript(() => {
      (window as any).Square = undefined;
    });
    
    await navigateToTicketSelection(page);
    await addTicketsToCart(page);
    await proceedToCheckout(page);
    
    // Cash App option should be disabled or show error
    const cashAppOption = page.locator('[data-testid="payment-method-cashapp"]');
    await expect(cashAppOption).toHaveAttribute('disabled', '');
    
    // Error message should be displayed
    const errorMessage = page.locator('[data-testid="cashapp-error"]');
    await expect(errorMessage).toContainText('Cash App Pay is not available');
  });

  test('should handle Cash App Pay tokenization failures', async ({ page }) => {
    // Mock tokenization failure
    await page.addInitScript(() => {
      (window as any).Square = {
        payments: () => ({
          cashAppPay: async () => ({
            attach: async () => {},
            addEventListener: (event: string, callback: Function) => {
              if (event === 'ontokenization') {
                setTimeout(() => {
                  callback({
                    detail: {
                      tokenResult: {
                        status: 'ERROR',
                        errors: [{ message: 'Payment was declined' }],
                      },
                    },
                  });
                }, 2000);
              }
            },
          }),
        }),
      };
    });
    
    await navigateToTicketSelection(page);
    await addTicketsToCart(page);
    await proceedToCheckout(page);
    await selectCashAppPayment(page);
    
    const cashAppButton = page.locator('[data-testid="cashapp-pay-button"]');
    await cashAppButton.click();
    
    // Should show error message
    await page.waitForSelector('[data-testid="payment-error"]', { timeout: 5000 });
    const errorMessage = page.locator('[data-testid="payment-error-message"]');
    await expect(errorMessage).toContainText('Payment was declined');
    
    // Cart should still contain items
    const cartBadge = page.locator('[data-testid="cart-badge"]');
    await expect(cartBadge).toContainText(TEST_CONFIG.testEvent.quantity.toString());
  });

  test('should validate payment amount before processing', async ({ page }) => {
    await navigateToTicketSelection(page);
    await addTicketsToCart(page, 3); // Add 3 tickets
    await proceedToCheckout(page);
    
    // Verify total amount displayed
    const totalAmount = page.locator('[data-testid="checkout-total"]');
    const expectedTotal = (TEST_CONFIG.testEvent.ticketPrice * 3).toFixed(2);
    await expect(totalAmount).toContainText(`$${expectedTotal}`);
    
    await selectCashAppPayment(page);
    
    // Verify Cash App Pay shows correct amount
    const cashAppAmount = page.locator('[data-testid="cashapp-amount"]');
    await expect(cashAppAmount).toContainText(`$${expectedTotal}`);
  });

  test('should handle Cash App Pay cancellation', async ({ page }) => {
    // Mock user cancellation
    await page.addInitScript(() => {
      (window as any).Square = {
        payments: () => ({
          cashAppPay: async () => ({
            attach: async () => {},
            addEventListener: (event: string, callback: Function) => {
              if (event === 'ontokenization') {
                setTimeout(() => {
                  callback({
                    detail: {
                      tokenResult: {
                        status: 'CANCEL',
                      },
                    },
                  });
                }, 2000);
              }
            },
          }),
        }),
      };
    });
    
    await navigateToTicketSelection(page);
    await addTicketsToCart(page);
    await proceedToCheckout(page);
    await selectCashAppPayment(page);
    
    const cashAppButton = page.locator('[data-testid="cashapp-pay-button"]');
    await cashAppButton.click();
    
    // Should return to payment selection
    await page.waitForSelector('[data-testid="payment-cancelled"]', { timeout: 5000 });
    
    // Should allow user to try again
    const retryButton = page.locator('[data-testid="retry-payment-btn"]');
    await expect(retryButton).toBeVisible();
    
    // Cart should still contain items
    const cartBadge = page.locator('[data-testid="cart-badge"]');
    await expect(cartBadge).toContainText(TEST_CONFIG.testEvent.quantity.toString());
  });

  test('should display Cash App Pay branding correctly', async ({ page }) => {
    await navigateToTicketSelection(page);
    await addTicketsToCart(page);
    await proceedToCheckout(page);
    
    // Verify Cash App Pay option is properly branded
    const cashAppOption = page.locator('[data-testid="payment-method-cashapp"]');
    await expect(cashAppOption).toBeVisible();
    
    // Check for Cash App Pay logo/icon
    const cashAppLogo = cashAppOption.locator('[data-testid="cashapp-logo"]');
    await expect(cashAppLogo).toBeVisible();
    
    // Check for proper text
    await expect(cashAppOption).toContainText('Cash App Pay');
    await expect(cashAppOption).toContainText('Pay instantly with your Cash App');
    
    // Select Cash App and verify button styling
    await cashAppOption.click();
    
    const cashAppButton = page.locator('[data-testid="cashapp-pay-button"]');
    await expect(cashAppButton).toBeVisible();
    await expect(cashAppButton).toHaveCSS('background-color', /.+/); // Verify custom styling
  });

  test('should handle mobile responsive Cash App Pay flow', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-specific test');
    
    await navigateToTicketSelection(page);
    await addTicketsToCart(page);
    await proceedToCheckout(page);
    
    // Verify mobile-optimized layout
    const checkoutModal = page.locator('[data-testid="checkout-modal"]');
    await expect(checkoutModal).toHaveCSS('width', /.+/);
    
    await selectCashAppPayment(page);
    
    // Verify Cash App Pay button is touch-friendly
    const cashAppButton = page.locator('[data-testid="cashapp-pay-button"]');
    await expect(cashAppButton).toBeVisible();
    
    // Test touch interaction
    await cashAppButton.tap();
    
    // Should work the same as desktop
    await page.waitForSelector('[data-testid="payment-processing"]', { timeout: 5000 });
  });

  test('should integrate with existing error handling', async ({ page }) => {
    // Mock server error during payment processing
    await page.route('**/api/payments/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error',
          code: 'SERVER_ERROR'
        })
      });
    });
    
    await navigateToTicketSelection(page);
    await addTicketsToCart(page);
    await proceedToCheckout(page);
    await selectCashAppPayment(page);
    
    const cashAppButton = page.locator('[data-testid="cashapp-pay-button"]');
    await cashAppButton.click();
    
    // Should show generic error message
    await page.waitForSelector('[data-testid="payment-error"]', { timeout: 10000 });
    const errorMessage = page.locator('[data-testid="payment-error-message"]');
    await expect(errorMessage).toContainText('payment failed');
    
    // Should offer retry option
    const retryButton = page.locator('[data-testid="retry-payment-btn"]');
    await expect(retryButton).toBeVisible();
  });
});