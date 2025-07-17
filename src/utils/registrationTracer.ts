/**
 * Registration Flow Tracer - Tracks network requests and browser events during registration
 */

interface TraceEvent {
  timestamp: string;
  type: string;
  data: any;
  url?: string;
  userAgent?: string;
}

class RegistrationTracer {
  private events: TraceEvent[] = [];
  private isTracing = false;
  private startTime: number = 0;

  startTracing() {
    console.log('🕵️ Registration Flow Tracer STARTED');
    this.isTracing = true;
    this.startTime = Date.now();
    this.events = [];

    // Clear previous logs
    this.clearPreviousLogs();

    // Log initial state
    this.trace('tracer_start', {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });

    // Set up network monitoring
    this.setupNetworkMonitoring();

    // Set up URL change monitoring
    this.setupURLMonitoring();

    // Set up error monitoring
    this.setupErrorMonitoring();

    // Set up performance monitoring
    this.setupPerformanceMonitoring();
  }

  private trace(type: string, data: any) {
    if (!this.isTracing) return;

    const event: TraceEvent = {
      timestamp: new Date().toISOString(),
      type,
      data,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    this.events.push(event);
    console.log(`🔍 [TRACE-${type.toUpperCase()}]`, event);

    // Store in localStorage for persistence
    try {
      const existingTraces = JSON.parse(localStorage.getItem('registration_traces') || '[]');
      existingTraces.push(event);
      localStorage.setItem('registration_traces', JSON.stringify(existingTraces.slice(-100)));
    } catch (e) {
      console.warn('Failed to store trace:', e);
    }
  }

  private setupNetworkMonitoring() {
    // Override fetch to monitor network requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = Date.now();
      const [resource, config] = args;
      
      this.trace('network_request_start', {
        url: resource.toString(),
        method: config?.method || 'GET',
        headers: config?.headers,
        body: config?.body ? 'present' : 'none'
      });

      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;

        this.trace('network_request_complete', {
          url: resource.toString(),
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          duration
        });

        // Check for Supabase auth responses
        if (resource.toString().includes('supabase') || resource.toString().includes('auth')) {
          try {
            const clonedResponse = response.clone();
            const responseText = await clonedResponse.text();
            
            this.trace('supabase_response', {
              url: resource.toString(),
              status: response.status,
              responseBody: responseText.substring(0, 1000), // First 1000 chars
              isAuthRelated: true
            });
          } catch (e) {
            this.trace('supabase_response_parse_error', {
              url: resource.toString(),
              error: e.message
            });
          }
        }

        return response;
      } catch (error) {
        this.trace('network_request_error', {
          url: resource.toString(),
          error: error.message,
          stack: error.stack
        });
        throw error;
      }
    };

    // Monitor XMLHttpRequests
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this._tracerData = { method, url, startTime: Date.now() };
      return originalXHROpen.call(this, method, url, ...args);
    };

    XMLHttpRequest.prototype.send = function(body) {
      if (this._tracerData) {
        (window as any).registrationTracer?.trace('xhr_request', {
          method: this._tracerData.method,
          url: this._tracerData.url,
          body: body ? 'present' : 'none'
        });

        this.addEventListener('load', () => {
          (window as any).registrationTracer?.trace('xhr_response', {
            url: this._tracerData.url,
            status: this.status,
            statusText: this.statusText,
            response: this.responseText.substring(0, 1000),
            duration: Date.now() - this._tracerData.startTime
          });
        });

        this.addEventListener('error', () => {
          (window as any).registrationTracer?.trace('xhr_error', {
            url: this._tracerData.url,
            status: this.status,
            statusText: this.statusText
          });
        });
      }

      return originalXHRSend.call(this, body);
    };
  }

  private setupURLMonitoring() {
    let lastUrl = window.location.href;

    const checkForURLChange = () => {
      if (window.location.href !== lastUrl) {
        this.trace('url_change', {
          from: lastUrl,
          to: window.location.href,
          search: window.location.search,
          hash: window.location.hash
        });

        // Check for error parameters
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        if (urlParams.get('error') || hashParams.get('error')) {
          this.trace('error_url_detected', {
            searchParams: Object.fromEntries(urlParams),
            hashParams: Object.fromEntries(hashParams),
            fullUrl: window.location.href
          });
        }

        lastUrl = window.location.href;
      }
    };

    // Check for URL changes every 100ms
    setInterval(checkForURLChange, 100);

    // Also listen for popstate events
    window.addEventListener('popstate', (event) => {
      this.trace('popstate_event', {
        url: window.location.href,
        state: event.state
      });
    });
  }

  private setupErrorMonitoring() {
    window.addEventListener('error', (event) => {
      this.trace('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trace('unhandled_promise_rejection', {
        reason: event.reason,
        promise: event.promise.toString()
      });
    });

    // Override console.error to catch logged errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      this.trace('console_error', {
        args: args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        )
      });
      return originalConsoleError.apply(console, args);
    };
  }

  private setupPerformanceMonitoring() {
    // Monitor performance entries
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              this.trace('navigation_timing', {
                name: entry.name,
                duration: entry.duration,
                loadEventEnd: entry.loadEventEnd,
                domContentLoadedEventEnd: entry.domContentLoadedEventEnd
              });
            }
          }
        });

        observer.observe({ entryTypes: ['navigation', 'resource'] });
      } catch (e) {
        console.warn('Performance monitoring not available:', e);
      }
    }
  }

  private clearPreviousLogs() {
    try {
      localStorage.removeItem('registration_traces');
      localStorage.removeItem('auth_test_logs');
    } catch (e) {
      console.warn('Could not clear previous logs:', e);
    }
  }

  exportTrace(): TraceEvent[] {
    const allEvents = JSON.parse(localStorage.getItem('registration_traces') || '[]');
    console.log('📊 COMPLETE REGISTRATION TRACE:', allEvents);
    
    // Create a comprehensive report
    const report = {
      testStartTime: new Date(this.startTime).toISOString(),
      duration: Date.now() - this.startTime,
      totalEvents: allEvents.length,
      events: allEvents,
      summary: this.generateSummary(allEvents)
    };

    console.log('📋 TRACE SUMMARY:', report.summary);
    return allEvents;
  }

  private generateSummary(events: TraceEvent[]) {
    const summary = {
      networkRequests: events.filter(e => e.type.includes('network')).length,
      errors: events.filter(e => e.type.includes('error')).length,
      urlChanges: events.filter(e => e.type === 'url_change').length,
      supabaseRequests: events.filter(e => e.type === 'supabase_response').length,
      hasErrors: events.some(e => e.type.includes('error')),
      hasNetworkFailures: events.some(e => e.type === 'network_request_error'),
      hasURLErrors: events.some(e => e.type === 'error_url_detected')
    };

    return summary;
  }

  stopTracing() {
    this.isTracing = false;
    console.log('🛑 Registration Flow Tracer STOPPED');
    return this.exportTrace();
  }
}

// Create global instance
const registrationTracer = new RegistrationTracer();

// Expose to window for manual control
if (typeof window !== 'undefined') {
  (window as any).registrationTracer = registrationTracer;
}

export { registrationTracer, RegistrationTracer };
export type { TraceEvent };