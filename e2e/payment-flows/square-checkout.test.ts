// Square Checkout E2E Tests
// End-to-end testing for Square payment integration

import { test, expect, Page, Browser } from '@playwright/test';

// Mock Square Web SDK responses
const mockSquareSDK = {
  payments: (applicationId: string, locationId: string) => ({
    card: () => ({
      attach: async (selector: string) => {
        console.log(`Mock Square card attached to ${selector}`);
      },
      tokenize: async () => ({
        status: 'OK',
        token: 'cnon:mock-card-nonce-ok'
      })
    }),
    cashApp: () => ({
      attach: async (selector: string) => {
        console.log(`Mock Square Cash App attached to ${selector}`);
      },
      tokenize: async () => ({
        status: 'OK',
        token: 'cnon:mock-cashapp-nonce-ok'
      })
    })
  })
};

test.describe('Square Checkout Flow', () => {
  let mockPaymentProcessed = false;
  let lastPaymentData: any = null;

  test.beforeEach(async ({ page }) => {
    // Reset test state
    mockPaymentProcessed = false;
    lastPaymentData = null;

    // Mock Square Web SDK
    await page.addInitScript(() => {
      // @ts-ignore
      window.Square = {
        payments: (applicationId: string, locationId: string) => ({
          card: () => ({
            attach: async (selector: string) => {
              console.log(`Square card attached to ${selector}`);
              return true;
            },
            tokenize: async () => {
              console.log('Square card tokenize called');
              return {
                status: 'OK',
                token: 'cnon:mock-card-nonce-ok'
              };
            }
          }),
          cashApp: () => ({
            attach: async (selector: string) => {
              console.log(`Square Cash App attached to ${selector}`);
              return true;
            },
            tokenize: async () => {
              console.log('Square Cash App tokenize called');
              return {
                status: 'OK',
                token: 'cnon:mock-cashapp-nonce-ok'
              };
            }
          })
        })
      };
    });

    // Intercept Square API calls
    await page.route('**/v2/**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();
      
      console.log(`Intercepted Square API call: ${method} ${url}`);
      
      if (url.includes('/v2/payments') && method === 'POST') {
        const postData = JSON.parse(route.request().postData() || '{}');
        lastPaymentData = postData;
        mockPaymentProcessed = true;
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            payment: {
              id: 'sq-payment-mock-123',
              status: 'COMPLETED',
              amount_money: {
                amount: Math.round((postData.amount_money?.amount || 2500)),
                currency: 'USD'
              },
              created_at: new Date().toISOString(),
              location_id: 'mock-location-id',
              order_id: postData.order_id,
              source_type: 'CARD'
            }
          })
        });
      } else if (url.includes('/v2/locations') && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            locations: [{
              id: 'mock-location-id',
              name: 'Mock Location'
            }]
          })
        });
      } else {
        await route.continue();
      }
    });

    // Navigate to the application
    await page.goto('/');
  });

  test('should complete Square payment flow successfully', async ({ page }) => {
    // Navigate to an event and add to cart
    await page.click('[data-testid="event-card"]:first-child .add-to-cart, .event-item:first-child .add-to-cart, text="Add to Cart"');
    
    // Go to cart
    await page.click('[data-testid="cart-button"], .cart-button, text="Cart"');
    
    // Proceed to checkout
    await page.click('text="Checkout", [data-testid="checkout-button"]');
    
    // Wait for checkout modal
    await expect(page.locator('.checkout-modal, [data-testid="checkout-modal"]')).toBeVisible();
    
    // Select Square payment method
    await page.click('input[value="square"], #square');
    await expect(page.locator('input[value="square"]')).toBeChecked();
    
    // Fill customer information
    await page.fill('input[name="firstName"], #firstName', 'John');
    await page.fill('input[name="lastName"], #lastName', 'Doe');
    await page.fill('input[name="email"], #email', 'john.doe@example.com');
    
    // Complete checkout (this will trigger Square processing)
    await page.click('text="Complete Purchase", [data-testid="complete-purchase"]');
    
    // Wait for processing state
    await expect(page.locator('text="Processing", text="Navigating"')).toBeVisible();
    
    // Wait for success state
    await expect(page.locator('text="Payment Successful", text="Purchase Complete"')).toBeVisible();
    
    // Verify payment was processed
    expect(mockPaymentProcessed).toBe(true);
    expect(lastPaymentData).toBeTruthy();
    expect(lastPaymentData.source_id).toBe('cnon:mock-card-nonce-ok');
  });

  test('should handle Square payment errors gracefully', async ({ page }) => {
    // Mock Square API to return error
    await page.route('**/v2/payments', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            errors: [{
              code: 'CARD_DECLINED',
              detail: 'The card was declined.',
              category: 'PAYMENT_METHOD_ERROR'
            }]
          })
        });
      } else {
        await route.continue();
      }
    });

    // Navigate to checkout
    await page.click('[data-testid="event-card"]:first-child .add-to-cart, .event-item:first-child .add-to-cart, text="Add to Cart"');
    await page.click('[data-testid="cart-button"], .cart-button, text="Cart"');
    await page.click('text="Checkout", [data-testid="checkout-button"]');
    
    // Select Square and fill info
    await page.click('input[value="square"]');
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[name="email"]', 'john.doe@example.com');
    
    // Complete checkout
    await page.click('text="Complete Purchase"');
    
    // Should show error message
    await expect(page.locator('text="Card was declined", text="declined"')).toBeVisible();
    
    // Should stay on checkout page for retry
    await expect(page.locator('.checkout-modal')).toBeVisible();
  });

  test('should validate required fields before Square payment', async ({ page }) => {
    // Navigate to checkout
    await page.click('[data-testid="event-card"]:first-child .add-to-cart, .event-item:first-child .add-to-cart, text="Add to Cart"');
    await page.click('[data-testid="cart-button"], .cart-button, text="Cart"');
    await page.click('text="Checkout"');
    
    // Select Square
    await page.click('input[value="square"]');
    
    // Try to checkout without filling required fields
    await page.click('text="Complete Purchase"');
    
    // Should show validation errors
    await expect(page.locator('text="Missing Information", text="required"')).toBeVisible();
    
    // Complete Purchase button should be disabled or show error
    const button = page.locator('text="Complete Purchase"');
    await expect(button).toBeDisabled();
  });

  test('should show Square in payment options', async ({ page }) => {
    // Navigate to checkout
    await page.click('[data-testid="event-card"]:first-child .add-to-cart, .event-item:first-child .add-to-cart, text="Add to Cart"');
    await page.click('[data-testid="cart-button"], .cart-button, text="Cart"');
    await page.click('text="Checkout"');
    
    // Verify Square payment option exists
    await expect(page.locator('text="Square"')).toBeVisible();
    await expect(page.locator('input[value="square"]')).toBeVisible();
    
    // Verify other payment options exist
    await expect(page.locator('text="PayPal"')).toBeVisible();
    await expect(page.locator('text="Cash App"')).toBeVisible();
  });

  test('should handle Square SDK loading failure gracefully', async ({ page }) => {
    // Override Square SDK to simulate loading failure
    await page.addInitScript(() => {
      // @ts-ignore - Don't load Square SDK
      delete window.Square;
    });

    // Navigate to checkout
    await page.click('[data-testid="event-card"]:first-child .add-to-cart, .event-item:first-child .add-to-cart, text="Add to Cart"');
    await page.click('[data-testid="cart-button"], .cart-button, text="Cart"');
    await page.click('text="Checkout"');
    
    // Square should still be available as payment option
    await expect(page.locator('text="Square"')).toBeVisible();
    
    // Select Square
    await page.click('input[value="square"]');
    
    // Fill required fields
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[name="email"]', 'john.doe@example.com');
    
    // Complete Purchase button should be available (fallback handling)
    const button = page.locator('text="Complete Purchase"');
    await expect(button).toBeVisible();
  });

  test('should display Square processing fees correctly', async ({ page }) => {
    // Navigate to checkout
    await page.click('[data-testid="event-card"]:first-child .add-to-cart, .event-item:first-child .add-to-cart, text="Add to Cart"');
    await page.click('[data-testid="cart-button"], .cart-button, text="Cart"');
    await page.click('text="Checkout"');
    
    // Select Square
    await page.click('input[value="square"]');
    
    // Verify processing fee is displayed (3% standard fee)
    await expect(page.locator('text="Processing Fee"')).toBeVisible();
    
    // Check that total includes fees
    const total = await page.locator('.total, text="Total"').textContent();
    expect(total).toContain('$');
  });

  test('should handle mixed cart with Square payment', async ({ page }) => {
    // Add multiple items to cart
    const eventCards = page.locator('[data-testid="event-card"], .event-item');
    const count = await eventCards.count();
    
    if (count > 1) {
      await eventCards.nth(0).locator('text="Add to Cart"').click();
      await eventCards.nth(1).locator('text="Add to Cart"').click();
    } else {
      // Add same item multiple times
      await eventCards.nth(0).locator('text="Add to Cart"').click();
      await eventCards.nth(0).locator('text="Add to Cart"').click();
    }
    
    // Go to checkout
    await page.click('[data-testid="cart-button"], text="Cart"');
    await page.click('text="Checkout"');
    
    // Select Square
    await page.click('input[value="square"]');
    
    // Fill info and checkout
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[name="email"]', 'john.doe@example.com');
    
    await page.click('text="Complete Purchase"');
    
    // Should process successfully
    await expect(page.locator('text="Payment Successful", text="Purchase Complete"')).toBeVisible();
    
    // Verify all items were included in payment
    expect(mockPaymentProcessed).toBe(true);
    expect(lastPaymentData?.amount_money?.amount).toBeGreaterThan(2500); // More than single item
  });
});