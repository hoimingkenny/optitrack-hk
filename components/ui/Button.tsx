'use client';

import { Button as ChakraButton, Spinner } from '@chakra-ui/react';
import { forwardRef, ReactNode } from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading, disabled, children, onClick, type = 'button', ...props }, ref) => {
    const variantStyles = {
      primary: {
        bg: 'blue.600',
        color: 'white',
        _hover: { bg: 'blue.700' },
      },
      secondary: {
        bg: 'gray.700',
        color: 'gray.100',
        borderWidth: '1px',
        borderColor: 'gray.600',
        _hover: { bg: 'gray.600' },
      },
      danger: {
        bg: 'red.600',
        color: 'white',
        _hover: { bg: 'red.700' },
      },
      ghost: {
        bg: 'transparent',
        color: 'gray.300',
        _hover: { bg: 'gray.800' },
      },
    };

    const sizeStyles = {
      sm: { px: 3, py: 1.5, fontSize: 'sm' },
      md: { px: 4, py: 2, fontSize: 'sm' },
      lg: { px: 6, py: 3, fontSize: 'md' },
    };

    return (
      <ChakraButton
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={disabled || isLoading}
        borderRadius="lg"
        fontWeight="medium"
        transition="colors"
        {...variantStyles[variant]}
        {...sizeStyles[size]}
        {...props}
      >
        {isLoading ? (
          <>
            <Spinner size="sm" mr={2} />
            Loading...
          </>
        ) : children}
      </ChakraButton>
    );
  }
);

Button.displayName = 'Button';

export default Button;
