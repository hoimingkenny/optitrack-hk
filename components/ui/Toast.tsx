'use client';

import { toaster } from '@/components/providers/ChakraProvider';

// Toast helper functions
export const toast = {
  success: (message: string) =>
    toaster.create({
      title: message,
      type: 'success',
      duration: 5000,
    }),
  error: (message: string) =>
    toaster.create({
      title: message,
      type: 'error',
      duration: 5000,
    }),
  warning: (message: string) =>
    toaster.create({
      title: message,
      type: 'warning',
      duration: 5000,
    }),
  info: (message: string) =>
    toaster.create({
      title: message,
      type: 'info',
      duration: 5000,
    }),
};

// Legacy exports for backward compatibility
export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export function addToast(toastData: Omit<Toast, 'id'>) {
  toaster.create({
    title: toastData.message,
    type: toastData.type,
    duration: toastData.duration ?? 5000,
  });
}

export function removeToast(id: string) {
  toaster.dismiss(id);
}

// ToastContainer is no longer needed - handled by ChakraProvider
export function ToastContainer() {
  return null;
}
