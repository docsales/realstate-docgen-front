import { useRef } from 'react';
import { UploadCloud, FileCheck, X } from 'lucide-react';
import type { UploadedFile } from '@/types/types';

interface DocumentUploadProps {
	onFilesSelected: (files: File[]) => void;
	acceptedTypes?: string;
	maxSize?: number; // in MB
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
	onFilesSelected,
	acceptedTypes = 'application/pdf,image/jpeg,image/png,image/jpg',
	maxSize = 10
}) => {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			const fileArray = Array.from(e.target.files);
			// Filter by size
			const validFiles = fileArray.filter(file => {
				const sizeMB = file.size / 1024 / 1024;
				return sizeMB <= maxSize;
			});
			onFilesSelected(validFiles);
		}
		// Reset input to allow selecting the same files again
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	return (
		<div className="border-2 border-dashed border-slate-300 rounded-2xl p-10 flex flex-col items-center justify-center bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer group relative">
			<input
				ref={fileInputRef}
				type="file"
				multiple
				accept={acceptedTypes}
				className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
				onChange={handleFileChange}
			/>
			<div className="p-4 bg-white rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
				<UploadCloud className="w-10 h-10 text-primary" />
			</div>
			<h4 className="text-lg font-semibold text-slate-800">Arraste seus documentos aqui</h4>
			<p className="text-slate-500 mt-2">Suporta PDF, JPG, PNG (Max {maxSize}MB)</p>
			<button className="mt-6 text-sm px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 pointer-events-none">
				Selecionar Arquivos
			</button>
		</div>
	);
};

interface DocumentListProps {
	files: UploadedFile[];
	onRemove: (id: string) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({ files, onRemove }) => {
	if (files.length === 0) return null;

	return (
		<div className="space-y-3">
			<h3 className="font-semibold text-slate-800">Documentos Carregados</h3>
			<div className="grid gap-3">
				{files.map((f) => (
					<div
						key={f.id}
						className="bg-white p-4 rounded-lg border border-slate-200 flex items-center justify-between shadow-sm"
					>
						<div className="flex items-center gap-3 flex-1">
							<div className={`p-2 rounded-lg ${
								f.validated === true
									? 'bg-green-100 text-green-700'
									: f.validated === false
									? 'bg-red-100 text-red-700'
									: 'bg-slate-100 text-slate-600'
							}`}>
								<FileCheck className="w-5 h-5" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="font-medium text-slate-800 truncate">{f.file.name}</p>
								<div className="flex items-center gap-2 text-xs text-slate-500">
									<span>{(f.file.size / 1024 / 1024).toFixed(2)} MB</span>
									<span>•</span>
									<span className="text-primary font-semibold">{f.type}</span>
									{f.validated === true && (
										<>
											<span>•</span>
											<span className="text-green-600 font-semibold">Validado</span>
										</>
									)}
									{f.validated === false && (
										<>
											<span>•</span>
											<span className="text-red-600 font-semibold">Erro na validação</span>
										</>
									)}
								</div>
								{f.validationError && (
									<p className="text-xs text-red-600 mt-1">{f.validationError}</p>
								)}
							</div>
						</div>
						<button
							onClick={() => onRemove(f.id)}
							className="cursor-pointer text-red-500 hover:text-red-700 ml-4"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				))}
			</div>
		</div>
	);
};
