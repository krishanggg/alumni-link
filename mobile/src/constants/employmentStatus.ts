import type { EmploymentStatus } from '../types';

export const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'self_employed', label: 'Self Employed' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'employed', label: 'Employed' },
  { value: 'retired', label: 'Retired' },
] as const satisfies readonly { value: EmploymentStatus; label: string }[];
