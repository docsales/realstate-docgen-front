import { Home } from 'lucide-react';
import type { PropertyState, PropertyType, UploadedFile } from '@/types/types';
import { DocumentRequirementItem } from './DocumentRequirementItem';
import { AlertBanner } from './AlertBanner';
import type { ConsolidatedChecklist } from '@/types/checklist.types';
import { generateFileId } from '@/utils/generateFileId';

interface PropertyDocumentsTabProps {
	propertyState: PropertyState;
	propertyType: PropertyType;
	deedCount: number;
	uploadedFiles: UploadedFile[];
	onFilesChange: (files: UploadedFile[]) => void;
	onRemoveFile: (fileId: string) => void;
	checklist: ConsolidatedChecklist | null;
}

export const PropertyDocumentsTab: React.FC<PropertyDocumentsTabProps> = ({
	propertyState,
	propertyType,
	deedCount,
	uploadedFiles,
	onFilesChange,
	onRemoveFile,
	checklist
}) => {
	const propertyFiles = uploadedFiles.filter(f => f.category === 'property');
	
	// Obter documentos da API ou fallback para array vazio
	const requiredDocuments = checklist?.imovel.documentos || [];
	const alerts = checklist?.imovel.alertas || [];

	const handleFileUpload = (files: File[], documentType: string) => {
		const newFiles: UploadedFile[] = files.map(file => ({
			id: generateFileId(),
			file,
			type: documentType,
			category: 'property',
			validated: undefined
		}));

		const updatedFiles = [...uploadedFiles, ...newFiles];
		onFilesChange(updatedFiles);
		
		// A validação agora é automática via OCR quando o processamento completar
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3 mb-6">
				<Home className="w-6 h-6 text-primary" />
				<h3 className="text-xl font-bold text-slate-800">Documentos do Imóvel</h3>
			</div>

			{/* Alertas */}
			{alerts.length > 0 && (
				<AlertBanner alerts={alerts} />
			)}

			{/* Informações do imóvel */}
			<div className="bg-gradient-to-r from-purple-50 to-purple-100 px-4 py-3 rounded-lg border border-purple-200">
				<h4 className="font-bold text-purple-900">Informações do Imóvel</h4>
				<div className="text-sm text-purple-700 mt-1 flex flex-wrap gap-x-4 gap-y-1">
					<span>Tipo: {propertyType === 'urbano' ? 'Urbano' : 'Rural'}</span>
					<span>•</span>
					<span>Situação: {propertyState.replace('_', ' ')}</span>
					{deedCount > 1 && (
						<>
							<span>•</span>
							<span>{deedCount} matrículas</span>
						</>
					)}
				</div>
			</div>

			{/* Lista de documentos obrigatórios */}
			<div className="space-y-3">
				{requiredDocuments.length > 0 ? (
					requiredDocuments.map((doc) => (
						<DocumentRequirementItem
							key={doc.id}
							documentId={doc.id}
							documentName={doc.nome}
							description={doc.observacao}
							uploadedFiles={propertyFiles}
							onFileUpload={handleFileUpload}
							onRemoveFile={onRemoveFile}
						/>
					))
				) : (
					<p className="text-slate-500 text-sm">Carregando documentos necessários...</p>
				)}
			</div>
		</div>
	);
};
