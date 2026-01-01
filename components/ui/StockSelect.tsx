'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  VStack, 
  Text, 
  Spinner, 
  Portal,
  Field,
  Input as ChakraInput
} from '@chakra-ui/react';
import { Stock } from '@/db/schema';

// Simple hook to detect clicks outside
function useOutsideClick({ ref, handler }: { ref: React.RefObject<HTMLElement | null>, handler: () => void }) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

interface StockSelectProps {
  label?: string;
  error?: string;
  value: string; // symbol
  onSelect: (stock: Stock) => void;
  required?: boolean;
}

export default function StockSelect({ label, error, value, onSelect, required }: StockSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const [results, setResults] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useOutsideClick({
    ref: containerRef,
    handler: () => setIsOpen(false),
  });

  // Fetch stocks when search changes
  useEffect(() => {
    const fetchStocks = async () => {
      if (!search || search.length < 1) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      setHasError(false);
      try {
        const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(search)}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data);
          // Only auto-open if the search text is different from the confirmed value
          if (isFocused && search !== value) setIsOpen(true);
        } else {
          setHasError(true);
          if (isFocused && search !== value) setIsOpen(true);
        }
      } catch (error) {
        console.error('Failed to fetch stocks:', error);
        setHasError(true);
        if (isFocused && search !== value) setIsOpen(true);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchStocks, 300);
    return () => clearTimeout(timer);
  }, [search, isFocused]);

  // Sync search with value prop
  useEffect(() => {
    setSearch(value);
  }, [value]);

  const handleSelect = (stock: Stock) => {
    onSelect(stock);
    setSearch(stock.symbol);
    setIsOpen(false);
  };

  const inputId = label?.toLowerCase().replace(/\s/g, '-');

  return (
    <Field.Root invalid={!!error} required={required} ref={containerRef} position="relative" w="full">
      {label && (
        <Field.Label htmlFor={inputId} fontSize="sm" fontWeight="medium" color="fg.muted" mb={1.5}>
          {label}
          {required && <Box as="span" color="red.400" ml={1}>*</Box>}
        </Field.Label>
      )}
      
      <Box position="relative" width="100%">
        <ChakraInput
          ref={inputRef}
          id={inputId}
          placeholder="Search by symbol or name (e.g. 1299.HK or AIA)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            if (search.length > 0) setIsOpen(true);
          }}
          onBlur={() => setIsFocused(false)}
          bg="bg.surface"
          borderColor={error ? 'red.500' : 'border.default'}
          borderRadius="lg"
          _focus={{
            borderColor: error ? 'red.500' : 'brand.500',
            boxShadow: 'none',
            outline: 'none',
          }}
        />
        
        {isLoading && (
          <Box position="absolute" right={3} top="50%" transform="translateY(-50%)" zIndex={1}>
            <Spinner size="xs" color="brand.500" />
          </Box>
        )}
      </Box>

      {isOpen && search.length > 0 && (
        <Box
          position="absolute"
          top="100%"
          left={0}
          right={0}
          mt={1}
          bg="bg.surface"
          borderWidth="1px"
          borderColor="border.default"
          borderRadius="lg"
          boxShadow="lg"
          zIndex={1000}
          maxH="250px"
          overflowY="auto"
        >
          <VStack align="stretch" p={1} gap={0}>
            {results.map((stock) => (
              <Box
                key={stock.id}
                px={3}
                py={2}
                cursor="pointer"
                borderRadius="md"
                _hover={{ bg: 'bg.muted' }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(stock);
                }}
              >
                <Text fontWeight="bold" fontSize="sm">{stock.symbol}</Text>
                <Text fontSize="xs" color="fg.subtle">{stock.name}</Text>
              </Box>
            ))}
            
            {isLoading && results.length === 0 && (
              <Box px={3} py={2}>
                <Text fontSize="sm" color="fg.subtle">Searching...</Text>
              </Box>
            )}

            {!isLoading && !hasError && results.length === 0 && search.length > 0 && (
              <Box px={3} py={2}>
                <Text fontSize="sm" color="fg.subtle">No results found</Text>
              </Box>
            )}

            {!isLoading && hasError && (
              <Box px={3} py={2}>
                <Text fontSize="sm" color="red.400">Failed to load stocks</Text>
              </Box>
            )}
          </VStack>
        </Box>
      )}

      {error && (
        <Field.ErrorText id={`${inputId}-error`} mt={1.5} fontSize="sm" color="red.400">
          {error}
        </Field.ErrorText>
      )}
    </Field.Root>
  );
}
