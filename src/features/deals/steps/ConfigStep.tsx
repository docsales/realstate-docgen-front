import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DayPicker } from 'react-day-picker';
import type { DealConfig, Person } from '@/types/types';
import type { DocumentTemplate } from '@/types/settings.types';
import {
	FileText,
	Wallet,
	Users2,
	Landmark,
	PiggyBank,
	Banknote,
	AlertCircle,
	Settings,
	Calendar,
} from 'lucide-react';
import { PersonList } from '../components/PersonList';
import { PropertyForm } from '../components/PropertyForm';
import { settingsService } from '@/services/settings.service';
import { Button } from '@/components/Button';
import 'react-day-picker/dist/style.css';

interface ConfigStepProps {
	data: DealConfig;
	onChange: (d: Partial<DealConfig>) => void;
}

// Utility Component for Toggle Cards
const ToggleCard: React.FC<{
	icon: React.ReactNode;
	title: string;
	checked: boolean;
	onChange: (c: boolean) => void;
}> = ({ icon, title, checked, onChange }) => (
	<div
		onClick={() => onChange(!checked)}
		className={`
      cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-3 text-center
      ${checked
				? 'border-primary bg-blue-50 text-primary shadow-sm'
				: 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
			}
    `}
	>
		<div className={`p-2 rounded-full ${checked ? 'bg-white' : 'bg-slate-100'}`}>
			{icon}
		</div>
		<span className="font-semibold text-sm">{title}</span>
		<div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${checked ? 'border-primary bg-primary' : 'border-slate-300'}`}>
			{checked && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
		</div>
	</div>
);

export const ConfigStep: React.FC<ConfigStepProps> = ({ data, onChange }) => {
	const navigate = useNavigate();
	const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		loadData();
	}, []);

	const loadData = async () => {
		setIsLoading(true);
		setError(null);
		try {
			const [templatesData, settingsData] = await Promise.all([
				settingsService.getDocumentTemplates(),
				settingsService.getUserSettings(),
			]);

			setTemplates(templatesData);

			if (templatesData.length === 0) {
				setError('TEMPLATES_MISSING');
			} else if (!settingsData.docsalesUserEmail) {
				setError('EMAIL_MISSING');
			} else {
				setError(null);
			}
		} catch (err) {
			console.error('Erro ao carregar dados:', err);
			setError('LOAD_ERROR');
		} finally {
			setIsLoading(false);
		}
	};

	const handleSellersChange = (sellers: Person[]) => {
		onChange({ sellers });
	};

	const handleBuyersChange = (buyers: Person[]) => {
		onChange({ buyers });
	};

	const handleNavigateToSettings = () => {
		navigate('/settings');
	};

	const formatDateForInput = (dateString?: string | null): Date | undefined => {
		if (!dateString || dateString.trim() === '') return undefined;
		// Verificar se está no formato YYYY-MM-DD
		if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
			const [year, month, day] = dateString.split('-').map(Number);
			const date = new Date(year, month - 1, day);
			// Validar se a data é válida
			if (isNaN(date.getTime())) return undefined;
			return date;
		}
		// Tentar converter de outros formatos
		const date = new Date(dateString);
		if (isNaN(date.getTime())) return undefined;
		return date;
	};

	const formatDateForBackend = (date: Date | undefined): string | undefined => {
		if (!date) return undefined;
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	};

	const formatDateForDisplay = (date: Date | undefined): string => {
		if (!date) return 'Selecione uma data';
		return date.toLocaleDateString('pt-BR');
	};

	// Componente DatePicker com React Day Picker
	const DatePickerField: React.FC<{
		label: string;
		value: Date | undefined;
		onChange: (date: Date | undefined) => void;
		description?: string;
	}> = ({ label, value, onChange, description }) => {
		const [isOpen, setIsOpen] = useState(false);
		const containerRef = React.useRef<HTMLDivElement>(null);

		useEffect(() => {
			const handleClickOutside = (event: MouseEvent) => {
				if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
					setIsOpen(false);
				}
			};

			if (isOpen) {
				document.addEventListener('mousedown', handleClickOutside);
			}

			return () => {
				document.removeEventListener('mousedown', handleClickOutside);
			};
		}, [isOpen]);

		return (
			<div ref={containerRef} className="relative">
				<label className="text-slate-700 font-medium">{label}</label>
				<button
					type="button"
					onClick={() => setIsOpen(!isOpen)}
					className="input input-bordered w-full flex items-center justify-between text-left"
				>
					<span className={value ? 'text-slate-800' : 'text-slate-400'}>
						{formatDateForDisplay(value)}
					</span>
					<Calendar className="w-4 h-4 text-slate-400" />
				</button>
				{isOpen && (
					<div className="absolute top-full left-0 mt-2 bg-white rounded-box shadow-lg border border-slate-200 p-4 z-50">
						<DayPicker
							className="react-day-picker bg-white border-none"
							mode="single"
							classNames={{
								weekdays: 'bg-white',
								weekday: 'text-slate-600',
								day: 'text-slate-800 hover:bg-slate-100',
								day_selected: 'bg-primary text-white hover:bg-primary',
								day_today: 'font-bold',
							}}
							selected={value}
							onSelect={(date) => {
								onChange(date);
								setIsOpen(false);
							}}							
						/>
					</div>
				)}
				{description && (
					<p className="text-xs text-slate-500 mt-1">{description}</p>
				)}
			</div>
		);
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<span className="loading loading-spinner loading-lg w-12 h-12 text-[#ef0474] mx-auto mb-4"></span>
					<p className="text-slate-600">Carregando configurações...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-8 animate-in fade-in duration-500">
			{/* Error Messages */}
			{error === 'TEMPLATES_MISSING' && (
				<div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
					<div className="flex items-start gap-3">
						<AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
						<div className="flex-1">
							<h3 className="font-bold text-amber-900 mb-1">Nenhum template configurado</h3>
							<p className="text-sm text-amber-800 mb-3">
								É necessário ter pelo menos um template de documento configurado para criar um contrato.
							</p>
							<Button
								onClick={handleNavigateToSettings}
								className="btn-sm"
								variant="secondary"
							>
								<Settings className="w-4 h-4 mr-2" />
								Ir para Configurações
							</Button>
						</div>
					</div>
				</div>
			)}

			{error === 'EMAIL_MISSING' && (
				<div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
					<div className="flex items-start gap-3">
						<AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
						<div className="flex-1">
							<h3 className="font-bold text-amber-900 mb-1">Email do Docsales não configurado</h3>
							<p className="text-sm text-amber-800 mb-3">
								É necessário configurar o email do Docsales para criar contratos.
							</p>
							<Button
								onClick={handleNavigateToSettings}
								className="btn-sm"
								variant="secondary"
							>
								<Settings className="w-4 h-4 mr-2" />
								Ir para Configurações
							</Button>
						</div>
					</div>
				</div>
			)}

			{error === 'LOAD_ERROR' && (
				<div className="bg-red-50 border border-red-200 rounded-xl p-4">
					<div className="flex items-start gap-3">
						<AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
						<div className="flex-1">
							<h3 className="font-bold text-red-900 mb-1">Erro ao carregar configurações</h3>
							<p className="text-sm text-red-800 mb-3">
								Não foi possível carregar os dados necessários. Tente novamente.
							</p>
							<Button
								onClick={loadData}
								className="btn-sm"
								variant="secondary"
							>
								Tentar Novamente
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* 1. Basic Info Card */}
			<section className="bg-white rounded-2xl shadow-sm border border-slate-200">
				<div className="bg-slate-50/50 p-4 border-b border-slate-100 flex items-center gap-2">
					<FileText className="w-5 h-5 text-secondary" />
					<h3 className="font-bold text-slate-800">Dados do Contrato</h3>
				</div>
				<div className="p-6 space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="md:col-span-2">
							<label className="text-slate-700 font-medium">Nome do Contrato (Identificação)</label>
							<input
								type="text"
								className="input input-bordered w-full"
								placeholder="Ex: Compra e Venda - Apto 32B Ed. Horizon"
								value={data.name}
								maxLength={80}
								onChange={(e) => {
									onChange({ name: e.target.value as string } as any);
								}}
							/>
						</div>
						<div>
							<label className="text-slate-700 font-medium">Modelo de Minuta</label>
							<select
								className="select select-bordered w-full"
								value={data.docTemplateId}
								onChange={(e) => {
									onChange({ docTemplateId: e.target.value as string } as any);
								}}
								disabled={templates.length === 0}
							>
								{templates.length === 0 ? (
									<option value="">Nenhum template disponível</option>
								) : (
									<>
										<option value="">Selecione um template</option>
										{templates
											.filter(t => t.isActive)
											.sort((a, b) => a.order - b.order)
											.map((template) => (
												<option key={template.id} value={template.templateId}>
													{template.label}
												</option>
											))}
									</>
								)}
							</select>
							{templates.length === 0 && (
								<p className="text-xs text-amber-600 mt-1">
									Configure templates nas configurações
								</p>
							)}
						</div>
					</div>
					
					{/* Date Fields */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<DatePickerField
							label="Data de Expiração"
							value={formatDateForInput(data.expiration_date)}
							onChange={(date) => {
								onChange({ expiration_date: formatDateForBackend(date) } as any);
							}}
							description="Data limite para assinatura do contrato"
						/>
						<DatePickerField
							label="Data de Término do Contrato"
							value={formatDateForInput(data.contract_end)}
							onChange={(date) => {
								onChange({ contract_end: formatDateForBackend(date) } as any);
							}}
							description="Data de término da vigência do contrato"
						/>
					</div>
				</div>
			</section>

			{/* 2. Commercial Conditions */}
			<section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
				<div className="bg-slate-50/50 p-4 border-b border-slate-100 flex items-center gap-2">
					<Wallet className="w-5 h-5 text-primary" />
					<h3 className="font-bold text-slate-800">Condições de Pagamento</h3>
				</div>
				<div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
					<ToggleCard
						icon={<PiggyBank className="w-6 h-6" />}
						title="Utilizar FGTS"
						checked={data.useFgts}
						onChange={(c) => {
							onChange({ useFgts: c } as any);
						}}
					/>
					<ToggleCard
						icon={<Landmark className="w-6 h-6" />}
						title="Financiamento Bancário"
						checked={data.bankFinancing}
						onChange={(c) => {
							onChange({ bankFinancing: c } as any);
						}}
					/>
					<ToggleCard
						icon={<Banknote className="w-6 h-6" />}
						title="Carta de Consórcio"
						checked={data.consortiumLetter}
						onChange={(c) => {
							onChange({ consortiumLetter: c } as any);
						}}
					/>
				</div>
			</section>

			{/* 3. Parties Involved with Tabs */}
			<section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
				<div className="bg-slate-50/50 p-4 border-b border-slate-100 flex items-center gap-2">
					<Users2 className="w-5 h-5 text-primary" />
					<h3 className="font-bold text-slate-800">Partes & Imóvel</h3>
				</div>

				{/* Tabs Navigation */}
				<div className="border-b border-slate-200 bg-slate-50/30">
					<div className="flex">
						<button
							type="button"
							onClick={() => onChange({ activePartyTab: 'sellers' } as any)}
							className={`flex-1 px-6 py-3 font-medium text-sm transition-all ${(!data.activePartyTab || data.activePartyTab === 'sellers')
								? 'text-primary border-b-2 border-primary bg-white'
								: 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
								}`}
						>
							Vendedores
						</button>
						<button
							type="button"
							onClick={() => onChange({ activePartyTab: 'buyers' } as any)}
							className={`flex-1 px-6 py-3 font-medium text-sm transition-all ${data.activePartyTab === 'buyers'
								? 'text-primary border-b-2 border-primary bg-white'
								: 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
								}`}
						>
							Compradores
						</button>
						<button
							type="button"
							onClick={() => onChange({ activePartyTab: 'property' } as any)}
							className={`flex-1 px-6 py-3 font-medium text-sm transition-all ${data.activePartyTab === 'property'
								? 'text-primary border-b-2 border-primary bg-white'
								: 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
								}`}
						>
							Imóvel
						</button>
					</div>
				</div>

				{/* Tab Content */}
				<div className="p-6">
					{/* Vendedores Tab */}
					{(!data.activePartyTab || data.activePartyTab === 'sellers') && (
						<div>
							<PersonList
								title="Vendedores"
								people={data.sellers || []}
								onChange={(s) => {
									handleSellersChange(s);
								}}
							/>
						</div>
					)}

					{/* Compradores Tab */}
					{data.activePartyTab === 'buyers' && (
						<div>
							<PersonList
								title="Compradores"
								people={data.buyers || []}
								onChange={(b) => {
									handleBuyersChange(b);
								}}
							/>
						</div>
					)}

					{/* Imóvel Tab */}
					{data.activePartyTab === 'property' && (
						<div>
							<PropertyForm
								propertyState={data.propertyState}
								propertyType={data.propertyType}
								deedCount={data.deedCount}
								onPropertyStateChange={(s) => {
									onChange({ propertyState: s } as any);
								}}
								onPropertyTypeChange={(t) => {
									onChange({ propertyType: t } as any);
								}}
								onDeedCountChange={(c) => {
									onChange({ deedCount: c } as any);
								}}
							/>
						</div>
					)}
				</div>
			</section>

		</div>
	);
};
