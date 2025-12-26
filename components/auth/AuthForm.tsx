'use client';

import { useState, FormEvent } from 'react';
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
    <Card padding="lg" className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-2xl">
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </CardTitle>
        <p className="text-center text-gray-400 text-sm mt-2">
          {mode === 'login' 
            ? 'Welcome back to OptiTrack HK' 
            : 'Start tracking your HK options trades'}
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {(error || validationError) && (
            <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
              {error || validationError}
            </div>
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

          <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>

          <p className="text-center text-sm text-gray-400">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={onToggleMode}
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
