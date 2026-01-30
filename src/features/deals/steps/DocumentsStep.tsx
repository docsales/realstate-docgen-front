import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/Button';
import { AlertTriangle, ArrowLeft, ArrowRight, RefreshCcw, RotateCw } from 'lucide-react';
import type { UploadedFile, DealConfig, Person } from '@/types/types';
import { BuyerDocumentsTab } from '../components/documents/BuyerDocumentsTab';
import { SellerDocumentsTab } from '../components/documents/SellerDocumentsTab';
import { PropertyDocumentsTab } from '../components/documents/PropertyDocumentsTab';
import { ProposalDocumentsTab } from '../components/documents/ProposalDocumentsTab';
import { documentChecklistService } from '../services/document-checklist.service';
import type { ConsolidatedChecklist, ChecklistRequestDTO } from '@/types/checklist.types';
import { ChecklistSummary } from '../components/documents/ChecklistSummary';
import { useOcr } from '@/hooks/useOcr';
import { useRemoveDocumentFromDeal } from '../hooks/useDeals';
import { useCoupleValidation } from '../hooks/useCoupleValidation';
import { useCoupleValidationSocket } from '../hooks/useCoupleValidationSocket';
import { getCoupleValidationCache } from '../services/couple-validation-cache.service';

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

	// Estado de validação de casais
	const [coupleValidations, setCoupleValidations] = useState<Map<string, any>>(new Map());
	const [validatingCouples, setValidatingCouples] = useState<Set<string>>(new Set());
	const [coupleValidationAttempts, setCoupleValidationAttempts] = useState<Map<string, number>>(new Map());
	const { validateCouple } = useCoupleValidation();

	const MAX_VALIDATION_ATTEMPTS = 3;

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
					// Validar se o tipo de documento identificado corresponde ao tipo esperado
					const expectedType = prevFile.type;
					const extractedType = extractedData?.tipo_documento;

					// Verificar se há incompatibilidade de tipo
					let validated = true;
					let validationError: string | undefined;

					if (extractedType && extractedType !== expectedType) {
						// Tipos específicos de certidão de casamento
						const marriageCertTypes = ['CERTIDAO_CASAMENTO', 'CERTIDAO_CASAMENTO_AVERBACAO_OBITO', 'CERTIDAO_CASAMENTO_AVERBACAO_DIVORCIO'];
						const birthCertTypes = ['CERTIDAO_NASCIMENTO'];

						// Se esperamos certidão de casamento mas recebemos certidão de nascimento
						if (marriageCertTypes.includes(expectedType) && birthCertTypes.includes(extractedType)) {
							validated = false;
							validationError = `DOCUMENT_TYPE_MISMATCH:expected=${expectedType},extracted=${extractedType}`;
							console.error(`❌ Tipo de documento incompatível: esperado=${expectedType}, extraído=${extractedType}`);
						}
						// Se esperamos certidão de nascimento mas recebemos certidão de casamento
						else if (birthCertTypes.includes(expectedType) && marriageCertTypes.includes(extractedType)) {
							validated = false;
							validationError = `DOCUMENT_TYPE_MISMATCH:expected=${expectedType},extracted=${extractedType}`;
							console.error(`❌ Tipo de documento incompatível: esperado=${expectedType}, extraído=${extractedType}`);
						}
						// Outros casos de incompatibilidade
						else if (extractedType !== expectedType) {
							validated = false;
							validationError = `DOCUMENT_TYPE_MISMATCH:expected=${expectedType},extracted=${extractedType}`;
							console.error(`❌ Tipo de documento incompatível: esperado=${expectedType}, extraído=${extractedType}`);
						}
					}

					return {
						...prevFile,
						validated,
						validationError,
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
			(f.ocrStatus === 'processing' || f.ocrStatus === 'uploading') &&
			f.ocrError === undefined
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

	// Função helper para verificar se todos documentos do casal estão completos
	const checkCoupleDocumentsComplete = useCallback((
		members: Person[],
		category: 'buyers' | 'sellers'
	): boolean => {
		if (!checklist || members.length !== 2) return false;

		const requiredDocs = category === 'buyers'
			? checklist.compradores.documentos.filter(d => d.obrigatorio)
			: checklist.vendedores.documentos.filter(d => d.obrigatorio);

		// Verificar se ambos os membros têm todos os documentos
		return members.every(member => {
			const isSpouse = member.isSpouse || false;
			const expectedDe = isSpouse ? 'conjuge' : 'titular';
			const docsForThisPerson = requiredDocs.filter(doc =>
				!doc.de || doc.de === expectedDe
			);

			// Se não há documentos obrigatórios para esta pessoa, algo está errado
			if (docsForThisPerson.length === 0) return false;

			const memberFiles = files.filter(f =>
				f.category === category &&
				f.personId === member.id
			);

			// Cada documento obrigatório deve ter pelo menos 1 arquivo validado
			const hasAllDocs = docsForThisPerson.every(doc => {
				const matchingFiles = memberFiles.filter(f => fileSatisfiesType(f, doc.id));
				return matchingFiles.length > 0 && matchingFiles.every(f => f.validated === true);
			});

			return hasAllDocs;
		});
	}, [checklist, files]);

	// Função para validar casal se necessário (com limite de tentativas)
	const validateCoupleIfNeeded = useCallback(async (coupleId: string, members: Person[]) => {
		if (!dealId) return;

		// Verificar se já está validando
		if (validatingCouples.has(coupleId)) {
			console.log(`⏳ Casal ${coupleId} já está sendo validado, pulando...`);
			return;
		}

		// Verificar se já foi validado com sucesso
		if (coupleValidations.has(coupleId)) {
			console.log(`✅ Casal ${coupleId} já foi validado, pulando...`);
			return;
		}

		// Verificar número de tentativas
		const attempts = coupleValidationAttempts.get(coupleId) || 0;
		if (attempts >= MAX_VALIDATION_ATTEMPTS) {
			console.warn(`⚠️ Casal ${coupleId} atingiu o limite de ${MAX_VALIDATION_ATTEMPTS} tentativas de validação`);
			return;
		}

		const titular = members.find(m => !m.isSpouse);
		const conjuge = members.find(m => m.isSpouse);

		if (!titular || !conjuge) {
			console.warn('❌ Casal incompleto:', { coupleId, members });
			return;
		}

		// Incrementar contador de tentativas
		setCoupleValidationAttempts(prev => {
			const newMap = new Map(prev);
			newMap.set(coupleId, attempts + 1);
			return newMap;
		});

		console.log(`🔍 Tentativa ${attempts + 1}/${MAX_VALIDATION_ATTEMPTS}: Iniciando validação automática do casal ${coupleId}`);
		setValidatingCouples(prev => new Set(prev).add(coupleId));

		try {
			await validateCouple.mutateAsync({
				dealId,
				coupleId,
				titularPersonId: titular.id,
				conjugePersonId: conjuge.id,
			});
			console.log(`📤 Validação do casal ${coupleId} disparada (resultado via WebSocket)`);
		} catch (error) {
			console.error(`❌ Erro na tentativa ${attempts + 1} de validação do casal ${coupleId}:`, error);

			// Se atingiu o limite de tentativas, remover da lista de validações para permitir revalidação manual
			if (attempts + 1 >= MAX_VALIDATION_ATTEMPTS) {
				console.warn(`🚫 Casal ${coupleId} atingiu o limite de tentativas. Validação automática desabilitada.`);
			}
		} finally {
			// Não remover aqui: o lock é liberado via eventos WS (completed/error)
		}
	}, [dealId, validateCouple, validatingCouples, coupleValidations, coupleValidationAttempts, MAX_VALIDATION_ATTEMPTS]);

	// Eventos via WebSocket para completar a validação do casal sem timeout.
	useCoupleValidationSocket({
		onStarted: (evt) => {
			if (evt.dealId !== (dealId || '')) return;
			setValidatingCouples(prev => new Set(prev).add(evt.coupleId));
		},
		onCompleted: (evt) => {
			if (evt.dealId !== (dealId || '')) return;
			setCoupleValidations(prev => {
				const newMap = new Map(prev);
				newMap.set(evt.coupleId, evt.result);
				return newMap;
			});
			setValidatingCouples(prev => {
				const newSet = new Set(prev);
				newSet.delete(evt.coupleId);
				return newSet;
			});
		},
		onError: (evt) => {
			if (evt.dealId !== (dealId || '')) return;
			console.error(`❌ Erro na validação do casal ${evt.coupleId}:`, evt.error);
			setValidatingCouples(prev => {
				const newSet = new Set(prev);
				newSet.delete(evt.coupleId);
				return newSet;
			});
		},
	});

	// Validação automática de casais quando documentos estão completos
	// Debounce para evitar múltiplas validações simultâneas
	useEffect(() => {
		if (!checklist || !dealId) return;

		// Usar timeout para debounce de 1 segundo
		const timeoutId = setTimeout(() => {
			// Agrupar vendedores por casal
			const sellersByCouple = new Map<string, Person[]>();
			config.sellers.forEach(seller => {
				if (seller.coupleId) {
					if (!sellersByCouple.has(seller.coupleId)) {
						sellersByCouple.set(seller.coupleId, []);
					}
					sellersByCouple.get(seller.coupleId)!.push(seller);
				}
			});

			// Agrupar compradores por casal
			const buyersByCouple = new Map<string, Person[]>();
			config.buyers.forEach(buyer => {
				if (buyer.coupleId) {
					if (!buyersByCouple.has(buyer.coupleId)) {
						buyersByCouple.set(buyer.coupleId, []);
					}
					buyersByCouple.get(buyer.coupleId)!.push(buyer);
				}
			});

			// Verificar cada casal de vendedores
			sellersByCouple.forEach((members, coupleId) => {
				if (members.length === 2) {
					const isCoupleComplete = checkCoupleDocumentsComplete(members, 'sellers');
					if (isCoupleComplete) {
						console.log(`📋 Casal ${coupleId} (vendedores) tem todos os documentos completos`);
						validateCoupleIfNeeded(coupleId, members);
					} else {
						console.log(`📋 Casal ${coupleId} (vendedores) ainda não tem todos os documentos`);
					}
				}
			});

			// Verificar cada casal de compradores
			buyersByCouple.forEach((members, coupleId) => {
				if (members.length === 2) {
					const isCoupleComplete = checkCoupleDocumentsComplete(members, 'buyers');
					if (isCoupleComplete) {
						console.log(`📋 Casal ${coupleId} (compradores) tem todos os documentos completos`);
						validateCoupleIfNeeded(coupleId, members);
					} else {
						console.log(`📋 Casal ${coupleId} (compradores) ainda não tem todos os documentos`);
					}
				}
			});
		}, 1000); // Debounce de 1 segundo

		return () => clearTimeout(timeoutId);
	}, [files, config.sellers, config.buyers, checklist, dealId, checkCoupleDocumentsComplete, validateCoupleIfNeeded]);

	// Hidratar cache persistido do backend ao montar (evita revalidação em remount)
	useEffect(() => {
		if (!dealId) return;
		let cancelled = false;

		// Ao trocar de deal, limpar cache local para evitar mistura
		setCoupleValidations(new Map());
		setValidatingCouples(new Set());

		(async () => {
			try {
				const resp = await getCoupleValidationCache(dealId);
				if (cancelled) return;

				const couples = resp?.couples || {};

				setCoupleValidations(() => {
					const map = new Map<string, any>();
					Object.entries(couples).forEach(([coupleId, entry]) => {
						if (entry.status === 'COMPLETED' && entry.result) {
							map.set(coupleId, entry.result);
						}
					});
					return map;
				});

				setValidatingCouples(() => {
					const set = new Set<string>();
					Object.entries(couples).forEach(([coupleId, entry]) => {
						if (entry.status === 'PROCESSING') {
							set.add(coupleId);
						}
					});
					return set;
				});
			} catch (err) {
				console.warn('⚠️ Falha ao hidratar cache de validação de casais:', err);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [dealId]);

	const validationGate = useCallback(() => {
		return { canContinue: true, message: 'Validação desabilitada temporariamente' };
	}, [])

	// Código original
	// TODO: reverter para o código original após testes
	// const validationGate = useCallback(() => {
	// 	if (!checklist) {
	// 		return { canContinue: false, message: 'Carregando checklist de documentos...' };
	// 	}

	// 	// Proposta comercial é opcional: não deve bloquear avanço do Step 2
	// 	// (mas, se o usuário enviou, ela ainda será processada e ficará disponível no Step 3).
	// 	const blockingFiles = files.filter(f => f.category !== 'proposal');

	// 	const errorCount = blockingFiles.filter(f => f.validated === false).length;
	// 	if (errorCount > 0) {
	// 		return { canContinue: false, message: `Há ${errorCount} documento(s) com erro. Remova e reenvie para continuar.` };
	// 	}

	// 	const pendingCount = blockingFiles.filter(f => f.validated === undefined || f.ocrStatus === 'processing' || f.ocrStatus === 'uploading').length;
	// 	if (pendingCount > 0) {
	// 		return { canContinue: false, message: `Aguardando validação de ${pendingCount} documento(s)...` };
	// 	}

	// 	const allUploadedValidated = blockingFiles.every(f => f.validated === true);
	// 	if (!allUploadedValidated) {
	// 		return { canContinue: false, message: 'Aguardando validação dos documentos...' };
	// 	}

	// 	let missingRequired = 0;

	// 	// Agrupar vendedores por casal
	// 	const sellersByCouple = new Map<string, Person[]>();
	// 	config.sellers.forEach(seller => {
	// 		const coupleId = seller.coupleId || `single_${seller.id}`;
	// 		if (!sellersByCouple.has(coupleId)) {
	// 			sellersByCouple.set(coupleId, []);
	// 		}
	// 		sellersByCouple.get(coupleId)!.push(seller);
	// 	});

	// 	// Vendedores - validar considerando casais
	// 	const sellerRequiredDocs = checklist.vendedores.documentos.filter(d => d.obrigatorio);
	// 	sellersByCouple.forEach((coupleMembers) => {
	// 		coupleMembers.forEach((seller) => {
	// 			const isSpouse = seller.isSpouse || false;
	// 			const expectedDe = isSpouse ? 'conjuge' : 'titular';
	// 			const docsForThisSeller = sellerRequiredDocs.filter(doc => !doc.de || doc.de === expectedDe);
	// 			const sellerFiles = blockingFiles.filter(f => f.category === 'sellers' && f.personId === seller.id);

	// 			docsForThisSeller.forEach(doc => {
	// 				const hasValidated = sellerFiles.some(f => fileSatisfiesType(f, doc.id) && f.validated === true);
	// 				if (!hasValidated) missingRequired += 1;
	// 			});
	// 		});
	// 	});

	// 	// Agrupar compradores por casal
	// 	const buyersByCouple = new Map<string, Person[]>();
	// 	config.buyers.forEach(buyer => {
	// 		const coupleId = buyer.coupleId || `single_${buyer.id}`;
	// 		if (!buyersByCouple.has(coupleId)) {
	// 			buyersByCouple.set(coupleId, []);
	// 		}
	// 		buyersByCouple.get(coupleId)!.push(buyer);
	// 	});

	// 	// Compradores - validar considerando casais
	// 	const buyerRequiredDocs = checklist.compradores.documentos.filter(d => d.obrigatorio);
	// 	buyersByCouple.forEach((coupleMembers) => {
	// 		coupleMembers.forEach((buyer) => {
	// 			const isSpouse = buyer.isSpouse || false;
	// 			const expectedDe = isSpouse ? 'conjuge' : 'titular';
	// 			const docsForThisBuyer = buyerRequiredDocs.filter(doc => !doc.de || doc.de === expectedDe);
	// 			const buyerFiles = blockingFiles.filter(f => f.category === 'buyers' && f.personId === buyer.id);

	// 			docsForThisBuyer.forEach(doc => {
	// 				const hasValidated = buyerFiles.some(f => fileSatisfiesType(f, doc.id) && f.validated === true);
	// 				if (!hasValidated) missingRequired += 1;
	// 			});
	// 		});
	// 	});

	// 	// Imóvel
	// 	const propertyRequiredDocs = checklist.imovel.documentos.filter(d => d.obrigatorio);
	// 	const propertyFiles = blockingFiles.filter(f => f.category === 'property');

	// 	propertyRequiredDocs.forEach(doc => {
	// 		if (doc.id === 'MATRICULA') {
	// 			const validatedCount = propertyFiles.filter(f => fileSatisfiesType(f, doc.id) && f.validated === true).length;
	// 			if (validatedCount < deedCountClamped) {
	// 				missingRequired += (deedCountClamped - validatedCount);
	// 			}
	// 			return;
	// 		}

	// 		const hasValidated = propertyFiles.some(f => fileSatisfiesType(f, doc.id) && f.validated === true);
	// 		if (!hasValidated) missingRequired += 1;
	// 	});

	// 	if (missingRequired > 0) {
	// 		return { canContinue: false, message: `Faltam anexar ${missingRequired} documento(s) obrigatório(s) para continuar.` };
	// 	}

	// 	return { canContinue: true, message: 'Tudo certo! Você já pode continuar.' };
	// }, [checklist, config.buyers, config.sellers, deedCountClamped, files]);

	const { canContinue, message: continueMessage } = validationGate();

	const setupDocumentsTabsButtons = (tab: DocumentTab) => {
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
					dealId={dealId}
					coupleValidations={coupleValidations}
					validatingCouples={validatingCouples}
				/>
			case 'sellers':
				return <SellerDocumentsTab
					sellers={config.sellers || []}
					uploadedFiles={files}
					onFilesChange={onFilesChange}
					onRemoveFile={handleRemoveFile}
					checklist={checklist}
					dealId={dealId}
					coupleValidations={coupleValidations}
					validatingCouples={validatingCouples}
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
