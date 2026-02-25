import React from 'react';
import { CheckCircle2, AlertCircle, Upload, RotateCw } from 'lucide-react';
import type { UploadedFile } from '@/types/types';
import { Button } from '@/components/Button';

interface OcrStats {
  total: number;
  idle: number;
  uploading: number;
  processing: number;
  completed: number;
  error: number;
}

interface DocumentStatusPanelProps {
  files: UploadedFile[];
  ocrStats: OcrStats;
  isCheckingStatus: boolean;
  onManualRefresh: () => void;
}

export const DocumentStatusPanel: React.FC<DocumentStatusPanelProps> = ({
  files,
  ocrStats,
  isCheckingStatus,
  onManualRefresh
}) => {
  // Don't show if no files uploaded yet
  if (files.length === 0) return null;

  const { total, uploading, processing, completed, error } = ocrStats;
  const inProgress = uploading + processing;
  const processed = completed + error;
  const progressPercent = total > 0 ? Math.round((processed / total) * 100) : 0;
  const allDone = inProgress === 0 && total > 0;
  const hasErrors = error > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800">Status dos Documentos</h3>
        </div>

        {/* Refresh button - only when processing */}
        {inProgress > 0 && (
          <Button
            variant="link"
            size="sm"
            icon={<RotateCw className="w-3.5 h-3.5" />}
            onClick={onManualRefresh}
            isLoading={isCheckingStatus}
            disabled={isCheckingStatus}
            className="tooltip tooltip-bottom p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            data-tip="Atualizar status"
          />
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${allDone && !hasErrors
              ? 'bg-emerald-500'
              : hasErrors
                ? 'bg-amber-500'
                : 'bg-primary'
            }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Enviados (uploaded total) */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Enviados</span>
          <span className="text-sm font-semibold text-slate-800 tabular-nums">{total}</span>
        </div>

        {/* Em andamento */}
        {inProgress > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="loading loading-spinner loading-sm text-amber-500" />
            <span className="text-xs text-slate-500">Em andamento</span>
            <span className="text-sm font-semibold text-amber-600 tabular-nums">{inProgress}</span>
          </div>
        )}

        {/* Processados (completed successfully) */}
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          <span className="text-xs text-slate-500">Processados</span>
          <span className="text-sm font-semibold text-slate-700 tabular-nums">{completed}</span>
        </div>

        {/* Errors */}
        {hasErrors && (
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 text-red-500" />
            <span className="text-xs text-slate-500">Erros</span>
            <span className="text-sm font-semibold text-red-600 tabular-nums">{error}</span>
          </div>
        )}

        {/* Summary text - right aligned */}
        <div className="ml-auto">
          {allDone && !hasErrors && (
            <span className="text-xs font-medium text-emerald-600">
              Todos processados
            </span>
          )}
          {allDone && hasErrors && (
            <span className="text-xs font-medium text-amber-600">
              {error} com erro - remova e reenvie
            </span>
          )}
          {!allDone && (
            <span className="text-xs text-slate-400 tabular-nums">
              {progressPercent}% concluido
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
