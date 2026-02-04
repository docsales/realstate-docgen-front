import React, { useEffect, useState, useRef } from 'react';
import { Button } from '../../../components/Button';
import { ArrowRight, CheckCircle2, ExternalLink, FilePenLine, FileText, RefreshCw } from 'lucide-react';
import type { GeneratePreviewResponse } from '@/types/types';
import { useDeal, useStartPreviewJob } from '../hooks/useDeals';
import { DocumentWritingLoader } from '../components/DocumentWritingLoader';
import { SuccessModal } from '../components/SuccessModal';
import { fireConfetti, fireQuickConfetti } from '@/utils/confetti';
import { previewService, type PreviewProgressStep, type PreviewJobState } from '@/services/preview.service';
import type { Socket } from 'socket.io-client';

interface PreviewStepProps {
	dealId: string;
	dealName: string;
	mappedCount: number;
	onGenerate: () => void;
}

export const PreviewStep: React.FC<PreviewStepProps> = ({ dealId, dealName, mappedCount, onGenerate }) => {
	const { data: deal, isLoading, refetch: refetchDeal } = useDeal(dealId);
	const startPreviewJobMutation = useStartPreviewJob();
	const [status, setStatus] = useState<'idle' | 'generating' | 'done'>('idle');
	const [preview, setPreview] = useState<GeneratePreviewResponse | null>(null);
	const previousMappedCountRef = useRef<number>(mappedCount);
	const previousContractFieldsRef = useRef<string | null>(null);
	const [showSuccessModal, setShowSuccessModal] = useState(false);
	const [isRegeneration, setIsRegeneration] = useState(false);
	const [jobId, setJobId] = useState<string | null>(null);
	const [jobStep, setJobStep] = useState<PreviewProgressStep>('getting_template_variables');
	const socketRef = useRef<Socket | null>(null);
	const pollTimerRef = useRef<number | null>(null);

	const stepToUi = (step: PreviewProgressStep) => {
		switch (step) {
			case 'getting_template_variables':
				return { title: 'Preparando o modelo...', description: 'Buscando variáveis do template no Google Docs.' };
			case 'building_payload':
				return { title: 'Montando o documento...', description: 'Organizando os dados mapeados para o preview.' };
			case 'llm_sellers':
				return { title: 'Analisando vendedores...', description: 'Consolidando dados com IA (pode levar alguns segundos).' };
			case 'llm_buyers':
				return { title: 'Analisando compradores...', description: 'Consolidando dados com IA (pode levar alguns segundos).' };
			case 'apps_script_generate':
				return { title: isRegeneration ? 'Regerando seu Documento...' : 'Gerando seu Documento...', description: 'Criando/atualizando o rascunho no Google Docs.' };
			case 'updating_deal':
				return { title: 'Finalizando...', description: 'Salvando metadados e preparando o link do preview.' };
			case 'done':
			default:
				return { title: 'Finalizando...', description: 'Aguarde um instante...' };
		}
	};

	const stopPolling = () => {
		if (pollTimerRef.current) {
			window.clearInterval(pollTimerRef.current);
			pollTimerRef.current = null;
		}
	};

	const startPolling = (dealIdToPoll: string, jobIdToPoll: string) => {
		stopPolling();
		pollTimerRef.current = window.setInterval(async () => {
			try {
				const state = await previewService.getJobStatus(dealIdToPoll, jobIdToPoll);
				setJobStep(state.step);
				if (state.status === 'COMPLETED' && state.result?.edit_url) {
					onCompleted(state);
				}
				if (state.status === 'ERROR') {
					console.error('❌ Preview job error:', state.error);
					setStatus('done');
					stopPolling();
				}
			} catch (e: any) {
				// Best-effort: em multi-instância o job pode “sumir”
				console.warn('⚠️ Não foi possível consultar status do job (provável troca de instância):', e?.message || e);
				setStatus('done');
				stopPolling();
			}
		}, 5000);
	};

	const onCompleted = async (stateOrResult: PreviewJobState | { result?: any; edit_url?: string; id?: string; status_code?: number }) => {
		const editUrl = (stateOrResult as any)?.result?.edit_url ?? (stateOrResult as any)?.edit_url;
		const id = (stateOrResult as any)?.result?.id ?? (stateOrResult as any)?.id;
		const status_code = (stateOrResult as any)?.result?.status_code ?? (stateOrResult as any)?.status_code ?? 200;

		await new Promise(resolve => setTimeout(resolve, 300));
		await refetchDeal();

		setPreview({
			edit_url: editUrl,
			id,
			status_code,
		});
		setStatus('done');
		stopPolling();

		if (isRegeneration) fireQuickConfetti();
		else fireConfetti();

		setTimeout(() => {
			setShowSuccessModal(true);
		}, 500);
	};

	const handleGenerate = async (isRegen = false) => {
		if (!dealId) {
			setStatus('idle');
			return;
		}

		setIsRegeneration(isRegen);
		setStatus('generating');
		setJobStep('getting_template_variables');
		try {
			const { jobId } = await startPreviewJobMutation.mutateAsync({ dealId });
			setJobId(jobId);
			startPolling(dealId, jobId);
		} catch (error) {
			console.error('❌ Erro ao iniciar geração do preview:', error);
			setStatus('done');
			stopPolling();
		}
	};

	useEffect(() => {
		// Conecta WS uma vez (best-effort)
		let mounted = true;
		(async () => {
			if (socketRef.current) return;
			const socket = await previewService.connectWebSocket();
			if (!mounted) {
				socket?.disconnect();
				return;
			}
			socketRef.current = socket;
			if (!socket) return;

			socket.on('preview_progress', (evt: { jobId: string; dealId: string; step: PreviewProgressStep }) => {
				if (!evt?.jobId || evt.jobId !== jobId) return;
				if (!evt?.dealId || evt.dealId !== dealId) return;
				setJobStep(evt.step);
			});

			socket.on('preview_completed', (evt: { jobId: string; dealId: string; edit_url: string; id: string }) => {
				if (!evt?.jobId || evt.jobId !== jobId) return;
				if (!evt?.dealId || evt.dealId !== dealId) return;
				onCompleted({ edit_url: evt.edit_url, id: evt.id, status_code: 200 });
			});

			socket.on('preview_error', (evt: { jobId: string; dealId: string; error: string }) => {
				if (!evt?.jobId || evt.jobId !== jobId) return;
				if (!evt?.dealId || evt.dealId !== dealId) return;
				console.error('❌ Erro no preview (WS):', evt.error);
				setStatus('done');
				stopPolling();
			});
		})();

		return () => {
			mounted = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dealId, jobId]);

	useEffect(() => {
		return () => {
			stopPolling();
			socketRef.current?.disconnect();
			socketRef.current = null;
		};
	}, []);

	useEffect(() => {
		if (status === 'generating') return;

		if (dealId && !isLoading) {
			const currentContractFields = deal?.contractFields
				? (typeof deal.contractFields === 'string'
					? deal.contractFields
					: JSON.stringify(deal.contractFields))
				: null;

			const mappingChanged =
				previousMappedCountRef.current !== mappedCount ||
				previousContractFieldsRef.current !== currentContractFields;

			if (deal?.consolidated && deal.consolidated.draftPreviewUrl) {
				if (mappingChanged && status === 'done') {
					setStatus('idle');
					setPreview(null);
				} else {
					const newPreview = {
						edit_url: deal.consolidated.draftPreviewUrl,
						id: deal.consolidated.generatedDocId,
						status_code: 200,
					};

					if (!preview ||
						preview.edit_url !== newPreview.edit_url ||
						preview.id !== newPreview.id) {
						setPreview(newPreview);
					}

					if (status !== 'done') {
						setStatus('done');
					}
				}
			}

			previousMappedCountRef.current = mappedCount;
			previousContractFieldsRef.current = currentContractFields;
		}
	}, [dealId, isLoading, deal, mappedCount, status, preview]);

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
					<Button onClick={() => handleGenerate(false)} className="w-full text-lg py-3">
						<FilePenLine className="w-4 h-4" />
						Gerar Preview
					</Button>
				</div>
			)}

			{status === 'generating' && (
				<DocumentWritingLoader
					title={stepToUi(jobStep).title}
					description={stepToUi(jobStep).description}
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
						<Button
							variant="secondary"
							className="w-full flex items-center gap-2 justify-center"
							onClick={() => handleGenerate(true)}
							disabled={startPreviewJobMutation.isPending}
						>
							<RefreshCw className={`w-4 h-4 ${startPreviewJobMutation.isPending ? 'animate-spin' : ''}`} />
							<span>Regerar Preview</span>
						</Button>
						<Button onClick={onGenerate} className="w-full justify-center flex items-center gap-2">
							<span>Avançar para Signatários</span>
							<ArrowRight className="w-4 h-4" />
						</Button>
					</div>
					<p className="text-xs text-slate-400">Nota: O documento abre em nova aba.</p>
				</div>
			)}

			{/* Success Modal */}
			<SuccessModal
				isOpen={showSuccessModal}
				onClose={() => setShowSuccessModal(false)}
				title={isRegeneration ? "Preview Atualizado!" : "Documento Pronto!"}
				description={isRegeneration
					? "Seu documento foi atualizado com sucesso e está pronto para visualização."
					: "Seu documento foi gerado com sucesso e está pronto para ser visualizado."}
				onOpenPreview={() => {
					if (preview?.edit_url) {
						window.open(preview.edit_url, '_blank');
					}
				}}
			/>
		</div>
	);
};