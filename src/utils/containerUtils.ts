/**
 * Container detection utilities for payment components
 * Prevents DOM timing race conditions by waiting for containers to be ready
 */

export interface ContainerWaitOptions {
  maxAttempts?: number;
  interval?: number;
  requiresRef?: boolean;
  requireSize?: boolean;
}

/**
 * Wait for a single container to be ready in DOM
 * @param containerId - The ID of the container element
 * @param ref - Optional React ref for additional validation
 * @param options - Configuration options
 */
export const waitForContainer = async (
  containerId: string,
  ref?: React.RefObject<HTMLElement> | null,
  options: ContainerWaitOptions = {}
): Promise<void> => {
  const { maxAttempts = 30, interval = 100, requiresRef = false, requireSize = true } = options;

  console.log(`[waitForContainer] Starting search for #${containerId}`);

  for (let i = 0; i < maxAttempts; i++) {
    const container = document.getElementById(containerId);
    const refReady = !requiresRef || (ref?.current && document.contains(ref.current));
    
    if (container) {
      // Check if container is in DOM
      if (!document.body.contains(container)) {
        console.log(`[waitForContainer] Container found but not in DOM body, attempt ${i + 1}`);
        await new Promise(resolve => setTimeout(resolve, interval));
        continue;
      }

      // Check if container has size
      if (requireSize) {
        const rect = container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          console.log(`[waitForContainer] Container has no size (${rect.width}x${rect.height}), attempt ${i + 1}`);
          await new Promise(resolve => setTimeout(resolve, interval));
          continue;
        }
      }

      // Check ref if required
      if (requiresRef && !refReady) {
        console.log(`[waitForContainer] Ref not ready, attempt ${i + 1}`);
        await new Promise(resolve => setTimeout(resolve, interval));
        continue;
      }

      console.log(`[waitForContainer] Container #${containerId} ready after ${i + 1} attempts`);
      return;
    }
    
    if (i % 5 === 0) {
      console.log(`[waitForContainer] Still searching for #${containerId}, attempt ${i + 1}/${maxAttempts}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  // Log final state
  const finalCheck = document.getElementById(containerId);
  console.error(`[waitForContainer] Failed to find container #${containerId}:`, {
    exists: !!finalCheck,
    inDOM: finalCheck ? document.body.contains(finalCheck) : false,
    hasRef: !!ref?.current,
    refInDOM: ref?.current ? document.body.contains(ref.current) : false
  });
  
  throw new Error(`Container #${containerId} not found after ${maxAttempts} attempts`);
};

/**
 * Wait for any of multiple containers to be ready in DOM
 * @param containerIds - Array of container IDs to check
 * @param options - Configuration options
 * @returns The ID of the first container found
 */
export const waitForAnyContainer = async (
  containerIds: string[],
  options: ContainerWaitOptions = {}
): Promise<string> => {
  const { maxAttempts = 10, interval = 100 } = options;

  for (let i = 0; i < maxAttempts; i++) {
    for (const id of containerIds) {
      const element = document.getElementById(id);
      if (element && document.contains(element)) {
        return id;
      }
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`No valid container found from [${containerIds.join(', ')}] after ${maxAttempts} attempts`);
};

/**
 * Payment-specific container detection for Square components
 * @param ref - React ref for the container
 */
export const waitForSquareContainer = async (
  ref?: React.RefObject<HTMLDivElement> | null
): Promise<void> => {
  return waitForContainer('square-card-container', ref, {
    maxAttempts: 10,
    interval: 100,
    requiresRef: true
  });
};

/**
 * Payment-specific container detection for CashApp components
 * @param ref - React ref for the container
 */
export const waitForCashAppContainer = async (
  ref?: React.RefObject<HTMLDivElement> | null
): Promise<void> => {
  return waitForContainer('cash-app-pay-container', ref, {
    maxAttempts: 10,
    interval: 100,
    requiresRef: true
  });
};

/**
 * Detect browser extension interference
 */
export const detectBrowserExtensions = (): { hasExtensions: boolean; message?: string } => {
  try {
    // Check for extension-injected elements
    const suspiciousElements = document.querySelectorAll('[id*="extension"], [class*="extension"]');
    
    // Check for extension messages in console errors
    const hasExtensionError = !!(window as any).__extensionError;
    
    // Check for common extension global variables
    const extensionGlobals = [
      'chrome.runtime',
      '__REACT_DEVTOOLS_GLOBAL_HOOK__',
      '__REDUX_DEVTOOLS_EXTENSION__'
    ];
    
    const hasExtensionGlobal = extensionGlobals.some(path => {
      try {
        const parts = path.split('.');
        let obj: any = window;
        for (const part of parts) {
          obj = obj[part];
          if (!obj) return false;
        }
        return true;
      } catch {
        return false;
      }
    });

    if (suspiciousElements.length > 0 || hasExtensionError || hasExtensionGlobal) {
      return {
        hasExtensions: true,
        message: 'Browser extensions detected. Some extensions may interfere with payment processing. Try disabling extensions or using incognito mode.'
      };
    }

    return { hasExtensions: false };
  } catch (error) {
    console.warn('[detectBrowserExtensions] Error detecting extensions:', error);
    return { hasExtensions: false };
  }
};