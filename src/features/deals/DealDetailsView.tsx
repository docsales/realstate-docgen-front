import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, FileText, Home, Users, DollarSign, User, Edit, AlertCircle, AlertTriangle, X, Eye } from 'lucide-react';
import { Button } from '../../components/Button';
import { useDeal, useRemoveSignatoryFromDeal } from './hooks/useDeals';
import type { DealStatus, DealDocument, Signatory } from '../../types/types';
import { mergeDealData, formatCPF } from './utils/extractDealData';
import { SignerCard } from './components/SignerCard';
import { DealContextBanner } from './components/DealContextBanner';
import { DocumentCategorizedList } from './components/DocumentCategorizedList';
import { DocumentDataDrawer } from './components/DocumentDataDrawer';

export const DealDetailsView: React.FC = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const dealId = id || '';

	const { data: dealData, isLoading, isError, error } = useDeal(dealId);

	const [removeSignerLoading, setRemoveSignerLoading] = useState(false);
	const removeSignatoryMutation = useRemoveSignatoryFromDeal();

	const [activeTab, setActiveTab] = useState<'data' | 'docs' | 'signers' | 'validations'>('data');
	const [selectedDoc, setSelectedDoc] = useState<DealDocument | null>(null);
	const [showContractDetailsModal, setShowContractDetailsModal] = useState(false);

	const removeSigner = async (signerId: string) => {
		if (!dealId) return;
		if (signerId.length < 15) return;

		try {
			setRemoveSignerLoading(true);
			await removeSignatoryMutation.mutateAsync({ dealId, signatoryId: signerId });
			console.log('Signatario removido do banco de dados');
		} catch (error) {
			console.error('Erro ao remover signatario do banco:', error);
		} finally {
			setRemoveSignerLoading(false);
		}
	}

	const handleNavigateToSpecificStep = (step: number) => {
		if (deal.status !== 'DRAFT') return;

		navigate(`/deals/${dealId}/edit?step=${step}`);
	}

	const getStatusBadge = (status: DealStatus) => {
		switch (status) {
			case 'SIGNED': return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase w-fit">Assinado</span>;
			case 'SENT': return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase w-fit">Enviado para assinatura</span>;
			case 'READ': return <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold uppercase w-fit">Visualizado</span>;
			case 'PARTIALLY_SIGNED': return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold uppercase w-fit">Parcialmente assinado</span>;
			case 'DRAFT': return <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold uppercase w-fit">{"Preparação do documento"}</span>;
			case 'CANCELED': return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase w-fit">Cancelado</span>;
			case 'REJECTED': return <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold uppercase w-fit">Rejeitado</span>;
			default: return <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold uppercase w-fit">{status}</span>;
		}
	};

	// Loading state
	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh]">
				<span className="loading loading-spinner loading-lg w-12 h-12 text-[#ef0474] mx-auto mb-4"></span>
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
				<Button onClick={() => navigate('/dashboard')} className="mt-4" variant="secondary">
					<ArrowLeft className="w-4 h-4 mr-2" /> Voltar
				</Button>
			</div>
		);
	}

	const getDealValue = () => {
		if (deal.valor !== 'Não informado' && deal.valor !== '' || !deal.metadata?.contractValue) return deal.valor;
		return formatCurrency(Number(deal.metadata?.contractValue) / 100);
	}

	const getUsersIcon = (count: number) => {
		if (count > 1) return <Users className="w-5 h-5" />;
		return <User className="w-5 h-5" />;
	}

	const formatCurrency = (value: number) => {
		return new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(value);
	}

	// Processar dados do deal com extração de documentos
	const deal = mergeDealData(dealData);

	/**
	 * Determina o step contextual para o botão "Continuar a preparação do documento"
	 */
	const getContextualStep = (): number => {
		const hasDocuments = dealData.documents && dealData.documents.length > 0;
		const hasContractFields = (() => {
			try {
				if (!dealData.contractFields) return false;
				const fields = typeof dealData.contractFields === 'string'
					? JSON.parse(dealData.contractFields)
					: dealData.contractFields;
				return fields && Object.keys(fields).length > 0;
			} catch {
				return false;
			}
		})();
		const hasPreview = !!(dealData.consolidated?.draftPreviewUrl || dealData.consolidated?.generatedDocId);

		if (hasPreview) return 4;
		if (hasContractFields) return 3;
		if (hasDocuments) return 2;
		return 1;
	};

	const hasAlerts = deal.alerts && deal.alerts.length > 0;

	/**
	 * Parse contract fields to get all variables grouped by section
	 */
	const getContractFieldsSections = () => {
		try {
			if (!dealData.contractFields) return null;
			const fields = typeof dealData.contractFields === 'string'
				? JSON.parse(dealData.contractFields)
				: dealData.contractFields;
			if (!fields || Object.keys(fields).length === 0) return null;

			const sections: Record<string, { key: string; value: string }[]> = {
				'Compradores': [],
				'Vendedores': [],
				'Imóvel': [],
				'Condições Comerciais': [],
				'Outros': [],
			};

			Object.entries(fields).forEach(([key, value]) => {
				const displayValue = typeof value === 'string' ? value : JSON.stringify(value);
				const lk = key.toLowerCase();

				if (lk.startsWith('buyers') || lk.startsWith('buyer') || lk.includes('comprador')) {
					sections['Compradores'].push({ key, value: displayValue });
				} else if (lk.startsWith('sellers') || lk.startsWith('seller') || lk.includes('vendedor')) {
					sections['Vendedores'].push({ key, value: displayValue });
				} else if (lk.includes('imovel') || lk.includes('property') || lk.includes('matricula') || lk.includes('cartorio') || lk.includes('endereco')) {
					sections['Imóvel'].push({ key, value: displayValue });
				} else if (lk.includes('valor') || lk.includes('pagamento') || lk.includes('financ') || lk.includes('fgts') || lk.includes('entrada') || lk.includes('parcela')) {
					sections['Condições Comerciais'].push({ key, value: displayValue });
				} else {
					sections['Outros'].push({ key, value: displayValue });
				}
			});

			// Filter empty sections
			return Object.fromEntries(
				Object.entries(sections).filter(([, items]) => items.length > 0)
			);
		} catch {
			return null;
		}
	};

	const contractSections = getContractFieldsSections();

	/**
	 * Friendly label from field key
	 */
	const formatFieldLabel = (key: string): string => {
		return key
			.replace(/\./g, ' > ')
			.replace(/_/g, ' ')
			.replace(/\b\w/g, c => c.toUpperCase());
	};

	// Metadata from step 1
	const templateName = dealData.docTemplateId || null;
	const metaConfig = dealData.metadata || {};
	const useFgts = metaConfig.useFgts ? 'Sim' : 'Não';
	const bankFinancing = metaConfig.bankFinancing ? 'Sim' : 'Não';
	const consortiumLetter = metaConfig.consortiumLetter ? 'Sim' : 'Não';

	return (
		<div className="p-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
			{/* Header */}
			<div className="mb-6">
				<button onClick={() => navigate('/dashboard')} className="cursor-pointer flex items-center text-slate-500 hover:text-slate-700 text-sm mb-4 transition-colors">
					<div className="flex items-center gap-2">
						<ArrowLeft className="w-4 h-4" />
						<span className="text-sm font-medium">
							Voltar para listagem
						</span>
					</div>
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
								onClick={() => navigate(`/deals/${dealId}/edit?step=${getContextualStep()}`)}
							>
								<Edit className="w-4 h-4 mr-2" /> {"Continuar a preparação do documento"}
							</Button>
						</div>
					)}
				</div>
			</div>

			{/* Contextual Banner */}
			<div className="mb-6">
				<DealContextBanner deal={dealData} />
			</div>

			<div className="tabs tabs-box bg-slate-100 gap-2 p-4 mb-6">
				{/* Aba Dados Tratados */}
				<input
					type="radio"
					name="deal_details_tabs"
					className={`tab px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'data' ? 'bg-white text-slate-800' : 'text-slate-500 hover:bg-white/90 hover:text-slate-400'}`}
					aria-label="Dados Tratados"
					defaultChecked
					onChange={() => setActiveTab('data')}
				/>
				<div className="tab-content bg-white rounded-b-xl border border-slate-200 shadow-sm p-6">
					{/* Resumo do Deal */}
					<div className="space-y-6">
						{/* Info Geral */}
						<div>
							<h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
								<FileText className="w-5 h-5 text-slate-500" />
								{"Informações Gerais"}
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="bg-slate-50 rounded-lg p-4">
									<label className="text-xs text-slate-400 block mb-1">{"Data de Criação"}</label>
									<p className="text-slate-800 font-medium">{deal.date}</p>
								</div>
								<div className="bg-slate-50 rounded-lg p-4">
									<label className="text-xs text-slate-400 block mb-1">{"Tipo"}</label>
									<p className="text-slate-800 font-medium">{deal.type}</p>
								</div>
								{templateName && (
									<div className="bg-slate-50 rounded-lg p-4">
										<label className="text-xs text-slate-400 block mb-1">{"Template"}</label>
										<p className="text-slate-800 font-medium text-sm truncate">{templateName}</p>
									</div>
								)}
							</div>
						</div>

						{/* Condições Comerciais resumo */}
						<div>
							<h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
								<DollarSign className="w-5 h-5 text-slate-500" />
								{"Condições Comerciais"}
							</h3>
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
								<div className="bg-slate-50 rounded-lg p-4">
									<label className="text-xs text-slate-400 block mb-1">{"Valor Total"}</label>
									<p className="text-slate-800 font-bold">{getDealValue()}</p>
								</div>
								<div className="bg-slate-50 rounded-lg p-4">
									<label className="text-xs text-slate-400 block mb-1">{"FGTS"}</label>
									<p className="text-slate-800 font-medium">{useFgts}</p>
								</div>
								<div className="bg-slate-50 rounded-lg p-4">
									<label className="text-xs text-slate-400 block mb-1">{"Financiamento"}</label>
									<p className="text-slate-800 font-medium">{bankFinancing}</p>
								</div>
								<div className="bg-slate-50 rounded-lg p-4">
									<label className="text-xs text-slate-400 block mb-1">{"Consórcio"}</label>
									<p className="text-slate-800 font-medium">{consortiumLetter}</p>
								</div>
							</div>
						</div>

						{/* Imóvel */}
						<div>
							<h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
								<Home className="w-5 h-5 text-slate-500" />
								{"Imóvel"}
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="bg-slate-50 rounded-lg p-4">
									<label className="text-xs text-slate-400 block mb-1">{"Endereço"}</label>
									<p className="text-slate-800 font-medium">{deal.address}</p>
								</div>
								<div className="bg-slate-50 rounded-lg p-4">
									<label className="text-xs text-slate-400 block mb-1">{"Matrícula"}</label>
									<p className="text-slate-800 font-bold">{deal.matricula}</p>
								</div>
							</div>
						</div>

						{/* Compradores */}
						<div>
							<h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
								{getUsersIcon(deal.buyers.length)}
								{`Comprador${deal.buyers.length > 1 ? 'es' : ''} (${deal.buyers.length})`}
							</h3>
							{deal.buyers.length > 0 ? (
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									{deal.buyers.map((buyer: any, idx: number) => (
										<div key={idx} className="bg-slate-50 p-4 rounded-lg flex items-start gap-3">
											<div className="bg-white p-2 rounded-full border border-slate-200">
												<User className="w-4 h-4 text-slate-400" />
											</div>
											<div className="flex-1 min-w-0">
												<p className="font-medium text-slate-800">{typeof buyer.name === 'string' ? buyer.name : 'Sem nome'}</p>
												{buyer.cpf && (
													<p className="text-xs text-slate-600 font-mono">CPF: {formatCPF(buyer.cpf)}</p>
												)}
												{buyer.email && <p className="text-xs text-slate-500">{buyer.email}</p>}
												{buyer.phone && <p className="text-xs text-slate-500">{buyer.phone}</p>}
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-sm text-slate-400 italic">{"Nenhum comprador cadastrado"}</p>
							)}
						</div>

						{/* Vendedores */}
						<div>
							<h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
								{getUsersIcon(deal.sellers.length)}
								{`Vendedor${deal.sellers.length > 1 ? 'es' : ''} (${deal.sellers.length})`}
							</h3>
							{deal.sellers.length > 0 ? (
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									{deal.sellers.map((seller: any, idx: number) => (
										<div key={idx} className="bg-slate-50 p-4 rounded-lg flex items-start gap-3">
											<div className="bg-white p-2 rounded-full border border-slate-200">
												<User className="w-4 h-4 text-slate-400" />
											</div>
											<div className="flex-1 min-w-0">
												<p className="font-medium text-slate-800">{typeof seller.name === 'string' ? seller.name : 'Sem nome'}</p>
												{seller.cpf && (
													<p className="text-xs text-slate-600 font-mono">CPF: {formatCPF(seller.cpf)}</p>
												)}
												{seller.email && <p className="text-xs text-slate-500">{seller.email}</p>}
												{seller.phone && <p className="text-xs text-slate-500">{seller.phone}</p>}
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-sm text-slate-400 italic">{"Nenhum vendedor cadastrado"}</p>
							)}
						</div>

						{/* Botão ver detalhes do contrato - só aparece se houver contractFields */}
						{contractSections && (
							<div className="pt-4 border-t border-slate-100">
								<Button
									variant="secondary"
									className="w-full justify-center"
									onClick={() => setShowContractDetailsModal(true)}
								>
									<Eye className="w-4 h-4 mr-2" />
									{"Ver todos os detalhes do contrato"}
								</Button>
							</div>
						)}
					</div>
				</div>

				{/* Aba Documentos */}
				<input
					type="radio"
					name="deal_details_tabs"
					className={`tab px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'docs' ? 'bg-white text-slate-800' : 'text-slate-500 hover:bg-white/90 hover:text-slate-400'}`}
					aria-label="Documentos"
					onChange={() => setActiveTab('docs')}
				/>
				<div className="tab-content bg-white rounded-b-xl border border-slate-200 shadow-sm p-0">
					<div className="p-6 border-b border-slate-100">
						<div className="flex items-center justify-between w-full">
							<h3 className="font-bold text-lg text-slate-800">Documentos do Contrato</h3>
						</div>
						<p className="text-sm text-slate-500">
							{deal.docs.length > 0
								? `${deal.docs.length} documento${deal.docs.length !== 1 ? 's' : ''} anexado${deal.docs.length !== 1 ? 's' : ''}`
								: 'Nenhum documento anexado ainda'}
						</p>
					</div>
					{deal.docs.length > 0 ? (
						<DocumentCategorizedList
							documents={deal.docs}
							onSelectDocument={(doc) => setSelectedDoc(doc)}
						/>
					) : (
						<div className="p-8 text-center">
							<FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
							<p className="text-slate-500">Nenhum documento anexado</p>
							<p className="text-xs text-slate-400 mt-1">
								{"Clique em \"Continuar a preparação do documento\" para adicionar documentos"}
							</p>
						</div>
					)}
				</div>

				{/* Aba Signatários */}
				<input
					type="radio"
					name="deal_details_tabs"
					className={`tab px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'signers' ? 'bg-white text-slate-800' : 'text-slate-500 hover:bg-white/90 hover:text-slate-400'}`}
					aria-label={"Signatários"}
					onChange={() => setActiveTab('signers')}
				/>
				<div className="tab-content bg-white rounded-b-xl border border-slate-200 shadow-sm p-6">
					<div className="flex items-center justify-between w-full">
						<h3 className="font-bold text-lg text-slate-800 mb-1">{"Signatários"}</h3>
					</div>
					<p className="text-sm text-slate-500 mb-4">
						{dealData.signers?.length || 0} {dealData.signers?.length !== 1 ? 'Signatários' : 'Signatário'} adicionado(s) para o contrato
					</p>

					{dealData.signers?.length === 0 ? (
						<div className="p-8 text-center">
							<Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
							<p className="text-slate-500">{"Nenhum signatário adicionado"}</p>
							<p className="text-xs text-slate-400 mt-1">
								{"Clique em \"Continuar a preparação do documento\" para adicionar signatários"}
							</p>
						</div>
					) : (
						<div className="space-y-4">
							{dealData.signers?.map((signer: Signatory) => (
								<SignerCard
									key={signer.id} signer={signer}
									dealStatus={dealData.status}
									canRemove={dealData.status === 'DRAFT'}
									onRemove={removeSigner}
									onClick={() => {
										if (dealData.status === 'DRAFT') {
											navigate(`/deals/${dealId}/edit?step=5`);
										}
									}}
									isLoading={removeSignerLoading}
								/>
							))}
						</div>
					)}
				</div>

				{/* Aba Validações */}
				<input
					type="radio"
					name="deal_details_tabs"
					className={`tab px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'validations' ? 'bg-white text-slate-800' : 'text-slate-500 hover:bg-white/90 hover:text-slate-400'}`}
					aria-label={hasAlerts ? "\u26A0 Validações" : "Validações"}
					onChange={() => setActiveTab('validations')}
				/>
				<div className="tab-content bg-white rounded-b-xl border border-slate-200 shadow-sm p-6">
					<h3 className="font-bold text-lg text-slate-800 mb-4">{"Validações"}</h3>

					{hasAlerts ? (
						<div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
							<div className="flex items-start gap-3">
								<AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
								<div className="flex-1">
									<h4 className="font-bold text-amber-900 mb-2">{"Alertas e Observações"}</h4>
									<ul className="space-y-1">
										{deal.alerts.map((alert: string, idx: number) => (
											<li key={idx} className="text-sm text-amber-800 flex items-start gap-2">
												<span className="mt-0.5">{"•"}</span>
												<span>{alert}</span>
											</li>
										))}
									</ul>
								</div>
							</div>
						</div>
					) : (
						<div className="p-8 text-center">
							<CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-3" />
							<p className="text-slate-500">{"Nenhuma pendência encontrada"}</p>
							<p className="text-xs text-slate-400 mt-1">
								{"Todos os documentos e dados estão em conformidade."}
							</p>
						</div>
					)}
				</div>
			</div>

			{/* Document data drawer */}
			<DocumentDataDrawer
				document={selectedDoc}
				open={!!selectedDoc}
				onClose={() => setSelectedDoc(null)}
			/>

			{/* Modal de detalhes do contrato */}
			{showContractDetailsModal && contractSections && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					{/* Backdrop */}
					<div
						className="absolute inset-0 bg-black/50 backdrop-blur-sm"
						onClick={() => setShowContractDetailsModal(false)}
					/>

					{/* Modal */}
					<div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
						{/* Header */}
						<div className="flex items-center justify-between p-6 border-b border-slate-200">
							<div>
								<h2 className="text-xl font-bold text-slate-800">{"Detalhes do Contrato"}</h2>
								<p className="text-sm text-slate-500 mt-0.5">{"Variáveis extraídas e configuradas"}</p>
							</div>
							<button
								onClick={() => setShowContractDetailsModal(false)}
								className="cursor-pointer p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						{/* Body */}
						<div className="flex-1 overflow-y-auto p-6 space-y-6">
							{Object.entries(contractSections).map(([sectionName, items]) => {
								const sectionIcon = sectionName === 'Compradores' || sectionName === 'Vendedores'
									? <Users className="w-4 h-4 text-slate-400" />
									: sectionName === 'Imóvel'
										? <Home className="w-4 h-4 text-slate-400" />
										: sectionName === 'Condições Comerciais'
											? <DollarSign className="w-4 h-4 text-slate-400" />
											: <FileText className="w-4 h-4 text-slate-400" />;

								return (
									<div key={sectionName}>
										<h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
											{sectionIcon}
											{sectionName}
										</h3>
										<div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-200">
											{(items as { key: string; value: string }[]).map(({ key, value }, idx) => (
												<div key={idx} className="flex items-start gap-4 p-3 px-4">
													<span className="text-xs text-slate-400 font-mono min-w-[180px] pt-0.5 break-all">{formatFieldLabel(key)}</span>
													<span className="text-sm text-slate-800 flex-1 break-words">{value || '-'}</span>
												</div>
											))}
										</div>
									</div>
								);
							})}
						</div>

						{/* Footer */}
						<div className="p-4 border-t border-slate-200 flex justify-end">
							<Button
								variant="secondary"
								onClick={() => setShowContractDetailsModal(false)}
							>
								Fechar
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
