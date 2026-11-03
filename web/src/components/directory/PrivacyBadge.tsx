import { Tooltip } from '../shared/Tooltip';

import { PRIVACY_HELP_TEXT } from '../../lib/privacyHelpText';

interface PrivacyBadgeProps {
  privacy: string;
}

const privacyStyles: Record<string, string> = {
  public: 'bg-success-container text-on-success-container',
  private: 'bg-error-container text-on-error-container',
};

export function PrivacyBadge({ privacy }: PrivacyBadgeProps) {
  const normalizedPrivacy = privacy as keyof typeof PRIVACY_HELP_TEXT;
  const description = PRIVACY_HELP_TEXT[normalizedPrivacy] ?? PRIVACY_HELP_TEXT.public;

  return (
    <Tooltip label={`${privacy} privacy: ${description}`} content={description}>
      <span className={`inline-flex rounded-sm px-2 py-0.5 text-label-sm font-label-sm ${privacyStyles[privacy] || privacyStyles.public}`}>
        {privacy.charAt(0).toUpperCase() + privacy.slice(1)}
      </span>
    </Tooltip>
  );
}
