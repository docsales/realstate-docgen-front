import { useState } from 'react';
import { FileText, AlertCircle, X } from 'lucide-react';
import type { UploadedFile } from '@/types/types';
import { DocumentRequirementItem } from './DocumentRequirementItem';
import type { ConsolidatedChecklist } from '@/types/checklist.types';
import { generateFileId } from '@/utils/generateFileId';
import { Button } from '@/components/Button';

interface ProposalDocumentsTabProps {
	uploadedFiles: UploadedFile[];
	onFilesChange: (files: UploadedFile[]) => void;
	onRemoveFile: (fileId: string) => void;
	checklist: ConsolidatedChecklist | null;
}

export const ProposalDocumentsTab: React.FC<ProposalDocumentsTabProps> = ({
	uploadedFiles,
	onFilesChange,
	onRemoveFile,
	checklist: _checklist
}) => {
	const proposalFiles = uploadedFiles.filter(f => f.category === 'proposal');
	const [linkError, setLinkError] = useState<string | null>(null);

	const handleFileUpload = (files: File[], documentType: string) => {
		const newFiles: UploadedFile[] = files.map(file => ({
			id: generateFileId(),
			file,
			type: documentType,
			types: [documentType],
			category: 'proposal',
			validated: undefined,
			ocrStatus: 'uploading' as const
		}));

		const updatedFiles = [...uploadedFiles, ...newFiles];
		onFilesChange(updatedFiles);
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-2 mb-4">
				<FileText className="w-4 h-4 text-slate-400" />
				<h3 className="text-sm font-semibold text-slate-700">Proposta Comercial</h3>
				<span className="text-[10px] uppercase tracking-wide font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Opcional</span>
			</div>

			{/* Erro de vinculação */}
			{linkError && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 animate-in fade-in">
					<AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
					<div className="flex-1">
						<p className="text-sm text-red-800">{linkError}</p>
					</div>
					<Button
						variant="link"
						size="sm"
						icon={<X className="w-4 h-4" />}
						onClick={() => setLinkError(null)}
						className="text-red-400 hover:text-red-600 transition-colors"
					/>
				</div>
			)}

			<div className="px-1 py-2 border-b border-slate-100">
				<p className="text-xs text-slate-400">
					Envie a proposta comercial (PDF/Imagem) ou prints de conversa (WhatsApp/e-mail) contendo os termos da negociacao.
				</p>
			</div>

			<div className="space-y-3">
				<DocumentRequirementItem
					documentId="PROPOSTA_COMERCIAL"
					documentName="Proposta Comercial"
					description="Pode ser formulario, e-mail, WhatsApp, manuscrito digitalizado, etc."
					uploadedFiles={proposalFiles}
					allFiles={proposalFiles}
					onFileUpload={handleFileUpload}
					onRemoveFile={onRemoveFile}
					maxFiles={5}
					isOptional
				/>
			</div>
		</div>
	);
};
