import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/Button';
import { AlertTriangle, ArrowLeft, ArrowRight, RefreshCcw, RotateCw } from 'lucide-react';
import type { UploadedFile, DealConfig } from '@/types/types';
import { BuyerDocumentsTab } from '../components/documents/BuyerDocumentsTab';
import { SellerDocumentsTab } from '../components/documents/SellerDocumentsTab';
import { PropertyDocumentsTab } from '../components/documents/PropertyDocumentsTab';
import { ProposalDocumentsTab } from '../components/documents/ProposalDocumentsTab';
import { documentChecklistService } from '../services/document-checklist.service';
import type { ConsolidatedChecklist, ChecklistRequestDTO } from '@/types/checklist.types';
import { ChecklistSummary } from '../components/documents/ChecklistSummary';
import { useOcr } from '@/hooks/useOcr';
import { useRemoveDocumentFromDeal } from '../hooks/useDeals';

interface DocumentsStepProps {
	files: UploadedFile[];
	onFilesChange: (files: UploadedFile[] | ((prevFiles: UploadedFile[]) => UploadedFile[])) => void;
	onAnalysisComplete?: (data: any) => void;
	config: DealConfig;
	dealId?: string | null;
	onValidationGateChange?: (gate: { canContinue: boolean; message: string }) => void;
}

type DocumentTab = 'buyers' | 'sellers' | 'property' | 'proposal';

