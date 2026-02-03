import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, FileText, Home, Users, DollarSign, User, XCircle, Edit, Send, Loader2, AlertCircle, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/Button';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ErrorModal } from '../../components/ErrorModal';
import { SuccessModal } from './components/SuccessModal';
import { useDeal, useRemoveSignatoryFromDeal, useSendContract } from './hooks/useDeals';
import type { DealStatus, Signatory } from '../../types/types';
import { mergeDealData, formatCPF } from './utils/extractDealData';
import { SignerCard } from './components/SignerCard';

export const DealDetailsView: React.FC = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const dealId = id || '';

	const { data: dealData, isLoading, isError, error } = useDeal(dealId);
	const sendContractMutation = useSendContract();

	const [removeSignerLoading, setRemoveSignerLoading] = useState(false);
	const removeSignatoryMutation = useRemoveSignatoryFromDeal();

	const [activeTab, setActiveTab] = useState<'data' | 'docs' | 'signers'>('data');
	const [isSending, setIsSending] = useState(false);
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const [showErrorModal, setShowErrorModal] = useState(false);
	const [showSuccessModal, setShowSuccessModal] = useState(false);
	const [errorTitle, setErrorTitle] = useState('');
	const [errorMessage, setErrorMessage] = useState('');
	const [errorDetails, setErrorDetails] = useState<string[]>([]);

	/**
	 * Valida se o deal possui todos os dados necessários para envio
	 */
	const validateDealForSending = () => {
		if (!dealData) return [];

		const errors: string[] = [];
		const deal = mergeDealData(dealData);

		// Verificar se há compradores
		if (!deal.buyers || deal.buyers.length === 0) {
			errors.push('Adicione pelo menos um comprador');
		}

		// Verificar se há vendedores
		if (!deal.sellers || deal.sellers.length === 0) {
			errors.push('Adicione pelo menos um vendedor');
		}

		// Verificar se há informações do imóvel
		const hasPropertyData = deal.address !== 'Não informado' ||
			deal.matricula !== 'Não informado' ||
			deal.area !== 'Não informado';

		if (!hasPropertyData) {
			errors.push('Adicione as informações do imóvel');
		}

		// Verificar se há preview gerado
		if (!dealData.consolidated?.draftPreviewUrl && !dealData.consolidated?.generatedDocId) {
			errors.push('Gere o preview do documento antes de enviar');
		}

		// Verificar se há signatários
		if (!dealData.signers || dealData.signers.length === 0) {
			errors.push('Adicione pelo menos um signatário');
		}

		return errors;
	};

	const handleSendContractClick = () => {
		const validationErrors = validateDealForSending();

		if (validationErrors.length > 0) {
			setErrorTitle('Dados Incompletos');
			setErrorMessage('Não é possível enviar o contrato pois alguns dados obrigatórios estão faltando:');
			setErrorDetails(validationErrors);
			setShowErrorModal(true);
			return;
		}

		setShowConfirmModal(true);
	};

	/**
	 * Extrai e formata a mensagem de erro da API
	 */
	const extractErrorMessage = (error: any): { title: string; message: string; details: string[] } => {
		const details: string[] = [];
		let title = 'Erro ao Enviar Contrato';
		let message = 'Ocorreu um erro ao tentar enviar o contrato para assinatura.';

		// Verificar se há resposta da API
		if (error?.response?.data) {
			const data = error.response.data;
			const status = error.response.status;

			// Erro 422 - Validação/Dados incompletos
			if (status === 422) {
				title = 'Dados Incompletos ou Inválidos';
				message = 'O contrato não pode ser enviado devido a problemas nos dados:';

				// Tentar extrair detalhes do erro
				if (data.message) {
					if (Array.isArray(data.message)) {
						details.push(...data.message);
					} else {
						details.push(data.message);
					}
				} else if (data.erro) {
					details.push(data.erro);
				} else if (data.errors && Array.isArray(data.errors)) {
					details.push(...data.errors);
				}

				// Se não conseguimos extrair detalhes, adicionar mensagem genérica
				if (details.length === 0) {
					details.push('Verifique se todos os dados do contrato estão completos');
					details.push('Certifique-se de que o preview foi gerado');
				}
			}
			// Erro 400 - Bad Request
			else if (status === 400) {
				title = 'Requisição Inválida';
				message = 'A requisição não pôde ser processada:';
				details.push(data.message || data.erro || 'Dados inválidos fornecidos');
			}
			// Erro 404 - Não encontrado
			else if (status === 404) {
				title = 'Contrato Não Encontrado';
				message = 'O contrato não foi encontrado no sistema.';
				details.push('Verifique se o contrato ainda existe');
				details.push('Tente recarregar a página');
			}
			// Erro 500 - Erro do servidor
			else if (status >= 500) {
				title = 'Erro do Servidor';
				message = 'Ocorreu um erro no servidor ao processar sua requisição.';
				details.push('Tente novamente em alguns instantes');
				details.push('Se o problema persistir, entre em contato com o suporte');
			}
			// Outros erros
			else {
				if (data.message) {
					details.push(data.message);
				} else if (data.erro) {
					details.push(data.erro);
				}
			}
		}
		// Erro de rede ou timeout
		else if (error?.message) {
			if (error.message.includes('timeout') || error.message.includes('Network Error')) {
				title = 'Erro de Conexão';
				message = 'Não foi possível conectar ao servidor.';
				details.push('Verifique sua conexão com a internet');
				details.push('Tente novamente em alguns instantes');
			} else {
				details.push(error.message);
			}
		}

		// Se não há detalhes, adicionar mensagem genérica
		if (details.length === 0) {
			details.push('Erro desconhecido. Tente novamente.');
		}

		return { title, message, details };
	};

	const handleConfirmSend = async () => {
		if (!dealId) return;

		setIsSending(true);
		try {
			await sendContractMutation.mutateAsync({ dealId });
			setShowConfirmModal(false);

			// Mostrar modal de sucesso
			setTimeout(() => {
				setShowSuccessModal(true);
			}, 300);
		} catch (error: any) {
			console.error('Erro ao enviar contrato:', error);
			setShowConfirmModal(false);

			// Extrair e formatar a mensagem de erro
			const errorInfo = extractErrorMessage(error);
			setErrorTitle(errorInfo.title);
			setErrorMessage(errorInfo.message);
			setErrorDetails(errorInfo.details);
			setShowErrorModal(true);
		} finally {
			setIsSending(false);
		}
	};

	const removeSigner = async (signerId: string) => {
		if (!dealId) return;
		if (signerId.length < 15) return;

		try {
			setRemoveSignerLoading(true);
			await removeSignatoryMutation.mutateAsync({ dealId, signatoryId: signerId });
			console.log('✅ Signatário removido do banco de dados');
		} catch (error) {
			console.error('❌ Erro ao remover signatário do banco:', error);
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
			case 'DRAFT': return <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold uppercase w-fit">Rascunho</span>;
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

	const renderNavigateToSpecificStepButton = (step: number, description: string) => {
		if (deal.status !== 'DRAFT') return <></>;

		return (
			<Button
				onClick={() => handleNavigateToSpecificStep(step)}
				variant="secondary"
				size="sm"
				className="tooltip tooltip-left flex items-center gap-2"
				data-tip={`Acesse as configurações ${description} para visualizar os dados`}
				disabled={deal.status !== 'DRAFT'}
			>
				<div className="flex items-center gap-2">
					<Edit className="w-4 h-4 mr-2" />
					<span className="text-sm">Visualizar</span>
				</div>
			</Button>
		);
	}

	// Processar dados do deal com extração de documentos
	const deal = mergeDealData(dealData);

	return (
		<div className="p-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
			{/* Header */}
			<div className="mb-6">
				<button onClick={() => navigate('/dashboard')} className="cursor-pointer flex items-center text-slate-500 hover:text-slate-700 text-sm mb-4 transition-colors">
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
								onClick={() => navigate(`/deals/${dealId}/edit?step=1`)}
								disabled={isSending}
							>
								<Edit className="w-4 h-4 mr-2" /> Editar
							</Button>
							<Button
								className="h-10 px-4 text-sm whitespace-nowrap"
								onClick={handleSendContractClick}
								disabled={isSending}
								isLoading={isSending}
							>
								<Send className="w-4 h-4 mr-2" /> Enviar para assinatura
							</Button>
						</div>
					)}
				</div>
			</div>

			{/* Alertas */}
			{deal.alerts && deal.alerts.length > 0 && (
				<div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
					<div className="flex items-start gap-3">
						<AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
						<div className="flex-1">
							<h3 className="font-bold text-amber-900 mb-2">Alertas e Observações</h3>
							<ul className="space-y-1">
								{deal.alerts.map((alert, idx) => (
									<li key={idx} className="text-sm text-amber-800">
										• {alert}
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			)}

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
				<div className="tab-content">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Imóvel */}
						<div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm">
							<div className="flex items-center gap-2 mb-4 text-primary">
								<div className="flex items-center justify-between w-full">
									<div className="flex items-center gap-2">
										<Home className="w-5 h-5" />
										<h3 className="font-bold text-lg text-slate-800">Imóvel</h3>
									</div>

									{renderNavigateToSpecificStepButton(1, 'do imóvel')}
								</div>
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
						<div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm">
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
						<div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm">
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
								deal.buyers.map((buyer: any, idx: number) => {
									// Garantir que temos strings válidas
									const buyerName = typeof buyer.name === 'string' ? buyer.name : 'Sem nome';
									const buyerEmail = typeof buyer.email === 'string' ? buyer.email : '';
									const buyerPhone = typeof buyer.phone === 'string' ? buyer.phone : '';
									const buyerCpf = typeof buyer.cpf === 'string' ? buyer.cpf : '';
									const buyerDataSource = typeof buyer.dataSource === 'string' ? buyer.dataSource : '';

									return (
										<div key={idx} className="bg-slate-50 p-3 rounded-lg flex items-start gap-3 mb-2">
											<div className="bg-white p-2 rounded-full border border-slate-200">
												<User className="w-4 h-4 text-slate-400" />
											</div>
											<div className="flex-1">
												<p className="font-medium text-slate-800">{buyerName}</p>
												{buyerCpf && (
													<p className="text-xs text-slate-600 font-mono">CPF: {formatCPF(buyerCpf)}</p>
												)}
												{buyerEmail && <p className="text-xs text-slate-500">{buyerEmail}</p>}
												{buyerPhone && <p className="text-xs text-slate-500">{buyerPhone}</p>}
												{buyerDataSource && (
													<p className="text-xs text-blue-600 mt-1">
														📄 Extraído de: {buyerDataSource}
													</p>
												)}
											</div>
										</div>
									);
								})
							) : (
								<p className="text-sm text-slate-400 italic">Nenhum comprador cadastrado</p>
							)}
						</div>

						{/* Vendedor */}
						<div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm">
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
								deal.sellers.map((seller: any, idx: number) => {
									// Garantir que temos strings válidas
									const sellerName = typeof seller.name === 'string' ? seller.name : 'Sem nome';
									const sellerEmail = typeof seller.email === 'string' ? seller.email : '';
									const sellerPhone = typeof seller.phone === 'string' ? seller.phone : '';
									const sellerCpf = typeof seller.cpf === 'string' ? seller.cpf : '';
									const sellerDataSource = typeof seller.dataSource === 'string' ? seller.dataSource : '';

									return (
										<div key={idx} className="bg-slate-50 p-3 rounded-lg flex items-start gap-3 mb-2">
											<div className="bg-white p-2 rounded-full border border-slate-200">
												<User className="w-4 h-4 text-slate-400" />
											</div>
											<div className="flex-1">
												<p className="font-medium text-slate-800">{sellerName}</p>
												{sellerCpf && (
													<p className="text-xs text-slate-600 font-mono">CPF: {formatCPF(sellerCpf)}</p>
												)}
												{sellerEmail && <p className="text-xs text-slate-500">{sellerEmail}</p>}
												{sellerPhone && <p className="text-xs text-slate-500">{sellerPhone}</p>}
												{sellerDataSource && (
													<p className="text-xs text-blue-600 mt-1">
														📄 Extraído de: {sellerDataSource}
													</p>
												)}
											</div>
										</div>
									);
								})
							) : (
								<p className="text-sm text-slate-400 italic">Nenhum vendedor cadastrado</p>
							)}
						</div>
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

							{renderNavigateToSpecificStepButton(2, 'de documentos')}
						</div>
						<p className="text-sm text-slate-500">
							{deal.docs.length > 0
								? 'Documentos anexados ao contrato'
								: 'Nenhum documento anexado ainda'}
						</p>
					</div>
					{deal.docs.length > 0 ? (
						<div className="divide-y divide-slate-100">
							{deal.docs.map((doc: any, idx: number) => (
								<div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center rounded-lg justify-between gap-4 hover:bg-slate-50 transition-colors">
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
											<span className={`text-sm ${doc.status === 'EXTRACTED' || doc.status === 'OCR_DONE'
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

				{/* Aba Signatários */}
				<input
					type="radio"
					name="deal_details_tabs"
					className={`tab px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'signers' ? 'bg-white text-slate-800' : 'text-slate-500 hover:bg-white/90 hover:text-slate-400'}`}
					aria-label="Signatários"
					onChange={() => setActiveTab('signers')}
				/>
				<div className="tab-content bg-white rounded-b-xl border border-slate-200 shadow-sm p-6">
					<div className="flex items-center justify-between w-full">
						<h3 className="font-bold text-lg text-slate-800 mb-1">Signatários</h3>

						{renderNavigateToSpecificStepButton(5, 'de signatários')}
					</div>
					<p className="text-sm text-slate-500 mb-4">
						{dealData.signers?.length || 0} {dealData.signers?.length !== 1 ? 'Signatários' : 'Signatário'} adicionado(s) para o contrato
					</p>

					{dealData.signers?.length === 0 ? (
						<div className="p-8 text-center">
							<Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
							<p className="text-slate-500">Nenhum signatário adicionado</p>
							<p className="text-xs text-slate-400 mt-1">
								Clique em "Editar" para adicionar signatários
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
			</div>

			{/* Modal de confirmação para envio */}
			<ConfirmModal
				isOpen={showConfirmModal}
				onClose={() => setShowConfirmModal(false)}
				onConfirm={handleConfirmSend}
				title="Enviar para Assinatura"
				message="Deseja enviar este contrato para assinatura? Os signatários receberão o documento por e-mail do DocSales e poderão assinar digitalmente."
				confirmText="Enviar Contrato"
				cancelText="Cancelar"
				isLoading={isSending}
			/>

			{/* Modal de erro customizado */}
			<ErrorModal
				isOpen={showErrorModal}
				onClose={() => setShowErrorModal(false)}
				title={errorTitle}
				message={errorMessage}
				details={errorDetails}
				actionText="Ir para Edição"
				onAction={() => {
					setShowErrorModal(false);
					navigate(`/deals/${dealId}/edit`);
				}}
			/>

			{/* Modal de sucesso */}
			<SuccessModal
				isOpen={showSuccessModal}
				onClose={() => setShowSuccessModal(false)}
				title="Contrato Enviado!"
				description="O contrato foi enviado para assinatura com sucesso. Os signatários receberão o documento por e-mail do DocSales e poderão assinar digitalmente."
			/>
		</div>
	);
};