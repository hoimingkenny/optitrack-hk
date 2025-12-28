'use client';

import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        // Custom color palette for the app
        brand: {
          50: { value: '#e6f2ff' },
          100: { value: '#b3d9ff' },
          200: { value: '#80bfff' },
          300: { value: '#4da6ff' },
          400: { value: '#1a8cff' },
          500: { value: '#0073e6' },
          600: { value: '#2563eb' },
          700: { value: '#1d4ed8' },
          800: { value: '#1e40af' },
          900: { value: '#1e3a8a' },
        },
      },
    },
    semanticTokens: {
      colors: {
        // Light theme background colors
        'bg.canvas': { value: '#ffffff' },
        'bg.surface': { value: '#f8fafc' },
        'bg.muted': { value: '#f1f5f9' },
        'bg.subtle': { value: '#e2e8f0' },
        // Light theme border colors
        'border.default': { value: '#e2e8f0' },
        'border.muted': { value: '#cbd5e0' },
        // Light theme text colors
        'fg.default': { value: '#1e293b' },
        'fg.muted': { value: '#64748b' },
        'fg.subtle': { value: '#94a3b8' },
      },
    },
  },
  globalCss: {
    body: {
      bg: 'bg.canvas',
      color: 'fg.default',
    },
  },
});

export const system = createSystem(defaultConfig, config);
