'use client';

import { Box, Field } from '@chakra-ui/react';
import { forwardRef } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  id?: string;
  required?: boolean;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  name?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, id, required, value, onChange, disabled, name }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s/g, '-');

    return (
      <Field.Root invalid={!!error} required={required}>
        {label && (
          <Field.Label htmlFor={selectId} fontSize="sm" fontWeight="medium" color="fg.muted" mb={1.5}>
            {label}
            {required && <Box as="span" color="red.400" ml={1}>*</Box>}
          </Field.Label>
        )}
        <select
          ref={ref}
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${selectId}-error` : undefined}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            backgroundColor: 'var(--chakra-colors-bg-surface)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: error ? '#ef4444' : 'var(--chakra-colors-border-default)',
            color: 'var(--chakra-colors-fg-default)',
            borderRadius: '0.5rem',
            outline: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <Field.ErrorText id={`${selectId}-error`} mt={1.5} fontSize="sm" color="red.400">
            {error}
          </Field.ErrorText>
        )}
      </Field.Root>
    );
  }
);

Select.displayName = 'Select';

export default Select;
