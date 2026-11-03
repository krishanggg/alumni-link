interface DoughnutLegendProps {
  labels: string[];
  data: number[];
  colors: string[];
  markerShape?: 'square' | 'circle';
}

export function DoughnutLegend({ labels, data, colors, markerShape = 'square' }: DoughnutLegendProps) {
  const markerClassName = markerShape === 'circle' ? 'rounded-full' : 'rounded-sm';

  return (
    <ul className="space-y-2.5">
      {labels.map((label, i) => (
        <li key={label} className="flex items-center gap-2 whitespace-nowrap text-body-md text-on-surface">
          <span className={`h-3 w-3 shrink-0 ${markerClassName}`} style={{ backgroundColor: colors[i % colors.length] }} aria-hidden="true" />
          <span className="capitalize">{label}</span>
          <span className="text-on-surface-variant">- {data[i]}</span>
        </li>
      ))}
    </ul>
  );
}
