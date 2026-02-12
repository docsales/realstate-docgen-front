import React from 'react';
import { CheckCircle2, Calendar, Shield } from 'lucide-react';
import type { ConsolidatedChecklist } from '@/types/checklist.types';
import type { DealConfig, UploadedFile } from '@/types/types';

interface ChecklistSummaryProps {
  checklist: ConsolidatedChecklist;
  uploadedFiles: UploadedFile[];
  config: DealConfig;
}

export const ChecklistSummary: React.FC<ChecklistSummaryProps> = ({ 
  checklist, 
  uploadedFiles,
  config
}) => {
  const fileSatisfiesType = (file: UploadedFile, documentType: string): boolean => {
    if (file.type === documentType) return true;
    if (file.types && file.types.includes(documentType)) return true;
    return false;
  };

  const deedCountClamped = Math.min(Math.max(config.deedCount || 1, 1), 5);

  // --- MANDATORY documents count ---
  let totalMandatory = 0;
  let validatedMandatory = 0;

  // Sellers mandatory
  const sellerMandatoryDocs = checklist.vendedores.documentos.filter(d => d.obrigatorio);
  config.sellers.forEach((seller) => {
    const expectedDe = (seller.isSpouse || false) ? 'conjuge' : 'titular';
    const docsForSeller = sellerMandatoryDocs.filter(doc => !doc.de || doc.de === expectedDe);
    const sellerFiles = uploadedFiles.filter(f => f.category === 'sellers' && f.personId === seller.id);
    totalMandatory += docsForSeller.length;
    validatedMandatory += docsForSeller.filter(doc =>
      sellerFiles.some(f => fileSatisfiesType(f, doc.id) && f.validated === true)
    ).length;
  });

  // Buyers mandatory
  const buyerMandatoryDocs = checklist.compradores.documentos.filter(d => d.obrigatorio);
  config.buyers.forEach((buyer) => {
    const expectedDe = (buyer.isSpouse || false) ? 'conjuge' : 'titular';
    const docsForBuyer = buyerMandatoryDocs.filter(doc => !doc.de || doc.de === expectedDe);
    const buyerFiles = uploadedFiles.filter(f => f.category === 'buyers' && f.personId === buyer.id);
    totalMandatory += docsForBuyer.length;
    validatedMandatory += docsForBuyer.filter(doc =>
      buyerFiles.some(f => fileSatisfiesType(f, doc.id) && f.validated === true)
    ).length;
  });

  // Property mandatory
  const propertyMandatoryDocs = checklist.imovel.documentos.filter(d => d.obrigatorio);
  const propertyFiles = uploadedFiles.filter(f => f.category === 'property');
  propertyMandatoryDocs.forEach(doc => {
    if (doc.id === 'MATRICULA') {
      totalMandatory += deedCountClamped;
      const validatedCount = propertyFiles.filter(f => fileSatisfiesType(f, doc.id) && f.validated === true).length;
      validatedMandatory += Math.min(validatedCount, deedCountClamped);
      return;
    }
    totalMandatory += 1;
    validatedMandatory += propertyFiles.some(f => fileSatisfiesType(f, doc.id) && f.validated === true) ? 1 : 0;
  });

  // --- OPTIONAL documents count ---
  const totalOptionalDocs =
    checklist.vendedores.documentos.filter(d => !d.obrigatorio).length +
    checklist.compradores.documentos.filter(d => !d.obrigatorio).length +
    checklist.imovel.documentos.filter(d => !d.obrigatorio).length;

  // Count optional docs that have at least one validated file uploaded
  let optionalUploaded = 0;
  const sellerOptionalDocs = checklist.vendedores.documentos.filter(d => !d.obrigatorio);
  config.sellers.forEach((seller) => {
    const sellerFiles = uploadedFiles.filter(f => f.category === 'sellers' && f.personId === seller.id);
    optionalUploaded += sellerOptionalDocs.filter(doc =>
      sellerFiles.some(f => fileSatisfiesType(f, doc.id) && f.validated === true)
    ).length;
  });
  const buyerOptionalDocs = checklist.compradores.documentos.filter(d => !d.obrigatorio);
  config.buyers.forEach((buyer) => {
    const buyerFiles = uploadedFiles.filter(f => f.category === 'buyers' && f.personId === buyer.id);
    optionalUploaded += buyerOptionalDocs.filter(doc =>
      buyerFiles.some(f => fileSatisfiesType(f, doc.id) && f.validated === true)
    ).length;
  });
  const propertyOptionalDocs = checklist.imovel.documentos.filter(d => !d.obrigatorio);
  optionalUploaded += propertyOptionalDocs.filter(doc =>
    propertyFiles.some(f => fileSatisfiesType(f, doc.id) && f.validated === true)
  ).length;

  // Proposal docs (always optional)
  const proposalFiles = uploadedFiles.filter(f => f.category === 'proposal');
  const proposalUploaded = proposalFiles.filter(f => f.validated === true).length;

  // Progress bar is ONLY for mandatory
  const mandatoryProgress = totalMandatory > 0 ? Math.round((validatedMandatory / totalMandatory) * 100) : 0;
  const isMandatoryComplete = mandatoryProgress === 100;

  // Deadline
  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const translateComplexity = (complexity: string) => {
    switch (complexity) {
      case 'BAIXA': return 'Baixa';
      case 'MEDIA': return 'Media';
      case 'MEDIA_ALTA': return 'Media-Alta';
      case 'ALTA': return 'Alta';
      case 'MUITO_ALTA': return 'Muito Alta';
      default: return complexity;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
      {/* Top section: Mandatory progress */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800">Documentos obrigatorios</h3>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold text-slate-800 tabular-nums">{validatedMandatory}</span>
          <span className="text-sm text-slate-400 font-normal">de {totalMandatory}</span>
          {isMandatoryComplete && (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-1" />
          )}
        </div>
      </div>

      {/* Progress bar -- mandatory only */}
      <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${isMandatoryComplete ? 'bg-emerald-500' : 'bg-primary'}`}
          style={{ width: `${mandatoryProgress}%` }}
        />
      </div>

      {/* Metadata chips row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Deadline chip */}
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1">
          <Calendar className="w-3 h-3 text-slate-400" />
          {checklist.resumo.prazoEstimadoDias} dias ({formatShortDate(checklist.resumo.dataEstimadaConclusao)})
        </span>

        {/* Complexity chip */}
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1">
          Complexidade: {translateComplexity(checklist.resumo.complexidadeMaxima)}
        </span>

        {/* Breakdown chip */}
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1">
          {config.sellers.length}V, {config.buyers.length}C, {deedCountClamped}M
        </span>

        {/* Optional docs chip (only if there are optional docs) */}
        {(totalOptionalDocs > 0 || proposalFiles.length > 0) && (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-md px-2.5 py-1">
            {optionalUploaded + proposalUploaded} opcional{optionalUploaded + proposalUploaded !== 1 ? 'is' : ''} enviado{optionalUploaded + proposalUploaded !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
};
