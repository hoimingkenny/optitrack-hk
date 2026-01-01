'use client';

import { Badge as ChakraBadge } from '@chakra-ui/react';
import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'custom';
  className?: string;
}

const variantStyles = {
  default: { bg: 'gray.500/20', color: 'gray.400', borderColor: 'gray.500/30' },
  success: { bg: 'green.500/20', color: 'green.400', borderColor: 'green.500/30' },
  warning: { bg: 'orange.500/20', color: 'orange.400', borderColor: 'orange.500/30' },
  danger: { bg: 'red.500/20', color: 'red.400', borderColor: 'red.500/30' },
  info: { bg: 'blue.500/20', color: 'blue.400', borderColor: 'blue.500/30' },
  custom: {},
};

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const styles = variantStyles[variant];

  return (
    <ChakraBadge
      display="inline-flex"
      alignItems="center"
      px={2.5}
      py={0.5}
      borderRadius="full"
      fontSize="xs"
      fontWeight="medium"
      borderWidth="1px"
      className={className}
      {...styles}
    >
      {children}
    </ChakraBadge>
  );
}

// Pre-styled badges for trade status
interface StatusBadgeProps {
  status: string;
}

const statusStyles: Record<string, { bg: string; color: string; borderColor: string }> = {
  'Open': { bg: 'blue.500/20', color: 'blue.400', borderColor: 'blue.500/30' },
  'Closed': { bg: 'green.500/20', color: 'green.400', borderColor: 'green.500/30' },
  'Expired': { bg: 'gray.500/20', color: 'gray.400', borderColor: 'gray.500/30' },
  'Exercised': { bg: 'orange.500/20', color: 'orange.400', borderColor: 'orange.500/30' },
  'Lapsed': { bg: 'gray.500/20', color: 'gray.400', borderColor: 'gray.500/30' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = statusStyles[status] || statusStyles['Open'];

  return (
    <ChakraBadge
      display="inline-flex"
      alignItems="center"
      px={2.5}
      py={0.5}
      borderRadius="full"
      fontSize="xs"
      fontWeight="medium"
      borderWidth="1px"
      {...styles}
    >
      {status}
    </ChakraBadge>
  );
}

// Pre-styled badges for trade direction
interface DirectionBadgeProps {
  direction: string;
}

const directionStyles: Record<string, { bg: string; color: string; borderColor: string }> = {
  'Sell': { bg: 'red.500/20', color: 'red.400', borderColor: 'red.500/30' },
  'Buy': { bg: 'green.500/20', color: 'green.400', borderColor: 'green.500/30' },
};

export function DirectionBadge({ direction }: DirectionBadgeProps) {
  const styles = directionStyles[direction] || {};

  return (
    <ChakraBadge
      display="inline-flex"
      alignItems="center"
      px={2.5}
      py={0.5}
      borderRadius="full"
      fontSize="xs"
      fontWeight="medium"
      borderWidth="1px"
      {...styles}
    >
      {direction}
    </ChakraBadge>
  );
}

// Pre-styled badges for option type
interface OptionTypeBadgeProps {
  type: string;
}

const optionTypeStyles: Record<string, { bg: string; color: string; borderColor: string }> = {
  'Call': { bg: 'cyan.500/20', color: 'cyan.400', borderColor: 'cyan.500/30' },
  'Put': { bg: 'purple.500/20', color: 'purple.400', borderColor: 'purple.500/30' },
};

export function OptionTypeBadge({ type }: OptionTypeBadgeProps) {
  const styles = optionTypeStyles[type] || {};

  return (
    <ChakraBadge
      display="inline-flex"
      alignItems="center"
      px={2.5}
      py={0.5}
      borderRadius="full"
      fontSize="xs"
      fontWeight="medium"
      borderWidth="1px"
      {...styles}
    >
      {type}
    </ChakraBadge>
  );
}
