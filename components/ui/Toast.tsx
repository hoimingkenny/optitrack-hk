'use client';

import { toast as sonnerToast } from 'sonner';

// Toast helper functions to match old API
export const toast = {
  success: (message: string) =>
    sonnerToast.success(message),
  error: (message: string) =>
    sonnerToast.error(message),
  warning: (message: string) =>
    sonnerToast.warning(message),
  info: (message: string) =>
    sonnerToast.info(message),
};

// Legacy exports for backward compatibility
export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export function addToast(toastData: Omit<Toast, 'id'>) {
  const { message, type, duration } = toastData;
  const options = { duration: duration ?? 5000 };
  
  switch (type) {
    case 'success':
      sonnerToast.success(message, options);
      break;
    case 'error':
      sonnerToast.error(message, options);
      break;
    case 'warning':
      sonnerToast.warning(message, options);
      break;
    case 'info':
      sonnerToast.info(message, options);
      break;
    default:
      sonnerToast(message, options);
  }
}

export function removeToast(id: string) {
  sonnerToast.dismiss(id);
}

// ToastContainer is no longer needed - handled by RootLayout adding Toaster
export function ToastContainer() {
  return null;
}
