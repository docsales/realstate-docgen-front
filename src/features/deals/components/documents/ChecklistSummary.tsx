import React from 'react';
import { FileText, Calendar, Shield } from 'lucide-react';
import type { ConsolidatedChecklist } from '@/types/checklist.types';
import type { DealConfig } from '@/types/types';

interface ChecklistSummaryProps {
  checklist: ConsolidatedChecklist;
  config: DealConfig;
}

export const ChecklistSummary: React.FC<ChecklistSummaryProps> = ({ 
  checklist, 
  config
}) => {
  const deedCountClamped = Math.min(Math.max(config.deedCount || 1, 1), 5);

  // Count mandatory documents expected from the checklist definition
  let totalMandatory = 0;

  const sellerMandatoryDocs = checklist.vendedores.documentos.filter(d => d.obrigatorio);
  config.sellers.forEach((seller) => {
    const expectedDe = (seller.isSpouse || false) ? 'conjuge' : 'titular';
    totalMandatory += sellerMandatoryDocs.filter(doc => !doc.de || doc.de === expectedDe).length;
  });

  const buyerMandatoryDocs = checklist.compradores.documentos.filter(d => d.obrigatorio);
  config.buyers.forEach((buyer) => {
    const expectedDe = (buyer.isSpouse || false) ? 'conjuge' : 'titular';
    totalMandatory += buyerMandatoryDocs.filter(doc => !doc.de || doc.de === expectedDe).length;
  });

  const propertyMandatoryDocs = checklist.imovel.documentos.filter(d => d.obrigatorio);
  propertyMandatoryDocs.forEach(doc => {
    totalMandatory += doc.id === 'MATRICULA' ? deedCountClamped : 1;
  });

  // Count optional (from checklist + 1 for Proposta Comercial which is always optional)
  const totalOptional =
    checklist.vendedores.documentos.filter(d => !d.obrigatorio).length +
    checklist.compradores.documentos.filter(d => !d.obrigatorio).length +
    checklist.imovel.documentos.filter(d => !d.obrigatorio).length +
    1; // Proposta Comercial

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
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
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-800">Resumo do Checklist</h3>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Mandatory docs */}
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Obrigatorios</p>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-lg font-bold text-slate-800 tabular-nums">{totalMandatory}</p>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {config.sellers.length}V, {config.buyers.length}C, {deedCountClamped}M
          </p>
        </div>

        {/* Complexity */}
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Complexidade</p>
          <p className="text-lg font-bold text-slate-800">
            {translateComplexity(checklist.resumo.complexidadeMaxima)}
          </p>
        </div>

        {/* Deadline */}
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Prazo estimado</p>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-lg font-bold text-slate-800 tabular-nums">
              {checklist.resumo.prazoEstimadoDias}
              <span className="text-sm font-normal text-slate-500 ml-1">dias</span>
            </p>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {formatDate(checklist.resumo.dataEstimadaConclusao)}
          </p>
        </div>

        {/* Optional count */}
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Opcionais</p>
          <p className="text-lg font-bold text-slate-800 tabular-nums">
            {totalOptional}
          </p>
        </div>
      </div>
    </div>
  );
};
