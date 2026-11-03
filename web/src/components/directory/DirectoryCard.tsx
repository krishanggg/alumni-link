import { PrivacyBadge } from './PrivacyBadge';
import { HighlightText } from '../shared/HighlightText';
import { Avatar } from '../shared/Avatar';

import { formatLastFirstName } from '../../utils/formatName';

interface DirectoryCardProps {
  id: number;
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
  school: string;
  graduationYear: number;
  sectionStrand: string | null;
  profilePhotoUrl: string | null;
  privacy?: string;
  highlight?: string;
  isHighlighted?: boolean;
  onView: (id: number) => void;
}

export function DirectoryCard({
  id, firstName, middleName, lastName, suffix, school, graduationYear, sectionStrand,
  profilePhotoUrl, privacy, highlight, isHighlighted, onView,
}: DirectoryCardProps) {
  const fullName = formatLastFirstName({ first_name: firstName, middle_name: middleName, last_name: lastName, suffix });

  return (
    <div className="relative">
      <button
        type="button"
        data-highlighted={isHighlighted || undefined}
        className={[
          'block w-full cursor-pointer rounded-lg border bg-white p-4 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
          isHighlighted ? 'border-accent/50 bg-info-container ring-2 ring-accent/30' : 'border-outline-variant/70',
        ].join(' ')}
        onClick={() => onView(id)}
        aria-label={'View ' + fullName + ' profile'}
      >
        <div className="flex items-center gap-3 pr-16">
          <Avatar name={`${firstName} ${lastName}`} photoUrl={profilePhotoUrl} alt={fullName} sizeClassName="h-12 w-12" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-title-md font-title-md text-on-surface">
              <HighlightText text={fullName} highlight={highlight} />
            </p>
            <p className="text-label-sm text-on-surface-variant">
              <HighlightText text={school} highlight={highlight} />
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-label-sm text-on-surface-variant">Batch {graduationYear}</p>
            {sectionStrand && <p className="text-label-sm text-on-surface-variant">{sectionStrand}</p>}
          </div>
        </div>
      </button>
      {privacy && (
        <div className="absolute right-4 top-4 z-10">
          <PrivacyBadge privacy={privacy} />
        </div>
      )}
    </div>
  );
}
