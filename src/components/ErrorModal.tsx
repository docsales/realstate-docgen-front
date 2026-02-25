import React from 'react';
import { X, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from './Button';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  details?: string[];
  actionText?: string;
  onAction?: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  details,
  actionText,
  onAction,
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
            <div className="p-2 rounded-full bg-red-100">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">
              {title}
            </h3>
          </div>
          <Button
            variant="ghost"
            icon={<X className="w-3.5 h-3.5" />}
            size="sm"
            onClick={onClose}
            className="transition-colors"
          />
        </div>

        {/* Body */}
        <div className="px-6 pb-6">
          <p className="text-slate-700 leading-relaxed mb-4">
            {message}
          </p>
          
          {details && details.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-900">
                  {details.length === 1 ? 'Ação necessária:' : 'Ações necessárias:'}
                </p>
              </div>
              <ul className="space-y-1 ml-6">
                {details.map((detail, idx) => (
                  <li key={idx} className="text-sm text-red-800">
                    • {detail}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 rounded-b-xl border-t border-slate-100">
          <Button
            variant="secondary"
            onClick={onClose}
            className="min-w-[100px]"
          >
            Fechar
          </Button>
          {actionText && onAction && (
            <Button
              onClick={onAction}
              className="min-w-[100px]"
            >
              {actionText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

