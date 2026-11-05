import React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  side?: 'right' | 'bottom'
}

/** Painel lateral (ou inferior no mobile) usado por todos os formulários do RRMILHAS. */
export function Sheet({ open, onClose, title, children, side = 'right' }: SheetProps) {
  return (
    <div>
      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-[#23201A]/40 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
          />
          <div
            className={cn(
              'fixed z-50 bg-white shadow-2xl flex flex-col',
              side === 'right'
                ? 'sheet-slide inset-y-0 right-0 w-full sm:w-[440px]'
                : 'sheet-slide-up inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl',
            )}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E2D6]">
              <h3 className="font-serif text-lg font-semibold text-[#23201A]">{title}</h3>
              <button
                onClick={onClose}
                className="grid place-items-center w-9 h-9 rounded-lg hover:bg-[#FAF7F0] transition-colors"
                aria-label="Fechar"
              >
                <X className="w-4 h-4 text-[#6E6A5E]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </div>
        </>
      )}
    </div>
  )
}
