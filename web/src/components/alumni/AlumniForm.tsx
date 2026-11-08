import { useEffect, useState, useReducer, useRef, type ReactNode } from 'react';
import { UserRound, GraduationCap, Phone, BriefcaseBusiness } from 'lucide-react';

import type { AlumniRecord } from '../../hooks/useAlumni';
import { EMPLOYMENT_STATUS_OPTIONS } from '../../types/Alumni';

import { SchoolSelect } from '../registration/SchoolSelect';
import { ProfilePhotoUpload } from './ProfilePhotoUpload';
import { TextField } from '../shared/TextField';
import { TextAreaField } from '../shared/TextAreaField';
import { SelectField } from '../shared/SelectField';
import { DateField } from '../shared/DateField';
import { Button } from '../shared/Button';
import { PrivacyHelp } from '../shared/PrivacyHelp';
import { FormErrorSummary } from '../shared/FormErrorSummary';

import { AlumniService } from '../../services/AlumniService';

import { AlumniFormSchema, AlumniFormSchemaWithRequiredSchool, type AlumniFormValues } from '../../schemas/AlumniSchema';
import { optionalPhilippinePhoneNumber, toFieldErrors } from '../../schemas/common';
import { DEFAULT_ICON_TONE } from '../../lib/toneClasses';
import { formatLastFirstName } from '../../utils/formatName';

