import React, { useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Upload, X, Link2, ChevronDown, FileText, Loader2 } from 'lucide-react';
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
	isOptional?: boolean;
}

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
	linkingFileId,
	isOptional = false
}) => {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [showLinkMenu, setShowLinkMenu] = useState(false);

	const relatedFiles = uploadedFiles.filter(f => {
		if (!fileSatisfiesType(f, documentId)) return false;
		if (personId === undefined && f.personId === undefined) return true;
		return f.personId === personId;
	});

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
		if ((e.target as HTMLElement).closest('[data-remove-button]') || (e.target as HTMLElement).closest('[data-link-menu]')) {
			return;
		}
		if (canAddMore) {
			fileInputRef.current?.click();
		}
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (canAddMore) { e.dataTransfer.dropEffect = 'copy'; setIsDragging(true); }
	};
	const handleDragEnter = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (canAddMore) setIsDragging(true);
	};
	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (e.currentTarget.contains(e.relatedTarget as Node)) return;
		setIsDragging(false);
	};
	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
		if (!canAddMore) return;
		const files = Array.from(e.dataTransfer.files);
		const filesToUpload = files.slice(0, maxFiles - relatedFiles.length);
		if (filesToUpload.length > 0) onFileUpload(filesToUpload, documentId, personId);
	};

	// --- Status indicator (left-side dot) ---
	const statusDot = isValidated
		? 'bg-emerald-500'
		: hasError
			? 'bg-red-500'
			: isPending
				? 'bg-amber-400 animate-pulse'
				: 'bg-slate-300';

	return (
		<div
			className={`
				group relative rounded-lg border transition-all duration-150
				${isDragging
					? 'border-primary bg-blue-50/40 shadow-sm'
					: hasError
						? 'border-red-200 bg-white'
						: isOptional
							? 'border-dashed border-slate-200 bg-white hover:border-slate-300'
							: 'border-slate-200 bg-white hover:border-slate-300'
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

			{/* Main content area */}
			<div className="px-4 py-3">
				{/* Header row */}
				<div className="flex items-center gap-3">
					{/* Status dot */}
					<span className={`flex-shrink-0 w-2 h-2 rounded-full ${statusDot}`} />

					{/* Document name */}
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2">
							<h4 className={`text-sm font-semibold truncate ${isOptional ? 'text-slate-500' : 'text-slate-800'}`}>{documentName}</h4>
							{isOptional && (
								<span className="flex-shrink-0 text-[10px] uppercase tracking-wide font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Opcional</span>
							)}
							{isValidated && (
								<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
							)}
							{hasError && (
								<AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
							)}
						</div>
						{description && (
							<p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{description}</p>
						)}
					</div>

					{/* Counter / status text */}
					<div className="flex-shrink-0 text-right">
						{relatedFiles.length > 0 ? (
							<span className="text-xs text-slate-400 tabular-nums">
								{relatedFiles.length}/{maxFiles}
							</span>
						) : (
							<span className="text-xs text-slate-400">
								0/{maxFiles}
							</span>
						)}
					</div>
				</div>

				{/* Empty state (no files yet) */}
				{relatedFiles.length === 0 && !isDragging && (
					<div className="mt-2 flex items-center gap-2">
						<Upload className="w-3.5 h-3.5 text-slate-300" />
						<span className="text-xs text-slate-400">
							Clique ou arraste para enviar ({maxFilesLabel})
						</span>

						{/* Link existing file button */}
						{onLinkExistingFile && reusableFiles.length > 0 && canAddMore && (
							<button
								data-link-menu
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									setShowLinkMenu(!showLinkMenu);
								}}
								disabled={!!linkingFileId}
								className={`cursor-pointer ml-auto text-xs px-2 py-0.5 text-primary hover:bg-slate-50 rounded border border-slate-200 flex items-center gap-1 transition-colors ${linkingFileId ? 'opacity-50 cursor-not-allowed' : ''}`}
							>
								{linkingFileId ? (
									<>
										<Loader2 className="w-3 h-3 animate-spin" />
										<span>Vinculando...</span>
									</>
								) : (
									<>
										<Link2 className="w-3 h-3" />
										<span>Usar existente</span>
										<ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showLinkMenu ? 'rotate-180' : ''}`} />
									</>
								)}
							</button>
						)}
					</div>
				)}

				{/* Drag feedback */}
				{isDragging && (
					<div className="mt-2 flex items-center gap-2">
						<Upload className="w-3.5 h-3.5 text-primary animate-bounce" />
						<span className="text-xs text-primary font-medium">Solte aqui para enviar</span>
					</div>
				)}

				{/* Uploaded files list */}
				{relatedFiles.length > 0 && (
					<div className="mt-3 space-y-1.5">
						{relatedFiles.map((file) => {
							const isOcrActive = file.ocrStatus === OcrStatus.UPLOADING || file.ocrStatus === OcrStatus.PROCESSING;
							const isOcrError = file.ocrStatus === OcrStatus.ERROR;

							return (
								<div key={file.id}>
									{/* OCR processing inline loader */}
									{(isOcrActive || isOcrError) && (
										<OcrStatusLoader
											status={file.ocrStatus!}
											fileName={file.file.name}
											error={file.ocrError}
											processingTime={file.ocrProcessingTime}
										/>
									)}

									{/* File row */}
									{!isOcrActive && (
										<div className="flex items-center gap-2 py-1.5 px-2 -mx-1 rounded hover:bg-slate-50 transition-colors">
											{/* File icon */}
											<FileText className={`w-3.5 h-3.5 flex-shrink-0 ${
												file.validated === false ? 'text-red-400' :
												file.validated === true ? 'text-slate-400' :
												'text-slate-300'
											}`} />

											{/* File info */}
											<div className="flex-1 min-w-0 flex items-center gap-1.5">
												<span className="text-xs text-slate-600 truncate">
													{file.file.name}
												</span>
												<span className="text-[11px] text-slate-300 flex-shrink-0 tabular-nums">
													{(file.file.size / 1024 / 1024).toFixed(1)} MB
												</span>
												{file.types && file.types.length > 1 && (
													<span className="text-[11px] text-primary font-medium flex-shrink-0">
														{file.types.length} tipos
													</span>
												)}
											</div>

											{/* Status indicator */}
											<div className="flex items-center gap-1.5 flex-shrink-0">
												{file.validated === undefined && (
													<Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
												)}
												{file.validated === true && (
													<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
												)}
												{file.validated === false && (
													<AlertCircle className="w-3.5 h-3.5 text-red-500" />
												)}
											</div>

											{/* Remove button */}
											{onRemoveFile && (
												<button
													data-remove-button
													onClick={(e) => {
														e.stopPropagation();
														onRemoveFile(file.id);
													}}
													className="cursor-pointer p-0.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
													title="Remover arquivo"
												>
													<X className="w-3.5 h-3.5" />
												</button>
											)}
										</div>
									)}

									{/* Validation error detail */}
									{file.validationError && (() => {
										const errorInfo = translateValidationError(file.validationError);
										return (
											<div className="mt-1 ml-6 px-2.5 py-2 bg-red-50 border-l-2 border-red-400 rounded-r text-xs">
												<p className="font-medium text-red-700">{errorInfo.title}</p>
												<p className="text-red-600 mt-0.5">{errorInfo.message}</p>
												{errorInfo.suggestion && (
													<p className="text-red-400 mt-0.5">{errorInfo.suggestion}</p>
												)}
											</div>
										);
									})()}
								</div>
							);
						})}
					</div>
				)}

				{/* Link existing file menu */}
				{showLinkMenu && reusableFiles.length > 0 && (
					<div data-link-menu className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
						<p className="text-xs text-slate-500 font-medium px-1 mb-1.5">
							Selecione um documento enviado:
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
									className={`cursor-pointer w-full text-left px-2 py-1.5 bg-white border border-slate-200 hover:border-primary/30 rounded transition-colors flex items-center gap-2 ${linkingFileId ? 'opacity-50 cursor-not-allowed' : ''}`}
								>
									{isLinking && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
									<FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
									<span className="text-xs text-slate-600 truncate flex-1">{file.file.name}</span>
									{file.types && file.types.length > 1 && (
										<span className="text-[11px] text-slate-400">{file.types.length} tipos</span>
									)}
									<Link2 className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
								</button>
							);
						})}
					</div>
				)}

				{/* Max files reached */}
				{!canAddMore && (
					<p className="text-[11px] text-slate-400 mt-2">
						Limite de {maxFiles} {maxFiles === 1 ? 'arquivo' : 'arquivos'} atingido
					</p>
				)}
			</div>
		</div>
	);
};
