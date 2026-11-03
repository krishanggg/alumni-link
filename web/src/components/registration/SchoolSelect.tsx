import { useActiveSchools } from '../../hooks/useActiveSchools';
import { SelectField } from '../shared/SelectField';

interface SchoolSelectProps {
  value: string;
  onChange: (schoolId: string) => void;
  error?: string;
  hideErrorText?: boolean;
  required?: boolean;
}

export function SchoolSelect({ value, onChange, error, hideErrorText, required = true }: SchoolSelectProps) {
  const { schools, isLoading } = useActiveSchools();

  return (
    <SelectField
      id="school-select"
      label={`School ${required ? '*' : ''}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={error}
      hideErrorText={hideErrorText}
      disabled={isLoading}
      hint={schools.length === 0 && !isLoading ? 'No schools available. Please contact the administrator.' : undefined}
    >
      <option value="">{isLoading ? 'Loading' : 'Select a school'}</option>
      {schools.map((school) => (
        <option key={school.id} value={school.id}>
          {school.name}
        </option>
      ))}
    </SelectField>
  );
}
