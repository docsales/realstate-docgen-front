import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonVariant?: 'primary' | 'danger';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmButtonVariant = 'primary',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${confirmButtonVariant === 'danger'
                ? 'bg-red-100'
                : 'bg-blue-100'
              }`}>
              <AlertCircle className={`w-6 h-6 ${confirmButtonVariant === 'danger'
                  ? 'text-red-600'
                  : 'text-blue-600'
                }`} />
            </div>
            <h3 className="text-xl font-bold text-slate-800">
              {title}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            icon={<X className="w-3.5 h-3.5" />}
            onClick={onClose}
            disabled={isLoading}
            className="transition-colors"
          />
        </div>

        {/* Body */}
        <div className="px-6 pb-6">
          <p className="text-slate-600 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 rounded-b-xl border-t border-slate-100">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            className="min-w-[100px]"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            isLoading={isLoading}
            className={`min-w-[100px] ${confirmButtonVariant === 'danger'
                ? 'border-none bg-red-600 hover:bg-red-700 text-white'
                : ''
              }`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
