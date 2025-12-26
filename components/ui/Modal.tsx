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
      placement="center"
      motionPreset="slide-in-bottom"
    >
      <DialogBackdrop bg="blackAlpha.700" backdropFilter="blur(4px)" />
      <DialogContent
        bg="gray.900"
        borderWidth="1px"
        borderColor="gray.800"
        borderRadius="xl"
        shadow="2xl"
      >
        <DialogHeader
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          p={4}
          borderBottomWidth="1px"
          borderColor="gray.800"
        >
          <DialogTitle fontSize="lg" fontWeight="semibold" color="gray.100">
            {title}
          </DialogTitle>
          <DialogCloseTrigger
            position="relative"
            top="0"
            right="0"
            p={1}
            color="gray.400"
            _hover={{ color: 'gray.200', bg: 'gray.800' }}
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
            borderColor="gray.800"
          >
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
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
