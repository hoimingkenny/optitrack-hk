'use client';

import { Box, Input as ChakraInput, Field } from '@chakra-ui/react';
import { forwardRef, InputHTMLAttributes } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, required, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-');

    return (
      <Field.Root invalid={!!error} required={required}>
        {label && (
          <Field.Label htmlFor={inputId} fontSize="sm" fontWeight="medium" color="gray.300" mb={1.5}>
            {label}
            {required && <Box as="span" color="red.400" ml={1}>*</Box>}
          </Field.Label>
        )}
        <ChakraInput
          ref={ref}
          id={inputId}
          bg="gray.800"
          borderColor={error ? 'red.500' : 'gray.700'}
          color="gray.100"
          borderRadius="lg"
          px={3}
          py={2}
          _placeholder={{ color: 'gray.500' }}
          _focus={{
            borderColor: error ? 'red.500' : 'blue.500',
            boxShadow: 'none',
            outline: 'none',
          }}
          _disabled={{ opacity: 0.5, cursor: 'not-allowed' }}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {error && (
          <Field.ErrorText id={`${inputId}-error`} mt={1.5} fontSize="sm" color="red.400">
            {error}
          </Field.ErrorText>
        )}
        {helperText && !error && (
          <Field.HelperText id={`${inputId}-helper`} mt={1.5} fontSize="sm" color="gray.500">
            {helperText}
          </Field.HelperText>
        )}
      </Field.Root>
    );
  }
);

Input.displayName = 'Input';

export default Input;
