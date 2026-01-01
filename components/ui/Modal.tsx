'use client';

import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogCloseTrigger,
  DialogBackdrop,
  Portal,
  Box,
} from '@chakra-ui/react';
import { ReactNode } from 'react';
import Button from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
} as const;

export default function Modal({ isOpen, onClose, title, children, footer, size = 'md' }: ModalProps) {
  return (
    <DialogRoot
      open={isOpen}
      onOpenChange={(details) => !details.open && onClose()}
      size={sizeMap[size]}
    >
      <Portal>
        <DialogBackdrop bg="blackAlpha.700" backdropFilter="blur(4px)" zIndex="9998" />
        <Box
          position="fixed"
          top="0"
          left="0"
          width="100vw"
          height="100vh"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex="9999"
          pointerEvents="none"
        >
          <DialogContent
            bg="bg.surface"
            borderWidth="1px"
            borderColor="border.default"
            borderRadius="xl"
            shadow="2xl"
            pointerEvents="auto"
            maxW={size === 'sm' ? 'sm' : size === 'md' ? 'md' : size === 'lg' ? 'lg' : 'xl'}
            w="full"
          >
            <DialogHeader
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              p={4}
              borderBottomWidth="1px"
              borderColor="border.default"
            >
              <DialogTitle fontSize="lg" fontWeight="semibold" color="fg.default">
                {title}
              </DialogTitle>
              <DialogCloseTrigger
                position="relative"
                top="0"
                right="0"
                p={1}
                color="fg.muted"
                _hover={{ color: 'fg.default', bg: 'bg.muted' }}
                borderRadius="lg"
              />
            </DialogHeader>

            <DialogBody p={4} maxH="70vh" overflowY="auto">
              {children}
            </DialogBody>

            {footer && (
              <DialogFooter
                display="flex"
                alignItems="center"
                justifyContent="flex-end"
                gap={3}
                p={4}
                borderTopWidth="1px"
                borderColor="border.default"
              >
                {footer}
              </DialogFooter>
            )}
          </DialogContent>
        </Box>
      </Portal>
    </DialogRoot>
  );
}

// Confirm dialog helper
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <p style={{ color: '#d1d5db' }}>{message}</p>
    </Modal>
  );
}
