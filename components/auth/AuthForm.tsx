'use client';

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
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
    <div className="w-full max-w-md mx-auto">
      <Card className="p-6">
        <CardHeader className="p-0 mb-6">
          <CardTitle className="text-center text-2xl font-bold">
            {mode === 'login' ? t('auth.sign_in') : t('auth.create_account')}
          </CardTitle>
          <p className="text-center text-muted-foreground text-sm mt-2">
            {mode === 'login' 
              ? t('auth.welcome_subtitle') 
              : t('auth.start_tracking')}
          </p>
        </CardHeader>

        <CardContent className="p-0">
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4">
              {(error || validationError) && (
                <div
                  className="w-full p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm"
                >
                  {error || validationError}
                </div>
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

              <div className="w-full mt-2">
                <Button type="submit" size="lg" disabled={isLoading} className="w-full">
                  {mode === 'login' ? t('auth.sign_in') : t('auth.create_account')}
                </Button>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                {mode === 'login' ? t('auth.no_account') + ' ' : t('auth.has_account') + ' '}
                <button
                  type="button"
                  onClick={onToggleMode}
                  className="text-blue-500 font-medium hover:text-blue-400 transition-colors bg-transparent border-none cursor-pointer p-0"
                >
                  {mode === 'login' ? t('auth.sign_up_link') : t('auth.sign_in_link')}
                </button>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
