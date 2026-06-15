'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { type ReactNode } from 'react'
import { cn } from '../utils'

export interface ModalProps {
  open:        boolean
  onClose:     () => void
  title?:      string
  description?: string
  children:    ReactNode
  className?:  string
  /** Default: 'md' */
  size?:       'sm' | 'md' | 'lg' | 'xl' | 'full'
}

const SIZE_CLASS = {
  sm:   'max-w-sm',
  md:   'max-w-lg',
  lg:   'max-w-2xl',
  xl:   'max-w-4xl',
  full: 'max-w-[95vw]',
}

/**
 * Modal accesible basado en Radix Dialog.
 *
 * @example
 * <Modal open={isOpen} onClose={() => setIsOpen(false)} title="Nuevo prospecto">
 *   <LeadForm onSubmit={...} />
 * </Modal>
 */
export function Modal({ open, onClose, title, description, children, className, size = 'md' }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-full translate-x-[-50%] translate-y-[-50%]',
            'bg-card rounded-lg border border-border shadow-xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
            SIZE_CLASS[size],
            className,
          )}
        >
          {title && (
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <Dialog.Title className="text-base font-semibold text-foreground">{title}</Dialog.Title>
                {description && (
                  <Dialog.Description className="mt-0.5 text-sm text-muted-foreground">{description}</Dialog.Description>
                )}
              </div>
              <Dialog.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
                <span className="text-muted-foreground text-xl leading-none">&times;</span>
              </Dialog.Close>
            </div>
          )}
          <div className="p-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
