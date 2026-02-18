import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: string
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-md' }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`bg-white rounded-[2rem] shadow-2xl w-full ${maxWidth} overflow-hidden border border-white/20 animate-in zoom-in-95 duration-200`}>
        <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50/50">
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-800">
            <X size={20} />
          </button>
        </div>
        <div className="p-8">
          {children}
        </div>
        {footer && (
          <div className="px-8 py-6 border-t bg-slate-50/50 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', isDestructive = false
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        <p className="text-slate-600 font-medium leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-100 transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest text-white shadow-lg transition-all active:scale-95 ${
              isDestructive ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}

interface PromptModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (value: string) => void
  title: string
  message: string
  placeholder?: string
  initialValue?: string
  confirmText?: string
}

export const PromptModal: React.FC<PromptModalProps> = ({
  isOpen, onClose, onConfirm, title, message, placeholder = '', initialValue = '', confirmText = 'Submit'
}) => {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    if (isOpen) setValue(initialValue)
  }, [isOpen, initialValue])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm(value)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <p className="text-slate-600 font-medium leading-relaxed mb-4">{message}</p>
          <input
            autoFocus
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-100 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-200 transition-all active:scale-95"
          >
            {confirmText}
          </button>
        </div>
      </form>
    </Modal>
  )
}
