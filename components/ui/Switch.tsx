'use client';

import { Switch as ChakraSwitch } from '@chakra-ui/react';
import { forwardRef, ReactNode } from 'react';

interface SwitchProps {
  label?: ReactNode;
  checked?: boolean;
  onCheckedChange?: (details: { checked: boolean }) => void;
  disabled?: boolean;
}

export const Switch = forwardRef<HTMLLabelElement, SwitchProps>(
  ({ label, checked, onCheckedChange, disabled, ...props }, ref) => {
    return (
      <ChakraSwitch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        ref={ref}
        {...props}
      >
        <ChakraSwitch.HiddenInput />
        <ChakraSwitch.Control>
          <ChakraSwitch.Thumb />
        </ChakraSwitch.Control>
        {label && <ChakraSwitch.Label>{label}</ChakraSwitch.Label>}
      </ChakraSwitch.Root>
    );
  }
);

Switch.displayName = 'Switch';
