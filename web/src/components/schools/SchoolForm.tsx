import { useState } from 'react';
import { Building2, Phone, Mail, Globe } from 'lucide-react';
import { Button } from '../shared/Button';
import { TextField } from '../shared/TextField';
import { TextAreaField } from '../shared/TextAreaField';
import type { School } from '../../types/Auth';
import { validatePhilippineSchoolPhoneNumber } from '../../utils/validation';

interface SchoolFormProps {
  initialData?: Partial<School>;
  onSubmit: (data: { name: string; address?: string; contact_number?: string; email?: string; website?: string }) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  error?: string;
}

export function SchoolForm({ initialData, onSubmit, onCancel, isSubmitting, error: formError }: SchoolFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [contactNumber, setContactNumber] = useState(initialData?.contact_number || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [website, setWebsite] = useState(initialData?.website || '');
  const contactNumberError = validatePhilippineSchoolPhoneNumber(contactNumber);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (contactNumberError) {
      return;
    }

    try {
      await onSubmit({
        name,
        address: address || undefined,
        contact_number: contactNumber || undefined,
        email: email || undefined,
        website: website || undefined,
      });
    } catch {
      // errors are surfaced via the formError prop from the parent
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <TextField
        id="school-name"
        label="School Name *"
        icon={Building2}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <TextAreaField
        id="school-address"
        label="Address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        rows={2}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="school-phone"
          label="Contact Number"
          icon={Phone}
          type="text"
          value={contactNumber}
          onChange={(e) => setContactNumber(e.target.value)}
          error={contactNumberError}
        />

        <TextField
          id="school-email"
          label="Email"
          icon={Mail}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <TextField
        id="school-website"
        label="Website"
        icon={Globe}
        type="url"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
      />

      {formError && (
        <div className="rounded-DEFAULT bg-error-container p-3 text-body-md text-on-error-container" role="alert">
          {formError}
        </div>
      )}

      <div className="flex justify-end gap-3 border-t border-outline-variant/60 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !name.trim() || !!contactNumberError}
          isLoading={isSubmitting}
          loadingText="Saving"
        >
          Save
        </Button>
      </div>
    </form>
  );
}
