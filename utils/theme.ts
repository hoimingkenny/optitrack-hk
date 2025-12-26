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
        // Background colors
        'bg.canvas': { value: '#000000' },
        'bg.surface': { value: '#111827' },
        'bg.muted': { value: '#1f2937' },
        'bg.subtle': { value: '#374151' },
        // Border colors
        'border.default': { value: '#1f2937' },
        'border.muted': { value: '#374151' },
        // Text colors
        'fg.default': { value: '#f3f4f6' },
        'fg.muted': { value: '#9ca3af' },
        'fg.subtle': { value: '#6b7280' },
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
