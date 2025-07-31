declare global {
  interface Window {
    gtag?: (
      command: 'event' | 'config' | 'set',
      action: string,
      parameters?: {
        event_category?: string;
        event_label?: string;
        value?: number;
        custom_dimensions?: Record<string, any>;
        [key: string]: any;
      }
    ) => void;
  }
}

export {};