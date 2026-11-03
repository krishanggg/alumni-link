import { useAvailableBatches } from '../../hooks/useBatches';

import { Checkbox } from '../shared/Checkbox';

interface TargetBatchSelectorProps {
  targetAllBatches: boolean;
  selectedBatches: number[];
  onChangeAll: (all: boolean) => void;
  onChangeBatches: (batches: number[]) => void;
  schoolId?: number;
}

export function TargetBatchSelector({ targetAllBatches, selectedBatches, onChangeAll, onChangeBatches, schoolId }: TargetBatchSelectorProps) {
  const { availableBatches } = useAvailableBatches(schoolId);

  function toggleBatch(year: number) {
    if (selectedBatches.includes(year)) {
      onChangeBatches(selectedBatches.filter((y) => y !== year));
    } else {
      onChangeBatches([...selectedBatches, year]);
    }
  }

  return (
    <div className="space-y-2">
      <Checkbox
        label="All Batches"
        checked={targetAllBatches}
        onChange={(e) => {
          onChangeAll(e.target.checked);
          if (e.target.checked) {
            onChangeBatches([]);
          }
        }}
      />

      {!targetAllBatches && (
        <div className="ml-6 grid max-h-32 grid-cols-3 gap-1 overflow-y-auto rounded-DEFAULT border border-outline-variant p-2">
          {availableBatches.map((year) => (
            <Checkbox
              key={year}
              label={String(year)}
              checked={selectedBatches.includes(year)}
              onChange={() => toggleBatch(year)}
            />
          ))}
          {availableBatches.length === 0 && (
            <p className="col-span-3 text-label-sm text-on-surface-variant">No batches available</p>
          )}
        </div>
      )}
    </div>
  );
}
