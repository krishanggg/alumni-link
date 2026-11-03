import { CircleHelp } from 'lucide-react';
import { Tooltip } from './Tooltip';

export function PrivacyHelp() {
  return (
    <span className="ml-1 inline-flex align-middle">
      <Tooltip
        label="About directory privacy"
        content="Choose whether approved alumni can find this profile. Contact information is never shared. Public shows the profile details in the directory; Private hides the profile from the directory and search."
      >
        <CircleHelp size={15} aria-hidden="true" className="text-on-surface-variant" />
      </Tooltip>
    </span>
  );
}
