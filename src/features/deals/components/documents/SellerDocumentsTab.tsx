import { UserCheck } from 'lucide-react';
import type { Person, UploadedFile } from '@/types/types';
import { DocumentRequirementItem } from './DocumentRequirementItem';
import { AlertBanner } from './AlertBanner';
import type { ConsolidatedChecklist } from '@/types/checklist.types';

interface SellerDocumentsTabProps {
	sellers: Person[];
	uploadedFiles: UploadedFile[];
	onFilesChange: (files: UploadedFile[]) => void;
	onValidate: (files: UploadedFile[]) => void;
	onRemoveFile: (fileId: string) => void;
	checklist: ConsolidatedChecklist | null;
}

export const SellerDocumentsTab: React.FC<SellerDocumentsTabProps> = ({
	sellers,
	uploadedFiles,
	onFilesChange,
	onValidate,
	onRemoveFile,
	checklist
}) => {	
	const sellerFiles = uploadedFiles.filter(f => f.category === 'sellers');
	
	const requiredDocuments = checklist?.vendedores.documentos || [];
	const alerts = checklist?.vendedores.alertas || [];

	const handleFileUpload = (files: File[], documentType: string, personId?: string) => {
		const newFiles: UploadedFile[] = files.map(file => ({
			id: `${Date.now()}-${Math.random()}`,
			file,
			type: documentType,
			category: 'sellers',
			personId: personId,
			validated: undefined
		}));

		const updatedFiles = [...uploadedFiles, ...newFiles];
		onFilesChange(updatedFiles);

		// Disparar validação automaticamente
		if (onValidate) {
			onValidate(newFiles);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3 mb-6">
				<UserCheck className="w-6 h-6 text-primary" />
				<h3 className="text-xl font-bold text-slate-800">Documentos dos Vendedores</h3>
			</div>

			{/* Alertas */}
			{alerts.length > 0 && (
				<AlertBanner alerts={alerts} />
			)}

			{/* Agrupar documentos por vendedor */}
			{sellers.map((seller, index) => {
				// Filtrar documentos deste vendedor específico
				const sellerSpecificFiles = sellerFiles.filter(f => f.personId === seller.id);
				
				// Contar documentos validados deste vendedor
				const validatedCount = requiredDocuments.filter(doc => {
					const relatedFiles = sellerSpecificFiles.filter(f => f.type === doc.id);
					return relatedFiles.length > 0 && relatedFiles.every(f => f.validated === true);
				}).length;

				return (
					<div key={seller.id} className="space-y-4 pb-6 border-b-2 border-slate-100 last:border-b-0">
						{/* Header do vendedor */}
						<div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 rounded-lg border border-blue-200 shadow-sm">
							<div className="flex items-center justify-between">
								<div>
									<h4 className="font-bold text-blue-900 text-lg">
										Vendedor {index + 1}
									</h4>
									<p className="text-sm text-blue-700 mt-1">
										{seller.personType === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
										{seller.maritalState && ` • ${seller.maritalState.replace('_', ' ')}`}
									</p>
								</div>
								<div className="text-right">
									<div className="text-2xl font-bold text-blue-900">
										{validatedCount}/{requiredDocuments.length}
									</div>
									<div className="text-xs text-blue-700">documentos</div>
								</div>
							</div>
						</div>

						{/* Documentos obrigatórios deste vendedor */}
						<div className="space-y-3 pl-2">
							{requiredDocuments.length > 0 ? (
								requiredDocuments.map((doc) => (
									<DocumentRequirementItem
										key={`${doc.id}_${seller.id}`}
										documentId={doc.id}
										documentName={doc.nome}
										description={doc.observacao}
										uploadedFiles={sellerSpecificFiles}
										onFileUpload={handleFileUpload}
										onRemoveFile={onRemoveFile}
										personId={seller.id}
									/>
								))
							) : (
								<p className="text-slate-500 text-sm">Carregando documentos necessários...</p>
							)}
						</div>
					</div>
				);
			})}

			{sellers.length === 0 && (
				<div className="text-center py-8 text-slate-500">
					<p>Nenhum vendedor configurado</p>
				</div>
			)}
		</div>
	);
};
