import React, { useState } from 'react';
import { Button } from '@/components/Button';
import { FilePlus, Search, CheckCircle2, History, Clock, Grid, List, Loader2, AlertCircle } from 'lucide-react';
import type { Deal, DealStatus } from '@/types/types';
import { useDeals } from '../deals/hooks/useDeals';

export const DashboardView: React.FC<{ onNewDeal: () => void, onDealClick: (id: string) => void }> = ({ onNewDeal, onDealClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Buscar deals reais do backend usando React Query
  const { data: deals = [], isLoading, isError, error } = useDeals('dev-user-id');

  // Filter logic
  const filteredDeals = deals.filter(d => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = d.name?.toLowerCase().includes(searchLower);
    // Buscar em signatários se existirem
    const signerMatch = d.signers?.some(s => 
      s.name.toLowerCase().includes(searchLower) || 
      s.email.toLowerCase().includes(searchLower)
    );
    return nameMatch || signerMatch;
  });

  const getStatusBadge = (status: DealStatus) => {
    switch (status) {
      case 'SIGNED': 
        return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold uppercase">Assinado</span>;
      case 'SENT': 
        return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold uppercase">Enviado</span>;
      case 'DRAFT': 
        return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold uppercase">Rascunho</span>;
      case 'CANCELED': 
        return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold uppercase">Cancelado</span>;
      case 'REJECTED': 
        return <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold uppercase">Rejeitado</span>;
      default: 
        return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold uppercase">{status}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Meus Contratos</h1>
          <p className="text-slate-500">Gerencie e acompanhe o status de suas negociações.</p>
        </div>
        <Button onClick={onNewDeal} className="btn btn-md">
          <FilePlus className="w-5 h-5" />
          Novo Contrato
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-3 text-slate-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome, cliente ou data..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-600 bg-white text-slate-600 placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-shadow"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* View Toggle Pill */}
        <div className="flex bg-slate-200 p-1 rounded-full border border-slate-300">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${viewMode === 'grid' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Grid className="w-4 h-4" /> Cards
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <List className="w-4 h-4" /> Tabela
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-slate-500">Carregando contratos...</p>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <p className="text-red-700 font-semibold">Erro ao carregar contratos</p>
          <p className="text-red-600 text-sm">{error instanceof Error ? error.message : 'Erro desconhecido'}</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && deals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-slate-50 border border-slate-200 rounded-lg">
          <FilePlus className="w-16 h-16 text-slate-300" />
          <p className="text-slate-600 font-semibold text-lg">Nenhum contrato encontrado</p>
          <p className="text-slate-500">Crie seu primeiro contrato clicando no botão acima.</p>
        </div>
      )}

      {/* Content */}
      {!isLoading && !isError && deals.length > 0 && (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
              {filteredDeals.map(deal => (
            <div
              key={deal.id}
              className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => onDealClick(deal.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono text-slate-400">#{deal.id.padStart(5, '0')}</span>
                <div className="flex gap-3 text-slate-300">
                  <div className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /><span className="text-xs">0</span></div>
                  <div className="flex items-center gap-1"><History className="w-4 h-4" /><span className="text-xs">1</span></div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 group-hover:text-primary transition-colors">
                    {deal.name || 'Sem nome'}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {deal.signers && deal.signers.length > 0 
                      ? `${deal.signers[0].name} (${deal.signers[0].email})`
                      : 'Sem signatários'}
                  </p>
                  <div className="mt-3">
                    {getStatusBadge(deal.status)}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>Criado em {new Date(deal.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
                <span className="text-slate-400 text-xs">
                  Atualizado em {new Date(deal.updatedAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">ID</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Contrato</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Signatários</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDeals.map(deal => (
                    <tr
                      key={deal.id}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => onDealClick(deal.id)}
                    >
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">
                        #{deal.id.substring(0, 8)}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {deal.name || 'Sem nome'}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {deal.signers && deal.signers.length > 0 
                          ? deal.signers[0].name 
                          : 'Sem signatários'}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(deal.status)}</td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {new Date(deal.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};