import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, FileText, Home, Users, DollarSign, User, Edit, AlertCircle, AlertTriangle, X, Eye } from 'lucide-react';
import { Button } from '../../components/Button';
import { useDeal, useRemoveSignatoryFromDeal } from './hooks/useDeals';
import type { DealStatus, DealDocument, Signatory } from '../../types/types';
import { mergeDealData } from './utils/extractDealData';
import { SignerCard } from './components/SignerCard';
import { DealContextBanner } from './components/DealContextBanner';
import { DocumentCategorizedList } from './components/DocumentCategorizedList';
import { DocumentDataDrawer } from './components/DocumentDataDrawer';
import { DocumentVariablesView } from './components/DocumentVariablesView.tsx';

/* ------------------------------------------------------------------ */
/*  Marital-state label helper                                         */
/* ------------------------------------------------------------------ */
const MARITAL_LABELS: Record<string, string> = {
	solteiro: 'Solteiro(a)',
	casado: 'Casado(a)',
	viuvo: 'Viúvo(a)',
	divorciado: 'Divorciado(a)',
	uniao_estavel: 'União Estável',
};

export const DealDetailsView: React.FC = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const dealId = id || '';

	const { data: dealData, isLoading, isError, error } = useDeal(dealId);

	const [removeSignerLoading, setRemoveSignerLoading] = useState(false);
	const removeSignatoryMutation = useRemoveSignatoryFromDeal();

	const [activeTab, setActiveTab] = useState<'data' | 'docs' | 'signers' | 'validations'>('data');
	const [selectedDoc, setSelectedDoc] = useState<DealDocument | null>(null);
	const [contractModalSection, setContractModalSection] = useState<string | null>(null);

	const removeSigner = async (signerId: string) => {
		if (!dealId) return;
		if (signerId.length < 15) return;

		try {
			setRemoveSignerLoading(true);
			await removeSignatoryMutation.mutateAsync({ dealId, signatoryId: signerId });
		} catch (error) {
			console.error('Erro ao remover signatario do banco:', error);
		} finally {
			setRemoveSignerLoading(false);
		}
	}

	const getStatusBadge = (status: DealStatus) => {
		switch (status) {
			case 'SIGNED': return <span className="bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase w-fit">Assinado</span>;
			case 'SENT': return <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase w-fit">Enviado para assinatura</span>;
			case 'READ': return <span className="bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase w-fit">Visualizado</span>;
			case 'PARTIALLY_SIGNED': return <span className="bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase w-fit">Parcialmente assinado</span>;
			case 'DRAFT': return <span className="bg-yellow-100 text-yellow-700 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase w-fit">{"Preparação do documento"}</span>;
			case 'CANCELED': return <span className="bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase w-fit">Cancelado</span>;
			case 'REJECTED': return <span className="bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase w-fit">Rejeitado</span>;
			default: return <span className="bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase w-fit">{status}</span>;
		}
	};

	const getDocumentStatusBadge = (status?: string) => {
		if (!status) return null;
		switch (status) {
			case 'EXTRACTED':
			case 'OCR_DONE':
				return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Processado</span>;
			case 'OCR_PROCESSING':
				return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Processando</span>;
			case 'ERROR':
				return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">Erro</span>;
			default:
				return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5">Pendente</span>;
		}
	};

	// Loading state
	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh]">
				<span className="loading loading-spinner loading-lg w-12 h-12 text-[#ef0474] mx-auto mb-4"></span>
				<p className="text-slate-600 text-sm">Carregando dados do contrato...</p>
			</div>
		);
	}

	// Error state
	if (isError || !dealData) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh]">
				<AlertCircle className="w-12 h-12 text-red-500 mb-4" />
				<p className="text-red-700 font-semibold text-sm">Erro ao carregar contrato</p>
				<p className="text-red-600 text-xs">{error instanceof Error ? error.message : 'Contrato não encontrado'}</p>
				<Button onClick={() => navigate('/dashboard')} icon={<ArrowLeft className="w-4 h-4" />} className="mt-4" variant="secondary">
					Voltar
				</Button>
			</div>
		);
	}

	const formatCurrency = (value: number) => {
		return new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(value);
	}

	// Processar dados do deal
	const deal = mergeDealData(dealData);

	const getDealValue = () => {
		if (deal.valor !== 'Não informado' && deal.valor !== '' || !deal.metadata?.contractValue) return deal.valor;
		return formatCurrency(Number(deal.metadata?.contractValue) / 100);
	}

	const getUsersIcon = (count: number) => {
		if (count > 1) return <Users className="w-4 h-4" />;
		return <User className="w-4 h-4" />;
	}

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
	 * Parse contract fields to get variables grouped by section
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

			return Object.fromEntries(
				Object.entries(sections).filter(([, items]) => items.length > 0)
			);
		} catch {
			return null;
		}
	};

	const contractSections = getContractFieldsSections();
	const matriculaDocs = (dealData.documents || []).filter((doc: any) => doc?.documentType === 'MATRICULA');

	const getDeep = (obj: any, path: string[]) => {
		return path.reduce<any>((acc, key) => (acc != null ? acc[key] : undefined), obj);
	};

	const toDisplayText = (value: any): string | null => {
		if (value === null || value === undefined) return null;
		if (typeof value === 'string') return value.trim() ? value : null;
		if (typeof value === 'number') return String(value);
		if (typeof value === 'boolean') return value ? 'Sim' : 'Não';

		if (typeof value === 'object') {
			// Common “string-like” fields
			const enderecoCompleto = value.endereco_completo || value.enderecoCompleto;
			if (typeof enderecoCompleto === 'string' && enderecoCompleto.trim()) return enderecoCompleto;

			const nome = value.nome || value.name;
			if (typeof nome === 'string' && nome.trim()) return nome;

			const numero = value.numero || value.number;
			if (typeof numero === 'string' && numero.trim()) return numero;
			if (typeof numero === 'number') return String(numero);

			// Address object pieces
			const logradouro = typeof value.logradouro === 'string' ? value.logradouro : undefined;
			const numeroEndereco = value.numero_endereco ?? value.numeroEndereco ?? value.numero;
			const complemento = typeof value.complemento === 'string' ? value.complemento : undefined;
			const bairro = typeof value.bairro === 'string' ? value.bairro : undefined;
			const cidade = typeof value.cidade === 'string' ? value.cidade : undefined;
			const estado = typeof value.estado === 'string' ? value.estado : undefined;
			const uf = typeof value.uf === 'string' ? value.uf : undefined;

			if (logradouro || numeroEndereco || complemento || bairro || cidade || estado || uf) {
				const parts: string[] = [];
				const firstLine = [logradouro, numeroEndereco != null ? String(numeroEndereco) : null]
					.filter(Boolean)
					.join(', ');
				if (firstLine) parts.push(firstLine);
				if (complemento) parts.push(complemento);
				const secondLine = [bairro, cidade].filter(Boolean).join(', ');
				if (secondLine) parts.push(secondLine);
				const region = [uf || estado].filter(Boolean).join('');
				if (region) parts.push(region);
				return parts.join(' - ');
			}

			return null;
		}

		return null;
	};

	const getMatriculaInfo = (doc: any) => {
		const vars = doc?.variables;

		const numero =
			toDisplayText(getDeep(vars, ['matricula', 'numero'])) ||
			toDisplayText(getDeep(vars, ['matricula', 'numero_matricula'])) ||
			toDisplayText(getDeep(vars, ['dados_matricula', 'numero'])) ||
			toDisplayText(getDeep(vars, ['dados_matricula', 'matricula', 'numero'])) ||
			toDisplayText(getDeep(vars, ['dados_matricula', 'matricula', 'numero_matricula'])) ||
			null;

		const endereco =
			toDisplayText(getDeep(vars, ['dados_matricula', 'imovel', 'endereco_completo'])) ||
			toDisplayText(getDeep(vars, ['dados_matricula', 'imovel', 'endereco'])) ||
			toDisplayText(getDeep(vars, ['imovel', 'endereco', 'endereco_completo'])) ||
			toDisplayText(getDeep(vars, ['imovel', 'endereco_completo'])) ||
			toDisplayText(getDeep(vars, ['imovel', 'endereco'])) ||
			toDisplayText(getDeep(vars, ['endereco_completo'])) ||
			null;

		const cartorio =
			toDisplayText(getDeep(vars, ['dados_matricula', 'cartorio', 'nome'])) ||
			toDisplayText(getDeep(vars, ['matricula', 'cartorio', 'nome'])) ||
			toDisplayText(getDeep(vars, ['dados_matricula', 'cartorio'])) ||
			toDisplayText(getDeep(vars, ['matricula', 'cartorio'])) ||
			null;

		return { numero, endereco, cartorio };
	};

	const handleListRegistries = () => {
		return (
			<div className="space-y-2">
				{matriculaDocs.map((doc: any, idx: number) => {
					const info = getMatriculaInfo(doc);

					const primaryLabel = info.numero
						? `Matrícula ${info.numero}`
						: (doc?.originalFilename ? String(doc.originalFilename) : `Matrícula ${idx + 1}`);

					const secondaryParts = [info.endereco, info.cartorio].filter(Boolean);
					const secondaryLabel =
						secondaryParts.length > 0 ? secondaryParts.join(' • ') : null;

					return (
						<div key={doc?.id || `${doc?.originalFilename || 'matricula'}_${idx}`} className="flex items-center gap-2.5">
							<div className="bg-slate-100 p-1.5 rounded-full">
								<FileText className="w-3.5 h-3.5 text-slate-400" />
							</div>
							<div className="flex-1 min-w-0">
								<span className="text-sm font-medium text-slate-800 block truncate">
									{primaryLabel}
								</span>
								{secondaryLabel ? (
									<span className="text-xs text-slate-500 block truncate">
										{secondaryLabel}
									</span>
								) : (
									<span className="text-xs text-slate-400 italic">Sem informações extraídas</span>
								)}
							</div>
						</div>
					);
				})}
			</div>
		);
	};

	const formatFieldLabel = (key: string): string => {
		return key
			.replace(/\./g, ' > ')
			.replace(/_/g, ' ')
			.replace(/\b\w/g, c => c.toUpperCase());
	};

	// Metadata from step 1
	const metaConfig = dealData.metadata || {};
	const useFgts = metaConfig.useFgts ? 'Sim' : 'Não';
	const bankFinancing = metaConfig.bankFinancing ? 'Sim' : 'Não';
	const consortiumLetter = metaConfig.consortiumLetter ? 'Sim' : 'Não';

	// Marital state from metadata.buyers / metadata.sellers
	const metaBuyers: any[] = metaConfig.buyers || [];
	const metaSellers: any[] = metaConfig.sellers || [];

	const getMaritalLabel = (persons: any[], idx: number) => {
		const p = persons[idx];
		if (!p?.maritalState) return null;
		return MARITAL_LABELS[p.maritalState] || p.maritalState;
	};

	const handleToggleDetailsModal = (section: string | null, isOpen: boolean = false) => {
		const modal = document.getElementById('details_modal') as HTMLDialogElement;

		if (isOpen) {
			modal.close();

			setTimeout(() => {
				setContractModalSection(null);
			}, 150);
			return;
		}

		setContractModalSection(section);
		modal.showModal();
	}

	return (
		<div className="p-4 md:p-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
			{/* Header */}
			<div className="mb-5">
				<Button variant="link" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />} onClick={() => navigate('/dashboard')} className="flex items-center text-slate-500 hover:text-slate-700 text-xs mb-3 transition-colors">
					<span className="font-medium">Voltar para listagem</span>
				</Button>

				<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
					<div>
						<div className="flex flex-col md:flex-row md:items-center gap-3">
							<h1 className="text-2xl font-bold text-slate-800">{deal.name}</h1>
							{getStatusBadge(deal.status)}
						</div>
						<div className="text-slate-400 mt-1 flex items-center gap-2 text-xs">
							<span>{deal.type}</span>
							<span className="w-1 h-1 bg-slate-300 rounded-full"></span>
							<span>Criado em {deal.date}</span>
						</div>
					</div>

					{(deal.status === 'PREPARATION' || deal.status === 'DRAFT') && (
						<div className="flex flex-wrap gap-2">
							<Button
								variant="secondary"
								size="sm"
								icon={<Edit className="w-3.5 h-3.5" />}
								onClick={() => navigate(`/deals/${dealId}/edit?step=${getContextualStep()}`)}
							>
								Continuar a preparação do documento
							</Button>
						</div>
					)}
				</div>
			</div>

			{/* Contextual Banner */}
			<div className="mb-5">
				<DealContextBanner deal={dealData} />
			</div>

			<div className="tabs tabs-box bg-slate-100 gap-2 p-3 mb-5">
				{/* Aba Dados Tratados */}
				<input
					type="radio"
					name="deal_details_tabs"
					className={`tab px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'data' ? 'bg-white text-slate-800' : 'text-slate-500 hover:bg-white/90 hover:text-slate-400'}`}
					aria-label="Dados Tratados"
					defaultChecked
					onChange={() => setActiveTab('data')}
				/>
				<div className="tab-content bg-white rounded-b-xl border border-slate-200 shadow-sm p-5">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

						{/* --- Card: Informacoes Gerais --- */}
						<div className="border border-slate-200 rounded-xl overflow-hidden">
							<div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
								<FileText className="w-4 h-4 text-slate-400" />
								<span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{"Informacoes Gerais"}</span>
							</div>
							<div className="p-4">
								<div className="grid grid-cols-2 gap-3">
									<div>
										<span className="text-xs text-slate-400 block mb-0.5">{"Data de Criacao"}</span>
										<span className="text-sm text-slate-800 font-medium">{deal.date}</span>
									</div>
									<div>
										<span className="text-xs text-slate-400 block mb-0.5">{"Tipo"}</span>
										<span className="text-sm text-slate-800 font-medium">{deal.type}</span>
									</div>
								</div>
							</div>
						</div>

						{/* --- Card: Imovel --- */}
						<div className="border border-slate-200 rounded-xl overflow-hidden">
							<div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Home className="w-4 h-4 text-slate-400" />
									<span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
										{`Imóvel${matriculaDocs.length > 0 ? ` (Matrícula${matriculaDocs.length > 1 ? 's' : ''}: ${matriculaDocs.length})` : ''}`}
									</span>
								</div>
								{(contractSections?.['Imóvel'] || matriculaDocs.length > 0) && (
									<Button variant="link" size="sm" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => handleToggleDetailsModal('Imóvel')} className="text-xs text-slate-400 hover:text-slate-700 font-medium flex items-center gap-1 transition-colors">
										Detalhes
									</Button>
								)}
							</div>
							<div className="p-4">
								{matriculaDocs.length > 0 ? (
									handleListRegistries()
								) : (
									<div className="grid grid-cols-2 gap-3">
										<div>
											<span className="text-xs text-slate-400 block mb-0.5">{"Endereço"}</span>
											<span className="text-sm text-slate-800 font-medium">{deal.address || 'Não informado'}</span>
										</div>
										<div>
											<span className="text-xs text-slate-400 block mb-0.5">{"Matrícula"}</span>
											<span className="text-sm text-slate-800 font-bold">{deal.matricula || 'Não informado'}</span>
										</div>
									</div>
								)}
							</div>
						</div>

						{/* --- Card: Compradores --- */}
						<div className="border border-slate-200 rounded-xl overflow-hidden">
							<div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
								<div className="flex items-center gap-2">
									{getUsersIcon(deal.buyers.length)}
									<span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
										{`Comprador${deal.buyers.length > 1 ? 'es' : ''} (${deal.buyers.length})`}
									</span>
								</div>
								{contractSections?.['Compradores'] && (
									<Button variant="link" size="sm" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => handleToggleDetailsModal('Compradores')} className="text-xs text-slate-400 hover:text-slate-700 font-medium flex items-center gap-1 transition-colors">
										Detalhes
									</Button>
								)}
							</div>
							<div className="p-4">
								{deal.buyers.length > 0 ? (
									<div className="space-y-2">
										{deal.buyers.map((buyer: any, idx: number) => {
											const marital = getMaritalLabel(metaBuyers, idx);
											return (
												<div key={idx} className="flex items-center gap-2.5">
													<div className="bg-slate-100 p-1.5 rounded-full">
														<User className="w-3.5 h-3.5 text-slate-400" />
													</div>
													<div className="flex-1 min-w-0">
														<span className="text-sm font-medium text-slate-800 block truncate">
															{typeof buyer.name === 'string' ? buyer.name : 'Sem nome'}
														</span>
														{marital && (
															<span className="text-xs text-slate-500">{marital}</span>
														)}
													</div>
												</div>
											);
										})}
									</div>
								) : (
									<p className="text-xs text-slate-400 italic">{"Nenhum comprador cadastrado"}</p>
								)}
							</div>
						</div>

						{/* --- Card: Vendedores --- */}
						<div className="border border-slate-200 rounded-xl overflow-hidden">
							<div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
								<div className="flex items-center gap-2">
									{getUsersIcon(deal.sellers.length)}
									<span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
										{`Vendedor${deal.sellers.length > 1 ? 'es' : ''} (${deal.sellers.length})`}
									</span>
								</div>
								{contractSections?.['Vendedores'] && (
									<Button variant="link" size="sm" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => handleToggleDetailsModal('Vendedores')} className="text-xs text-slate-400 hover:text-slate-700 font-medium flex items-center gap-1 transition-colors">
										Detalhes
									</Button>
								)}
							</div>
							<div className="p-4">
								{deal.sellers.length > 0 ? (
									<div className="space-y-2">
										{deal.sellers.map((seller: any, idx: number) => {
											const marital = getMaritalLabel(metaSellers, idx);
											return (
												<div key={idx} className="flex items-center gap-2.5">
													<div className="bg-slate-100 p-1.5 rounded-full">
														<User className="w-3.5 h-3.5 text-slate-400" />
													</div>
													<div className="flex-1 min-w-0">
														<span className="text-sm font-medium text-slate-800 block truncate">
															{typeof seller.name === 'string' ? seller.name : 'Sem nome'}
														</span>
														{marital && (
															<span className="text-xs text-slate-500">{marital}</span>
														)}
													</div>
												</div>
											);
										})}
									</div>
								) : (
									<p className="text-xs text-slate-400 italic">{"Nenhum vendedor cadastrado"}</p>
								)}
							</div>
						</div>

						{/* --- Card: Condicoes Comerciais (full width) --- */}
						<div className="border border-slate-200 rounded-xl overflow-hidden lg:col-span-2">
							<div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
								<div className="flex items-center gap-2">
									<DollarSign className="w-4 h-4 text-slate-400" />
									<span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{"Condicoes Comerciais"}</span>
								</div>
								{contractSections?.['Condições Comerciais'] && (
									<Button variant="link" size="sm" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => handleToggleDetailsModal('Condições Comerciais')} className="text-xs text-slate-400 hover:text-slate-700 font-medium flex items-center gap-1 transition-colors">
										Detalhes
									</Button>
								)}
							</div>
							<div className="p-4">
								<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
									<div>
										<span className="text-xs text-slate-400 block mb-0.5">{"Valor"}</span>
										<span className="text-sm text-slate-800 font-bold">{getDealValue()}</span>
									</div>
									<div>
										<span className="text-xs text-slate-400 block mb-0.5">{"FGTS"}</span>
										<span className="text-sm text-slate-800 font-medium">{useFgts}</span>
									</div>
									<div>
										<span className="text-xs text-slate-400 block mb-0.5">{"Financiamento"}</span>
										<span className="text-sm text-slate-800 font-medium">{bankFinancing}</span>
									</div>
									<div>
										<span className="text-xs text-slate-400 block mb-0.5">{"Consorcio"}</span>
										<span className="text-sm text-slate-800 font-medium">{consortiumLetter}</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Aba Documentos */}
				<input
					type="radio"
					name="deal_details_tabs"
					className={`tab px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'docs' ? 'bg-white text-slate-800' : 'text-slate-500 hover:bg-white/90 hover:text-slate-400'}`}
					aria-label="Documentos"
					onChange={() => setActiveTab('docs')}
				/>
				<div className="tab-content bg-white rounded-b-xl border border-slate-200 shadow-sm p-0">
					<div className="p-4 border-b border-slate-100">
						<h3 className="font-semibold text-sm text-slate-800">Documentos do Contrato</h3>
						<p className="text-xs text-slate-500">
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
						<div className="p-6 text-center">
							<FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
							<p className="text-xs text-slate-500">Nenhum documento anexado</p>
							<p className="text-xs text-slate-400 mt-0.5">
								{"Clique em \"Continuar a preparação do documento\" para adicionar documentos"}
							</p>
						</div>
					)}
				</div>

				{/* Aba Signatários */}
				<input
					type="radio"
					name="deal_details_tabs"
					className={`tab px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'signers' ? 'bg-white text-slate-800' : 'text-slate-500 hover:bg-white/90 hover:text-slate-400'}`}
					aria-label="Signatários"
					onChange={() => setActiveTab('signers')}
				/>
				<div className="tab-content bg-white rounded-b-xl border border-slate-200 shadow-sm p-4">
					<h3 className="font-semibold text-sm text-slate-800 mb-0.5">{"Signatários"}</h3>
					<p className="text-xs text-slate-500 mb-3">
						{dealData.signers?.length || 0} {dealData.signers?.length !== 1 ? 'signatários' : 'signatário'} adicionado(s)
					</p>

					{dealData.signers?.length === 0 ? (
						<div className="p-6 text-center">
							<Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
							<p className="text-xs text-slate-500">{"Nenhum signatário adicionado"}</p>
							<p className="text-xs text-slate-400 mt-0.5">
								{"Clique em \"Continuar a preparação do documento\" para adicionar signatários"}
							</p>
						</div>
					) : (
						<div className="space-y-3">
							{dealData.signers?.map((signer: Signatory) => (
								<SignerCard
									key={signer.id}
									signer={signer}
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
					className={`tab px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'validations' ? 'bg-white text-slate-800' : 'text-slate-500 hover:bg-white/90 hover:text-slate-400'}`}
					aria-label={hasAlerts ? "\u26A0\uFE0E Validações" : "Validações"}
					onChange={() => setActiveTab('validations')}
				/>
				<div className="tab-content bg-white rounded-b-xl border border-slate-200 shadow-sm p-4">
					<h3 className="font-semibold text-sm text-slate-800 mb-3">{"Validações"}</h3>

					{hasAlerts ? (
						<div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
							<div className="flex items-start gap-2.5">
								<AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
								<div className="flex-1">
									<h4 className="font-semibold text-sm text-amber-900 mb-1.5">{"Alertas e Observações"}</h4>
									<ul className="space-y-0.5">
										{deal.alerts?.map((alert: string, idx: number) => (
											<li key={idx} className="text-xs text-amber-800 flex items-start gap-1.5">
												<span className="mt-0.5">{"•"}</span>
												<span>{alert}</span>
											</li>
										))}
									</ul>
								</div>
							</div>
						</div>
					) : (
						<div className="p-6 text-center">
							<CheckCircle2 className="w-10 h-10 text-green-300 mx-auto mb-2" />
							<p className="text-xs text-slate-500">{"Nenhuma pendência encontrada"}</p>
							<p className="text-xs text-slate-400 mt-0.5">
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

			{/* Modal de detalhes do contrato por seção */}
			<dialog
				id="details_modal"
				className="modal "
				onClick={(e) => {
					if (e.target === e.currentTarget) handleToggleDetailsModal(null, true);
				}}
				onCancel={(e) => {
					e.preventDefault();
					handleToggleDetailsModal(null, true);
				}}
			>
				<div className="modal-box bg-white max-w-2xl max-h-[80vh] overflow-y-auto">
					<div className="modal-header">
						{/* Header */}
						<div className="flex items-center justify-between p-5 border-b border-slate-200">
							<div>
								<h2 className="text-base font-bold text-slate-800">
									{contractModalSection === 'Compradores' && 'Detalhes dos Compradores'}
									{contractModalSection === 'Vendedores' && 'Detalhes dos Vendedores'}
									{contractModalSection === 'Imóvel' && 'Detalhes do Imóvel'}
									{contractModalSection === 'Condições Comerciais' && 'Detalhes das Condições Comerciais'}
									{contractModalSection === 'Outros' && 'Outros Detalhes'}
								</h2>
								<p className="text-xs text-slate-500 mt-0.5">{"Variáveis extraídas do contrato"}</p>
							</div>
							<Button variant="link" size="sm" icon={<X className="w-3.5 h-3.5" />} onClick={() => handleToggleDetailsModal(null, true)} className="tooltip tooltip-left text-xs text-slate-400 hover:text-slate-700 font-medium flex items-center gap-1 transition-colors" data-tip="Fechar" />
						</div>
					</div>
					{/* Body */}
					<div className="flex-1 overflow-y-auto p-5">
						{contractModalSection === 'Imóvel' && matriculaDocs.length > 0 ? (
							<div className="space-y-3">
								{matriculaDocs.map((doc: any, idx: number) => {
									const info = getMatriculaInfo(doc);
									const title = info.numero
										? `Matrícula ${info.numero}`
										: (doc?.originalFilename ? String(doc.originalFilename) : `Matrícula ${idx + 1}`);

									return (
										<div key={doc?.id || `${doc?.originalFilename || 'matricula'}_${idx}`} className="collapse collapse-arrow bg-white border border-slate-200 rounded-xl">
											<input type="checkbox" />
											<div className="collapse-title px-4 py-3 pr-12">
												<div className="flex items-center justify-between gap-3">
													<div className="min-w-0">
														<p className="text-sm font-semibold text-slate-800 truncate">{title}</p>
														{info.endereco ? (
															<p className="text-xs text-slate-500 truncate">{info.endereco}</p>
														) : doc?.originalFilename ? (
															<p className="text-xs text-slate-500 truncate">{String(doc.originalFilename)}</p>
														) : null}
													</div>
													<div className="flex-shrink-0">
														{getDocumentStatusBadge(doc?.status)}
													</div>
												</div>
											</div>
											<div className="collapse-content px-4 pb-4">
												{doc?.variables && Object.keys(doc.variables).length > 0 ? (
													<div className="bg-slate-50 rounded-xl border border-slate-200 p-4 overflow-x-hidden">
														<DocumentVariablesView variables={doc.variables} />
													</div>
												) : (
													<p className="text-xs text-slate-500 italic">Nenhum dado extraído para esta matrícula.</p>
												)}
											</div>
										</div>
									);
								})}
							</div>
						) : (
							<div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-200">
								{(contractSections?.[contractModalSection as string] as { key: string; value: string }[])?.map(({ key, value }, idx) => (
									<div key={idx} className="flex items-start gap-3 p-3 px-4">
										<span className="text-xs text-slate-400 font-mono min-w-[150px] pt-0.5 break-all">{formatFieldLabel(key)}</span>
										<span className="text-sm text-slate-800 flex-1 break-words">{value || '-'}</span>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Footer */}
					<div className="modal-action p-4 border-t border-slate-200 flex justify-end">
						<Button
							variant="secondary"
							className="text-xs h-8"
							onClick={() => handleToggleDetailsModal(null, true)}
						>
							Fechar
						</Button>
					</div>
				</div>
			</dialog>
		</div>
	);
};
