import { z } from 'zod';

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Please upload a valid image file (JPEG, PNG, WEBP, or GIF).',
    };
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'File size must be less than 5MB.',
    };
  }
  return { valid: true };
}

export const clientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address').or(z.literal('')).or(z.null()).optional(),
  phone: z.string().or(z.null()).optional(),
  address: z.string().or(z.null()).optional(),
  city: z.string().or(z.null()).optional(),
  country: z.string().or(z.null()).optional(),
  taxId: z.string().or(z.null()).optional(),
  notes: z.string().or(z.null()).optional(),
});

export const businessSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address').or(z.literal('')).or(z.null()).optional(),
  phone: z.string().or(z.null()).optional(),
  address: z.string().or(z.null()).optional(),
  city: z.string().or(z.null()).optional(),
  country: z.string().or(z.null()).optional(),
  taxId: z.string().or(z.null()).optional(),
  logo: z.string().or(z.null()).optional(),
  signature: z.string().or(z.null()).optional(),
  accentColor: z.string().or(z.null()).optional(),
  font: z.string().or(z.null()).optional(),
  footerText: z.string().or(z.null()).optional(),
});

export const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  clientId: z.string().min(1, 'Client is required'),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  notes: z.string().or(z.null()).optional(),
  paymentQR: z.string().or(z.null()).optional(),
  items: z.array(z.any()).min(1, 'At least one item is required'),
});

export function getErrorsObject(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  error.errors.forEach((err) => {
    if (err.path.length > 0) {
      errors[err.path[0].toString()] = err.message;
    }
  });
  return errors;
}

export function getFirstError(error: z.ZodError): string {
  if (error.errors.length > 0) {
    return error.errors[0].message;
  }
  return 'Validation error';
}
