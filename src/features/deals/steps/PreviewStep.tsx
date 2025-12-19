import React, { useEffect, useState } from 'react';
import { Button } from '../../../components/Button';
import { ArrowRight, CheckCircle2, ExternalLink, FilePenLine, FileText } from 'lucide-react';
import type { GeneratePreviewResponse } from '@/types/types';
import { useDeal, useGeneratePreview } from '../hooks/useDeals';
import { DocumentWritingLoader } from '../components/DocumentWritingLoader';

interface PreviewStepProps {
	dealId: string;
	dealName: string;
	mappedCount: number;
	onGenerate: () => void;
}

export const PreviewStep: React.FC<PreviewStepProps> = ({ dealId, dealName, mappedCount, onGenerate }) => {
	const { data: deal, isLoading } = useDeal(dealId);
	const generatePreviewMutation = useGeneratePreview();
	const [status, setStatus] = useState<'idle' | 'generating' | 'done'>('idle');
	const [preview, setPreview] = useState<GeneratePreviewResponse | null>(null);

	const handleGenerate = async () => {
		if (!dealId) {
			console.error('Deal ID is required');
			setStatus('idle');
			return;
		}

		setStatus('generating');
		try {
			const generatedPreview = await generatePreviewMutation.mutateAsync({ dealId });
			setPreview(generatedPreview);
			setStatus('done');
		} catch (error) {
			console.error(error);
			setStatus('idle');
		}
	};

	useEffect(() => {
		if (dealId && !isLoading) {
			if (deal?.consolidated && deal.consolidated.draftPreviewUrl) {
				setPreview({
					edit_url: deal.consolidated.draftPreviewUrl,
					id: deal.consolidated.generatedDocId,
					status_code: 200,
				});

				setStatus('done');
			}
		}
	}, [dealId, isLoading, deal]);

	return (
		<div className="flex flex-col items-center justify-center space-y-8 py-10 animate-in fade-in duration-500">
			{status === 'idle' && (
				<div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-lg w-full text-center space-y-6">
					<div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
						<FileText className="w-8 h-8 text-primary" />
					</div>
					<div>
						<h3 className="text-2xl font-bold text-slate-800">Pronto para gerar o preview?</h3>
						<p className="text-slate-500 mt-2">Vamos criar um rascunho do seu documento no Google Docs com base nos dados mapeados.</p>
					</div>

					<div className="bg-slate-50 p-4 rounded-lg text-left text-sm space-y-2">
						<div className="flex justify-between">
							<span className="text-slate-500">Contrato:</span>
							<span className="font-medium text-slate-800">{dealName}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-slate-500">Variáveis Mapeadas:</span>
							<span className="font-medium text-slate-800">{mappedCount} campos</span>
						</div>
					</div>

					{preview && (
						<div className="flex justify-between">
							<span className="text-slate-500">Preview:</span>
							<span className="font-medium text-slate-800">{preview.edit_url}</span>
						</div>
					)}
					<Button onClick={handleGenerate} className="w-full text-lg py-3">
						<FilePenLine className="w-4 h-4" />
						Gerar Preview
					</Button>
				</div>
			)}

			{status === 'generating' && (
				<DocumentWritingLoader 
					title="Gerando seu Documento..."
					description="O sistema está aplicando as variáveis no modelo e criando o link no Drive."
				/>
			)}

			{status === 'done' && (
				<div className="bg-white p-8 rounded-2xl shadow-lg border border-green-100 max-w-lg w-full text-center space-y-6">
					<div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
						<CheckCircle2 className="w-8 h-8 text-green-600" />
					</div>
					<div>
						<h3 className="text-2xl font-bold text-slate-800">Preview Gerado!</h3>
						<p className="text-slate-500 mt-2">Seu documento foi criado com sucesso. Você pode visualizá-lo e editá-lo antes de enviar.</p>
					</div>

					<div className="flex gap-4 flex-col">
						<Button variant="secondary" className="w-full flex items-center gap-2 justify-center" onClick={() => window.open(preview?.edit_url, '_blank')}>
							<ExternalLink className="w-4 h-4" />
							<span>Abrir no Google Docs</span>
						</Button>
						<Button onClick={onGenerate} className="w-full justify-center flex items-center gap-2">
							<span>Avançar para Signatários</span>
							<ArrowRight className="w-4 h-4" />
						</Button>
					</div>
					<p className="text-xs text-slate-400">Nota: O documento abre em nova aba.</p>
				</div>
			)}
		</div>
	);
};