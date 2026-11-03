import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { getGlobalLoadingCount, subscribeGlobalLoading } from '../../lib/globalLoadingSignal';

const SHOW_DELAY_MS = 150;
const TRICKLE_INTERVAL_MS = 300;
const TRICKLE_CEILING = 0.92;
const FINISH_DURATION_MS = 250;
const FADE_DURATION_MS = 250;

type Phase = 'idle' | 'loading' | 'finishing' | 'fading';

export function GlobalLoadingBar() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  // Non-react-query loads: auth bootstrap and lazy route-chunk downloads.
  const externalLoadingCount = useSyncExternalStore(subscribeGlobalLoading, getGlobalLoadingCount);
  const isActive = isFetching + isMutating + externalLoadingCount > 0;

  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const showTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const trickleInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const finishTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (isActive) {
      clearTimeout(finishTimeout.current);
      showTimeout.current = setTimeout(() => {
        setProgress(0.08);
        setPhase('loading');
        trickleInterval.current = setInterval(() => {
          setProgress((current) => current + (TRICKLE_CEILING - current) * 0.15);
        }, TRICKLE_INTERVAL_MS);
      }, SHOW_DELAY_MS);

      return () => clearTimeout(showTimeout.current);
    }

    clearTimeout(showTimeout.current);
    clearInterval(trickleInterval.current);

    setPhase((current) => {
      if (current !== 'loading') {
        return 'idle';
      }
      setProgress(1);
      finishTimeout.current = setTimeout(() => setPhase('fading'), FINISH_DURATION_MS);
      return 'finishing';
    });

    return () => clearTimeout(finishTimeout.current);
  }, [isActive]);

  useEffect(() => {
    if (phase !== 'fading') {
      return;
    }
    const resetTimeout = setTimeout(() => {
      setPhase('idle');
      setProgress(0);
    }, FADE_DURATION_MS);
    return () => clearTimeout(resetTimeout);
  }, [phase]);

  if (phase === 'idle') {
    return null;
  }

  return (
    <div role="status" aria-label="Loading" className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]">
      <div
        className="h-full w-full origin-left bg-accent"
        style={{
          transform: `scaleX(${progress})`,
          opacity: phase === 'fading' ? 0 : 1,
          transition:
            phase === 'loading'
              ? `transform ${TRICKLE_INTERVAL_MS}ms ease-out`
              : phase === 'finishing'
                ? `transform ${FINISH_DURATION_MS}ms ease-out`
                : `opacity ${FADE_DURATION_MS}ms ease-out`,
        }}
      />
    </div>
  );
}
