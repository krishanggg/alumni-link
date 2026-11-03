import { memo } from 'react';

import AlumniRow from '../shared/AlumniRow';

import type { DirectoryEntry } from '../../types/directory';

import { formatLastFirstName } from '../../utils/formatName';

interface DirectoryCardProps {
  entry: DirectoryEntry;
  onPress: (id: number) => void;
}

/**
 * A directory result, composed onto the shared `AlumniRow`.
 *
 * The fields are exactly what `DirectoryResource` exposes at every privacy
 * level — no occupation field exists in the v1 schema, so none is shown.
 */
function DirectoryCardComponent({ entry, onPress }: DirectoryCardProps) {
  const fullName = formatLastFirstName(entry);

  const batchLine = `Batch ${entry.graduation_year}${
    entry.section_strand ? ` • ${entry.section_strand}` : ''
  }`;

  return (
    <AlumniRow
      photoUrl={entry.profile_photo_url}
      initials={`${entry.first_name[0]}${entry.last_name[0]}`}
      name={fullName}
      lines={[batchLine, entry.school]}
      onPress={() => onPress(entry.id)}
      accessibilityLabel={`${fullName}. ${batchLine}. ${entry.school}. Opens profile.`}
    />
  );
}

export const DirectoryCard = memo(DirectoryCardComponent);
