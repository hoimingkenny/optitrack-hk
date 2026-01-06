'use client';

import { useState, FormEvent } from 'react';
import { Box, VStack, Text } from '@chakra-ui/react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useLanguage } from '@/components/providers/LanguageProvider';

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
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!email || !password) {
      setValidationError(t('auth.email_password_required'));
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setValidationError(t('auth.passwords_no_match'));
      return;
    }

    if (password.length < 6) {
      setValidationError(t('auth.password_min_length'));
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
              {mode === 'login' ? t('auth.sign_in') : t('auth.create_account')}
            </Text>
          </CardTitle>
          <Text textAlign="center" color="fg.muted" fontSize="sm" mt={2}>
            {mode === 'login' 
              ? t('auth.welcome_subtitle') 
              : t('auth.start_tracking')}
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
                label={t('auth.email_label')}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <Input
                label={t('auth.password_label')}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />

              {mode === 'signup' && (
                <Input
                  label={t('auth.confirm_password_label')}
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
                  <Box w="full">{mode === 'login' ? t('auth.sign_in') : t('auth.create_account')}</Box>
                </Button>
              </Box>

              <Text textAlign="center" fontSize="sm" color="gray.400">
                {mode === 'login' ? t('auth.no_account') + ' ' : t('auth.has_account') + ' '}
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
                  {mode === 'login' ? t('auth.sign_up_link') : t('auth.sign_in_link')}
                </button>
              </Text>
            </VStack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
