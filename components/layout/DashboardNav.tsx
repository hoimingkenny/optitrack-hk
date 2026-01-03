'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, Flex, HStack, Text } from '@chakra-ui/react';
import Button from '@/components/ui/Button';

interface DashboardNavProps {
  onSignOut: () => void;
  userEmail?: string;
}

export default function DashboardNav({ onSignOut, userEmail }: DashboardNavProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: HomeIcon },
    { href: '/trades', label: 'All Trades', icon: ListIcon },
    { href: '/futu/options', label: 'Options', icon: ChartBarIcon },
  ];

  return (
    <Box
      as="nav"
      bg="bg.surface"
      borderBottomWidth="1px"
      borderColor="border.default"
      position="sticky"
      top={0}
      zIndex={40}
    >
      <Box maxW="7xl" mx="auto" px={{ base: 4, sm: 6, lg: 8 }}>
        <Flex alignItems="center" justifyContent="space-between" h={16}>
          {/* Logo */}
          <Link href="/">
            <HStack gap={2}>
              <Text fontSize="xl" fontWeight="bold" color="brand.500">📈</Text>
              <Text fontSize="lg" fontWeight="semibold" color="fg.default">OptiTrack HK</Text>
            </HStack>
          </Link>

          {/* Nav Links */}
          <HStack gap={1} display={{ base: 'none', md: 'flex' }}>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <HStack
                    gap={2}
                    px={4}
                    py={2}
                    borderRadius="lg"
                    fontSize="sm"
                    fontWeight="medium"
                    transition="colors"
                    bg={isActive ? 'brand.500/20' : 'transparent'}
                    color={isActive ? 'brand.500' : 'fg.muted'}
                    _hover={{
                      color: isActive ? 'brand.500' : 'fg.default',
                      bg: isActive ? 'brand.500/20' : 'bg.muted',
                    }}
                  >
                    <item.icon className="w-4 h-4" />
                    <Text>{item.label}</Text>
                  </HStack>
                </Link>
              );
            })}
          </HStack>

          {/* User Menu */}
          <HStack gap={4}>
            {userEmail && (
              <Text
                display={{ base: 'none', sm: 'block' }}
                fontSize="sm"
                color="fg.muted"
                truncate
                maxW="150px"
              >
                {userEmail}
              </Text>
            )}
            <Button variant="ghost" size="sm" onClick={onSignOut}>
              Sign Out
            </Button>
          </HStack>
        </Flex>
      </Box>

      {/* Mobile Nav */}
      <Flex
        display={{ base: 'flex', md: 'none' }}
        borderTopWidth="1px"
        borderColor="border.default"
        px={2}
        py={2}
        gap={1}
        overflowX="auto"
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <HStack
                gap={2}
                px={3}
                py={2}
                borderRadius="lg"
                fontSize="sm"
                fontWeight="medium"
                whiteSpace="nowrap"
                bg={isActive ? 'brand.500/20' : 'transparent'}
                color={isActive ? 'brand.500' : 'fg.muted'}
                _hover={{
                  color: isActive ? 'brand.500' : 'fg.default',
                  bg: isActive ? 'brand.500/20' : 'bg.muted',
                }}
              >
                <item.icon className="w-4 h-4" />
                <Text>{item.label}</Text>
              </HStack>
            </Link>
          );
        })}
      </Flex>
    </Box>
  );
}

// Icons
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}

function ChartBarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
