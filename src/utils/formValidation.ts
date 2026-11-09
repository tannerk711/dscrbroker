import { z } from 'zod/v4';

export const loanGoalSchema = z.enum(['purchase', 'refinance', 'flip']);

export const propertyTypeSchema = z.enum([
  'single_family',
  'warrantable_condo',
  'non_warrantable_condo',
  'multi_family_small',
  'multi_family_large',
]);

export const stateSchema = z.string().length(2);

export const creditScoreSchema = z.enum([
  '740_plus',
  '700_739',
  '640_699',
  'below_640',
]);

export const cashFlowSchema = z.enum(['positive', 'break_even', 'negative']);

export const usCitizenSchema = z.enum(['yes', 'permanent_resident', 'foreign_national']);

export const timelineSchema = z.enum([
  'ready_now',
  'within_30_days',
  'within_90_days',
  'just_researching',
]);

export const contactSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(50, 'First name is too long'),

  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(50, 'Last name is too long'),

  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),

  phone: z
    .string()
    .trim()
    .min(1, 'Phone number is required')
    .refine(
      (val) => {
        const digits = val.replace(/\D/g, '');
        return digits.length === 10 || digits.length === 11;
      },
      'Please enter a valid 10-digit phone number'
    )
    .refine(
      (val) => {
        const digits = val.replace(/\D/g, '');
        return !/(\d)\1{4,}/.test(digits);
      },
      'Please enter a valid phone number'
    ),

  consent: z.literal(true, {
    message: 'You must agree to be contacted',
  }),
});
