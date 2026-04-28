'use client';

import { useEffect, useState } from 'react';

export function useDeferredMount(delay = 120) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mount = () => setIsReady(true);
    const browserWindow = window as Window &
      typeof globalThis & {
        requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
        cancelIdleCallback?: (handle: number) => void;
      };

    if (browserWindow.requestIdleCallback && browserWindow.cancelIdleCallback) {
      const idleId = browserWindow.requestIdleCallback(mount, { timeout: delay + 500 });
      return () => browserWindow.cancelIdleCallback?.(idleId);
    }

    const timeoutId = browserWindow.setTimeout(mount, delay);
    return () => browserWindow.clearTimeout(timeoutId);
  }, [delay]);

  return isReady;
}
