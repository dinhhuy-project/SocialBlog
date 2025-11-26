import { useRef, useEffect } from 'react';

interface UseTurnstileOptions {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: (error: Error) => void;
  theme?: 'light' | 'dark';
  size?: 'normal' | 'compact';
  language?: string;
}

export interface TurnstileInstance {
  render: (containerId: string, options: any) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
  getResponse: (widgetId?: string) => string | undefined;
  isExpired: (widgetId?: string) => boolean;
}

declare global {
  interface Window {
    turnstile?: TurnstileInstance;
  }
}

/**
 * Hook to integrate Turnstile CAPTCHA into React components
 * Handles script loading and widget lifecycle
 */
export function useTurnstile({
  siteKey,
  onVerify,
  onError,
  theme = 'light',
  size = 'normal',
  language = 'en',
}: UseTurnstileOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string>();

  useEffect(() => {
    // Load Turnstile script if not already loaded
    if (!window.turnstile) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;

      script.onload = () => {
        renderWidget();
      };

      script.onerror = () => {
        const error = new Error('Failed to load Turnstile script');
        console.error(error);
        onError?.(error);
      };

      document.head.appendChild(script);
    } else {
      renderWidget();
    }

    return () => {
      // Cleanup widget on unmount
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (error) {
          console.error('Error removing Turnstile widget:', error);
        }
      }
    };
  }, []);

  const renderWidget = () => {
    if (!containerRef.current || !window.turnstile) {
      return;
    }

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current as any, {
        sitekey: siteKey,
        theme,
        size,
        language,
        callback: onVerify,
        'error-callback': onError ? () => onError(new Error('Turnstile verification failed')) : undefined,
      });
    } catch (error) {
      console.error('Error rendering Turnstile widget:', error);
      onError?.(error as Error);
    }
  };

  const reset = () => {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  };

  const getToken = (): string | undefined => {
    if (widgetIdRef.current && window.turnstile) {
      return window.turnstile.getResponse(widgetIdRef.current);
    }
    return undefined;
  };

  return {
    containerRef,
    reset,
    getToken,
  };
}
