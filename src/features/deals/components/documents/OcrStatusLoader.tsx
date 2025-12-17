/**
 * Componente de feedback visual para status de processamento OCR
 */

import { Loader2, CheckCircle2, AlertCircle, Clock, Upload } from 'lucide-react';
import type { OcrStatus } from '@/types/ocr.types';

interface OcrStatusLoaderProps {
  status: OcrStatus;
  fileName: string;
  error?: string;
  progress?: number;
  processingTime?: number;
}

export const OcrStatusLoader: React.FC<OcrStatusLoaderProps> = ({
  status,
  fileName,
  error,
  progress = 0,
  processingTime,
}) => {
  // Configuração de status
  const statusConfig = {
    idle: {
      icon: Clock,
      label: 'Aguardando',
      color: 'text-slate-400',
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-200',
    },
    uploading: {
      icon: Upload,
      label: 'Enviando',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    processing: {
      icon: Loader2,
      label: 'Processando OCR',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
    completed: {
      icon: CheckCircle2,
      label: 'Concluído',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    error: {
      icon: AlertCircle,
      label: 'Erro',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;
  const isAnimating = status === 'uploading' || status === 'processing';

  return (
    <div 
      className={`
        relative overflow-hidden rounded-lg border-2 p-4 transition-all duration-300
        ${config.borderColor} ${config.bgColor}
      `}
    >
      {/* Barra de progresso */}
      {(status === 'uploading' || status === 'processing') && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200">
          <div 
            className={`h-full transition-all duration-300 ${
              status === 'uploading' ? 'bg-blue-500' : 'bg-purple-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Ícone com animação */}
        <div className={`flex-shrink-0 ${config.color}`}>
          <Icon 
            className={`w-5 h-5 ${isAnimating ? 'animate-spin' : ''}`}
          />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className={`text-sm font-semibold ${config.color} truncate`}>
              {config.label}
            </h4>
            {processingTime && status === 'completed' && (
              <span className="text-xs text-slate-500">
                {(processingTime / 1000).toFixed(1)}s
              </span>
            )}
          </div>

          <p className="text-xs text-slate-600 truncate" title={fileName}>
            {fileName}
          </p>

          {/* Mensagem de erro */}
          {status === 'error' && error && (
            <p className="text-xs text-red-600 mt-2 line-clamp-2">
              {error}
            </p>
          )}

          {/* Indicador de progresso textual */}
          {(status === 'uploading' || status === 'processing') && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    status === 'uploading' ? 'bg-blue-500' : 'bg-purple-500'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {progress}%
              </span>
            </div>
          )}

          {/* Mensagem de sucesso */}
          {status === 'completed' && (
            <p className="text-xs text-green-600 mt-1 font-medium">
              ✓ Dados extraídos com sucesso
            </p>
          )}
        </div>
      </div>

      {/* Pulse animation para processing */}
      {status === 'processing' && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-purple-200 opacity-20 animate-pulse" />
        </div>
      )}
    </div>
  );
};

/**
 * Componente compacto para exibir apenas o status inline
 */
export const OcrStatusBadge: React.FC<{
  status: OcrStatus;
  compact?: boolean;
}> = ({ status, compact = false }) => {
  const statusConfig = {
    idle: { icon: Clock, label: 'Aguardando', color: 'bg-slate-100 text-slate-600' },
    uploading: { icon: Upload, label: 'Enviando', color: 'bg-blue-100 text-blue-700' },
    processing: { icon: Loader2, label: 'Processando', color: 'bg-purple-100 text-purple-700' },
    completed: { icon: CheckCircle2, label: 'Concluído', color: 'bg-green-100 text-green-700' },
    error: { icon: AlertCircle, label: 'Erro', color: 'bg-red-100 text-red-700' },
  };

  const config = statusConfig[status];
  const Icon = config.icon;
  const isAnimating = status === 'uploading' || status === 'processing';

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className={`w-3 h-3 ${isAnimating ? 'animate-spin' : ''}`} />
      {!compact && <span>{config.label}</span>}
    </div>
  );
};

