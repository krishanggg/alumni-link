import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

import type { BatchComparisonEntry } from '../../hooks/useBatches';
import { useBatches } from '../../hooks/useBatches';
import { useScope } from '../../hooks/useScope';
import { Button } from '../../components/shared/Button';

import { CHART_PALETTE, CHART_PRIMARY } from '../../lib/toneClasses';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function BatchComparePage() {
  const { schoolId: selectedSchoolId } = useScope();
  const { batches, isLoading: batchesLoading, fetchComparison } = useBatches(selectedSchoolId);

  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [entries, setEntries] = useState<BatchComparisonEntry[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped on every scope change so a comparison request that was already
  // in flight for the previous scope can't write its result into the new view.
  const compareRequestRef = useRef(0);

  // A scope change swaps out the underlying cohorts, so any in-progress
  // year selection and comparison no longer apply.
  useEffect(() => {
    compareRequestRef.current += 1;
    setSelectedYears([]);
    setEntries([]);
    setError(null);
  }, [selectedSchoolId]);

  function toggleYear(year: number) {
    setSelectedYears((prev) => {
      if (prev.includes(year)) {
        return prev.filter((y) => y !== year);
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, year];
    });
  }

  async function handleCompare() {
    const requestId = compareRequestRef.current;
    setIsComparing(true);
    setError(null);
    try {
      const result = await fetchComparison(selectedYears);
      if (compareRequestRef.current !== requestId) {
        return;
      }
      const sorted = Object.values(result).sort((a, b) => a.graduation_year - b.graduation_year);
      setEntries(sorted);
    } catch (err) {
      if (compareRequestRef.current !== requestId) {
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to compare batches');
    } finally {
      if (compareRequestRef.current === requestId) {
        setIsComparing(false);
      }
    }
  }

  const chartData = {
    labels: entries.map((e) => `Batch ${e.graduation_year}`),
    datasets: [
      { label: 'Total Graduates', data: entries.map((e) => e.total), backgroundColor: CHART_PRIMARY },
    ],
  };
  const progressChartData = {
    labels: entries.map((e) => `Batch ${e.graduation_year}`),
    datasets: [
      {
        label: 'Registration Progress',
        data: entries.map((e) => e.registration_progress ?? 0),
        backgroundColor: CHART_PALETTE[1],
      },
      {
        label: 'Profile Completeness',
        data: entries.map((e) => e.profile_completeness ?? 0),
        backgroundColor: CHART_PALETTE[2],
      },
    ],
  };

  const requiredMetrics = [
    { label: 'Total Graduates', key: 'total' as const, suffix: '' },
    { label: 'Registration Progress', key: 'registration_progress' as const, suffix: '%' },
    { label: 'Profile Completeness', key: 'profile_completeness' as const, suffix: '%' },
  ];
  const genderMetrics = [
    { label: 'Male', key: 'male_count' as const, suffix: '' },
    { label: 'Female', key: 'female_count' as const, suffix: '' },
  ];

  function formatMetric(value: number | null, suffix: string): string {
    if (value === null) {
      return '–';
    }

    return `${value}${suffix}`;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link to="/batches" className="text-label-md text-secondary hover:opacity-80">
          &larr; Back to Batches
        </Link>
      </div>

      {error && (
        <div className="mt-4 rounded-DEFAULT bg-error-container p-3 text-body-md text-on-error-container" role="alert">
          {error}
        </div>
      )}

      <div className="mt-6 rounded-lg border border-outline-variant/70 bg-white shadow-card p-4">
        <h2 className="text-headline-sm font-headline-sm text-on-surface">
          Select Years <span className="text-on-surface-variant">({selectedYears.length}/5)</span>
        </h2>
        {batchesLoading ? (
          <div className="mt-3 h-10 animate-pulse rounded bg-surface-container" />
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {batches.map((batch) => {
              const isSelected = selectedYears.includes(batch.graduation_year);
              const isDisabled = !isSelected && selectedYears.length >= 5;
              return (
                <button
                  key={batch.graduation_year}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleYear(batch.graduation_year)}
                  disabled={isDisabled}
                  className={`rounded-full px-4 py-1.5 text-label-sm transition-colors disabled:opacity-40 ${
                    isSelected
                      ? 'bg-secondary text-on-secondary'
                      : 'border border-outline-variant text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  {batch.graduation_year}
                </button>
              );
            })}
          </div>
        )}
        <div className="mt-4 flex items-center gap-3">
          <Button
            size="sm"
            onClick={handleCompare}
            disabled={selectedYears.length < 2 || isComparing}
            isLoading={isComparing}
            loadingText="Comparing"
          >
            Compare
          </Button>
          {selectedYears.length < 2 && (
            <span className="text-label-sm text-on-surface-variant">Select at least 2 years</span>
          )}
        </div>
      </div>

      {entries.length > 0 && (
        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-outline-variant/70 bg-white shadow-card p-4">
            <h2 className="mb-4 text-headline-sm font-headline-sm text-on-surface">Side-by-Side Chart</h2>
            <div className="h-72">
              <Bar
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'top' } },
                }}
              />
            </div>
            <h3 className="mb-4 text-headline-sm font-headline-sm text-on-surface">Progress Metrics</h3>
            <div className="h-72">
              <Bar
                data={progressChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'top' } },
                }}
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-outline-variant/70 bg-white shadow-card">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low">
                  <th className="px-4 py-3 text-left text-label-md text-on-surface">Metric</th>
                  {entries.map((e) => (
                    <th key={e.graduation_year} className="px-4 py-3 text-left text-label-md text-on-surface">
                      Batch {e.graduation_year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...requiredMetrics, ...genderMetrics].map(({ label, key, suffix }) => (
                  <tr key={key} className="border-b border-outline-variant">
                    <td className="px-4 py-3 text-label-md font-medium text-on-surface">{label}</td>
                    {entries.map((e) => (
                      <td key={e.graduation_year} className="px-4 py-3 text-body-md text-on-surface">
                        {formatMetric(e[key], suffix)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default BatchComparePage;
