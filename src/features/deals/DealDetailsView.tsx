import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Circle, FileText, Home, Users, DollarSign, User, XCircle, Edit, Plus, Send, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../../components/Button';
import { useDeal } from './hooks/useDeals';
import type { DealStatus } from '../../types/types';

interface DealDetailsProps {
    dealId: string;
    onBack: () => void;
    onEdit?: (dealId: string) => void;
}

// Mock extra details that aren't in the main list
const MOCK_DETAILS_MAP: Record<string, any> = {
    '1': {
        address: 'Rua das Palmeiras, 500 - Jardim Europa, São Paulo/SP',
        area: '250m²',
        matricula: '45.678',
        cartorio: '10º Cartório de Registro de Imóveis',
        valor: 'R$ 850.000,00',
        entrada: 'R$ 170.000,00',
        financiamento: 'Sim',
        fgts: 'Sim',
        consorcio: 'Não',
        buyers: [{ name: 'João Silva', email: 'joao@email.com', phone: '(11) 99999-0001' }],
        sellers: [{ name: 'Maria Oliveira', email: 'maria@email.com', phone: '(11) 99999-0002' }],
        docs: [
             { name: 'RG Comprador', sent: true, reviewed: true },
             { name: 'Comprovante de Residência Comprador', sent: true, reviewed: false },
             { name: 'RG Vendedor', sent: true, reviewed: true },
             { name: 'Matrícula do Imóvel', sent: true, reviewed: true },
        ]
    },
    '2': {
        address: 'Av. Morumbi, 1200 - Morumbi, São Paulo/SP',
        area: '450m²',
        matricula: '12.345',
        cartorio: '15º Cartório de Registro de Imóveis',
        valor: 'R$ 2.500.000,00',
        entrada: 'R$ 500.000,00',
        financiamento: 'Sim',
        fgts: 'Não',
        consorcio: 'Sim',
        buyers: [{ name: 'Ana Maria', email: 'ana@email.com', phone: '(11) 98888-0001' }],
        sellers: [{ name: 'Pedro Santos', email: 'pedro@email.com', phone: '(11) 97777-0002' }],
        docs: [
            { name: 'RG Comprador', sent: true, reviewed: true },
            { name: 'RG Vendedor', sent: true, reviewed: true },
       ]
    },
    '3': {
        address: 'Rua Industrial, 88 - Galpão 3 - Barra Funda, SP',
        area: '1000m²',
        matricula: '99.888',
        cartorio: '3º Cartório de Registro de Imóveis',
        valor: 'R$ 15.000,00 (Aluguel)',
        entrada: 'R$ 45.000,00 (Depósito)',
        financiamento: 'Não',
        fgts: 'Não',
        consorcio: 'Não',
        buyers: [{ name: 'Empresa XYZ Ltda', email: 'contato@xyz.com', phone: '(11) 3333-4444' }],
        sellers: [{ name: 'Imobiliária Corporativa', email: 'adm@imobcorp.com', phone: '(11) 3000-5000' }],
        docs: [
            { name: 'Contrato Social Locatário', sent: true, reviewed: true },
            { name: 'Ficha Cadastral', sent: true, reviewed: true },
       ]
    }
};

