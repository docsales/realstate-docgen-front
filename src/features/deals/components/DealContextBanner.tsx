import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  ExternalLink,
  ArrowRight,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
} from 'lucide-react';
import { Button } from '../../../components/Button';
import type { Deal, DealDocument, Signatory, DealStatus } from '@/types/types';

interface DealContextBannerProps {
  deal: Deal;
}

// -------------------------------------------------------------------
// Stage helpers
// -------------------------------------------------------------------

type DealStage = 'no_docs' | 'docs_uploaded' | 'doc_generated' | 'sent_for_signature';

function resolveStage(deal: Deal): DealStage {
  const hasDocuments = (deal.documents?.length ?? 0) > 0;
  const hasGeneratedDoc = !!deal.consolidated?.generatedDocId;
  const isSent: boolean = deal.status !== 'DRAFT';

  if (isSent) return 'sent_for_signature';
  if (hasGeneratedDoc) return 'doc_generated';
  if (hasDocuments) return 'docs_uploaded';
  return 'no_docs';
}

function countByStatus(docs: DealDocument[]) {
  let processed = 0;
  let processing = 0;
  let error = 0;
  docs.forEach((d) => {
    if (d.status === 'EXTRACTED' || d.status === 'OCR_DONE') processed++;
    else if (d.status === 'OCR_PROCESSING') processing++;
    else if (d.status === 'ERROR') error++;
  });
  return { processed, processing, error, total: docs.length };
}

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  SENT: {
    label: 'Enviado',
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
    icon: <Send className="w-3.5 h-3.5" />,
  },
  READ: {
    label: 'Visualizado',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
    icon: <Eye className="w-3.5 h-3.5" />,
  },
  PARTIALLY_SIGNED: {
    label: 'Parcialmente assinado',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  SIGNED: {
    label: 'Assinado',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  REJECTED: {
    label: 'Rejeitado',
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  CANCELED: {
    label: 'Cancelado',
    color: 'text-slate-600',
    bg: 'bg-slate-50 border-slate-200',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

function getSignerIcon(status?: string) {
  switch (status) {
    case 'signed':
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    case 'rejected':
    case 'cancelled':
      return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    case 'read':
      return <Eye className="w-3.5 h-3.5 text-amber-500" />;
    default:
      return <Clock className="w-3.5 h-3.5 text-slate-400" />;
  }
}

// -------------------------------------------------------------------
// Sub-components for each stage
// -------------------------------------------------------------------

function NoDocsStage({ dealId }: { dealId: string }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-4 p-5 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
      <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-slate-200/60 flex items-center justify-center">
        <Upload className="w-5 h-5 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-700">
          Envie os documentos para comecar
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          Adicione os documentos do comprador, vendedor e imovel para gerar a
          minuta.
        </p>
      </div>
      <Button
        icon={<Upload className="w-4 h-4" />}
        onClick={() => navigate(`/deals/${dealId}/edit?step=2`)}
        className="flex-shrink-0"
      >
        Enviar documentos
      </Button>
    </div>
  );
}

function DocsUploadedStage({
  dealId,
  documents,
}: {
  dealId: string;
  documents: DealDocument[];
}) {
  const navigate = useNavigate();
  const stats = countByStatus(documents);

  return (
    <div className="flex items-center gap-4 p-5 bg-blue-50/50 border border-blue-200/60 rounded-xl">
      <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-blue-100 flex items-center justify-center">
        <FileText className="w-5 h-5 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-700">
          Documentos recebidos, preencha as variaveis
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-slate-500">
            {stats.processed} processado{stats.processed !== 1 ? 's' : ''}
          </span>
          {stats.processing > 0 && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              {stats.processing} processando
            </span>
          )}
          {stats.error > 0 && (
            <span className="text-xs text-red-600">
              {stats.error} com erro
            </span>
          )}
        </div>
      </div>
      <Button
        size="sm"
        icon={<ArrowRight className="w-4 h-4" />}
        iconPosition="right"
        onClick={() => navigate(`/deals/${dealId}/edit?step=3`)}
        className="flex-shrink-0"
      >
        Preencher variaveis
      </Button>
    </div>
  );
}

function DocGeneratedStage({
  deal,
}: {
  deal: Deal;
}) {
  const docUrl = deal.consolidated?.draftPreviewUrl;

  return (
    <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100/60 transition-colors group">
      <Button
        variant="link"
        size="sm"
        onClick={() => docUrl && window.open(docUrl, '_blank')}
        className="flex justify-start pl-5 py-10 w-full"
      >
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center group-hover:bg-emerald-200/70 transition-colors">
            <FileText className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-left min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-700 truncate">
              Minuta gerada
            </p>
            <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              Abrir documento
            </p>
          </div>
        </div>
      </Button>
    </div>
  );
}

function SentForSignatureStage({ deal }: { deal: Deal }) {
  const signers = deal.signers ?? [];
  const signedCount = signers.filter((s) => s.status === 'signed').length;
  const dealStatus = deal.status as DealStatus;
  const cfg = statusConfig[dealStatus] || statusConfig.SENT;
  const docUrl =
    deal.consolidated?.docsalesPdfUrl || deal.consolidated?.draftPreviewUrl;

  return (
    <div className={`p-5 rounded-xl border ${cfg.bg}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Status badge */}
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}
          >
            {cfg.icon}
            {cfg.label}
          </span>
          <span className="text-xs text-slate-500">
            {signedCount} de {signers.length} assinaram
          </span>
        </div>

        {docUrl && (
          <Button
            variant="link"
            size="sm"
            icon={<FileText className="w-3.5 h-3.5" />}
            onClick={() => window.open(docUrl, '_blank')}
          >
            Abrir documento
          </Button>
        )}
      </div>

      {/* Signers list */}
      {signers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-black/5">
          {signers.map((signer: Signatory) => (
            <span
              key={signer.id}
              className="inline-flex items-center gap-1.5 text-xs bg-white/70 border border-black/5 rounded-full px-2.5 py-1"
            >
              {getSignerIcon(signer.status)}
              <span className="text-slate-700 font-medium max-w-[120px] truncate">
                {signer.name}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------
// Main component
// -------------------------------------------------------------------

export const DealContextBanner: React.FC<DealContextBannerProps> = ({ deal }) => {
  const stage = resolveStage(deal);

  switch (stage) {
    case 'no_docs':
      return <NoDocsStage dealId={deal.id} />;
    case 'docs_uploaded':
      return (
        <DocsUploadedStage
          dealId={deal.id}
          documents={deal.documents ?? []}
        />
      );
    case 'doc_generated':
      return <DocGeneratedStage deal={deal} />;
    case 'sent_for_signature':
      return <SentForSignatureStage deal={deal} />;
    default:
      return null;
  }
};
