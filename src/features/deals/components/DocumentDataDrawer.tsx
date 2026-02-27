import React from 'react';
import { X, FileText, Download, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import type { DealDocument } from '@/types/types';
import { Button } from '@/components/Button';
import { DocumentVariablesView } from './DocumentVariablesView';

interface DocumentDataDrawerProps {
  document: DealDocument | null;
  open: boolean;
  onClose: () => void;
}

// -------------------------------------------------------------------
// Translation helpers
// -------------------------------------------------------------------

const DOC_TYPE_LABELS: Record<string, string> = {
  RG: 'RG',
  CNH: 'CNH',
  CNI: 'CNI',
  CPF: 'CPF',
  COMPROVANTE_RESIDENCIA: 'Comprovante de Endereco',
  CERTIDAO_CASAMENTO: 'Certidao de Casamento',
  CERTIDAO_NASCIMENTO: 'Certidao de Nascimento',
  MATRICULA: 'Matricula do Imovel',
  IPTU: 'IPTU',
  PROPOSTA_COMERCIAL: 'Proposta Comercial',
};

function translateDocType(type: string): string {
  return DOC_TYPE_LABELS[type] || type;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'EXTRACTED':
    case 'OCR_DONE':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
          <CheckCircle2 className="w-3 h-3" /> Processado
        </span>
      );
    case 'OCR_PROCESSING':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
          <span className="loading loading-spinner loading-sm text-amber-500" /> Processando
        </span>
      );
    case 'ERROR':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
          <AlertCircle className="w-3 h-3" /> Erro
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5">
          Pendente
        </span>
      );
  }
}

// -------------------------------------------------------------------
// Main drawer component
// -------------------------------------------------------------------

export const DocumentDataDrawer: React.FC<DocumentDataDrawerProps> = ({
  document,
  open,
  onClose,
}) => {
  const hasVariables =
    document != null &&
    document.variables != null &&
    Object.keys(document.variables).length > 0;

  return (
    <>
      <div className="drawer drawer-end">
        <input
          id="document_data_drawer"
          type="checkbox"
          className="drawer-toggle"
          checked={open}
          onChange={(e) => { if (!e.target.checked) onClose(); }}
        />
        <div className="drawer-content">
          {/* Page content here */}
        </div>
        <div className="drawer-side z-50">
          <label
            htmlFor="document_data_drawer"
            aria-label="close sidebar"
            className="drawer-overlay"
            onClick={(e) => { e.preventDefault(); onClose(); }}
          />
          <div className="w-full max-w-md min-w-0 bg-white border-l border-slate-200 overflow-x-hidden flex flex-col h-full">
            {document ? (
              <>
                {/* Header */}
                <div className="flex items-start gap-3 p-5 border-b border-slate-200 flex-shrink-0">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {document.originalFilename || document.documentType}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">
                        {translateDocType(document.documentType)}
                      </span>
                      {getStatusBadge(document.status)}
                    </div>
                  </div>
                  <label
                    htmlFor="document_data_drawer"
                    aria-label="close sidebar"
                    onClick={(e) => { e.preventDefault(); onClose(); }}
                    className="drawer-overlay cursor-pointer p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors tooltip tooltip-left"
                    data-tip="Fechar"
                  >
                    <X className="w-5 h-5" />
                  </label>
                </div>

                {/* Actions bar */}
                <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 flex-shrink-0">
                  {document.fileUrl && (
                    <>
                      <Button
                        variant="ghost"
                        onClick={() => window.open(document.fileUrl, '_blank')}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Visualizar
                      </Button>
                      <a
                        href={document.fileUrl}
                        download={document.originalFilename}
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Baixar
                      </a>
                    </>
                  )}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-5">
                  {hasVariables ? (
                    <>
                      <p className="text-xs uppercase tracking-wide font-semibold text-slate-400 mb-4">
                        Dados extraidos
                      </p>
                      <DocumentVariablesView variables={document.variables!} />
                    </>
                  ) : document.status === 'OCR_PROCESSING' ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <span className="loading loading-spinner loading-md text-slate-300 mb-3" />
                      <p className="text-sm text-slate-500">Processando documento...</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Os dados extraidos aparecerao aqui quando o processamento
                        terminar.
                      </p>
                    </div>
                  ) : document.status === 'ERROR' ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <AlertCircle className="w-8 h-8 text-red-300 mb-3" />
                      <p className="text-sm text-slate-500">Erro ao processar documento</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Nao foi possivel extrair os dados deste documento.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <FileText className="w-8 h-8 text-slate-200 mb-3" />
                      <p className="text-sm text-slate-500">Nenhum dado extraido</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Este documento ainda nao possui dados extraidos.
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer (mobile-friendly close) */}
                <div className="p-4 border-t border-slate-200 flex-shrink-0 bg-white">
                  <Button
                    variant="secondary"
                    className="w-full justify-center"
                    onClick={(e) => { e.preventDefault(); onClose(); }}
                  >
                    Fechar
                  </Button>
                </div>
              </>
            ) : (
              <div className="p-5" />
            )}
          </div>
        </div>
      </div>
    </>
  );
};
