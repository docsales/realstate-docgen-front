import React from 'react';
import {
  FileText,
  CheckCircle2,
  Loader2,
  XCircle,
  Circle,
  ExternalLink,
  Download,
  Database,
  User,
  Users,
  Home,
  Receipt,
} from 'lucide-react';
import type { DealDocument } from '@/types/types';

interface DocumentCategorizedListProps {
  documents: DealDocument[];
  onSelectDocument: (doc: DealDocument) => void;
}

// -------------------------------------------------------------------
// Translation helpers
// -------------------------------------------------------------------

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode }
> = {
  buyers: { label: 'Compradores', icon: <Users className="w-4 h-4" /> },
  sellers: { label: 'Vendedores', icon: <User className="w-4 h-4" /> },
  property: { label: 'Imovel', icon: <Home className="w-4 h-4" /> },
  proposal: { label: 'Proposta', icon: <Receipt className="w-4 h-4" /> },
};

const CATEGORY_ORDER = ['sellers', 'buyers', 'property', 'proposal'];

const DOC_SUBCATEGORY: Record<string, string> = {
  RG: 'Identificacao',
  CNH: 'Identificacao',
  CNI: 'Identificacao',
  CPF: 'CPF',
  COMPROVANTE_RESIDENCIA: 'Comp. Endereco',
  CERTIDAO_CASAMENTO: 'Certidao',
  CERTIDAO_NASCIMENTO: 'Certidao',
  MATRICULA: 'Matricula',
  IPTU: 'IPTU',
  PROPOSTA_COMERCIAL: 'Proposta',
};

function getSubcategory(docType: string): string {
  return DOC_SUBCATEGORY[docType] || docType;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'EXTRACTED':
    case 'OCR_DONE':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
          <CheckCircle2 className="w-3 h-3" /> Processado
        </span>
      );
    case 'OCR_PROCESSING':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
          <Loader2 className="w-3 h-3 animate-spin" /> Processando
        </span>
      );
    case 'ERROR':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 rounded-full px-2 py-0.5">
          <XCircle className="w-3 h-3" /> Erro
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-50 rounded-full px-2 py-0.5">
          <Circle className="w-3 h-3" /> Pendente
        </span>
      );
  }
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export const DocumentCategorizedList: React.FC<DocumentCategorizedListProps> = ({
  documents,
  onSelectDocument,
}) => {
  // Group by category
  const grouped = new Map<string, DealDocument[]>();
  documents.forEach((doc) => {
    const cat = doc.category || 'other';
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(doc);
  });

  // Sort categories by defined order
  const sortedCategories = CATEGORY_ORDER.filter((cat) =>
    grouped.has(cat)
  );
  // Add any remaining categories not in the predefined order
  grouped.forEach((_, cat) => {
    if (!sortedCategories.includes(cat)) sortedCategories.push(cat);
  });

  return (
    <div>
      {sortedCategories.map((category) => {
        const docs = grouped.get(category) || [];
        const cfg = CATEGORY_CONFIG[category] || {
          label: category,
          icon: <FileText className="w-4 h-4" />,
        };

        return (
          <div key={category}>
            {/* Category header */}
            <div className="flex items-center gap-2 px-6 py-3 bg-slate-50 border-b border-slate-100">
              <span className="text-slate-400">{cfg.icon}</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {cfg.label}
              </span>
              <span className="text-[11px] text-slate-400 ml-auto tabular-nums">
                {docs.length}
              </span>
            </div>

            {/* Table header */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_120px_110px_auto] items-center gap-4 px-6 py-2 border-b border-slate-100 text-[11px] uppercase tracking-wide font-medium text-slate-400">
              <span>Arquivo</span>
              <span>Tipo</span>
              <span>Status</span>
              <span className="text-right">Acoes</span>
            </div>

            {/* Document rows */}
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="grid grid-cols-1 sm:grid-cols-[1fr_120px_110px_auto] items-center gap-2 sm:gap-4 px-6 py-3 border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
              >
                {/* Filename */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-8 h-8 rounded bg-blue-50 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 truncate">
                    {doc.originalFilename || doc.documentType || 'Documento'}
                  </span>
                </div>

                {/* Subcategory */}
                <span className="text-xs text-slate-500 sm:text-left pl-11 sm:pl-0">
                  {getSubcategory(doc.documentType)}
                </span>

                {/* Status */}
                <div className="pl-11 sm:pl-0">{getStatusBadge(doc.status)}</div>

                {/* Actions */}
                <div className="flex items-center gap-1 justify-end pl-11 sm:pl-0">
                  {doc.fileUrl && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(doc.fileUrl, '_blank');
                        }}
                        className="cursor-pointer p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Visualizar"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={doc.fileUrl}
                        download={doc.originalFilename}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Baixar"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </>
                  )}
                  {(doc.status === 'EXTRACTED' || doc.status === 'OCR_DONE') &&
                    doc.variables &&
                    Object.keys(doc.variables).length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDocument(doc);
                        }}
                        className="cursor-pointer flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-primary hover:bg-blue-50 transition-colors"
                        title="Ver dados extraidos"
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Dados</span>
                      </button>
                    )}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};
