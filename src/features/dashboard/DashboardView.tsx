import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { FilePlus, Search, CheckCircle2, Clock, Grid, List, AlertCircle, X, Calendar, FileText, Hourglass } from 'lucide-react';
import type { DealStatus, Signatory } from '@/types/types';
import { useDealsInfinite } from '../deals/hooks/useDeals';
import { UtilsService } from '@/services/utils.service';
import { useAuth } from '@/hooks/useAuth';

export const DashboardView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [serverSearchTerm, setServerSearchTerm] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Refs para infinite scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Hook para infinite scroll - busca com termo do servidor
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useDealsInfinite(serverSearchTerm, 20);

  // Flatten all pages
  const allDeals = data?.pages.flatMap(page => page.data) ?? [];
  const totalDeals = data?.pages[0]?.total ?? 0;

  // Filtro local primeiro
  const localFilteredDeals = allDeals.filter(d => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = d.name?.toLowerCase().includes(searchLower);
    const signerMatch = d.signers?.some(s =>
      s.name.toLowerCase().includes(searchLower) ||
      s.email.toLowerCase().includes(searchLower)
    );
    return nameMatch || signerMatch;
  });

  // Se não encontrou nada localmente E tem termo de busca, buscar no servidor
  useEffect(() => {
    // Só dispara busca no servidor se:
    // 1. Existe um termo de busca
    // 2. Não há resultados locais
    // 3. Já carregamos alguma página (allDeals.length > 0)
    // 4. O termo de busca é diferente do que já estamos buscando no servidor
    if (searchTerm && localFilteredDeals.length === 0 && allDeals.length > 0 && searchTerm !== serverSearchTerm) {
      // Debounce de 500ms antes de buscar no servidor
      const timer = setTimeout(() => {
        setServerSearchTerm(searchTerm);
      }, 500);
      return () => clearTimeout(timer);
    } else if (!searchTerm && serverSearchTerm !== undefined) {
      // Limpar busca do servidor quando apagar termo
      setServerSearchTerm(undefined);
    }
  }, [searchTerm, localFilteredDeals.length, allDeals.length, serverSearchTerm]);

  // Intersection Observer para infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Deals a exibir: se está buscando no servidor, usa allDeals, senão usa filtrados
  const dealsToDisplay = serverSearchTerm ? allDeals : localFilteredDeals;

  const getStatusBadge = (status: DealStatus) => {
    switch (status) {
      case 'SIGNED':
        return (
          <div className="flex items-center gap-2 bg-gradient-to-r from-green-100 to-green-50 text-green-700 px-3 py-1.5 rounded-md border border-green-200">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-bold">Assinado</span>
          </div>
        );
      case 'SENT':
      case 'READ':
      case 'PARTIALLY_SIGNED':
        return (
          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 px-3 py-1.5 rounded-md border border-amber-200">
            <Hourglass className="w-4 h-4" />
            <span className="text-xs font-bold">Em assinatura</span>
          </div>
        );
      case 'DRAFT':
        return (
          <div className="flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md">
            <FileText className="w-4 h-4" />
            <span className="text-xs font-bold">Rascunho</span>
          </div>
        );
      case 'CANCELED':
        return (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-md border border-red-200">
            <X className="w-4 h-4" />
            <span className="text-xs font-bold">Cancelado</span>
          </div>
        );
      case 'REJECTED':
        return (
          <div className="flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-1.5 rounded-md">
            <X className="w-4 h-4" />
            <span className="text-xs font-bold">Rejeitado</span>
          </div>
        );
      default:
        return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold uppercase">{status}</span>;
    }
  };

  const renderSignersStatus = (deal: any) => {
    if (!['SENT', 'READ', 'PARTIALLY_SIGNED'].includes(deal.status)) {
      return null;
    }

    if (!deal.signers || deal.signers.length === 0) {
      return null;
    }

    const waitingSigners = deal.signers.filter((s: Signatory) =>
      !s.status || s.status === 'waiting' || s.status === 'read'
    );

    if (waitingSigners.length === 0) {
      return null;
    }

    return (
      <div className="mt-4 bg-gradient-to-r from-amber-100 to-amber-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-yellow-700" />
          <span className="text-sm font-semibold text-yellow-800">Aguardando assinatura:</span>
        </div>
        <div className="flex items-center gap-2">
          {waitingSigners.map((signer: Signatory) => (
            <div key={signer.id} className="text-xs bg-amber-50 text-amber-900 px-2.5 py-1.5 rounded font-medium border border-amber-200">
              {signer.name}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Meus Contratos</h1>
          <p className="text-slate-500">Gerencie e acompanhe o status de suas negociações.</p>
        </div>
        <Button
          variant="primary"
          icon={<FilePlus className="w-5 h-5" />}
          onClick={() => navigate('/deals/new')}
        >
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
          <Button variant="link" size="sm" icon={<Grid className="w-4 h-4" />} onClick={() => setViewMode('grid')} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${viewMode === 'grid' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Cards
          </Button>
          <Button variant="link" size="sm" icon={<List className="w-4 h-4" />} onClick={() => setViewMode('table')} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Tabela
          </Button>
        </div>
      </div>

      {/* Badge mostrando modo de busca */}
      {serverSearchTerm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
          <Search className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-700">
            Buscando no servidor por: <strong>"{serverSearchTerm}"</strong>
          </span>
        </div>
      )}

      {/* Contador de progresso */}
      {!isLoading && !isError && allDeals.length > 0 && (
        <p className="text-slate-500 text-sm">
          {serverSearchTerm
            ? `Resultados da busca: ${dealsToDisplay.length} de ${totalDeals} contratos`
            : `Mostrando ${dealsToDisplay.length} de ${totalDeals} contratos`
          }
        </p>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <span className="loading loading-spinner loading-lg w-12 h-12 text-[#ef0474] mx-auto mb-4"></span>
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

      {/* Empty state quando não encontra localmente */}
      {searchTerm && localFilteredDeals.length === 0 && !serverSearchTerm && allDeals.length > 0 && (
        <div className="text-center py-8 text-slate-500 bg-slate-50 border border-slate-200 rounded-lg">
          <span className="loading loading-spinner loading-md text-primary mx-auto mb-2" />
          <p>Nenhum contrato encontrado localmente.</p>
          <p className="text-sm">Buscando no servidor...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && allDeals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-slate-50 border border-slate-200 rounded-lg">
          <FilePlus className="w-16 h-16 text-slate-300" />
          <p className="text-slate-600 font-semibold text-lg">Nenhum contrato encontrado</p>
          <p className="text-slate-500">Crie seu primeiro contrato clicando no botão acima.</p>
        </div>
      )}

      {/* Content com scroll container */}
      {!isLoading && !isError && allDeals.length > 0 && (
        <div
          ref={scrollContainerRef}
          className="overflow-y-auto max-h-[calc(100vh-300px)]"
        >
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
              {dealsToDisplay.map(deal => (
                <div
                  key={deal.id}
                  className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => navigate(`/deals/${deal.id}`)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-mono text-slate-400">#{deal.id.padStart(5, '0')}</span>
                  </div>

                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-800 group-hover:text-primary transition-colors">
                        {deal.name}
                      </h3>
                      <p className="text-sm font-medium text-slate-500 mt-1">
                        {user?.email}
                      </p>
                      <div className="mt-3">
                        <div className="flex items-center justify-between gap-4">
                          {getStatusBadge(deal.status)}
                          <div className="flex gap-3 text-slate-300">
                            <div className="flex items-center gap-1">
                              <div className="py-1.5 px-1.5 rounded font-medium bg-green-100 text-green-600">
                                <CheckCircle2 className="w-3 h-3" />
                              </div>
                              <span className="text-xs font-bold text-slate-600">{UtilsService.getSignersCount(deal).signed}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <div className="py-1.5 px-1.5 rounded font-medium bg-amber-100 text-amber-600">
                                <Hourglass className="w-3 h-3" />
                              </div>
                              <span className="text-xs font-bold text-slate-600">{UtilsService.getSignersCount(deal).waiting}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Status detalhado dos signatários */}
                      {renderSignersStatus(deal)}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <div className="py-1.5 px-1.5 rounded font-medium bg-gray-100 text-gray-600">
                        <Calendar className="w-3 h-3 text-gray-400" />
                      </div>
                      <span>{deal.expirationDate
                        ? `Expira em ${new Date(deal.expirationDate).toLocaleDateString('pt-BR')}`
                        : `Criado em ${new Date(deal.createdAt).toLocaleDateString('pt-BR')}`}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">ID</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Contrato</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Signatários</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dealsToDisplay.map(deal => (
                    <tr
                      key={deal.id}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/deals/${deal.id}`)}
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

          {/* Loading indicator no final para infinite scroll */}
          <div ref={loadMoreRef} className="py-4">
            {isFetchingNextPage && (
              <div className="flex justify-center items-center gap-2">
                <span className="loading loading-spinner loading-lg w-6 h-6 text-[#ef0474] mx-auto mb-4"></span>
                <span className="text-slate-500">Carregando mais...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};