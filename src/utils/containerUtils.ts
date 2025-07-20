/**
 * Container detection utilities for payment components
 * Prevents DOM timing race conditions by waiting for containers to be ready
 */

export interface ContainerWaitOptions {
  maxAttempts?: number;
  interval?: number;
  requiresRef?: boolean;
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
  const { maxAttempts = 10, interval = 100, requiresRef = false } = options;

  for (let i = 0; i < maxAttempts; i++) {
    const container = document.getElementById(containerId);
    const refReady = !requiresRef || (ref?.current && document.contains(ref.current));
    
    if (container && document.contains(container) && refReady) {
      return;
    }
    
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
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