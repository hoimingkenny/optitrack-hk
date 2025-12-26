'use client';

import { useState, FormEvent } from 'react';
import { Box, VStack, Text } from '@chakra-ui/react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

interface AuthFormProps {
  mode: 'login' | 'signup';
  onSubmit: (email: string, password: string) => Promise<void>;
  onToggleMode: () => void;
  isLoading?: boolean;
  error?: string;
}

export default function AuthForm({ 
  mode, 
  onSubmit, 
  onToggleMode, 
  isLoading = false,
  error 
}: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!email || !password) {
      setValidationError('Email and password are required');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return;
    }

    await onSubmit(email, password);
  };

  return (
    <Box w="full" maxW="md" mx="auto">
      <Card padding="lg">
        <CardHeader>
          <CardTitle>
            <Text textAlign="center" fontSize="2xl">
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </Text>
          </CardTitle>
          <Text textAlign="center" color="gray.400" fontSize="sm" mt={2}>
            {mode === 'login' 
              ? 'Welcome back to OptiTrack HK' 
              : 'Start tracking your HK options trades'}
          </Text>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit}>
            <VStack gap={4}>
              {(error || validationError) && (
                <Box
                  w="full"
                  p={3}
                  bg="red.900/30"
                  borderWidth="1px"
                  borderColor="red.700"
                  borderRadius="lg"
                  color="red.400"
                  fontSize="sm"
                >
                  {error || validationError}
                </Box>
              )}

              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />

              {mode === 'signup' && (
                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              )}

              <Box w="full">
                <Button type="submit" size="lg" isLoading={isLoading}>
                  <Box w="full">{mode === 'login' ? 'Sign In' : 'Create Account'}</Box>
                </Button>
              </Box>

              <Text textAlign="center" fontSize="sm" color="gray.400">
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button
                  type="button"
                  onClick={onToggleMode}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#60a5fa',
                    fontWeight: 500,
                    fontSize: 'inherit',
                    fontFamily: 'inherit',
                    padding: 0,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#93c5fd'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#60a5fa'}
                >
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </Text>
            </VStack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