function FormSection({ icon: Icon, title, description, children }: { icon: typeof UserRound; title: string; description: string; children: ReactNode }) {
  return (
    <section className="border-b border-outline-variant/70 px-6 py-6 last:border-0">
      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${DEFAULT_ICON_TONE}`}>
          <Icon size={18} aria-hidden="true" strokeWidth={2.25} />
        </div>
        <div>
          <h3 className="text-headline-sm font-headline-sm text-on-surface">{title}</h3>
          <p className="text-label-sm text-on-surface-variant">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

interface DuplicateMatch {
  id: number;
  first_name: string;
  last_name: string;
  graduation_year: number;
  school_id: number | null;
  section_strand: string | null;
  student_id: string | null;
}

interface AlumniFormProps {
  initialData?: AlumniRecord | null;
  onSubmit: (data: AlumniFormValues, photoFile: File | null, removePhoto: boolean) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  lockedSchoolId?: number | null;
  initialSchoolId?: number | null;
  requireSchool?: boolean;
}

interface FormState {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  gender: string;
  birthdate: string;
  schoolId: string;
  studentId: string;
  graduationYear: string;
  sectionStrand: string;
  contactNumber: string;
  contactEmail: string;
  address: string;
  employmentStatus: string;
  companyName: string;
  positionInCompany: string;
  privacy: string;
}

type FormAction =
  { type: 'SET_FIELD'; field: keyof FormState; value: string };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    default:
      return state;
  }
}

function getLiveContactNumberError(value: string): string | undefined {
  const result = optionalPhilippinePhoneNumber.safeParse(value);

  if (result.success) {
    return undefined;
  }

  return result.error.issues[0]?.message;
}

export function AlumniForm({ initialData, onSubmit, onCancel, isSubmitting, error, fieldErrors = {}, lockedSchoolId = null, initialSchoolId = null, requireSchool = false }: AlumniFormProps) {
  const isSchoolAdmin = lockedSchoolId !== null;
  const [state, dispatch] = useReducer(formReducer, {
    firstName: initialData?.first_name ?? '',
    middleName: initialData?.middle_name ?? '',
    lastName: initialData?.last_name ?? '',
    suffix: initialData?.suffix ?? '',
    gender: initialData?.gender ?? '',
    birthdate: initialData?.birthdate ?? '',
    schoolId: isSchoolAdmin ? String(lockedSchoolId) : (initialData?.school?.id ? String(initialData.school.id) : (initialSchoolId ? String(initialSchoolId) : '')),
    studentId: initialData?.student_id ?? '',
    graduationYear: initialData?.graduation_year ? String(initialData.graduation_year) : '',
    sectionStrand: initialData?.section_strand ?? '',
    contactNumber: initialData?.contact_number ?? '',
    contactEmail: initialData?.contact_email ?? '',
    address: initialData?.address ?? '',
    employmentStatus: initialData?.employment_status ?? '',
    companyName: initialData?.company_name ?? '',
    positionInCompany: initialData?.position_in_company ?? '',
    privacy: initialData?.privacy ?? 'public',
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [shouldRemovePhoto, setShouldRemovePhoto] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[] | null>(null);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [clientFieldErrors, setClientFieldErrors] = useState<Record<string, string[]>>({});
  const [emailAvailabilityError, setEmailAvailabilityError] = useState<string | undefined>();
  const emailCheckToken = useRef(0);

  useEffect(() => {
    if (!initialData && !isSchoolAdmin) {
      dispatch({ type: 'SET_FIELD', field: 'schoolId', value: initialSchoolId ? String(initialSchoolId) : '' });
    }
  }, [initialData, initialSchoolId, isSchoolAdmin]);

  const mergedFieldErrors = { ...fieldErrors, ...clientFieldErrors };

  async function handleEmailBlur() {
    const email = state.contactEmail.trim();

    if (!email || mergedFieldErrors.contact_email?.[0]) {
      return;
    }

    const token = ++emailCheckToken.current;

    try {
      const { available } = await AlumniService.checkAlumniEmailAvailability(email, initialData?.id);

      if (emailCheckToken.current === token) {
        setEmailAvailabilityError(available ? undefined : 'This email address is already registered.');
      }
    } catch {
      // Availability is still authoritatively enforced on save; a failed live check is not fatal.
    }
  }

  function buildPayload() {
    return {
      first_name: state.firstName,
      last_name: state.lastName,
      middle_name: state.middleName || undefined,
      suffix: state.suffix || undefined,
      school_id: state.schoolId ? Number(state.schoolId) : undefined,
      student_id: state.studentId || undefined,
      graduation_year: state.graduationYear ? Number(state.graduationYear) : undefined,
      section_strand: state.sectionStrand || undefined,
      gender: state.gender || undefined,
      birthdate: state.birthdate || undefined,
      contact_number: state.contactNumber || undefined,
      contact_email: state.contactEmail || undefined,
      address: state.address || undefined,
      employment_status: EMPLOYMENT_STATUS_OPTIONS.find(({ value }) => value === state.employmentStatus)?.value ?? null,
      company_name: state.companyName || undefined,
      position_in_company: state.positionInCompany || undefined,
      privacy: state.privacy || undefined,
    };
  }

  async function findDuplicates(): Promise<DuplicateMatch[]> {
    const params: Record<string, string | number> = {
      first_name: state.firstName,
      last_name: state.lastName,
    };

    if (state.graduationYear) {
      params.graduation_year = state.graduationYear;
    }

    if (state.schoolId) {
      params.school_id = state.schoolId;
    }

    if (initialData?.id) {
      params.exclude_id = initialData.id;
    }

    return AlumniService.listAlumniDuplicates(params);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const schema = requireSchool ? AlumniFormSchemaWithRequiredSchool : AlumniFormSchema;
    const result = schema.safeParse(buildPayload());

    if (!result.success) {
      setClientFieldErrors(toFieldErrors(result.error));
      return;
    }

    setClientFieldErrors({});

    if (duplicates) {
      await onSubmit(result.data, photoFile, shouldRemovePhoto);
      return;
    }

    setIsCheckingDuplicates(true);

    try {
      let matches: DuplicateMatch[] = [];

      try {
        matches = await findDuplicates();
      } catch {
        matches = [];
      }

      if (matches.length > 0) {
        setDuplicates(matches);
        return;
      }

      await onSubmit(result.data, photoFile, shouldRemovePhoto);
    } finally {
      setIsCheckingDuplicates(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
      <FormSection icon={UserRound} title="Personal Information" description="The alumnus's basic identity details">
      <div className="flex items-center gap-4">
        <ProfilePhotoUpload
          currentPhotoUrl={initialData?.profile_photo_url}
          onFileSelected={setPhotoFile}
          onRemoveChange={setShouldRemovePhoto}
        />
        <p className="text-label-md text-on-surface-variant">Optional photo shown on the alumni directory</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <TextField
          id="alumni-first-name"
          label="First Name *"
          type="text"
          value={state.firstName}
          onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'firstName', value: e.target.value })}
          required
          error={mergedFieldErrors.first_name?.[0]}
        />

        <TextField
          id="alumni-middle-name"
          label="Middle Name"
          type="text"
          value={state.middleName}
          onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'middleName', value: e.target.value })}
          error={mergedFieldErrors.middle_name?.[0]}
        />

        <TextField
          id="alumni-last-name"
          label="Last Name *"
          type="text"
          value={state.lastName}
          onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'lastName', value: e.target.value })}
          required
          error={mergedFieldErrors.last_name?.[0]}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <TextField
          id="alumni-suffix"
          label="Suffix"
          type="text"
          value={state.suffix}
          onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'suffix', value: e.target.value })}
          error={mergedFieldErrors.suffix?.[0]}
        />

        <SelectField
          id="alumni-gender"
          label="Gender"
          value={state.gender}
          onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'gender', value: e.target.value })}
        >
          <option value="male">Male</option>
          <option value="female">Female</option>
        </SelectField>

        <DateField
          id="alumni-birthdate"
          label="Birthdate"
          value={state.birthdate}
          onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'birthdate', value: e.target.value })}
          error={mergedFieldErrors.birthdate?.[0]}
        />
      </div>

      {isSchoolAdmin ? (
        <p className="text-label-md text-on-surface-variant">School assignment is enforced for your school.</p>
      ) : (
        <SchoolSelect value={state.schoolId} onChange={(v) => dispatch({ type: 'SET_FIELD', field: 'schoolId', value: v })} error={mergedFieldErrors.school_id?.[0]} required={requireSchool} />
      )}
      </FormSection>

      <FormSection icon={GraduationCap} title="Graduation Details" description="Academic record and cohort">
      <div className="grid grid-cols-2 gap-3">
        <TextField
          id="alumni-student-id"
          label="Student ID"
          type="text"
          value={state.studentId}
          onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'studentId', value: e.target.value })}
          error={mergedFieldErrors.student_id?.[0]}
        />

        <TextField
          id="alumni-graduation-year"
          label="Graduation Year *"
          type="number"
          value={state.graduationYear}
          onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'graduationYear', value: e.target.value })}
          required
          error={mergedFieldErrors.graduation_year?.[0]}
        />
      </div>

      <TextField
        id="alumni-section"
        label="Section/Strand *"
        type="text"
        value={state.sectionStrand}
        onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'sectionStrand', value: e.target.value })}
        required
        error={mergedFieldErrors.section_strand?.[0]}
      />
      </FormSection>

      <FormSection icon={Phone} title="Contact Information" description="How to reach this alumnus">
      <div className="grid grid-cols-2 gap-3">
        <TextField
          id="alumni-contact-number"
          label="Contact Number"
          icon={Phone}
          type="text"
          value={state.contactNumber}
          onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'contactNumber', value: e.target.value })}
          error={mergedFieldErrors.contact_number?.[0] ?? getLiveContactNumberError(state.contactNumber)}
        />

        <TextField
          id="alumni-contact-email"
          label="Email"
          type="email"
          value={state.contactEmail}
          onChange={(e) => {
            setEmailAvailabilityError(undefined);
            dispatch({ type: 'SET_FIELD', field: 'contactEmail', value: e.target.value });
          }}
          onBlur={handleEmailBlur}
          error={mergedFieldErrors.contact_email?.[0] ?? emailAvailabilityError}
        />
      </div>

      <TextAreaField
        id="alumni-address"
        label="Address"
        value={state.address}
        onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'address', value: e.target.value })}
        rows={2}
        error={mergedFieldErrors.address?.[0]}
      />
      </FormSection>

      <FormSection icon={BriefcaseBusiness} title="Employment Information" description="Optional employment status and workplace details">
      <SelectField
        id="alumni-employment-status"
        label="Employment Status"
        value={state.employmentStatus}
        onChange={(event) => {
          const nextStatus = EMPLOYMENT_STATUS_OPTIONS.find(({ value }) => value === event.target.value)?.value ?? '';
          dispatch({ type: 'SET_FIELD', field: 'employmentStatus', value: nextStatus });
          if (nextStatus !== 'employed' && nextStatus !== 'self_employed') {
            dispatch({ type: 'SET_FIELD', field: 'companyName', value: '' });
            dispatch({ type: 'SET_FIELD', field: 'positionInCompany', value: '' });
            setClientFieldErrors((current) => {
              const next = { ...current };
              delete next.company_name;
              delete next.position_in_company;
              return next;
            });
          }
        }}
        error={mergedFieldErrors.employment_status?.[0]}
      >
        <option value="">Select employment status</option>
        {EMPLOYMENT_STATUS_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
      </SelectField>

      {(state.employmentStatus === 'employed' || state.employmentStatus === 'self_employed') && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            id="alumni-company-name"
            label="Company Name *"
            type="text"
            value={state.companyName}
            onChange={(event) => dispatch({ type: 'SET_FIELD', field: 'companyName', value: event.target.value })}
            required
            error={mergedFieldErrors.company_name?.[0]}
          />
          <TextField
            id="alumni-position-in-company"
            label="Position In Company *"
            type="text"
            value={state.positionInCompany}
            onChange={(event) => dispatch({ type: 'SET_FIELD', field: 'positionInCompany', value: event.target.value })}
            required
            error={mergedFieldErrors.position_in_company?.[0]}
          />
        </div>
      )}
      </FormSection>

      <FormSection icon={UserRound} title="Directory Privacy" description="Control whether your profile appears in the alumni directory">
      <div>
        <label htmlFor="alumni-privacy" className="flex items-center text-label-md font-label-md text-on-surface">
          Privacy
          <PrivacyHelp />
        </label>
        <SelectField
          id="alumni-privacy"
          label="Privacy"
          hideLabel
          containerClassName="mt-1"
          value={state.privacy}
          onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'privacy', value: e.target.value })}
        >
          <option value="public">Public</option>
          <option value="private">Private</option>
        </SelectField>
      </div>
      </FormSection>

      </div>

      <div className="shrink-0 space-y-4 border-t border-outline-variant/70 bg-surface-container-low/50 px-6 py-6">
      {duplicates && duplicates.length > 0 && (
        <div className="rounded-DEFAULT border border-warning-container bg-warning-container/50 p-3">
          <p className="text-label-md font-label-md text-on-warning-container">
            Possible duplicate record{duplicates.length > 1 ? 's' : ''} found:
          </p>
          <ul className="mt-2 space-y-1">
            {duplicates.map((match) => (
              <li key={match.id} className="text-body-md text-on-warning-container">
                {formatLastFirstName(match)} — Class of {match.graduation_year}
                {match.section_strand ? ` (${match.section_strand})` : ''}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-label-sm text-on-warning-container">
            Review the list above. Submitting again will save this record anyway.
          </p>
        </div>
      )}

      {(error || Object.keys(clientFieldErrors).length > 0) && (
        <FormErrorSummary message={error || 'Please correct the errors below.'} fieldErrors={mergedFieldErrors} />
      )}

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || isCheckingDuplicates}
          isLoading={isSubmitting || isCheckingDuplicates}
          loadingText={isCheckingDuplicates ? 'Checking' : 'Saving'}
        >
          {duplicates ? 'Save Anyway' : 'Save'}
        </Button>
      </div>
      </div>
    </form>
  );
}
