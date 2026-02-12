import React from 'react';
import { FileText, CheckCircle2 } from 'lucide-react';
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

  // Total necessário e total validado usando a MESMA regra dos blocos (titular x cônjuge + matrícula x deedCount)
  let totalRequired = 0;
  let validatedRequired = 0;

  // Vendedores
  const sellerRequiredDocs = checklist.vendedores.documentos.filter(d => d.obrigatorio);
  config.sellers.forEach((seller) => {
    const isSpouse = seller.isSpouse || false;
    const expectedDe = isSpouse ? 'conjuge' : 'titular';
    const docsForThisSeller = sellerRequiredDocs.filter(doc => !doc.de || doc.de === expectedDe);
    const sellerFiles = uploadedFiles.filter(f => f.category === 'sellers' && f.personId === seller.id);

    totalRequired += docsForThisSeller.length;
    validatedRequired += docsForThisSeller.filter(doc =>
      sellerFiles.some(f => fileSatisfiesType(f, doc.id) && f.validated === true)
    ).length;
  });

  // Compradores
  const buyerRequiredDocs = checklist.compradores.documentos.filter(d => d.obrigatorio);
  config.buyers.forEach((buyer) => {
    const isSpouse = buyer.isSpouse || false;
    const expectedDe = isSpouse ? 'conjuge' : 'titular';
    const docsForThisBuyer = buyerRequiredDocs.filter(doc => !doc.de || doc.de === expectedDe);
    const buyerFiles = uploadedFiles.filter(f => f.category === 'buyers' && f.personId === buyer.id);

    totalRequired += docsForThisBuyer.length;
    validatedRequired += docsForThisBuyer.filter(doc =>
      buyerFiles.some(f => fileSatisfiesType(f, doc.id) && f.validated === true)
    ).length;
  });

  // Imóvel
  const propertyRequiredDocs = checklist.imovel.documentos.filter(d => d.obrigatorio);
  const propertyFiles = uploadedFiles.filter(f => f.category === 'property');
  propertyRequiredDocs.forEach(doc => {
    if (doc.id === 'MATRICULA') {
      totalRequired += deedCountClamped;
      const validatedCount = propertyFiles.filter(f => fileSatisfiesType(f, doc.id) && f.validated === true).length;
      validatedRequired += Math.min(validatedCount, deedCountClamped);
      return;
    }

    totalRequired += 1;
    const hasValidated = propertyFiles.some(f => fileSatisfiesType(f, doc.id) && f.validated === true);
    validatedRequired += hasValidated ? 1 : 0;
  });

  // Calcular documentos enviados e validados
  const pendingCount = uploadedFiles.filter(f => f.validated === undefined).length;

  // Calcular progresso (apenas validados)
  const progress = totalRequired > 0 ? Math.round((validatedRequired / totalRequired) * 100) : 0;

  // Formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const translateComplexity = (complexity: string) => {
    switch (complexity) {
      case 'BAIXA':
        return 'Baixa';
      case 'MEDIA':
        return 'Média';
      case 'MEDIA_ALTA':
        return 'Média Alta';
      case 'ALTA':
        return 'Alta';
      case 'MUITO_ALTA':
        return 'Muito Alta';
      default:
        return complexity;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
      {/* Header row with title + progress */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400" />
          Resumo do Checklist
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Progresso</span>
          <span className="text-sm font-bold text-slate-800 tabular-nums">{progress}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-100 rounded-full h-1.5 mb-5 overflow-hidden">
        <div
          className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Documentos</p>
          <p className="text-lg font-bold text-slate-800 tabular-nums">
            {validatedRequired}
            <span className="text-slate-300 font-normal">/{totalRequired}</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {config.sellers.length}V, {config.buyers.length}C, {deedCountClamped}M
          </p>
        </div>

        {/* Complexidade */}
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Complexidade</p>
          <p className="text-lg font-bold text-slate-800">
            {translateComplexity(checklist.resumo.complexidadeMaxima)}
          </p>
        </div>

        {/* Prazo */}
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Prazo estimado</p>
          <p className="text-lg font-bold text-slate-800 tabular-nums">
            {checklist.resumo.prazoEstimadoDias}
            <span className="text-sm font-normal text-slate-500 ml-1">dias</span>
          </p>
        </div>

        {/* Status */}
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Status</p>
          <div className="flex items-center gap-1.5">
            {pendingCount > 0 ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <p className="text-sm font-medium text-slate-600">{pendingCount} validando</p>
              </>
            ) : progress === 100 ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <p className="text-sm font-medium text-slate-600">Completo</p>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                <p className="text-sm font-medium text-slate-500">Em andamento</p>
              </>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {formatDate(checklist.resumo.dataEstimadaConclusao)}
          </p>
        </div>
      </div>
    </div>
  );
};
