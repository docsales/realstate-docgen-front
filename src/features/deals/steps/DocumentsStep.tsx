import { useState, useEffect } from 'react';
import { Button } from '@/components/Button';
import { ArrowRight, AlertTriangle, RefreshCcw, Clock, RotateCw } from 'lucide-react';
import type { UploadedFile, DealConfig } from '@/types/types';
import { BuyerDocumentsTab } from '../components/documents/BuyerDocumentsTab';
import { SellerDocumentsTab } from '../components/documents/SellerDocumentsTab';
import { PropertyDocumentsTab } from '../components/documents/PropertyDocumentsTab';
import { documentChecklistService } from '../services/document-checklist.service';
import type { ConsolidatedChecklist, ChecklistRequestDTO } from '@/types/checklist.types';
import { ChecklistSummary } from '../components/documents/ChecklistSummary';
import { useOcr } from '@/hooks/useOcr';
import { usePollingCountdown } from '@/hooks/usePollingCountdown';
import { useAddDocumentToDeal } from '../hooks/useDeals';

interface DocumentsStepProps {
	files: UploadedFile[];
	onFilesChange: (files: UploadedFile[] | ((prevFiles: UploadedFile[]) => UploadedFile[])) => void;
	onNext: () => void;
	onAnalysisComplete?: (data: any) => void;
	config: DealConfig;
	dealId?: string | null;
}

