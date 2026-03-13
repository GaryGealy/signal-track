import { z } from 'zod';

export const weightSchema = z.object({
  metricType: z.literal('weight'),
  // Note: z.coerce.number() in Zod v4 ignores invalid_type_error — the option is a no-op
  // in the coerce path. Using .refine() for positive validation instead of .positive()
  // is equivalent for all practical inputs.
  value: z.coerce
    .number()
    .refine((val) => val > 0, { message: 'Weight must be positive' }),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required')
});

export const bloodPressureSchema = z.object({
  metricType: z.literal('blood_pressure'),
  systolic: z.coerce
    .number()
    .int()
    .min(1, 'Required'),
  diastolic: z.coerce
    .number()
    .int()
    .min(1, 'Required'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required')
});

export const sleepSchema = z
  .object({
    metricType: z.literal('sleep'),
    bedDate: z.string().min(1, 'Required'),
    bedTime: z.string().min(1, 'Required'),
    wakeDate: z.string().min(1, 'Required'),
    wakeTime: z.string().min(1, 'Required')
  })
  .refine(
    (d) =>
      new Date(`${d.wakeDate}T${d.wakeTime}`) > new Date(`${d.bedDate}T${d.bedTime}`),
    { message: 'Wake time must be after bedtime', path: ['wakeTime'] }
  );

export const workSchema = z
  .object({
    metricType: z.literal('work'),
    workDate: z.string().min(1, 'Required'),
    startTime: z.string().min(1, 'Required'),
    endTime: z.string().min(1, 'Required')
  })
  .refine(
    (d) =>
      new Date(`${d.workDate}T${d.endTime}`) > new Date(`${d.workDate}T${d.startTime}`),
    { message: 'End time must be after start time', path: ['endTime'] }
  );

export type WeightData = z.infer<typeof weightSchema>;
export type BloodPressureData = z.infer<typeof bloodPressureSchema>;
export type SleepData = z.infer<typeof sleepSchema>;
export type WorkData = z.infer<typeof workSchema>;
