import { useState, useEffect } from 'react';
import { Button } from '@/components/Button';
import { ArrowRight, AlertTriangle, RefreshCcw } from 'lucide-react';
import type { UploadedFile, DealConfig } from '@/types/types';
import { BuyerDocumentsTab } from '../components/documents/BuyerDocumentsTab';
import { SellerDocumentsTab } from '../components/documents/SellerDocumentsTab';
import { PropertyDocumentsTab } from '../components/documents/PropertyDocumentsTab';
import { GoogleGenAI, Type } from "@google/genai";
import { documentChecklistService } from '../services/document-checklist.service';
import type { ConsolidatedChecklist, ChecklistRequestDTO } from '@/types/checklist.types';
import { ChecklistSummary } from '../components/documents/ChecklistSummary';

interface DocumentsStepProps {
	files: UploadedFile[];
	onFilesChange: (files: UploadedFile[]) => void;
	onNext: () => void;
	onAnalysisComplete?: (data: any) => void;
	config: DealConfig;
}

export const DocumentsStep: React.FC<DocumentsStepProps> = ({ 
	files, 
	onFilesChange, 
	onNext, 
	onAnalysisComplete,
	config 
}) => {
	const [isProcessing, setIsProcessing] = useState(false);
	const [activeTab, setActiveTab] = useState<'buyers' | 'sellers' | 'property'>('buyers');
	const [checklist, setChecklist] = useState<ConsolidatedChecklist | null>(null);
	const [isLoadingChecklist, setIsLoadingChecklist] = useState(false);
	const [checklistError, setChecklistError] = useState<string | null>(null);
	const [validationError, setValidationError] = useState<string | null>(null);

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

	const fileToBase64 = (file: File): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onload = () => {
				const result = reader.result as string;
				// Remove data URL prefix
				const base64 = result.split(',')[1];
				resolve(base64);
			};
			reader.onerror = error => reject(error);
		});
	};

	const processDocuments = async () => {
		setValidationError(null);

		// Validar documentos antes de processar
		if (checklist) {
			const validation = validateRequiredDocuments();
			if (!validation.valid) {
				setValidationError(validation.error ?? 'Erro ao validar documentos');
				return;
			}
		}

		if (files.length === 0) {
			onNext();
			return;
		}

		setIsProcessing(true);

		try {
			// Process the first file for demonstration, or could loop through all
			const fileToProcess = files[0].file;
			const base64Data = await fileToBase64(fileToProcess);

			const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
			const response = await ai.models.generateContent({
				model: 'gemini-2.5-flash',
				contents: {
					parts: [
						{
							inlineData: {
								mimeType: fileToProcess.type || 'image/png',
								data: base64Data
							}
						},
						{ text: "Extract data from this document in JSON format. Capture personal info, address, and document specific details." }
					]
				},
				config: {
					responseMimeType: 'application/json',
					responseSchema: {
						type: Type.OBJECT,
						properties: {
							nome: { type: Type.STRING },
							cpf_cnpj: { type: Type.STRING },
							tipo_pessoa: { type: Type.STRING },
							endereco_completo: { type: Type.STRING },
							documento: {
								type: Type.OBJECT,
								properties: {
									tipo: { type: Type.STRING },
									subtipo: { type: Type.STRING },
									empresa: { type: Type.STRING },
									cnpj_empresa: { type: Type.STRING },
									mes_referencia: { type: Type.STRING },
									valor_total: { type: Type.NUMBER }
								}
							},
							endereco: {
								type: Type.OBJECT,
								properties: {
									logradouro: { type: Type.STRING },
									numero: { type: Type.STRING },
									bairro: { type: Type.STRING },
									cidade: { type: Type.STRING },
									estado: { type: Type.STRING },
									cep_formatado: { type: Type.STRING },
									tipo_imovel: { type: Type.STRING }
								}
							}
						}
					}
				}
			});

			const text = response.text;
			if (text && onAnalysisComplete) {
				const data = JSON.parse(text);
				onAnalysisComplete(data);
			}

			onNext();
		} catch (error) {
			console.error("Error processing documents with Gemini:", error);
			// Fallback to next step even if error, or handle error UI
			onNext();
		} finally {
			setIsProcessing(false);
		}
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

	if (isProcessing) {
		return (
			<div className="flex flex-col items-center justify-center h-96 space-y-8 animate-in fade-in">
				<div className="relative w-32 h-40 bg-white border-2 border-slate-200 rounded-lg shadow-lg overflow-hidden flex flex-col">
					{/* Fake Document Content */}
					<div className="p-4 space-y-2 opacity-30">
						<div className="h-2 w-1/2 bg-slate-400 rounded"></div>
						<div className="h-2 w-full bg-slate-300 rounded"></div>
						<div className="h-2 w-3/4 bg-slate-300 rounded"></div>
						<div className="h-2 w-full bg-slate-300 rounded"></div>
						<div className="h-20 w-full bg-slate-100 rounded mt-4"></div>
					</div>

					{/* Scanning Line */}
					<div className="absolute left-0 right-0 h-1 bg-accent shadow-[0_0_15px_rgba(239,4,116,0.6)] animate-[scan_2s_ease-in-out_infinite]"></div>
				</div>

				<div className="text-center space-y-2">
					<h3 className="text-xl font-bold text-slate-800">Analisando Documentos...</h3>
					<p className="text-slate-500">Extraindo dados com Inteligência Artificial (Gemini)</p>
				</div>

				<style>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
              `}</style>
			</div>
		)
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
