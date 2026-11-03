import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels, { type Context } from 'chartjs-plugin-datalabels';
import { DoughnutLegend } from '../shared/DoughnutLegend';

import { CHART_ON_COLOR, CHART_PALETTE, CHART_PRIMARY } from '../../lib/toneClasses';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, ChartDataLabels);

interface BatchStatisticsChartProps {
  gender: Record<string, number>;
  sections: Record<string, number>;
}

function formatPercentage(value: number, total: number): string {
  return total > 0 ? `${Math.round((value / total) * 100)}%` : '0%';
}

export function BatchStatisticsChart({ gender, sections }: BatchStatisticsChartProps) {
  const genderLabels = Object.keys(gender).map((k) => k || 'Unknown');
  const genderValues = Object.values(gender);
  const genderTotal = genderValues.reduce((sum, value) => sum + value, 0);
  const topSections = Object.entries(sections).slice(0, 8);

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: 0, autoPadding: false },
    plugins: {
      legend: { display: false },
      datalabels: {
        color: CHART_ON_COLOR,
        font: { weight: 'bold' as const, size: 13 },
        formatter: (value: number, ctx: Context) => {
          const dataset = (ctx.chart.data.datasets[0].data as number[]);
          const total = dataset.reduce((sum, v) => sum + v, 0);
          return formatPercentage(value, total);
        },
      },
    },
  };

  const genderData = {
    labels: genderLabels,
    datasets: [{ data: genderValues, backgroundColor: [...CHART_PALETTE], borderWidth: 0 }],
  };

  const sectionsData = {
    labels: topSections.map(([k]) => k),
    datasets: [{ label: 'Students', data: topSections.map(([, v]) => v), backgroundColor: CHART_PRIMARY }],
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-outline-variant/70 bg-white shadow-card p-4">
        <h3 className="text-headline-sm font-headline-sm text-on-surface">Gender Breakdown</h3>
        <div className="mt-3 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center">
          <div className="relative aspect-square h-48 w-48 max-w-full shrink-0 sm:h-56 sm:w-56">
            <Doughnut className="block h-full w-full" data={genderData} options={doughnutOptions} />
          </div>
          <div className="w-full min-w-0 max-w-full sm:w-auto sm:max-w-xs [&_li]:whitespace-normal [&_li]:break-words">
            <DoughnutLegend labels={genderLabels} data={genderValues} colors={[...CHART_PALETTE]} />
          </div>
        </div>
        <table className="sr-only">
          <caption>Gender breakdown data</caption>
          <thead>
            <tr>
              <th scope="col">Gender</th>
              <th scope="col">Students</th>
              <th scope="col">Percentage</th>
            </tr>
          </thead>
          <tbody>
            {genderLabels.map((label, index) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{genderValues[index]}</td>
                <td>{formatPercentage(genderValues[index], genderTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-outline-variant/70 bg-white shadow-card p-4">
        <h3 className="text-headline-sm font-headline-sm text-on-surface">Top Sections</h3>
        <div className="mt-3 h-48">
          {topSections.length > 0 ? (
            <Bar
              data={sectionsData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, datalabels: { display: false } },
              }}
            />
          ) : (
            <p className="flex h-full items-center justify-center text-body-md text-on-surface-variant">
              No section data
            </p>
          )}
        </div>
        <table className="sr-only">
          <caption>Top sections data</caption>
          <thead>
            <tr>
              <th scope="col">Section</th>
              <th scope="col">Students</th>
            </tr>
          </thead>
          <tbody>
            {topSections.map(([section, count]) => (
              <tr key={section}>
                <th scope="row">{section}</th>
                <td>{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
