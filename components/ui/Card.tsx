'use client';

import { Box } from '@chakra-ui/react';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingMap = {
  none: 0,
  sm: 3,
  md: 4,
  lg: 6,
};

export default function Card({ children, padding = 'md' }: CardProps) {
  return (
    <Box
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="xl"
      p={paddingMap[padding]}
    >
      {children}
    </Box>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children }: CardHeaderProps) {
  return (
    <Box borderBottomWidth="1px" borderColor="border.default" pb={4} mb={4}>
      {children}
    </Box>
  );
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children }: CardTitleProps) {
  return (
    <Box as="h3" fontSize="lg" fontWeight="semibold" color="fg.default">
      {children}
    </Box>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children }: CardContentProps) {
  return <Box>{children}</Box>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children }: CardFooterProps) {
  return (
    <Box borderTopWidth="1px" borderColor="border.default" pt={4} mt={4}>
      {children}
    </Box>
  );
}
