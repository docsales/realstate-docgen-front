/**
 * Componente de feedback visual para status de processamento OCR
 * Design: inline compacto, monocromatico (slate + primary), sem bordas coloridas
 */

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Clock, Upload } from 'lucide-react';
import type { OcrStatus } from '@/types/ocr.types';

interface OcrStatusLoaderProps {
  status: OcrStatus;
  fileName: string;
  error?: string;
  processingTime?: number;
}

const processingMessages = [
  'Analisando documento...',
  'Extraindo dados...',
  'Processando...',
];

export const OcrStatusLoader: React.FC<OcrStatusLoaderProps> = ({
  status,
  fileName,
  error,
  processingTime,
}) => {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    if (status === 'processing') {
      const interval = setInterval(() => {
        setMsgIdx((prev) => (prev + 1) % processingMessages.length);
      }, 2500);
      return () => clearInterval(interval);
    }
    setMsgIdx(0);
  }, [status]);

  const isError = status === 'error';

  const label =
    status === 'idle' ? 'Aguardando' :
    status === 'uploading' ? 'Enviando...' :
    status === 'processing' ? processingMessages[msgIdx] :
    status === 'completed' ? 'Processado' :
    'Erro ao processar';

  return (
    <div
      className={`
        flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200
        ${isError ? 'bg-red-50 border border-red-200' : 'bg-slate-50 border border-slate-200'}
      `}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 ${isError ? 'text-red-500' : 'text-slate-400'}`}>
        {status === 'idle' && <Clock className="w-4 h-4" />}
        {status === 'uploading' && <Upload className="w-4 h-4 animate-pulse" />}
        {status === 'processing' && <Loader2 className="w-4 h-4 animate-spin" />}
        {status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
        {status === 'error' && <AlertCircle className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <span className={`text-xs font-medium ${isError ? 'text-red-700' : 'text-slate-600'}`}>
          {label}
        </span>
        {status === 'error' && error && (
          <p className="text-xs text-red-500 mt-0.5 line-clamp-1">{error}</p>
        )}
      </div>

      {/* Processing time (completed only) */}
      {status === 'completed' && processingTime && (
        <span className="text-[11px] text-slate-400 flex-shrink-0 tabular-nums">
          {(processingTime / 1000).toFixed(1)}s
        </span>
      )}
    </div>
  );
};

/**
 * Badge compacto inline para status OCR
 */
export const OcrStatusBadge: React.FC<{
  status: OcrStatus;
  compact?: boolean;
}> = ({ status, compact = false }) => {
  const statusConfig = {
    idle: { icon: Clock, label: 'Aguardando', color: 'bg-slate-100 text-slate-500' },
    uploading: { icon: Loader2, label: 'Enviando', color: 'bg-slate-100 text-slate-600' },
    processing: { icon: Loader2, label: 'Processando', color: 'bg-slate-100 text-slate-600' },
    completed: { icon: CheckCircle2, label: 'Concluido', color: 'bg-emerald-50 text-emerald-600' },
    error: { icon: AlertCircle, label: 'Erro', color: 'bg-red-50 text-red-600' },
  };

  const config = statusConfig[status];
  const Icon = config.icon;
  const isAnimating = status === 'uploading' || status === 'processing';

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
      <Icon className={`w-3 h-3 ${isAnimating ? 'animate-spin' : ''}`} />
      {!compact && <span>{config.label}</span>}
    </div>
  );
};
