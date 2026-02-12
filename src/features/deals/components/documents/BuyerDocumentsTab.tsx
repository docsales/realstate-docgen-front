import { useState, useMemo, type ReactElement } from 'react';
import { Users, AlertCircle, X, Heart } from 'lucide-react';
import type { Person, UploadedFile } from '@/types/types';
import { DocumentRequirementItem } from './DocumentRequirementItem';
import { AlertBanner } from './AlertBanner';
import { CoupleValidationBanner } from './CoupleValidationBanner';
import type { ConsolidatedChecklist } from '@/types/checklist.types';
import { generateFileId } from '@/utils/generateFileId';
import { ocrService } from '@/services/ocr.service';
import { getCoupleMembers } from '@/types/types';

interface BuyerDocumentsTabProps {
	buyers: Person[];
	uploadedFiles: UploadedFile[];
	onFilesChange: (files: UploadedFile[]) => void;
	onRemoveFile: (fileId: string) => void;
	checklist: ConsolidatedChecklist | null;
	dealId?: string | null;
	coupleValidations?: Map<string, any>;
	validatingCouples?: Set<string>;
}

export const BuyerDocumentsTab: React.FC<BuyerDocumentsTabProps> = ({
	buyers,
	uploadedFiles,
	onFilesChange,
	onRemoveFile,
	checklist,
	dealId,
	coupleValidations = new Map(),
	validatingCouples = new Set(),
}) => {
	const buyerFiles = uploadedFiles.filter(f => f.category === 'buyers');
	const [linkingFileId, setLinkingFileId] = useState<string | null>(null);
	const [linkError, setLinkError] = useState<string | null>(null);

	// Obter documentos da API ou fallback para array vazio
	const requiredDocuments = checklist?.compradores.documentos || [];
	const alerts = checklist?.compradores.alertas || [];

	const handleFileUpload = (files: File[], documentType: string, personId?: string) => {
		const newFiles: UploadedFile[] = files.map(file => ({
			id: generateFileId(),
			file,
			type: documentType,
			types: [documentType], // Initialize types array
			category: 'buyers',
			personId: personId,
			validated: undefined,
			ocrStatus: 'uploading' as const
		}));

		const updatedFiles = [...uploadedFiles, ...newFiles];
		onFilesChange(updatedFiles);

		// A validação agora é automática via OCR quando o processamento completar
	};

	const handleLinkExistingFile = async (fileId: string, documentType: string) => {
		setLinkingFileId(fileId);
		setLinkError(null);

		// Encontrar o arquivo original
		const sourceFile = uploadedFiles.find(f => f.id === fileId);
		if (!sourceFile) {
			console.error('❌ Arquivo original não encontrado:', fileId);
			setLinkError('Arquivo não encontrado. Tente novamente.');
			setLinkingFileId(null);
			return;
		}

		if (!sourceFile.documentId) {
			console.error('❌ Arquivo sem documentId:', {
				fileId: sourceFile.id,
				fileName: sourceFile.file.name,
				ocrStatus: sourceFile.ocrStatus,
				validated: sourceFile.validated,
				documentId: sourceFile.documentId
			});
			setLinkError('O documento ainda não foi salvo no banco de dados. Aguarde o processamento.');
			setLinkingFileId(null);
			return;
		}

		try {
			// Chamar API para criar novo documento no banco
			const result = await ocrService.linkDocumentType(sourceFile.documentId, documentType);

			if (!result.success) {
				console.error('❌ Erro ao vincular documento:', result.error);
				setLinkError(`Erro ao vincular documento: ${result.error}`);
				setLinkingFileId(null);
				return;
			}

			// Criar novo UploadedFile que compartilha dados do original
			const newFile: UploadedFile = {
				...sourceFile,
				id: generateFileId(), // Novo ID local
				documentId: result.documentId, // Novo ID do banco
				type: documentType,
				types: [documentType],
			};

			// Adicionar ao array de arquivos
			onFilesChange([...uploadedFiles, newFile]);
			console.log(`✓ Documento vinculado a ${documentType} (novo ID: ${result.documentId})`);

		} catch (error) {
			console.error('❌ Erro ao vincular documento:', error);
			setLinkError('Erro ao vincular documento. Tente novamente.');
		} finally {
			setLinkingFileId(null);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-2 mb-4">
				<Users className="w-4 h-4 text-slate-400" />
				<h3 className="text-sm font-semibold text-slate-700">Documentos dos Compradores</h3>
			</div>

			{/* Erro de vinculação */}
			{linkError && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 animate-in fade-in">
					<AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
					<div className="flex-1">
						<p className="text-sm text-red-800">{linkError}</p>
					</div>
					<button
						onClick={() => setLinkError(null)}
						className="cursor-pointer text-red-400 hover:text-red-600 transition-colors"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			)}

			{/* Alertas */}
			{alerts.length > 0 && (
				<AlertBanner alerts={alerts} />
			)}

			{/* Agrupar documentos por comprador/casal */}
			{useMemo(() => {
				// Agrupar compradores por casal
				const processedCouples = new Set<string>();
				const result: ReactElement[] = [];
				let displayIndex = 0;

				buyers.forEach((buyer, _) => {
					// Se já processamos este casal, pular
					if (buyer.coupleId && processedCouples.has(buyer.coupleId)) {
						return;
					}

					// Se tem coupleId, processar todo o casal
					if (buyer.coupleId) {
						processedCouples.add(buyer.coupleId);
						const coupleMembers = getCoupleMembers(buyer.coupleId, buyers);
						const titular = coupleMembers.find(m => !m.isSpouse);
						const conjuge = coupleMembers.find(m => m.isSpouse);
						
						coupleMembers.forEach((member) => {
							const buyerSpecificFiles = buyerFiles.filter(f => f.personId === member.id);
							const isSpouse = member.isSpouse || false;
							const expectedDe = isSpouse ? 'conjuge' : 'titular';
							const buyerDocuments = requiredDocuments.filter(doc =>
								!doc.de || doc.de === expectedDe
							);
							const validatedCount = buyerDocuments.filter(doc => {
								const relatedFiles = buyerSpecificFiles.filter(f => f.type === doc.id);
								return relatedFiles.length > 0 && relatedFiles.every(f => f.validated === true);
							}).length;

							result.push(
								<div key={member.id} className="space-y-3">
									{/* Header do comprador */}
									<div className="flex items-center justify-between px-1 py-2 border-b border-slate-100">
										<div className="flex items-center gap-2">
											{member.coupleId && (
												<Heart className="w-3.5 h-3.5 text-slate-400" />
											)}
											<div>
												<h4 className="font-semibold text-sm text-slate-800">
													Comprador {++displayIndex} {member.isSpouse ? '(Conjuge)' : ''}
												</h4>
												<p className="text-xs text-slate-400 mt-0.5">
													{member.personType === 'PF' ? 'Pessoa Fisica' : 'Pessoa Juridica'}
													{member.maritalState && ` - ${member.maritalState.replace('_', ' ')}`}
												</p>
											</div>
										</div>
										<div className="text-right">
											<span className="text-sm font-bold text-slate-800 tabular-nums">
												{validatedCount}/{buyerDocuments.length}
											</span>
											<span className="text-xs text-slate-400 ml-1">docs</span>
										</div>
									</div>

									{/* Documentos obrigatórios deste comprador */}
									<div className="space-y-3 pl-2">
										{buyerDocuments.length > 0 ? (
											buyerDocuments.map((doc) => (
												<DocumentRequirementItem
													key={`${doc.id}_${doc.de || 'generic'}_${member.id}`}
													documentId={doc.id}
													documentName={doc.nome}
													description={doc.observacao}
													uploadedFiles={buyerSpecificFiles}
													allFiles={buyerFiles}
													onFileUpload={handleFileUpload}
													onRemoveFile={onRemoveFile}
													onLinkExistingFile={handleLinkExistingFile}
													personId={member.id}
													linkingFileId={linkingFileId}
												/>
											))
										) : (
											<div className="text-center py-12 text-slate-500">
												<span className="loading loading-spinner loading-lg w-12 h-12 text-[#ef0474] mx-auto mb-4"></span>
												<p className="text-sm text-slate-500">Carregando documentos necessários...</p>
											</div>
										)}
									</div>
								</div>
							);
						});

						// Adicionar banner de validação de casal após processar todos os membros
						if (dealId && titular && conjuge) {
							result.push(
								<div key={`validation-${buyer.coupleId}`} className="mb-4">
									<CoupleValidationBanner
										dealId={dealId}
										coupleId={buyer.coupleId}
										titularPersonId={titular.id}
										conjugePersonId={conjuge.id}
									/>
								</div>
							);
						}

						return; // Sair do loop após processar o casal
					} else {
						// Processar comprador solteiro
						const buyerSpecificFiles = buyerFiles.filter(f => f.personId === buyer.id);
						const isSpouse = buyer.isSpouse || false;
						const expectedDe = isSpouse ? 'conjuge' : 'titular';
						const buyerDocuments = requiredDocuments.filter(doc =>
							!doc.de || doc.de === expectedDe
						);
						const validatedCount = buyerDocuments.filter(doc => {
							const relatedFiles = buyerSpecificFiles.filter(f => f.type === doc.id);
							return relatedFiles.length > 0 && relatedFiles.every(f => f.validated === true);
						}).length;

						result.push(
							<div key={buyer.id} className="space-y-3">
								{/* Header do comprador */}
								<div className="flex items-center justify-between px-1 py-2 border-b border-slate-100">
									<div>
										<h4 className="font-semibold text-sm text-slate-800">
											Comprador {++displayIndex}
										</h4>
										<p className="text-xs text-slate-400 mt-0.5">
											{buyer.personType === 'PF' ? 'Pessoa Fisica' : 'Pessoa Juridica'}
											{buyer.maritalState && ` - ${buyer.maritalState.replace('_', ' ')}`}
										</p>
									</div>
									<div className="text-right">
										<span className="text-sm font-bold text-slate-800 tabular-nums">
											{validatedCount}/{buyerDocuments.length}
										</span>
										<span className="text-xs text-slate-400 ml-1">docs</span>
									</div>
								</div>

								{/* Documentos obrigatórios deste comprador */}
								<div className="space-y-3 pl-2">
									{buyerDocuments.length > 0 ? (
										buyerDocuments.map((doc) => (
											<DocumentRequirementItem
												key={`${doc.id}_${doc.de || 'generic'}_${buyer.id}`}
												documentId={doc.id}
												documentName={doc.nome}
												description={doc.observacao}
												uploadedFiles={buyerSpecificFiles}
												allFiles={buyerFiles}
												onFileUpload={handleFileUpload}
												onRemoveFile={onRemoveFile}
												onLinkExistingFile={handleLinkExistingFile}
												personId={buyer.id}
												linkingFileId={linkingFileId}
											/>
										))
									) : (
										<div className="text-center py-12 text-slate-500">
											<span className="loading loading-spinner loading-lg w-12 h-12 text-[#ef0474] mx-auto mb-4"></span>
											<p className="text-sm text-slate-500">Carregando documentos necessários...</p>
										</div>
									)}
								</div>
							</div>
						);
					}
				});

				return result;
			}, [buyers, buyerFiles, requiredDocuments, linkingFileId, handleFileUpload, onRemoveFile, handleLinkExistingFile, dealId])}

			{buyers.length === 0 && (
				<div className="text-center py-8 text-slate-500">
					<p>Nenhum comprador configurado</p>
				</div>
			)}
		</div>
	);
};
