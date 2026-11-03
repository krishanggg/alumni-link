import {
  GraduationCap, IdCard, School, BookOpen, User, Cake, BriefcaseBusiness,
  Phone, Mail, MapPin, Clock, ShieldCheck,
} from 'lucide-react';
import type { AlumniRecord } from '../../hooks/useAlumni';
import { EMPLOYMENT_STATUS_OPTIONS } from '../../types/Alumni';
import { Field } from '../shared/Field';
import { SectionHeader } from '../shared/SectionHeader';
import { PrivacyBadge } from '../directory/PrivacyBadge';
import { TONE_CLASSES } from '../../lib/toneClasses';
import { formatFullName, formatLastFirstName } from '../../utils/formatName';

interface AlumniDetailViewProps {
  alumni: AlumniRecord;
}

export function AlumniDetailView({ alumni }: AlumniDetailViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-xl bg-linear-to-br from-secondary-container/25 via-white to-white p-3 sm:gap-4 sm:p-4">
        {alumni.profile_photo_url ? (
          <img
            src={alumni.profile_photo_url}
            alt={formatFullName(alumni)}
            className="h-16 w-16 shrink-0 rounded-full object-cover ring-4 ring-white shadow-card sm:h-20 sm:w-20"
          />
        ) : (
          <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full ${TONE_CLASSES.blue} ring-4 ring-white shadow-card sm:h-20 sm:w-20`}>
            <User size={28} aria-hidden="true" strokeWidth={1.75} className="sm:hidden" />
            <User size={32} aria-hidden="true" strokeWidth={1.75} className="hidden sm:block" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-headline-sm font-headline-sm text-on-surface">
            {formatLastFirstName(alumni)}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-label-sm font-label-sm text-accent">
              <GraduationCap size={12} aria-hidden="true" />
              Class of {alumni.graduation_year}
            </span>
            {alumni.student_id && (
              <span className="inline-flex items-center rounded-full bg-surface-container-high px-2.5 py-1 font-mono text-label-sm text-on-surface-variant">
                {alumni.student_id}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <SectionHeader icon={School} label="Academic Information" tone="blue" />
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 pl-9 sm:grid-cols-2">
          <Field icon={IdCard} label="Student ID" value={alumni.student_id} alignIconWithLabel />
          <Field icon={School} label="School" value={alumni.school?.name} alignIconWithLabel />
          <Field icon={BookOpen} label="Section/Strand" value={alumni.section_strand} alignIconWithLabel />
        </div>
      </div>

      <div className="space-y-3 border-t border-outline-variant/60 pt-5">
        <SectionHeader icon={User} label="Personal Information" tone="purple" />
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 pl-9 sm:grid-cols-2">
          <Field icon={User} label="Gender" value={alumni.gender ? alumni.gender.charAt(0).toUpperCase() + alumni.gender.slice(1) : null} alignIconWithLabel />
          <Field icon={Cake} label="Birthdate" value={alumni.birthdate} alignIconWithLabel />
          <div className="sm:col-span-2">
            <Field icon={MapPin} label="Address" value={alumni.address} alignIconWithLabel />
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t border-outline-variant/60 pt-5">
        <SectionHeader icon={BriefcaseBusiness} label="Employment Information" tone="blue" />
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 pl-9 sm:grid-cols-2">
          <Field
            icon={BriefcaseBusiness}
            label="Employment Status"
            value={EMPLOYMENT_STATUS_OPTIONS.find(({ value }) => value === alumni.employment_status)?.label ?? null}
            alignIconWithLabel
          />
          {(alumni.employment_status === 'employed' || alumni.employment_status === 'self_employed') && (
            <>
              <Field icon={BriefcaseBusiness} label="Company Name" value={alumni.company_name} alignIconWithLabel />
              <Field icon={BriefcaseBusiness} label="Position In Company" value={alumni.position_in_company} alignIconWithLabel />
            </>
          )}
        </div>
      </div>

      <div className="space-y-3 border-t border-outline-variant/60 pt-5">
        <SectionHeader icon={Phone} label="Contact Information" tone="green" />
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 pl-9 sm:grid-cols-2">
          <Field icon={Phone} label="Contact Number" value={alumni.contact_number} href={alumni.contact_number ? `tel:${alumni.contact_number}` : undefined} alignIconWithLabel />
          <Field icon={Mail} label="Email" value={alumni.contact_email} href={alumni.contact_email ? `mailto:${alumni.contact_email}` : undefined} alignIconWithLabel />
        </div>
      </div>

      <div className="space-y-3 border-t border-outline-variant/60 pt-5">
        <SectionHeader icon={ShieldCheck} label="Directory Privacy" tone="amber" />
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 pl-9 sm:grid-cols-2">
          <Field icon={ShieldCheck} label="Privacy" value={<PrivacyBadge privacy={alumni.privacy} />} alignIconWithLabel />
        </div>
      </div>

      <div className="rounded-lg bg-surface-container-low p-4">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <Clock size={14} aria-hidden="true" />
          <p className="text-overline font-overline uppercase">Record History</p>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
          <div>
            <p className="text-label-sm text-on-surface-variant">Created</p>
            <p className="mt-0.5 text-body-md text-on-surface">{alumni.created_at ? new Date(alumni.created_at).toLocaleString() : '—'}</p>
          </div>
          <div>
            <p className="text-label-sm text-on-surface-variant">Created By</p>
            <p className="mt-0.5 text-body-md text-on-surface">{alumni.created_by ?? '—'}</p>
          </div>
          <div>
            <p className="text-label-sm text-on-surface-variant">Last Updated</p>
            <p className="mt-0.5 text-body-md text-on-surface">{alumni.updated_at ? new Date(alumni.updated_at).toLocaleString() : '—'}</p>
          </div>
          <div>
            <p className="text-label-sm text-on-surface-variant">Last Modified By</p>
            <p className="mt-0.5 text-body-md text-on-surface">{alumni.updated_by ?? '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
