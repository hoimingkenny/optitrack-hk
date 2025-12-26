'use client';

import { ChakraProvider as ChakraUIProvider, Toaster, createToaster } from '@chakra-ui/react';
import { system } from '@/utils/theme';

// Create toaster instance here to avoid circular dependency
const toaster = createToaster({
  placement: 'top-end',
  pauseOnPageIdle: true,
});

export { toaster };

export default function ChakraProvider({ children }: { children: React.ReactNode }) {
  return (
    <ChakraUIProvider value={system}>
      {children}
      <Toaster toaster={toaster}>
        {(toast) => (
          <div>
            <div>{toast.title}</div>
            {toast.description && <div>{toast.description}</div>}
          </div>
        )}
      </Toaster>
    </ChakraUIProvider>
  );
}
