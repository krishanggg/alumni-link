function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function alumniNameMatchesUser(userName: string, firstName: string, lastName: string): boolean {
  const normalizedUser = normalizeName(userName);
  const straight = normalizeName(`${firstName} ${lastName}`);
  const reversed = normalizeName(`${lastName} ${firstName}`);

  return normalizedUser === straight || normalizedUser === reversed;
}
