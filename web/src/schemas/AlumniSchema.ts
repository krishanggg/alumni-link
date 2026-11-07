import { z } from 'zod';

import { localTodayIsoDate, philippinePhoneNumber } from './common';

const MIN_GRADUATION_YEAR = 1900;

export const AlumniFormSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required.').max(100, 'First name must be 100 characters or fewer.'),
  last_name: z.string().trim().min(1, 'Last name is required.').max(100, 'Last name must be 100 characters or fewer.'),
  middle_name: z.string().trim().max(100, 'Middle name must be 100 characters or fewer.').optional(),
  suffix: z.string().trim().max(20, 'Suffix must be 20 characters or fewer.').optional(),
  school_id: z.number({ error: 'Select a valid school.' }).int().positive('Select a valid school.').optional(),
  student_id: z.string().trim().max(50, 'Student ID must be 50 characters or fewer.').optional(),
  graduation_year: z
    .number({ error: 'Graduation year is required.' })
    .int('Graduation year must be a whole number.')
    .min(MIN_GRADUATION_YEAR, `Graduation year must be ${MIN_GRADUATION_YEAR} or later.`)
    .refine((year) => year <= new Date().getFullYear() + 1, 'Graduation year cannot be more than one year in the future.'),
  section_strand: z.string().trim().min(1, 'Section/Strand is required.').max(100, 'Section/Strand must be 100 characters or fewer.'),
  gender: z.enum(['male', 'female'], { error: 'Gender must be male or female.' }).optional(),
  birthdate: z
    .iso.date('Birthdate must be a valid date.')
    .refine((value) => value < localTodayIsoDate(), 'Birthdate must be before today.')
    .optional(),
  contact_number: philippinePhoneNumber.optional(),
  contact_email: z.email('Must be a valid email address.').max(255, 'Email must be 255 characters or fewer.').optional(),
  address: z.string().trim().max(500, 'Address must be 500 characters or fewer.').optional(),
  employment_status: z.enum(['student', 'self_employed', 'unemployed', 'employed', 'retired']).nullable().optional(),
  company_name: z.string().trim().max(255, 'Company Name must be 255 characters or fewer.').nullable().optional(),
  position_in_company: z.string().trim().max(255, 'Position In Company must be 255 characters or fewer.').nullable().optional(),
  privacy: z.enum(['public', 'private'], { error: 'Privacy must be public or private.' }).optional(),
}).superRefine((values, context) => {
  if (values.employment_status !== 'employed' && values.employment_status !== 'self_employed') {
    return;
  }

  if (!values.company_name?.trim()) {
    context.addIssue({ code: 'custom', path: ['company_name'], message: 'Company Name is required.' });
  }
  if (!values.position_in_company?.trim()) {
    context.addIssue({ code: 'custom', path: ['position_in_company'], message: 'Position In Company is required.' });
  }
});

export const AlumniFormSchemaWithRequiredSchool = AlumniFormSchema.superRefine((values, context) => {
  if (!values.school_id) {
    context.addIssue({ code: 'custom', path: ['school_id'], message: 'Select a school.' });
  }
});

export type AlumniFormValues = z.infer<typeof AlumniFormSchema>;
