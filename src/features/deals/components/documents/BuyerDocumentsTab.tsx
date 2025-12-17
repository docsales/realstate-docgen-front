import { Users } from 'lucide-react';
import type { Person, UploadedFile } from '@/types/types';
import { DocumentRequirementItem } from './DocumentRequirementItem';
import { AlertBanner } from './AlertBanner';
import type { ConsolidatedChecklist } from '@/types/checklist.types';
import { generateFileId } from '@/utils/generateFileId';

interface BuyerDocumentsTabProps {
	buyers: Person[];
	uploadedFiles: UploadedFile[];
	onFilesChange: (files: UploadedFile[]) => void;
	onRemoveFile: (fileId: string) => void;
	checklist: ConsolidatedChecklist | null;
}

export const BuyerDocumentsTab: React.FC<BuyerDocumentsTabProps> = ({
	buyers,
	uploadedFiles,
	onFilesChange,
	onRemoveFile,
	checklist
}) => {
	const buyerFiles = uploadedFiles.filter(f => f.category === 'buyers');
	
	// Obter documentos da API ou fallback para array vazio
	const requiredDocuments = checklist?.compradores.documentos || [];
	const alerts = checklist?.compradores.alertas || [];

	const handleFileUpload = (files: File[], documentType: string, personId?: string) => {
		const newFiles: UploadedFile[] = files.map(file => ({
			id: generateFileId(),
			file,
			type: documentType,
			category: 'buyers',
			personId: personId,
			validated: undefined
		}));

		const updatedFiles = [...uploadedFiles, ...newFiles];
		onFilesChange(updatedFiles);
		
		// A validação agora é automática via OCR quando o processamento completar
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3 mb-6">
				<Users className="w-6 h-6 text-primary" />
				<h3 className="text-xl font-bold text-slate-800">Documentos dos Compradores</h3>
			</div>

			{/* Alertas */}
			{alerts.length > 0 && (
				<AlertBanner alerts={alerts} />
			)}

			{/* Agrupar documentos por comprador */}
			{buyers.map((buyer, index) => {
				// Filtrar documentos deste comprador específico
				const buyerSpecificFiles = buyerFiles.filter(f => f.personId === buyer.id);
				
				// Contar documentos validados deste comprador
				const validatedCount = requiredDocuments.filter(doc => {
					const relatedFiles = buyerSpecificFiles.filter(f => f.type === doc.id);
					return relatedFiles.length > 0 && relatedFiles.every(f => f.validated === true);
				}).length;

				return (
					<div key={buyer.id} className="space-y-4 pb-6 border-b-2 border-slate-100 last:border-b-0">
						{/* Header do comprador */}
						<div className="bg-gradient-to-r from-green-50 to-green-100 px-4 py-3 rounded-lg border border-green-200 shadow-sm">
							<div className="flex items-center justify-between">
								<div>
									<h4 className="font-bold text-green-900 text-lg">
										Comprador {index + 1}
									</h4>
									<p className="text-sm text-green-700 mt-1">
										{buyer.personType === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
										{buyer.maritalState && ` • ${buyer.maritalState.replace('_', ' ')}`}
									</p>
								</div>
								<div className="text-right">
									<div className="text-2xl font-bold text-green-900">
										{validatedCount}/{requiredDocuments.length}
									</div>
									<div className="text-xs text-green-700">documentos</div>
								</div>
							</div>
						</div>

						{/* Documentos obrigatórios deste comprador */}
						<div className="space-y-3 pl-2">
							{requiredDocuments.length > 0 ? (
								requiredDocuments.map((doc) => (
									<DocumentRequirementItem
										key={`${doc.id}_${buyer.id}`}
										documentId={doc.id}
										documentName={doc.nome}
										description={doc.observacao}
										uploadedFiles={buyerSpecificFiles}
										onFileUpload={handleFileUpload}
										onRemoveFile={onRemoveFile}
										personId={buyer.id}
									/>
								))
							) : (
								<p className="text-slate-500 text-sm">Carregando documentos necessários...</p>
							)}
						</div>
					</div>
				);
			})}

			{buyers.length === 0 && (
				<div className="text-center py-8 text-slate-500">
					<p>Nenhum comprador configurado</p>
				</div>
			)}
		</div>
	);
};
