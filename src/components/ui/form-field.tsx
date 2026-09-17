import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function FormField({ label, error, required, children, className }: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label className={cn(error && 'text-destructive')}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-xs text-destructive animate-in fade-in-0 slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  required?: boolean;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, required, className, ...props }, ref) => {
    return (
      <FormField label={label} error={error} required={required}>
        <Input
          ref={ref}
          className={cn(error && 'border-destructive focus-visible:ring-destructive', className)}
          {...props}
        />
      </FormField>
    );
  }
);
FormInput.displayName = 'FormInput';

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  required?: boolean;
}

export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, required, className, ...props }, ref) => {
    return (
      <FormField label={label} error={error} required={required}>
        <Textarea
          ref={ref}
          className={cn(error && 'border-destructive focus-visible:ring-destructive', className)}
          {...props}
        />
      </FormField>
    );
  }
);
FormTextarea.displayName = 'FormTextarea';
