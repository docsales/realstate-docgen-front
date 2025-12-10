import React from 'react';
import type { DealConfig, Person } from '@/types/types';
import {
	FileText,
	Wallet,
	Users2,
	Landmark,
	PiggyBank,
	Banknote,
} from 'lucide-react';
import { PersonList } from '../components/PersonList';
import { PropertyForm } from '../components/PropertyForm';

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
	const handleSellersChange = (sellers: Person[]) => {
		onChange({ sellers });
	};

	const handleBuyersChange = (buyers: Person[]) => {
		onChange({ buyers });
	};

	return (
		<div className="space-y-8 animate-in fade-in duration-500">

			{/* 1. Basic Info Card */}
			<section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
				<div className="bg-slate-50/50 p-4 border-b border-slate-100 flex items-center gap-2">
					<FileText className="w-5 h-5 text-secondary" />
					<h3 className="font-bold text-slate-800">Dados do Contrato</h3>
				</div>
				<div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
					<div className="md:col-span-2">
						<label className="text-slate-700 font-medium">Nome do Contrato (Identificação)</label>
						<input
							type="text"
							className="input input-bordered w-full"
							placeholder="Ex: Compra e Venda - Apto 32B Ed. Horizon"
							value={data.name}
							maxLength={80}
							onChange={(e) => onChange({ name: e.target.value as string })}
						/>
					</div>
					<div>
						<label className="text-slate-700 font-medium">Modelo de Minuta</label>
						<select
							className="select select-bordered w-full"
							value={data.contractModel}
							onChange={(e) => onChange({ contractModel: e.target.value })}
						>
							<option value="venda_compra_padrao">Compra e Venda Padrão</option>
							<option value="locacao_residencial">Locação Residencial</option>
							<option value="locacao_comercial">Locação Comercial</option>
							<option value="escritura_publica">Escritura Pública de Compra e Venda</option>
							<option value="doacao_imovel">Doação de Imóvel</option>
							<option value="inventario_extrajudicial">Inventário Extrajudicial</option>
						</select>
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
						onChange={(c) => onChange({ useFgts: c })}
					/>
					<ToggleCard
						icon={<Landmark className="w-6 h-6" />}
						title="Financiamento Bancário"
						checked={data.bankFinancing}
						onChange={(c) => onChange({ bankFinancing: c })}
					/>
					<ToggleCard
						icon={<Banknote className="w-6 h-6" />}
						title="Carta de Consórcio"
						checked={data.consortiumLetter}
						onChange={(c) => onChange({ consortiumLetter: c })}
					/>
				</div>
			</section>

			{/* 3. Parties Involved with Tabs */}
			<section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
				<div className="bg-slate-50/50 p-4 border-b border-slate-100 flex items-center gap-2">
					<Users2 className="w-5 h-5 text-slate-600" />
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
								onChange={handleSellersChange}
							/>
						</div>
					)}

					{/* Compradores Tab */}
					{data.activePartyTab === 'buyers' && (
						<div>
							<PersonList
								title="Compradores"
								people={data.buyers || []}
								onChange={handleBuyersChange}
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
								onPropertyStateChange={(s) => onChange({ propertyState: s })}
								onPropertyTypeChange={(t) => onChange({ propertyType: t })}
								onDeedCountChange={(c) => onChange({ deedCount: c })}
							/>
						</div>
					)}
				</div>
			</section>

		</div>
	);
};
