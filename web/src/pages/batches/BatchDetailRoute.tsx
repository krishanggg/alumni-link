import { useParams } from 'react-router-dom';

import { AppShell } from '../../components/layout/AppShell';
import BatchDetailPage from './BatchDetailPage';

// The shell header is otherwise a static per-route title (set in App.tsx) —
// this route is the one place that needs it to reflect drill-down context.
export default function BatchDetailRoute() {
  const { year } = useParams<{ year: string }>();

  return (
    <AppShell
      title={year ? `Batch ${year}` : 'Batch Tracking'}
      subtitle={year ? 'Cohort roster, statistics, and notes' : undefined}
    >
      <BatchDetailPage />
    </AppShell>
  );
}
