import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/Button';
import { AlertTriangle, RefreshCcw, RotateCw } from 'lucide-react';
import type { UploadedFile, DealConfig } from '@/types/types';
import { BuyerDocumentsTab } from '../components/documents/BuyerDocumentsTab';
import { SellerDocumentsTab } from '../components/documents/SellerDocumentsTab';
import { PropertyDocumentsTab } from '../components/documents/PropertyDocumentsTab';
import { documentChecklistService } from '../services/document-checklist.service';
import type { ConsolidatedChecklist, ChecklistRequestDTO } from '@/types/checklist.types';
import { ChecklistSummary } from '../components/documents/ChecklistSummary';
import { useOcr } from '@/hooks/useOcr';
import { useRemoveDocumentFromDeal } from '../hooks/useDeals';

interface DocumentsStepProps {
	files: UploadedFile[];
	onFilesChange: (files: UploadedFile[] | ((prevFiles: UploadedFile[]) => UploadedFile[])) => void;
	onNext?: () => void;
	onAnalysisComplete?: (data: any) => void;
	config: DealConfig;
	dealId?: string | null;
}

export const DocumentsStep: React.FC<DocumentsStepProps> = ({
	files,
	onFilesChange,
	config,
	dealId
}) => {
	const removeDocumentFromDealMutation = useRemoveDocumentFromDeal();

	const [activeTab, setActiveTab] = useState<'buyers' | 'sellers' | 'property'>('buyers');
	const [checklist, setChecklist] = useState<ConsolidatedChecklist | null>(null);
	const [isLoadingChecklist, setIsLoadingChecklist] = useState(false);
	const [checklistError, setChecklistError] = useState<string | null>(null);
	const hasCheckedOnMountRef = useRef(false);
	const mountTimestampRef = useRef<number>(Date.now());

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
			onFilesChange(prevFiles => prevFiles.map(f => {
				if (f.id === localFileId) {
					return {
						...f,
						validated: true,
						ocrExtractedData: extractedData, // Garantir que extractedData está salvo no arquivo
					};
				}
				return f;
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
		console.log('📍 DocumentsStep montado');
		
		return () => {
			console.log('📍 DocumentsStep desmontado');
		};
	}, []);

	// Verificar status de arquivos em processamento ao montar ou quando arquivos mudarem
	useEffect(() => {
		const processingFiles = files.filter(f =>
			f.ocrStatus === 'processing' ||
			f.ocrStatus === 'uploading'
		);

		if (processingFiles.length > 0 && !isCheckingStatus) {
			// Verificar se já passou tempo suficiente desde a última verificação (evitar spam)
			const timeSinceMount = Date.now() - mountTimestampRef.current;
			
			if (!hasCheckedOnMountRef.current || timeSinceMount < 2000) {
				console.log(`🔄 DocumentsStep: ${processingFiles.length} arquivo(s) em processamento - verificando status`);
				hasCheckedOnMountRef.current = true;

				const timeoutId = setTimeout(() => {
					handleManualRefresh();
				}, 1000);

				return () => clearTimeout(timeoutId);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [files.length, isCheckingStatus]); // Usar files.length ao invés de files para evitar loops

	useEffect(() => {
		const loadChecklist = async () => {
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
		};

		loadChecklist();
	}, [config]);

	const handleRemoveFile = (fileId: string) => {
		if (!dealId) return;

		onFilesChange(files.filter(f => f.id !== fileId));
		removeDocumentFromDealMutation.mutate({ dealId, documentId: fileId }, {
			onSuccess: () => {
				console.log('✅ Documento removido do deal');
			},
			onError: (error) => {
				console.error('❌ Erro ao remover documento do deal:', error);
			}
		});
	}

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
						<Button onClick={() => window.location.reload()} className="btn-md">
							<RefreshCcw className="w-5 h-5" />
							Tentar Novamente
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
					numSellers={config.sellers.length}
					numBuyers={config.buyers.length}
				/>
			)}

			{/* OCR Status Panel */}
			{files.length > 0 && (ocrStats.processing > 0 || ocrStats.uploading > 0 || ocrStats.completed > 0) && (
				<div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4 shadow-sm">
					<div className="flex items-center justify-between mb-3">
						<div className="flex items-center gap-2">
							<div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
							<h3 className="font-bold text-purple-900">Status do Processamento OCR</h3>
						</div>

						{/* Botão de refresh manual */}
						{ocrStats.processing > 0 && (
							<button
								onClick={handleManualRefresh}
								disabled={isCheckingStatus}
								className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-purple-50 rounded-lg border border-purple-300 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								title="Verificar status manualmente"
							>
								<RotateCw className={`w-4 h-4 text-purple-600 ${isCheckingStatus ? 'animate-spin' : ''}`} />
								<span className="text-xs font-semibold text-purple-800">
									{isCheckingStatus ? 'Verificando...' : 'Verificar Status'}
								</span>
							</button>
						)}
					</div>

					<div className="grid grid-cols-5 gap-3">
						<div className="bg-white rounded-lg p-3 text-center border border-slate-200">
							<div className="text-2xl font-bold text-slate-800">{ocrStats.total}</div>
							<div className="text-xs text-slate-600">Total</div>
						</div>
						<div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
							<div className="text-2xl font-bold text-blue-700">{ocrStats.uploading}</div>
							<div className="text-xs text-blue-600">Enviando</div>
						</div>
						<div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-200">
							<div className="text-2xl font-bold text-purple-700 flex items-center justify-center gap-1">
								{ocrStats.processing}
								{ocrStats.processing > 0 && (
									<div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
								)}
							</div>
							<div className="text-xs text-purple-600">Processando</div>
						</div>
						<div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
							<div className="text-2xl font-bold text-green-700">{ocrStats.completed}</div>
							<div className="text-xs text-green-600">Concluído</div>
						</div>
						<div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
							<div className="text-2xl font-bold text-red-700">{ocrStats.error}</div>
							<div className="text-xs text-red-600">Erro</div>
						</div>
					</div>

					{isOcrProcessing && (
						<div className="mt-3 flex items-center gap-2 text-sm text-purple-700">
							<div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
							<span className="font-medium">Processando documentos via LLMWhisperer...</span>
						</div>
					)}
				</div>
			)}

			{/* Tabs Navigation */}
			<div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
				<div className="border-b border-slate-200 bg-slate-50/30">
					<div className="flex">
						<button
							type="button"
							onClick={() => setActiveTab('buyers')}
							className={`flex-1 px-6 py-3 font-medium text-sm transition-all ${activeTab === 'buyers'
								? 'text-primary border-b-2 border-primary bg-white'
								: 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
								}`}
						>
							Compradores
						</button>
						<button
							type="button"
							onClick={() => setActiveTab('sellers')}
							className={`flex-1 px-6 py-3 font-medium text-sm transition-all ${activeTab === 'sellers'
								? 'text-primary border-b-2 border-primary bg-white'
								: 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
								}`}
						>
							Vendedores
						</button>
						<button
							type="button"
							onClick={() => setActiveTab('property')}
							className={`flex-1 px-6 py-3 font-medium text-sm transition-all ${activeTab === 'property'
								? 'text-primary border-b-2 border-primary bg-white'
								: 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
								}`}
						>
							Imóvel
						</button>
					</div>
				</div>

				{/* Tab Content */}
				<div className="p-6">
					{activeTab === 'buyers' && (
						<BuyerDocumentsTab
							buyers={config.buyers || []}
							uploadedFiles={files}
							onFilesChange={onFilesChange}
							onRemoveFile={handleRemoveFile}
							checklist={checklist}
						/>
					)}

					{activeTab === 'sellers' && (
						<SellerDocumentsTab
							sellers={config.sellers || []}
							uploadedFiles={files}
							onFilesChange={onFilesChange}
							onRemoveFile={handleRemoveFile}
							checklist={checklist}
						/>
					)}

					{activeTab === 'property' && (
						<PropertyDocumentsTab
							propertyState={config.propertyState}
							propertyType={config.propertyType}
							deedCount={config.deedCount}
							uploadedFiles={files}
							onFilesChange={onFilesChange}
							onRemoveFile={handleRemoveFile}
							checklist={checklist}
						/>
					)}
				</div>
			</div>
		</div>
	);
};
