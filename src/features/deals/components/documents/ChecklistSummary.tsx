import React from 'react';
import { FileText, Calendar, TrendingUp, CheckCircle2, Users } from 'lucide-react';
import type { ConsolidatedChecklist } from '@/types/checklist.types';
import type { UploadedFile } from '@/types/types';

interface ChecklistSummaryProps {
  checklist: ConsolidatedChecklist;
  uploadedFiles: UploadedFile[];
  numSellers?: number;
  numBuyers?: number;
}

export const ChecklistSummary: React.FC<ChecklistSummaryProps> = ({ 
  checklist, 
  uploadedFiles,
  numSellers = 1,
  numBuyers = 1
}) => {
  // Calcular documentos obrigatórios ÚNICOS (tipos de documentos)
  const vendedoresDocsObrigatorios = checklist.vendedores.documentos.filter(d => d.obrigatorio).length;
  const compradoresDocsObrigatorios = checklist.compradores.documentos.filter(d => d.obrigatorio).length;
  const imovelDocsObrigatorios = checklist.imovel.documentos.filter(d => d.obrigatorio).length;
  
  // Total real considerando todas as pessoas
  // Cada vendedor precisa enviar os mesmos documentos, assim como cada comprador
  const totalRequired = 
    (vendedoresDocsObrigatorios * numSellers) + 
    (compradoresDocsObrigatorios * numBuyers) + 
    imovelDocsObrigatorios;

  // Calcular documentos enviados e validados
  const uploadedCount = uploadedFiles.filter(f => f.validated === true).length;
  const pendingCount = uploadedFiles.filter(f => f.validated === undefined).length;

  // Calcular progresso (apenas validados)
  const progress = totalRequired > 0 ? Math.round((uploadedCount / totalRequired) * 100) : 0;

  // Cor da complexidade
  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'BAIXA':
        return 'text-green-600 bg-green-50';
      case 'MEDIA':
        return 'text-blue-600 bg-blue-50';
      case 'MEDIA_ALTA':
        return 'text-yellow-600 bg-yellow-50';
      case 'ALTA':
        return 'text-orange-600 bg-orange-50';
      case 'MUITO_ALTA':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-slate-600 bg-slate-50';
    }
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl border border-primary/20 p-6 mb-6">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        Resumo do Checklist
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total de Documentos */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Necessário</p>
              <p className="text-2xl font-bold text-slate-800">{totalRequired}</p>
              <p className="text-xs text-slate-400 mt-1">
                {numSellers}V • {numBuyers}C • 1I
              </p>
            </div>
          </div>
        </div>

        {/* Complexidade */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Complexidade</p>
              <p className={`text-lg font-bold px-2 py-1 rounded-md inline-block ${getComplexityColor(checklist.resumo.complexidadeMaxima)}`}>
                {checklist.resumo.complexidadeMaxima}
              </p>
            </div>
          </div>
        </div>

        {/* Prazo Estimado */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Prazo Estimado</p>
              <p className="text-2xl font-bold text-slate-800">{checklist.resumo.prazoEstimadoDias} dias</p>
            </div>
          </div>
        </div>

        {/* Progresso */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Validados</p>
              <p className="text-2xl font-bold text-slate-800">{uploadedCount}/{totalRequired}</p>
              {pendingCount > 0 && (
                <p className="text-xs text-yellow-600 mt-1">
                  +{pendingCount} validando
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Progresso */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-700">Documentos Obrigatórios</span>
          <span className="text-sm font-bold text-primary">{progress}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-primary to-accent h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Conclusão estimada: {formatDate(checklist.resumo.dataEstimadaConclusao)}
        </p>
      </div>
    </div>
  );
};