export const DealDetailsView: React.FC<DealDetailsProps> = ({ dealId, onBack, onEdit }) => {
    // Buscar dados reais do deal
    const { data: dealData, isLoading, isError, error } = useDeal(dealId);
    
    const [activeTab, setActiveTab] = useState<'data' | 'docs' | 'notes'>('data');
    const [notes, setNotes] = useState('');

    const getStatusBadge = (status: DealStatus) => {
        switch(status) {
            case 'SIGNED': return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase w-fit">Assinado</span>;
            case 'SENT': return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase w-fit">Enviado para assinatura</span>;
            case 'DRAFT': return <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold uppercase w-fit">Rascunho</span>;
            case 'PREPARATION': return <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold uppercase w-fit">Preparando</span>;
            case 'CANCELED': return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase w-fit">Cancelado</span>;
            case 'REJECTED': return <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold uppercase w-fit">Rejeitado</span>;
            default: return <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold uppercase w-fit">{status}</span>;
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <p className="text-slate-600">Carregando dados do contrato...</p>
            </div>
        );
    }

    // Error state
    if (isError || !dealData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <p className="text-red-700 font-semibold">Erro ao carregar contrato</p>
                <p className="text-red-600 text-sm">{error instanceof Error ? error.message : 'Contrato não encontrado'}</p>
                <Button onClick={onBack} className="mt-4" variant="secondary">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                </Button>
            </div>
        );
    }

    // Processar dados do deal
    const metadata = dealData.metadata || {};
    const deal = {
        ...dealData,
        type: dealData.name?.includes('Aluguel') ? 'Locação' : 'Compra e Venda',
        date: new Date(dealData.createdAt).toLocaleDateString('pt-BR'),
        // Dados do metadata ou fallback para mock
        address: metadata.address || MOCK_DETAILS_MAP['1']?.address || 'Não informado',
        area: metadata.area || MOCK_DETAILS_MAP['1']?.area || 'Não informado',
        matricula: metadata.matricula || MOCK_DETAILS_MAP['1']?.matricula || 'Não informado',
        cartorio: metadata.cartorio || MOCK_DETAILS_MAP['1']?.cartorio || 'Não informado',
        valor: metadata.valor || MOCK_DETAILS_MAP['1']?.valor || 'Não informado',
        entrada: metadata.entrada || MOCK_DETAILS_MAP['1']?.entrada || 'Não informado',
        financiamento: metadata.bankFinancing ? 'Sim' : 'Não',
        fgts: metadata.useFgts ? 'Sim' : 'Não',
        consorcio: metadata.consortiumLetter ? 'Sim' : 'Não',
        buyers: metadata.buyers || [],
        sellers: metadata.sellers || [],
        docs: dealData.documents || [],
    };

    const renderTabs = () => (
        <div className="flex gap-2 mb-6">
            <button
                onClick={() => setActiveTab('data')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'data' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
            >
                Dados Tratados
            </button>
            <button
                onClick={() => setActiveTab('docs')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'docs' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
            >
                Documentos
            </button>
            <button
                onClick={() => setActiveTab('notes')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'notes' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
            >
                Observações
            </button>
        </div>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="mb-6">
                <button onClick={onBack} className="cursor-pointer flex items-center text-slate-500 hover:text-slate-700 text-sm mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para listagem
                </button>
                
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <h1 className="text-3xl font-bold text-slate-800">{deal.name}</h1>
                            {getStatusBadge(deal.status)}
                        </div>
                        <div className="text-slate-500 mt-1 flex items-center gap-2 text-sm">
                            <span>{deal.type}</span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            <span>Criado em {deal.date}</span>
                        </div>
                    </div>

                    {/* Action Buttons - Only if preparation/draft */}
                    {(deal.status === 'PREPARATION' || deal.status === 'DRAFT') && (
                        <div className="flex flex-wrap gap-3">
                            <Button 
                                variant="secondary" 
                                className="h-10 px-4 text-sm whitespace-nowrap"
                                onClick={() => onEdit?.(dealId)}
                            >
                                <Edit className="w-4 h-4 mr-2" /> Editar
                            </Button>
                            <Button variant="secondary" className="h-10 px-4 text-sm whitespace-nowrap">
                                <Plus className="w-4 h-4 mr-2" /> Adicionar Doc
                            </Button>
                            <Button variant="secondary" className="h-10 px-4 text-sm whitespace-nowrap">
                                <FileText className="w-4 h-4 mr-2" /> Gerar Doc
                            </Button>
                            <Button className="h-10 px-4 text-sm whitespace-nowrap">
                                <Send className="w-4 h-4 mr-2" /> Enviar p/ assinatura
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {renderTabs()}

            {/* Tab Content */}
            {activeTab === 'data' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Imóvel */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 text-primary">
                            <Home className="w-5 h-5" />
                            <h3 className="font-bold text-lg text-slate-800">Imóvel</h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Endereço</label>
                                <p className="text-slate-700 font-medium">{deal.address}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Matrícula</label>
                                    <p className="text-slate-800 font-bold">{deal.matricula}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Área</label>
                                    <p className="text-slate-800 font-bold">{deal.area}</p>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Cartório</label>
                                <p className="text-slate-700">{deal.cartorio}</p>
                            </div>
                        </div>
                    </div>

                    {/* Condições Comerciais */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 text-primary">
                            <DollarSign className="w-5 h-5" />
                            <h3 className="font-bold text-lg text-slate-800">Condições Comerciais</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-6 mb-4">
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Valor Total</label>
                                <p className="text-primary font-bold text-lg">{deal.valor}</p>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Entrada</label>
                                <p className="text-slate-800 font-medium text-lg">{deal.entrada}</p>
                            </div>
                        </div>
                         <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                             <div>
                                 <label className="text-xs text-slate-400 block mb-1">Financiamento</label>
                                 <p className="text-slate-800 font-medium">{deal.financiamento}</p>
                             </div>
                             <div>
                                 <label className="text-xs text-slate-400 block mb-1">FGTS</label>
                                 <p className="text-slate-800 font-medium">{deal.fgts}</p>
                             </div>
                             <div>
                                 <label className="text-xs text-slate-400 block mb-1">Consórcio</label>
                                 <p className="text-slate-800 font-medium">{deal.consorcio}</p>
                             </div>
                         </div>
                    </div>

                    {/* Comprador */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-2 text-primary">
                            <User className="w-5 h-5" />
                            <h3 className="font-bold text-lg text-slate-800">
                                Comprador{deal.buyers.length !== 1 && 'es'} ({deal.buyers.length})
                            </h3>
                        </div>
                        <p className="text-xs text-slate-400 mb-4">
                            {deal.buyers.length || 0} Pessoa(s)
                        </p>
                        {deal.buyers.length > 0 ? (
                            deal.buyers.map((buyer: any, idx: number) => (
                                <div key={idx} className="bg-slate-50 p-3 rounded-lg flex items-start gap-3 mb-2">
                                    <div className="bg-white p-2 rounded-full border border-slate-200">
                                        <User className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-800">{buyer.name || 'Sem nome'}</p>
                                        <p className="text-xs text-slate-500">{buyer.email || 'Sem email'}</p>
                                        {buyer.phone && <p className="text-xs text-slate-500">{buyer.phone}</p>}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-slate-400 italic">Nenhum comprador cadastrado</p>
                        )}
                    </div>

                    {/* Vendedor */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-2 text-primary">
                            <Users className="w-5 h-5" />
                            <h3 className="font-bold text-lg text-slate-800">
                                Vendedor{deal.sellers.length !== 1 && 'es'} ({deal.sellers.length})
                            </h3>
                        </div>
                        <p className="text-xs text-slate-400 mb-4">
                            {deal.sellers.length || 0} Pessoa(s)
                        </p>
                        {deal.sellers.length > 0 ? (
                            deal.sellers.map((seller: any, idx: number) => (
                                <div key={idx} className="bg-slate-50 p-3 rounded-lg flex items-start gap-3 mb-2">
                                    <div className="bg-white p-2 rounded-full border border-slate-200">
                                        <User className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-800">{seller.name || 'Sem nome'}</p>
                                        <p className="text-xs text-slate-500">{seller.email || 'Sem email'}</p>
                                        {seller.phone && <p className="text-xs text-slate-500">{seller.phone}</p>}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-slate-400 italic">Nenhum vendedor cadastrado</p>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'docs' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="font-bold text-lg text-slate-800">Documentos do Contrato</h3>
                        <p className="text-sm text-slate-500">
                            {deal.docs.length > 0 
                                ? 'Documentos anexados ao contrato' 
                                : 'Nenhum documento anexado ainda'}
                        </p>
                    </div>
                    {deal.docs.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {deal.docs.map((doc: any, idx: number) => (
                                <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-50 p-2 rounded text-primary">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <span className="font-medium text-slate-700 block">
                                                {doc.originalFilename || doc.documentType || 'Documento'}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {doc.documentType || 'Tipo não especificado'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-1.5 min-w-[100px]">
                                            {doc.status === 'EXTRACTED' || doc.status === 'OCR_DONE' ? (
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            ) : doc.status === 'OCR_PROCESSING' ? (
                                                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                            ) : doc.status === 'ERROR' ? (
                                                <XCircle className="w-4 h-4 text-red-500" />
                                            ) : (
                                                <Circle className="w-4 h-4 text-slate-300" />
                                            )}
                                            <span className={`text-sm ${
                                                doc.status === 'EXTRACTED' || doc.status === 'OCR_DONE' 
                                                    ? 'text-green-600' 
                                                    : doc.status === 'OCR_PROCESSING'
                                                    ? 'text-blue-600'
                                                    : doc.status === 'ERROR'
                                                    ? 'text-red-600'
                                                    : 'text-slate-400'
                                            }`}>
                                                {doc.status === 'EXTRACTED' ? 'Processado' :
                                                 doc.status === 'OCR_DONE' ? 'OCR Concluído' :
                                                 doc.status === 'OCR_PROCESSING' ? 'Processando' :
                                                 doc.status === 'ERROR' ? 'Erro' :
                                                 doc.status || 'Pendente'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center">
                            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500">Nenhum documento anexado</p>
                            <p className="text-xs text-slate-400 mt-1">
                                Clique em "Editar" para adicionar documentos
                            </p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'notes' && (
                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                     <h3 className="font-bold text-lg text-slate-800 mb-1">Observações</h3>
                     <p className="text-sm text-slate-500 mb-4">Notas e observações sobre o contrato</p>
                     
                     <textarea
                        className="w-full h-32 border border-slate-600 rounded-lg p-3 bg-white text-slate-600 placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                        placeholder="Adicione observações sobre este contrato..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                     />
                     
                     <div className="flex justify-end mt-4">
                         <Button onClick={() => alert("Observações salvas!")}>
                             Salvar Observações
                         </Button>
                     </div>
                 </div>
            )}
        </div>
    );
};