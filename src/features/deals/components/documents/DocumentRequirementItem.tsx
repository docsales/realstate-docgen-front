import React, { useRef, useState } from 'react';
import { CheckCircle2, XCircle, Clock, Upload, X, Link2, ChevronDown } from 'lucide-react';
import type { UploadedFile } from '@/types/types';
import { OcrStatusLoader } from './OcrStatusLoader';
import { OcrStatus } from '@/types/ocr.types';
import { UtilsService } from '@/services/utils.service';
import { translateValidationError } from '@/utils/validationErrorMessages';

interface DocumentRequirementItemProps {
	documentId: string;
	documentName: string;
	description?: string;
	uploadedFiles: UploadedFile[];
	allFiles?: UploadedFile[];
	onFileUpload: (files: File[], documentType: string, personId?: string) => void;
	onRemoveFile?: (fileId: string) => void;
	onLinkExistingFile?: (fileId: string, documentType: string) => void;
	personId?: string;
	maxFiles?: number;
	linkingFileId?: string | null;
}

// Helper function to check if a file satisfies a document type
const fileSatisfiesType = (file: UploadedFile, documentType: string): boolean => {
	if (file.type === documentType) return true;
	if (file.types && file.types.includes(documentType)) return true;
	return false;
};

export const DocumentRequirementItem: React.FC<DocumentRequirementItemProps> = ({
	documentId,
	documentName,
	description,
	uploadedFiles,
	allFiles,
	onFileUpload,
	onRemoveFile,
	onLinkExistingFile,
	personId,
	maxFiles = 5,
	linkingFileId
}) => {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [showLinkMenu, setShowLinkMenu] = useState(false);

	const relatedFiles = uploadedFiles.filter(f => {
		if (!fileSatisfiesType(f, documentId)) return false;

		if (personId === undefined && f.personId === undefined) return true;

		return f.personId === personId;
	});

	// Find other validated files from the same person/category that could be reused
	const reusableFiles = (allFiles || uploadedFiles).filter(file => {
		if (personId !== undefined && file.personId !== personId) return false;
		if (personId === undefined && file.personId !== undefined) return false;

		if (fileSatisfiesType(file, documentId)) return false;

		if (file.ocrStatus !== OcrStatus.COMPLETED || !file.validated) return false;

		if (!file.documentId) return false;

		return true;
	});

	const isValidated = relatedFiles.length > 0 && relatedFiles.every(f => f.validated === true);
	const hasError = relatedFiles.some(f => f.validated === false);
	const isPending = relatedFiles.length > 0 && relatedFiles.some(f => f.validated === undefined);
	const canAddMore = relatedFiles.length < maxFiles;
	const maxFilesLabel = maxFiles === 1 ? '1 arquivo' : `${maxFiles} arquivos`;

	const getStatusIcon = () => {
		if (isValidated) {
			return <CheckCircle2 className="w-5 h-5 text-green-500" />;
		}
		if (hasError) {
			return <XCircle className="w-5 h-5 text-red-600" />;
		}
		if (isPending) {
			return <Clock className="w-5 h-5 text-yellow-600" />;
		}
		return <Upload className="w-5 h-5 text-slate-400" />;
	};

	const getStatusText = () => {
		if (isValidated) {
			return <span className="text-green-600 font-medium text-xs">Concluido</span>;
		}
		if (hasError) {
			return <span className="text-red-600 font-semibold text-sm">Erro na validacao</span>;
		}
		if (isPending) {
			return <span className="text-yellow-600 font-semibold text-sm">Validando...</span>;
		}
		return (
			<span className="text-slate-400 font-semibold text-sm">
				Clique ou arraste para enviar (ate {maxFilesLabel})
			</span>
		);
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			const fileArray = Array.from(e.target.files);
			const remainingSlots = maxFiles - relatedFiles.length;
			const filesToUpload = fileArray.slice(0, remainingSlots);

			if (filesToUpload.length > 0) {
				onFileUpload(filesToUpload, documentId, personId);
			}
		}
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	const handleClick = (e: React.MouseEvent) => {
		if ((e.target as HTMLElement).closest('[data-remove-button]')) {
			return;
		}

		if (canAddMore) {
			fileInputRef.current?.click();
		}
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (canAddMore) {
			e.dataTransfer.dropEffect = 'copy';
			setIsDragging(true);
		}
	};

	const handleDragEnter = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (canAddMore) {
			setIsDragging(true);
		}
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();

		if (e.currentTarget.contains(e.relatedTarget as Node)) {
			return;
		}

		setIsDragging(false);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);

		if (!canAddMore) return;

		const files = Array.from(e.dataTransfer.files);
		const remainingSlots = maxFiles - relatedFiles.length;
		const filesToUpload = files.slice(0, remainingSlots);

		if (filesToUpload.length > 0) {
			onFileUpload(filesToUpload, documentId, personId);
		}
	};

	return (
		<div
			className={`
				p-4 rounded-lg border-2 transition-all
				${isValidated
					? 'border-slate-200 bg-white'
					: hasError
						? 'border-red-200 bg-red-50/30'
						: isPending
							? 'border-yellow-200 bg-yellow-50/30'
							: isDragging
								? 'border-blue-400 bg-blue-50 border-dashed scale-[1.02] shadow-lg'
								: 'border-slate-200 bg-white hover:border-slate-600 hover:bg-slate-50 border-dashed'
				}
				${canAddMore ? 'cursor-pointer' : ''}
			`}
			onClick={handleClick}
			onDragOver={handleDragOver}
			onDragEnter={handleDragEnter}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			<input
				ref={fileInputRef}
				type="file"
				multiple
				accept="application/pdf,image/jpeg,image/png,image/jpg"
				className="hidden"
				onChange={handleFileChange}
			/>

			<div className="flex items-start justify-between gap-4">
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-3 mb-2">
						{getStatusIcon()}
						<h4 className="font-semibold text-slate-800">{documentName}</h4>
					</div>

					{description && (
						<p className="text-sm text-slate-600 mb-3">{description}</p>
					)}

					{/* Arquivos anexados */}
					{relatedFiles.length > 0 && (
						<div className="space-y-2 mb-3">
							{relatedFiles.map((file) => {
								// Only show OCR loader for active states (uploading/processing), not completed
								const isOcrActive = file.ocrStatus === OcrStatus.UPLOADING || file.ocrStatus === OcrStatus.PROCESSING;
								const isOcrError = file.ocrStatus === OcrStatus.ERROR;

								return (
									<div key={file.id}>
										{/* Show OCR loader only while actively processing or on error */}
										{(isOcrActive || isOcrError) && (
											<div className="mb-2">
												<OcrStatusLoader
													status={file.ocrStatus!}
													fileName={file.file.name}
													error={file.ocrError}
													processingTime={file.ocrProcessingTime}
												/>
											</div>
										)}

										{/* File card - compact, no redundant status badges */}
										<div
											className={`flex items-center justify-between gap-2 p-2 rounded border ${file.validated === false
												? 'bg-red-50 border-red-200'
												: file.validated === undefined
													? 'bg-yellow-50 border-yellow-200'
													: 'bg-white border-slate-200'
											}`}
										>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 flex-wrap">
													<span className="text-xs font-bold text-slate-600 uppercase bg-slate-100 px-2 py-0.5 rounded">
														{file.types && file.types.length > 1 ? UtilsService.getDocumentTypes(file.types) : UtilsService.getDocumentType(file.type)}
													</span>
													{file.types && file.types.length > 1 && (
														<span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded">
															{file.types.length} docs
														</span>
													)}
													<span className="text-xs text-slate-700 truncate font-medium">
														{file.file.name}
													</span>
													<span className="text-xs text-slate-400">
														({(file.file.size / 1024 / 1024).toFixed(2)} MB)
													</span>
													{file.validated === false && (
														<span className="text-xs text-red-600 font-semibold">Erro</span>
													)}
													{file.validated === undefined && (
														<span className="text-xs text-yellow-600 font-semibold animate-pulse">Validando...</span>
													)}
												</div>
												{file.validationError && (() => {
													const errorInfo = translateValidationError(file.validationError);
													return (
														<div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
															<p className="text-xs font-semibold text-red-800">{errorInfo.title}</p>
															<p className="text-xs text-red-600 mt-1">{errorInfo.message}</p>
															{errorInfo.suggestion && (
																<p className="text-xs text-red-500 mt-1 italic">{errorInfo.suggestion}</p>
															)}
														</div>
													);
												})()}
											</div>

											{onRemoveFile && (
												<button
													data-remove-button
													onClick={(e) => {
														e.stopPropagation();
														onRemoveFile(file.id);
													}}
													className="cursor-pointer p-1 hover:bg-red-100 rounded text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
													title="Remover arquivo"
												>
													<X className="w-4 h-4" />
												</button>
											)}
										</div>
									</div>
								);
							})}
						</div>
					)}

					<div className="flex items-center gap-2 flex-wrap">
						{getStatusText()}
						<span className="text-xs text-slate-400">
							({relatedFiles.length}/{maxFiles})
						</span>

						{/* Botão para reutilizar documento existente */}
						{onLinkExistingFile && reusableFiles.length > 0 && canAddMore && relatedFiles.length === 0 && (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									setShowLinkMenu(!showLinkMenu);
								}}
								disabled={!!linkingFileId}
								className={`cursor-pointer text-xs px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded border border-blue-200 flex items-center gap-1 transition-colors ${linkingFileId ? 'opacity-50 cursor-not-allowed' : ''}`}
							>
								{linkingFileId ? (
									<>
										<span className="loading loading-spinner loading-xs"></span>
										Vinculando...
									</>
								) : (
									<>
										<Link2 className="w-3 h-3" />
										Usar documento existente
										<ChevronDown className="w-3 h-3 transition-transform duration-200" />
									</>
								)}
							</button>
						)}
					</div>

					{/* Menu de documentos reutilizáveis */}
					{showLinkMenu && reusableFiles.length > 0 && (
						<div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
							<p className="text-xs text-slate-600 font-semibold mb-2">
								Selecione um documento já enviado:
							</p>
							{reusableFiles.map((file) => {
								const isLinking = linkingFileId === file.id;
								return (
									<button
										key={file.id}
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											onLinkExistingFile?.(file.id, documentId);
											setShowLinkMenu(false);
										}}
										disabled={!!linkingFileId}
										className={`cursor-pointer w-full text-left p-2 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 rounded transition-all flex items-center justify-between gap-2 ${linkingFileId ? 'opacity-50 cursor-not-allowed' : ''}`}
									>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 flex-wrap">
												{isLinking && (
													<span className="loading loading-spinner loading-xs text-blue-600"></span>
												)}
												<span className="text-xs font-bold text-slate-600 uppercase bg-slate-100 px-2 py-0.5 rounded">
													{file.type}
												</span>
												<span className="text-xs text-slate-700 truncate font-medium">
													{file.file.name}
												</span>
												{file.types && file.types.length > 1 && (
													<span className="text-xs text-blue-600 font-medium">
														(Satisfaz {file.types.length} documentos)
													</span>
												)}
											</div>
										</div>
										<Link2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
									</button>
								);
							})}
						</div>
					)}

					{/* Mensagem durante drag */}
					{isDragging && (
						<p className="text-sm text-blue-600 font-medium mt-2 animate-pulse">
							Solte o arquivo aqui para enviar
						</p>
					)}

					{/* Mensagem quando limite atingido */}
					{!canAddMore && (
						<p className="text-xs text-slate-500 mt-2">
							Limite de {maxFiles} {maxFiles === 1 ? 'arquivo' : 'arquivos'} atingido
						</p>
					)}
				</div>
			</div>
		</div>
	);
};
