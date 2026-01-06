'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  VStack, 
  Text, 
  Spinner, 
  Portal,
  Field,
  Flex,
  Badge,
  HStack
} from '@chakra-ui/react';
import { OptionChainItem } from '@/utils/futu/client';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface OptionSelectProps {
  label?: string;
  error?: string;
  symbol: string;
  expiryDate: string;
  optionType: string;
  value: string; // futu_code
  onSelect: (item: OptionChainItem) => void;
  required?: boolean;
  disabled?: boolean;
}

export default function OptionSelect({ 
  label, 
  error, 
  symbol, 
  expiryDate, 
  optionType,
  value, 
  onSelect, 
  required,
  disabled
}: OptionSelectProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<OptionChainItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch options when criteria change
  useEffect(() => {
    const fetchOptions = async () => {
      if (!symbol || !expiryDate || !optionType) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      setHasError(false);
      try {
        const response = await fetch(`/api/futu/option-chain?symbol=${symbol}&date=${expiryDate}`);
        if (response.ok) {
          const data = await response.json();
          // Filter by option type (1 = Call, 2 = Put)
          const typeNum = optionType === 'Call' ? 1 : 2;
          const filtered = data.filter((item: OptionChainItem) => item.optionType === typeNum);
          setResults(filtered);
        } else {
          setHasError(true);
        }
      } catch (error) {
        console.error('Failed to fetch options:', error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOptions();
  }, [symbol, expiryDate, optionType]);

  const handleSelect = (item: OptionChainItem) => {
    onSelect(item);
    setIsOpen(false);
  };

  const selectedItem = results.find(r => r.code === value);

  return (
    <Field.Root invalid={!!error} required={required} w="full">
      {label && (
        <Field.Label fontSize="sm" fontWeight="medium" color="fg.muted" mb={1.5}>
          {label}
          {required && <Box as="span" color="red.400" ml={1}>*</Box>}
        </Field.Label>
      )}
      
      <Box position="relative" ref={containerRef} w="full">
        <Box
          p={2}
          borderWidth="1px"
          borderColor={error ? 'red.400' : 'border.default'}
          borderRadius="md"
          bg={disabled ? 'bg.muted' : 'bg.surface'}
          cursor={disabled ? 'not-allowed' : 'pointer'}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          minH="40px"
          display="flex"
          alignItems="center"
        >
          {selectedItem ? (
            <HStack justify="space-between" w="full">
              <Text fontWeight="bold">{selectedItem.strikePrice}</Text>
              <Text fontSize="xs" color="fg.muted">{selectedItem.code}</Text>
            </HStack>
          ) : (
            <Text color="fg.subtle">{t('trade.select_strike')}</Text>
          )}
        </Box>

        {isOpen && !disabled && (
          <Portal>
            <Box
              position="absolute"
              zIndex="popover"
              bg="bg.surface"
              boxShadow="lg"
              borderRadius="md"
              borderWidth="1px"
              borderColor="border.default"
              maxH="300px"
              overflowY="auto"
              minW={containerRef.current?.offsetWidth}
              style={{
                top: (containerRef.current?.getBoundingClientRect().bottom || 0) + window.scrollY + 5,
                left: (containerRef.current?.getBoundingClientRect().left || 0) + window.scrollX,
              }}
            >
              {isLoading ? (
                <Flex p={4} justify="center">
                  <Spinner size="sm" />
                </Flex>
              ) : results.length > 0 ? (
                results.map((item) => (
                  <Box
                    key={item.code}
                    px={3}
                    py={2}
                    cursor="pointer"
                    _hover={{ bg: 'blue.50' }}
                    onClick={() => handleSelect(item)}
                    borderBottomWidth="1px"
                    borderColor="border.muted"
                  >
                    <Flex justify="space-between" align="center">
                      <VStack align="start" gap={0}>
                        <Text fontWeight="bold">{t('trade.strike_label').replace('{price}', item.strikePrice.toString())}</Text>
                        <Text fontSize="xs" color="fg.muted">{t('trade.last_price').replace('{price}', (item.premium || '-').toString())}</Text>
                      </VStack>
                      <Badge size="xs" colorPalette={item.optionType === 1 ? 'green' : 'red'}>
                        {item.optionType === 1 ? 'CALL' : 'PUT'}
                      </Badge>
                    </Flex>
                  </Box>
                ))
              ) : (
                <Box p={4} textAlign="center">
                  <Text fontSize="sm" color="fg.muted">
                    {symbol && expiryDate ? t('trade.no_options_found') : t('trade.select_stock_expiry')}
                  </Text>
                </Box>
              )}
            </Box>
          </Portal>
        )}
      </Box>
      
      {error && (
        <Field.ErrorText mt={1.5} fontSize="sm" color="red.400">
          {error}
        </Field.ErrorText>
      )}
    </Field.Root>
  );
}