export const DocumentsStep: React.FC<DocumentsStepProps> = ({
	files,
	onFilesChange,
	config,
	dealId,
	onValidationGateChange
}) => {
	const removeDocumentFromDealMutation = useRemoveDocumentFromDeal();

	const [activeTab, setActiveTab] = useState<DocumentTab>('sellers');
	const [checklist, setChecklist] = useState<ConsolidatedChecklist | null>(null);
	const [isLoadingChecklist, setIsLoadingChecklist] = useState(false);
	const [checklistError, setChecklistError] = useState<string | null>(null);
	const hasCheckedOnMountRef = useRef(false);
	const mountTimestampRef = useRef<number>(Date.now());

	const documentsTabRef = useRef<HTMLDivElement>(null);

	// Armazenar o config anterior para comparação
	const previousConfigRef = useRef<string | null>(null);
	const isInitialLoadRef = useRef(true);

	// Integração com OCR
	const {
		stats: ocrStats,
		isProcessing: isOcrProcessing,
		isCheckingStatus,
		manualRefresh,
	} = useOcr(files, onFilesChange, {
		autoProcess: true,
		dealId: dealId || undefined,
		onComplete: (_documentId, extractedData, localFileId) => {
			onFilesChange(prevFiles => prevFiles.map(prevFile => {
				if (prevFile.id === localFileId) {
					return {
						...prevFile,
						validated: true,
						ocrExtractedData: extractedData,
					};
				}
				return prevFile;
			}));
		},
		onError: (fileId, error) => {
			console.error('❌ Erro no OCR:', fileId, error);
		},
	});

	const handleManualRefresh = useCallback(() => {
		manualRefresh(files);
	}, [manualRefresh, files]);

	// Resetar flag ao montar o componente
	useEffect(() => {
		hasCheckedOnMountRef.current = false;
		mountTimestampRef.current = Date.now();

		return () => { };
	}, []);

	// Verificar status de arquivos em processamento ao montar ou quando arquivos mudarem
	useEffect(() => {
		const processingFiles = files.filter(f =>
			f.ocrStatus === 'processing' ||
			f.ocrStatus === 'uploading'
		);

		if (processingFiles.length > 0 && !isCheckingStatus) {
			const timeSinceMount = Date.now() - mountTimestampRef.current;

			if (!hasCheckedOnMountRef.current || timeSinceMount < 2000) {
				hasCheckedOnMountRef.current = true;

				const timeoutId = setTimeout(() => {
					handleManualRefresh();
				}, 1000);

				return () => clearTimeout(timeoutId);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [files.length, isCheckingStatus]);

	// Função para carregar o checklist
	const loadChecklist = useCallback(async () => {
		setIsLoadingChecklist(true);
		setChecklistError(null);

		try {
			const checklists = [];

			for (const seller of config.sellers) {
				for (const buyer of config.buyers) {
					const requestData: ChecklistRequestDTO = {
						vendedor: {
							tipo: seller.personType,
							estadoCivil: seller.maritalState,
							regimeBens: seller.propertyRegime
						},
						comprador: {
							tipo: buyer.personType,
							estadoCivil: buyer.maritalState,
							regimeBens: buyer.propertyRegime,
							vaiFinanciar: config.bankFinancing
						},
						imovel: {
							situacao: config.propertyState,
							tipoImovel: config.propertyType
						}
					};

					const response = await documentChecklistService.generateChecklist(requestData);

					if (response && response.sucesso) {
						checklists.push(response.dados);
					}
				}
			}

			if (checklists.length > 0) {
				const consolidated = documentChecklistService.consolidateMultipleChecklists(checklists);
				setChecklist(consolidated);
			} else {
				setChecklistError('Não foi possível gerar o checklist de documentos. Por favor, tente novamente.');
			}
		} catch (error) {
			console.error('Erro ao carregar checklist:', error);
			setChecklistError('Erro ao carregar checklist de documentos');
		} finally {
			setIsLoadingChecklist(false);
		}
	}, [config]);

	useEffect(() => {
		const configKey = JSON.stringify({
			buyers: config.buyers.map(buyer => ({
				personType: buyer.personType,
				maritalState: buyer.maritalState,
				propertyRegime: buyer.propertyRegime
			})),
			sellers: config.sellers.map(seller => ({
				personType: seller.personType,
				maritalState: seller.maritalState,
				propertyRegime: seller.propertyRegime
			})),
			bankFinancing: config.bankFinancing,
			propertyState: config.propertyState,
			propertyType: config.propertyType
		});

		// Se é a primeira carga OU se o config mudou, carregar o checklist
		if (isInitialLoadRef.current || previousConfigRef.current !== configKey) {
			previousConfigRef.current = configKey;
			isInitialLoadRef.current = false;
			loadChecklist();
		}
	}, [config, loadChecklist]);

	const handleRemoveFile = (fileId: string) => {
		if (!dealId) return;

		const toRemove = files.find(f => f.id === fileId);
		const backendDocumentId = toRemove?.documentId || fileId;

		onFilesChange(files.filter(f => f.id !== fileId));
		removeDocumentFromDealMutation.mutate({ dealId, documentId: backendDocumentId }, {
			onSuccess: () => {
				console.log('✅ Documento removido do deal');
			},
			onError: (error) => {
				console.error('❌ Erro ao remover documento do deal:', error);
			}
		});
	}

	const fileSatisfiesType = (file: UploadedFile, documentType: string): boolean => {
		if (file.type === documentType) return true;
		if (file.types && file.types.includes(documentType)) return true;
		return false;
	};

	const deedCountClamped = Math.min(Math.max(config.deedCount || 1, 1), 5);

	const validationGate = useCallback(() => {
		if (!checklist) {
			return { canContinue: false, message: 'Carregando checklist de documentos...' };
		}

		// Proposta comercial é opcional: não deve bloquear avanço do Step 2
		// (mas, se o usuário enviou, ela ainda será processada e ficará disponível no Step 3).
		const blockingFiles = files.filter(f => f.category !== 'proposal');

		const errorCount = blockingFiles.filter(f => f.validated === false).length;
		if (errorCount > 0) {
			return { canContinue: false, message: `Há ${errorCount} documento(s) com erro. Remova e reenvie para continuar.` };
		}

		const pendingCount = blockingFiles.filter(f => f.validated === undefined || f.ocrStatus === 'processing' || f.ocrStatus === 'uploading').length;
		if (pendingCount > 0) {
			return { canContinue: false, message: `Aguardando validação de ${pendingCount} documento(s)...` };
		}

		const allUploadedValidated = blockingFiles.every(f => f.validated === true);
		if (!allUploadedValidated) {
			return { canContinue: false, message: 'Aguardando validação dos documentos...' };
		}

		let missingRequired = 0;

		// Vendedores
		const sellerRequiredDocs = checklist.vendedores.documentos.filter(d => d.obrigatorio);
		config.sellers.forEach((seller) => {
			const isSpouse = seller.isSpouse || false;
			const expectedDe = isSpouse ? 'conjuge' : 'titular';
			const docsForThisSeller = sellerRequiredDocs.filter(doc => !doc.de || doc.de === expectedDe);
			const sellerFiles = blockingFiles.filter(f => f.category === 'sellers' && f.personId === seller.id);

			docsForThisSeller.forEach(doc => {
				const hasValidated = sellerFiles.some(f => fileSatisfiesType(f, doc.id) && f.validated === true);
				if (!hasValidated) missingRequired += 1;
			});
		});

		// Compradores
		const buyerRequiredDocs = checklist.compradores.documentos.filter(d => d.obrigatorio);
		config.buyers.forEach((buyer) => {
			const isSpouse = buyer.isSpouse || false;
			const expectedDe = isSpouse ? 'conjuge' : 'titular';
			const docsForThisBuyer = buyerRequiredDocs.filter(doc => !doc.de || doc.de === expectedDe);
			const buyerFiles = blockingFiles.filter(f => f.category === 'buyers' && f.personId === buyer.id);

			docsForThisBuyer.forEach(doc => {
				const hasValidated = buyerFiles.some(f => fileSatisfiesType(f, doc.id) && f.validated === true);
				if (!hasValidated) missingRequired += 1;
			});
		});

		// Imóvel
		const propertyRequiredDocs = checklist.imovel.documentos.filter(d => d.obrigatorio);
		const propertyFiles = blockingFiles.filter(f => f.category === 'property');

		propertyRequiredDocs.forEach(doc => {
			if (doc.id === 'MATRICULA') {
				const validatedCount = propertyFiles.filter(f => fileSatisfiesType(f, doc.id) && f.validated === true).length;
				if (validatedCount < deedCountClamped) {
					missingRequired += (deedCountClamped - validatedCount);
				}
				return;
			}

			const hasValidated = propertyFiles.some(f => fileSatisfiesType(f, doc.id) && f.validated === true);
			if (!hasValidated) missingRequired += 1;
		});

		if (missingRequired > 0) {
			return { canContinue: false, message: `Faltam anexar ${missingRequired} documento(s) obrigatório(s) para continuar.` };
		}

		return { canContinue: true, message: 'Tudo certo! Você já pode continuar.' };
	}, [checklist, config.buyers, config.sellers, deedCountClamped, files]);

	const { canContinue, message: continueMessage } = validationGate();

	const setupDocumentsTabsButtons = (tab: DocumentTab) => {
		console.log('setupDocumentsTabsButtons', tab);
		const map = {
			'sellers': { previous: null, next: 'buyers' },
			'buyers': { previous: 'sellers', next: 'property' },
			'property': { previous: 'buyers', next: 'proposal' },
			'proposal': { previous: 'property', next: null },
		};

		return map[tab];
	}

	const navigateDocumentsTab = (nextTab: DocumentTab) => {
		setActiveTab(nextTab);
		documentsTabRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	const translateTab = (tab: DocumentTab) => {
		switch (tab) {
			case 'buyers':
				return 'Compradores';
			case 'sellers':
				return 'Vendedores';
			case 'property':
				return 'Imóvel';
			case 'proposal':
				return 'Proposta';
			default:
				return tab;
		}
	}

	const renderHeaderDocumentTabsButtons = (tab: DocumentTab) => {
		return (
			<button
				type="button"
				onClick={() => navigateDocumentsTab(tab)}
				className={`cursor-pointer flex-1 px-6 py-3 font-medium text-sm transition-all ${activeTab === tab
					? 'text-primary border-b-2 border-primary bg-white'
					: 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
					}`}
			>
				<span className="capitalize">
					{translateTab(tab)}
				</span>
			</button>
		);
	}

	const renderDocumentsTabContent = (tab: DocumentTab) => {
		switch (tab) {
			case 'buyers':
				return <BuyerDocumentsTab
					buyers={config.buyers || []}
					uploadedFiles={files}
					onFilesChange={onFilesChange}
					onRemoveFile={handleRemoveFile}
					checklist={checklist}
				/>
			case 'sellers':
				return <SellerDocumentsTab
					sellers={config.sellers || []}
					uploadedFiles={files}
					onFilesChange={onFilesChange}
					onRemoveFile={handleRemoveFile}
					checklist={checklist}
				/>
			case 'property':
				return <PropertyDocumentsTab
					propertyState={config.propertyState}
					propertyType={config.propertyType}
					deedCount={config.deedCount}
					uploadedFiles={files}
					onFilesChange={onFilesChange}
					onRemoveFile={handleRemoveFile}
					checklist={checklist}
				/>
			case 'proposal':
				return <ProposalDocumentsTab
					uploadedFiles={files}
					onFilesChange={onFilesChange}
					onRemoveFile={handleRemoveFile}
					checklist={checklist}
				/>
			default:
				return null;
		}
	};

	const renderDocumentsTabsButtons = () => {
		const { previous, next } = setupDocumentsTabsButtons(activeTab);
		return (
			<div className="flex justify-between items-center mt-6">
				{previous ?
					<Button variant="secondary" onClick={() => navigateDocumentsTab(previous as DocumentTab)}>
						<div className="flex items-center gap-2">
							<ArrowLeft className="w-4 h-4" />
							<span className="capitalize">
								{translateTab(previous as DocumentTab)}
							</span>
						</div>
					</Button> : <div className="w-full" />}
				{next && <Button variant="secondary" onClick={() => navigateDocumentsTab(next as DocumentTab)}>
					<div className="flex items-center gap-2">
						<span className="capitalize">
							{translateTab(next as DocumentTab)}
						</span>
						<ArrowRight className="w-4 h-4" />
					</div>
				</Button>}
			</div>
		);
	}

	useEffect(() => {
		setupDocumentsTabsButtons(activeTab);
	}, [activeTab]);

	// Informar ao wizard o estado de "pode continuar" do Step 2 (para renderizar no rodapé fixo)
	useEffect(() => {
		onValidationGateChange?.({ canContinue, message: continueMessage });
	}, [canContinue, continueMessage, onValidationGateChange]);

	if (isLoadingChecklist) {
		return (
			<div className="flex flex-col items-center justify-center h-96 space-y-8 animate-in fade-in">
				<div className="relative">
					<div className="w-16 h-16 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
				</div>
				<div className="text-center space-y-2">
					<h3 className="text-xl font-bold text-slate-800">Gerando Checklist...</h3>
					<p className="text-slate-500">Analisando configuração da negociação</p>
				</div>
			</div>
		);
	}

	if (checklistError) {
		return (
			<div className="flex flex-col items-center justify-center h-96 space-y-8 animate-in fade-in">
				<div className="text-center space-y-4">
					<AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
					<h3 className="text-xl font-bold text-slate-800">Erro ao Carregar Checklist</h3>
					<p className="text-slate-500">{checklistError}</p>
					<div className="flex justify-center">
						<Button
							onClick={() => {
								console.log('🔄 Tentando recarregar checklist...');
								loadChecklist();
							}}
							className="btn-md"
							disabled={isLoadingChecklist}
						>
							<RefreshCcw className={`w-5 h-5 ${isLoadingChecklist ? 'animate-spin' : ''}`} />
							{isLoadingChecklist ? 'Carregando...' : 'Tentar Novamente'}
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6 animate-in fade-in duration-500">
			{/* Checklist Summary */}
			{checklist && (
				<ChecklistSummary
					checklist={checklist}
					uploadedFiles={files}
					config={config}
				/>
			)}

			{/* Status Panel */}
			{files.length > 0 && (ocrStats.processing > 0 || ocrStats.uploading > 0 || ocrStats.completed > 0) && (
				<div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-3">
							<div className="relative">
								<div className="w-4 h-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse"></div>
								<div className="absolute inset-0 w-4 h-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-ping opacity-75"></div>
							</div>
							<h3 className="font-bold text-lg text-slate-800">Status dos Documentos</h3>
						</div>

						{/* Botão de refresh manual */}
						{ocrStats.processing > 0 && (
							<button
								onClick={handleManualRefresh}
								disabled={isCheckingStatus}
								className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-white hover:bg-indigo-50 rounded-md border border-indigo-300 shadow-sm transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
								title="Atualizar status"
							>
								<RotateCw className={`w-4 h-4 text-indigo-600 ${isCheckingStatus ? 'animate-spin' : ''}`} />
								<span className="text-sm font-semibold text-indigo-800">
									{isCheckingStatus ? 'Atualizando...' : 'Atualizar'}
								</span>
							</button>
						)}
					</div>

					<div className="grid grid-cols-5 gap-4">
						<div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center border border-slate-200 shadow-sm">
							<div className="text-3xl font-bold text-slate-800 mb-1">{ocrStats.total}</div>
							<div className="text-xs font-medium text-slate-600 uppercase tracking-wide">Total</div>
						</div>
						<div className="bg-blue-50/80 backdrop-blur-sm rounded-xl p-4 text-center border border-blue-200 shadow-sm">
							<div className="text-3xl font-bold text-blue-700 mb-1">{ocrStats.uploading}</div>
							<div className="text-xs font-medium text-blue-600 uppercase tracking-wide">Enviando</div>
						</div>
						<div className="bg-gradient-to-br from-purple-50 to-indigo-50 backdrop-blur-sm rounded-xl p-4 text-center border border-purple-200 shadow-sm relative overflow-hidden">
							{ocrStats.processing > 0 && (
								<div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-indigo-400/20 animate-pulse"></div>
							)}
							<div className="text-3xl font-bold text-purple-700 mb-1 flex items-center justify-center gap-2 relative z-10">
								{ocrStats.processing}
								{ocrStats.processing > 0 && (
									<div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
								)}
							</div>
							<div className="text-xs font-medium text-purple-600 uppercase tracking-wide relative z-10">Processando</div>
						</div>
						<div className="bg-green-50/80 backdrop-blur-sm rounded-xl p-4 text-center border border-green-200 shadow-sm">
							<div className="text-3xl font-bold text-green-700 mb-1">{ocrStats.completed}</div>
							<div className="text-xs font-medium text-green-600 uppercase tracking-wide">Concluído</div>
						</div>
						<div className="bg-red-50/80 backdrop-blur-sm rounded-xl p-4 text-center border border-red-200 shadow-sm">
							<div className="text-3xl font-bold text-red-700 mb-1">{ocrStats.error}</div>
							<div className="text-xs font-medium text-red-600 uppercase tracking-wide">Erro</div>
						</div>
					</div>

					{isOcrProcessing && (
						<div className="mt-4 flex items-center gap-3 text-sm text-slate-700 bg-white/60 backdrop-blur-sm rounded-lg px-4 py-2 border border-indigo-200">
							<div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
							<span className="font-medium">Processando seus documentos...</span>
						</div>
					)}
				</div>
			)}

			{/* Tabs Navigation */}
			<div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
				<div ref={documentsTabRef} className="border-b border-slate-200 bg-slate-50/30">
					<div className="flex">
						{renderHeaderDocumentTabsButtons('sellers')}
						{renderHeaderDocumentTabsButtons('buyers')}
						{renderHeaderDocumentTabsButtons('property')}
						{renderHeaderDocumentTabsButtons('proposal')}
					</div>
				</div>

				{/* Tab Content */}
				<div className="p-6">
					{renderDocumentsTabContent(activeTab)}

					{/* Buttons Navigation */}
					{renderDocumentsTabsButtons()}
				</div>
			</div>
		</div>
	);
};
