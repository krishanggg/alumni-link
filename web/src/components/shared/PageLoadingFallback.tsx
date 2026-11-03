import { useEffect } from 'react';

import { ThreeBodyLoader } from './ThreeBodyLoader';
import { startGlobalLoading, stopGlobalLoading } from '../../lib/globalLoadingSignal';

// Suspense fallback for lazy page chunks that render *inside* the AppShell.
// Keeps the shell (sidebar + header) mounted and only shows the loader in the
// content area, so a first-visit chunk download doesn't blank the whole screen.
// `flex-1` makes it fill the shell's <main>, so the loader sits at the true
// centre of the content area rather than anchored near the top.
export function PageLoadingFallback() {
  // While this fallback is mounted a route chunk is downloading — drive the
  // top progress bar too, so the click has feedback above the fold immediately.
  useEffect(() => {
    startGlobalLoading();
    return stopGlobalLoading;
  }, []);

  return (
    <div className="flex flex-1 items-center justify-center self-stretch py-24">
      <ThreeBodyLoader size={48} />
    </div>
  );
}
