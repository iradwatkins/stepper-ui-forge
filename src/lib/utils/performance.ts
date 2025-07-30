/**
 * Performance monitoring utilities
 */

// Web Vitals monitoring
export const measureWebVitals = () => {
  if ('PerformanceObserver' in window) {
    // Measure Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log('LCP:', lastEntry.startTime);
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      // LCP not supported
    }

    // Measure First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          console.log('FID:', entry.processingStart - entry.startTime);
        });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      // FID not supported
    }

    // Measure Cumulative Layout Shift
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            console.log('CLS:', clsValue);
          }
        });
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      // CLS not supported
    }
  }
};

// Resource loading performance
export const measureResourceTiming = () => {
  if ('performance' in window && 'getEntriesByType' in performance) {
    const resources = performance.getEntriesByType('resource');
    const slowResources = resources
      .filter(r => r.duration > 500)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);
    
    console.log('Slow resources:', slowResources.map(r => ({
      name: r.name,
      duration: Math.round(r.duration),
      size: (r as any).transferSize || 0,
      type: (r as any).initiatorType
    })));
  }
};

// Bundle size tracking
export const trackBundleSize = () => {
  if ('performance' in window && 'getEntriesByType' in performance) {
    const navigation = performance.getEntriesByType('navigation')[0] as any;
    const totalSize = navigation.transferSize || 0;
    const compressedSize = navigation.encodedBodySize || 0;
    
    console.log('Page metrics:', {
      totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
      compressedSize: `${(compressedSize / 1024).toFixed(2)} KB`,
      domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart),
      fullyLoaded: Math.round(navigation.loadEventEnd - navigation.loadEventStart)
    });
  }
};

// Initialize performance monitoring
export const initPerformanceMonitoring = () => {
  if (typeof window !== 'undefined') {
    // Wait for page load
    if (document.readyState === 'complete') {
      measureWebVitals();
      measureResourceTiming();
      trackBundleSize();
    } else {
      window.addEventListener('load', () => {
        measureWebVitals();
        setTimeout(() => {
          measureResourceTiming();
          trackBundleSize();
        }, 1000);
      });
    }
  }
};