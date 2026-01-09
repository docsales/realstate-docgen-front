import React, { useEffect } from 'react';
import { Lock } from 'lucide-react';
import { Button } from './Button';

interface DealLockedModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  onGoHome: () => void;
  onGoToDetails: () => void;
  /**
   * Caso o modal seja fechado por algum motivo externo (bug, unmount parcial, ESC, etc),
   * usamos isso como fallback para redirecionar o usuário.
   */
  onUnexpectedClose?: () => void;
}

export const DealLockedModal: React.FC<DealLockedModalProps> = ({
  isOpen,
  title = 'Edição bloqueada',
  message = 'Este documento já foi enviado para assinatura e não pode mais ser editado.',
  onGoHome,
  onGoToDetails,
  onUnexpectedClose,
}) => {
  // Fallback: se ESC for pressionado, não “fecha” o modal; redireciona o usuário.
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onUnexpectedClose?.();
      }
    };

    // Usar `capture=true` (boolean) pra garantir simetria no removeEventListener.
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen, onUnexpectedClose]);

  // Fallback: se algum fluxo externo conseguir derrubar o modal, redireciona.
  useEffect(() => {
    if (!isOpen) onUnexpectedClose?.();
  }, [isOpen, onUnexpectedClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop (não clicável) */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deal-locked-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-slate-100">
              <Lock className="w-6 h-6 text-slate-600" />
            </div>
            <h3 id="deal-locked-title" className="text-xl font-bold text-slate-800">
              {title}
            </h3>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-6">
          <p className="text-slate-600 leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 pt-0">
          <Button variant="secondary" onClick={onGoHome}>
            Ir para o início
          </Button>
          <Button variant="primary" onClick={onGoToDetails}>
            Ver detalhes
          </Button>
        </div>
      </div>
    </div>
  );
};

