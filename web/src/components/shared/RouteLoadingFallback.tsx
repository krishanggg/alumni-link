import { useEffect } from 'react';

import { ThreeBodyLoader } from './ThreeBodyLoader';
import { startGlobalLoading, stopGlobalLoading } from '../../lib/globalLoadingSignal';

export function RouteLoadingFallback() {
  // App-shell-less routes (auth pages, first paint of a protected route): still
  // feed the top progress bar while the chunk downloads.
  useEffect(() => {
    startGlobalLoading();
    return stopGlobalLoading;
  }, []);

  return (
    <div className="bg-app-canvas flex min-h-screen items-center justify-center">
      <ThreeBodyLoader size={56} />
    </div>
  );
}