export const DocumentsStep: React.FC<DocumentsStepProps> = ({ 
	files, 
	onFilesChange, 
	onNext, 
	config,
	dealId
}) => {
	const [activeTab, setActiveTab] = useState<'buyers' | 'sellers' | 'property'>('buyers');
	const [checklist, setChecklist] = useState<ConsolidatedChecklist | null>(null);
	const [isLoadingChecklist, setIsLoadingChecklist] = useState(false);
	const [checklistError, setChecklistError] = useState<string | null>(null);
	const [validationError, setValidationError] = useState<string | null>(null);

	// Hook para vincular documentos ao deal
	const addDocumentToDealMutation = useAddDocumentToDeal();

	// Integração com OCR
	const { 
		stats: ocrStats, 
		isProcessing: isOcrProcessing,
		manualRefresh,
	} = useOcr(files, onFilesChange, {
		autoProcess: true,
		pollingInterval: 10 * 1000, // 10 segundos - Verificação mais frequente para parser
		onComplete: (fileId, extractedData) => {
			console.log('✅ OCR + Parser concluídos:', fileId, extractedData);
			console.log('🔍 dealId disponível?', dealId);
			console.log('🔍 fileId disponível?', fileId);
			
			// Vincular documento ao deal se dealId estiver disponível
			if (dealId && fileId) {
				console.log('📎 Iniciando vinculação do documento ao deal...');
				addDocumentToDealMutation.mutate(
					{ dealId, documentId: fileId },
					{
						onSuccess: () => {
							console.log('✅ Documento vinculado ao deal:', fileId);
						},
						onError: (error) => {
							console.error('❌ Erro ao vincular documento ao deal:', error);
						}
					}
				);
			} else {
				console.warn('⚠️ Não foi possível vincular documento - dealId ou fileId ausente');
			}
		},
		onError: (fileId, error) => {
			console.error('❌ Erro no OCR:', fileId, error);
		},
	});

	// Contador de polling
	const pollingCountdown = usePollingCountdown(
		10 * 1000, // 10 segundos - Alinhado com o intervalo de polling
		ocrStats.processing > 0 // Ativar quando houver arquivos processando
	);

	// Buscar checklist da API ao carregar o componente
	useEffect(() => {
		const loadChecklist = async () => {
			setIsLoadingChecklist(true);
			setChecklistError(null);

			try {
				const checklists = [];

				// Gerar checklist para cada combinação vendedor x comprador
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
					// Consolidar todos os checklists
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

	// Função para validar documentos no servidor
	const validateDocuments = async (filesToValidate: UploadedFile[]): Promise<void> => {
		// Filtrar apenas arquivos pendentes de validação
		const pendingFiles = filesToValidate.filter(f => f.validated === undefined);
		
		if (pendingFiles.length === 0) return;

		// TODO: Implementar chamada à API para validação
		// Por enquanto, apenas simula validação
		pendingFiles.forEach((file, index) => {
			// Simulação: valida após um delay escalonado
			setTimeout(() => {
				// IMPORTANTE: Usar função de callback para obter o estado mais recente
				// Evita problemas de closure com setTimeout
				onFilesChange((currentFiles) => {
					return currentFiles.map(f => 
						f.id === file.id 
							? { 
								...f, 
								validated: Math.random() > 0.2,  // 80% de sucesso
								// Mantém o type original (já foi definido corretamente no upload)
								type: f.type,
								validationError: Math.random() > 0.2 ? undefined : 'Documento ilegível ou fora do padrão' 
							}
							: f
					);
				});
			}, (index + 1) * 1000); // Delay escalonado para cada arquivo
		});
	};

	const processDocuments = () => {
		setValidationError(null);

		// Validar documentos antes de processar
		if (checklist) {
			const validation = validateRequiredDocuments();
			if (!validation.valid) {
				setValidationError(validation.error ?? 'Erro ao validar documentos');
				return;
			}
		}

		// Avançar para próximo passo
		onNext();
	};

	// Função para validar se todos os documentos obrigatórios foram enviados
	const validateRequiredDocuments = (): { valid: boolean; error?: string } => {
		if (!checklist) {
			return { valid: true };
		}

		// Verificar alertas de bloqueio
		const blockingAlerts = checklist.alertasGerais.filter(
			alert => alert.tipo === 'BLOQUEIO'
		);

		if (blockingAlerts.length > 0) {
			return {
				valid: false,
				error: `Existem ${blockingAlerts.length} impedimento(s) que bloqueiam a continuidade. Por favor, resolva-os antes de continuar.`
			};
		}

		// Coletar todos os documentos obrigatórios
		const allRequiredDocs = [
			...checklist.vendedores.documentos.filter(d => d.obrigatorio),
			...checklist.compradores.documentos.filter(d => d.obrigatorio),
			...checklist.imovel.documentos.filter(d => d.obrigatorio)
		];

		// Verificar quais documentos obrigatórios ainda não foram enviados
		const missingDocs = allRequiredDocs.filter(doc => {
			return !files.some(f => f.type === doc.id && f.validated !== false);
		});

		if (missingDocs.length > 0) {
			return {
				valid: false,
				error: `Faltam ${missingDocs.length} documento(s) obrigatório(s). Por favor, envie todos os documentos necessários antes de continuar.`
			};
		}

		return { valid: true };
	};

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
						
						{/* Contador de refresh e botão manual */}
						<div className="flex items-center gap-2">
							{ocrStats.processing > 0 && (
								<div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-purple-300 shadow-sm">
									<Clock className="w-4 h-4 text-purple-600" />
									<div className="text-xs">
										<span className="text-purple-800 font-semibold">Próximo refresh em </span>
										<span className="text-purple-600 font-bold">{pollingCountdown.formattedTime}</span>
									</div>
								</div>
							)}
							
							{/* Botão de refresh manual */}
							{ocrStats.processing > 0 && (
								<button
									onClick={manualRefresh}
									className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-purple-50 rounded-lg border border-purple-300 shadow-sm transition-colors"
									title="Verificar status agora"
								>
									<RotateCw className="w-4 h-4 text-purple-600" />
									<span className="text-xs font-semibold text-purple-800">Atualizar Agora</span>
								</button>
							)}
						</div>
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
							className={`flex-1 px-6 py-3 font-medium text-sm transition-all ${
								activeTab === 'buyers'
									? 'text-primary border-b-2 border-primary bg-white'
									: 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
							}`}
						>
							Compradores
						</button>
						<button
							type="button"
							onClick={() => setActiveTab('sellers')}
							className={`flex-1 px-6 py-3 font-medium text-sm transition-all ${
								activeTab === 'sellers'
									? 'text-primary border-b-2 border-primary bg-white'
									: 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
							}`}
						>
							Vendedores
						</button>
						<button
							type="button"
							onClick={() => setActiveTab('property')}
							className={`flex-1 px-6 py-3 font-medium text-sm transition-all ${
								activeTab === 'property'
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
							onValidate={validateDocuments}
							checklist={checklist}
						/>
					)}

					{activeTab === 'sellers' && (
						<SellerDocumentsTab
							sellers={config.sellers || []}
							uploadedFiles={files}
							onFilesChange={onFilesChange}
							onValidate={validateDocuments}
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
							onValidate={validateDocuments}
							checklist={checklist}
						/>
					)}
				</div>
			</div>

			{/* Validation Error */}
			{validationError && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
					<AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
					<div>
						<h4 className="font-semibold text-red-800 mb-1">Validação Falhou</h4>
						<p className="text-red-700 text-sm">{validationError}</p>
					</div>
				</div>
			)}

			{/* Process Button */}
			{files.length > 0 && (
				<div className="flex justify-end pt-6">
					<Button onClick={processDocuments} className="w-full md:w-auto text-lg px-8 py-3 h-auto">
						Processar Documentos <ArrowRight className="w-5 h-5 ml-2" />
					</Button>
				</div>
			)}
		</div>
	);
};
