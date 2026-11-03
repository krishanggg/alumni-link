import { Link } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';

import { useBatches } from '../../hooks/useBatches';
import { useAuth } from '../../hooks/useAuth';
import { useScope } from '../../hooks/useScope';
import { BatchCard } from '../../components/batches/BatchCard';
import { EmptyState } from '../../components/shared/EmptyState';
import { useAppReducedMotion } from '../../hooks/useAppReducedMotion';
import { reducedVariants } from '../../lib/motion';
import { BatchListLoadingState } from './BatchListLoadingState';

function BatchListPage() {
  const { user } = useAuth();
  const { schoolId: selectedSchoolId } = useScope();
  const { batches, isLoading, error } = useBatches(selectedSchoolId);

  const isAdmin = user?.role === 'super_admin' || user?.role === 'school_admin';
  const isSuperAdmin = user?.role === 'super_admin';
  const prefersReducedMotion = useAppReducedMotion();

  const [staggerKey, setStaggerKey] = useState(0);
  const prevSchoolIdRef = useRef(selectedSchoolId);
  const wasLoadingRef = useRef(isLoading);

  useEffect(() => {
    if (!isLoading && wasLoadingRef.current) {
      setStaggerKey((k) => k + 1);
    }

    wasLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    if (selectedSchoolId !== prevSchoolIdRef.current) {
      prevSchoolIdRef.current = selectedSchoolId;
      setStaggerKey((k) => k + 1);
    }
  }, [selectedSchoolId]);

  const gridStaggerVariants = useMemo(
    () => reducedVariants.staggerContainer(prefersReducedMotion, batches.length),
    [prefersReducedMotion, batches.length],
  );
  const gridItemVariants = useMemo(
    () => reducedVariants.listItem(prefersReducedMotion),
    [prefersReducedMotion],
  );

  if (isLoading) {
    return <BatchListLoadingState isAdmin={isAdmin} />;
  }

  return (
    <div className="p-6">
      {isAdmin && (
        <div className="mb-6 flex justify-end">
          <Link
            to="/batches/compare"
            className="rounded-DEFAULT border border-secondary px-4 py-2 text-label-sm font-label-sm text-secondary hover:bg-surface-container-low"
          >
            Compare Batches
          </Link>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-DEFAULT bg-error-container p-3 text-body-md text-on-error-container" role="alert">
          {error}
        </div>
      )}

      {batches.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={selectedSchoolId ? 'No batches for this school yet' : 'No batches to track yet'}
          description={
            selectedSchoolId
              ? 'Batches appear here once this school has alumni records with a graduation year.'
              : 'A batch is created automatically for each graduation year once alumni records exist. Add alumni to get started.'
          }
        />
      ) : (
        <>
        {isSuperAdmin && <p className="mb-4 text-body-md text-on-surface-variant">{selectedSchoolId ? 'Showing batches for the selected school.' : 'Showing combined batch totals across all schools.'}</p>}
        <motion.div
          key={staggerKey}
          variants={gridStaggerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {batches.map((batch) => (
            <motion.div key={batch.graduation_year} variants={gridItemVariants}>
              <BatchCard
                graduationYear={batch.graduation_year}
                totalGraduates={batch.total_graduates}
                registrationProgress={batch.registration_progress}
                profileCompleteness={batch.profile_completeness}
                schoolId={selectedSchoolId}
              />
            </motion.div>
          ))}
        </motion.div>
        </>
      )}
    </div>
  );
}

export default BatchListPage;
