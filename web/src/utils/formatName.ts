export interface NameParts {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix?: string | null;
}

/** "First Middle Last Suffix" — all present parts, single-spaced. */
export function formatFullName(person: NameParts): string {
  return [person.first_name, person.middle_name, person.last_name, person.suffix]
    .filter(Boolean)
    .join(' ')
    .trim();
}

/** "Last, First Middle Suffix" — the directory/table convention used across list views. */
export function formatLastFirstName(person: NameParts): string {
  const first = [person.first_name, person.middle_name, person.suffix].filter(Boolean).join(' ');
  return `${person.last_name}, ${first}`;
}
