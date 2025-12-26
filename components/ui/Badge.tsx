'use client';

import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'custom';
  className?: string;
}

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variants = {
    default: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    success: 'bg-green-500/20 text-green-400 border-green-500/30',
    warning: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    danger: 'bg-red-500/20 text-red-400 border-red-500/30',
    info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    custom: '', // Use className for custom styling
  };

  return (
    <span 
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

// Pre-styled badges for trade status
interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const statusStyles: Record<string, string> = {
    'Open': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'Closed': 'bg-green-500/20 text-green-400 border-green-500/30',
    'Expired': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    'Exercised': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'Lapsed': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  return (
    <Badge variant="custom" className={statusStyles[status] || statusStyles['Open']}>
      {status}
    </Badge>
  );
}

// Pre-styled badges for trade direction
interface DirectionBadgeProps {
  direction: string;
}

export function DirectionBadge({ direction }: DirectionBadgeProps) {
  const directionStyles: Record<string, string> = {
    'Sell Put': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'Sell Call': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    'Buy Put': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    'Buy Call': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  };

  return (
    <Badge variant="custom" className={directionStyles[direction] || ''}>
      {direction}
    </Badge>
  );
}
