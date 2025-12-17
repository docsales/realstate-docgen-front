import React, { useRef, useState } from 'react';
import { CheckCircle2, XCircle, Clock, Upload, X } from 'lucide-react';
import type { UploadedFile } from '@/types/types';
import { OcrStatusLoader } from './OcrStatusLoader';
import { OcrStatus } from '@/types/ocr.types';

interface DocumentRequirementItemProps {
	documentId: string;
	documentName: string;
	description?: string;
	uploadedFiles: UploadedFile[];
	onFileUpload: (files: File[], documentType: string, personId?: string) => void;
	onRemoveFile?: (fileId: string) => void;
	personId?: string;
	maxFiles?: number;
}

export const DocumentRequirementItem: React.FC<DocumentRequirementItemProps> = ({
	documentId,
	documentName,
	description,
	uploadedFiles,
	onFileUpload,
	onRemoveFile,
	personId,
	maxFiles = 5
}) => {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = useState(false);

	const relatedFiles = uploadedFiles.filter(f => {
		if (f.type !== documentId) return false;
		
		if (personId === undefined && f.personId === undefined) return true;
		
		return f.personId === personId;
	});
	const isValidated = relatedFiles.length > 0 && relatedFiles.every(f => f.validated === true);
	const hasError = relatedFiles.some(f => f.validated === false);
	const isPending = relatedFiles.length > 0 && relatedFiles.some(f => f.validated === undefined);
	const canAddMore = relatedFiles.length < maxFiles;

	const getStatusIcon = () => {
		if (isValidated) {
			return <CheckCircle2 className="w-5 h-5 text-green-600" />;
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
			return <span className="text-green-600 font-semibold text-sm">Validado</span>;
		}
		if (hasError) {
			return <span className="text-red-600 font-semibold text-sm">Erro na validação</span>;
		}
		if (isPending) {
			return <span className="text-yellow-600 font-semibold text-sm">Validando...</span>;
		}
		return <span className="text-slate-400 font-semibold text-sm">Clique ou arraste para enviar</span>;
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
		
		// Verificar se ainda está dentro da área de drop
		// Se o relatedTarget (para onde o mouse foi) ainda está dentro do currentTarget,
		// significa que só mudou de elemento filho, não saiu da área
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
				bg-white p-4 rounded-lg border-2 transition-all
				${isValidated
					? 'border-green-200 bg-green-50/30'
					: hasError
					? 'border-red-200 bg-red-50/30'
					: isPending
					? 'border-yellow-200 bg-yellow-50/30'
					: isDragging
					? 'border-blue-400 bg-blue-50 border-dashed scale-[1.02] shadow-lg'
					: 'border-slate-200 hover:border-slate-300 border-dashed'
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
								// Verificar se tem status OCR
								const hasOcrStatus = file.ocrStatus && file.ocrStatus !== OcrStatus.IDLE;
								
								return (
									<div key={file.id}>
										{/* Mostrar loader OCR se estiver processando */}
										{hasOcrStatus && (
											<div className="mb-2">
												<OcrStatusLoader
													status={file.ocrStatus!}
													fileName={file.file.name}
													error={file.ocrError}
													processingTime={file.ocrProcessingTime}
												/>
											</div>
										)}
										
										{/* Card do arquivo */}
										<div 
											className={`flex items-center justify-between gap-2 p-2 rounded border ${
												file.validated === true 
													? 'bg-green-50 border-green-200' 
													: file.validated === false
													? 'bg-red-50 border-red-200'
													: 'bg-yellow-50 border-yellow-200'
											}`}
										>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 flex-wrap">
													<span className="text-xs font-bold text-slate-600 uppercase bg-white px-2 py-0.5 rounded">
														{file.type}
													</span>
													<span className="text-xs text-slate-700 truncate font-medium">
														{file.file.name}
													</span>
													<span className="text-xs text-slate-400">
														({(file.file.size / 1024 / 1024).toFixed(2)} MB)
													</span>
													{file.validated === true && (
														<span className="text-xs text-green-600 font-semibold">✓ Validado</span>
													)}
													{file.validated === false && (
														<span className="text-xs text-red-600 font-semibold">✗ Erro</span>
													)}
													{file.validated === undefined && (
														<span className="text-xs text-yellow-600 font-semibold animate-pulse">⌛ Validando...</span>
													)}
												</div>
												{file.validationError && (
													<p className="text-xs text-red-600 mt-1">{file.validationError}</p>
												)}
											</div>
											
											{onRemoveFile && (
												<button
													data-remove-button
													onClick={(e) => {
														e.stopPropagation();
														onRemoveFile(file.id);
													}}
													className="p-1 hover:bg-red-100 rounded text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
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

					<div className="flex items-center gap-2">
						{getStatusText()}
						{relatedFiles.length > 0 && canAddMore && (
							<span className="text-xs text-slate-400">
								({relatedFiles.length}/{maxFiles})
							</span>
						)}
					</div>

					{/* Mensagem durante drag */}
					{isDragging && (
						<p className="text-sm text-blue-600 font-medium mt-2 animate-pulse">
							Solte o arquivo aqui para enviar
						</p>
					)}

					{/* Mensagem quando limite atingido */}
					{!canAddMore && (
						<p className="text-xs text-slate-500 mt-2">
							Limite de {maxFiles} arquivo(s) atingido
						</p>
					)}
				</div>
			</div>
		</div>
	);
};
