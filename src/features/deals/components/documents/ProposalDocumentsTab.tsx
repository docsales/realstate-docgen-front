import { useState } from 'react';
import { FileText, AlertCircle, X } from 'lucide-react';
import type { UploadedFile } from '@/types/types';
import { DocumentRequirementItem } from './DocumentRequirementItem';
import type { ConsolidatedChecklist } from '@/types/checklist.types';
import { generateFileId } from '@/utils/generateFileId';

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
			<div className="flex items-center gap-3 mb-6">
				<FileText className="w-6 h-6 text-primary" />
				<h3 className="text-xl font-bold text-slate-800">Proposta Comercial</h3>
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

			<div className="bg-gradient-to-r from-amber-50 to-amber-100 px-4 py-3 rounded-lg border border-amber-200">
				<h4 className="font-bold text-amber-900">O que enviar</h4>
				<p className="text-sm text-amber-800 mt-1">
					Envie a proposta comercial (PDF/Imagem) ou prints de conversa (WhatsApp/e-mail) contendo os termos
					da negociação. O sistema cuidará do resto automaticamente para apoiar o mapeamento das variáveis
				</p>
			</div>

			{/* Lista de documentos obrigatórios */}
			<div className="space-y-3">
				<DocumentRequirementItem
					documentId="PROPOSTA_COMERCIAL"
					documentName="Proposta Comercial"
					description="Pode ser formulário, e-mail, WhatsApp, manuscrito digitalizado, etc. O OCR é agnóstico ao formato."
					uploadedFiles={proposalFiles}
					allFiles={proposalFiles}
					onFileUpload={handleFileUpload}
					onRemoveFile={onRemoveFile}
					maxFiles={5}
				/>
			</div>
		</div>
	);
};
