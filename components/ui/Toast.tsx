'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

// Simple toast store
let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

function notifyListeners() {
  toastListeners.forEach(listener => listener([...toasts]));
}

export function addToast(toast: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).substr(2, 9);
  toasts = [...toasts, { ...toast, id }];
  notifyListeners();

  // Auto remove after duration
  const duration = toast.duration ?? 5000;
  if (duration > 0) {
    setTimeout(() => removeToast(id), duration);
  }
}

export function removeToast(id: string) {
  toasts = toasts.filter(t => t.id !== id);
  notifyListeners();
}

// Toast item component
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const icons = {
    success: (
      <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const backgrounds = {
    success: 'bg-green-900/50 border-green-700',
    error: 'bg-red-900/50 border-red-700',
    warning: 'bg-orange-900/50 border-orange-700',
    info: 'bg-blue-900/50 border-blue-700',
  };

  return (
    <div 
      className={`
        flex items-center gap-3 p-4 rounded-lg border shadow-lg
        ${backgrounds[toast.type]}
        animate-slide-in
      `}
      role="alert"
    >
      {icons[toast.type]}
      <p className="text-gray-100 text-sm flex-1">{toast.message}</p>
      <button 
        onClick={onRemove}
        className="text-gray-400 hover:text-gray-200 transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// Toast container component
export function ToastContainer() {
  const [toastList, setToastList] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const listener = (newToasts: Toast[]) => setToastList(newToasts);
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div 
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full"
      aria-live="polite"
    >
      {toastList.map(toast => (
        <ToastItem 
          key={toast.id} 
          toast={toast} 
          onRemove={() => removeToast(toast.id)} 
        />
      ))}
    </div>,
    document.body
  );
}

// Helper functions for common toasts
export const toast = {
  success: (message: string) => addToast({ message, type: 'success' }),
  error: (message: string) => addToast({ message, type: 'error' }),
  warning: (message: string) => addToast({ message, type: 'warning' }),
  info: (message: string) => addToast({ message, type: 'info' }),
};
