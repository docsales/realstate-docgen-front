import React from 'react';
import { Home, TreePine, Minus, Plus, ScrollText } from 'lucide-react';
import type { PropertyState, PropertyType } from '@/types/types';
import { Button } from '@/components/Button';

interface PropertyFormProps {
  propertyState: PropertyState;
  propertyType: PropertyType;
  deedCount: number;
  onPropertyStateChange: (state: PropertyState) => void;
  onPropertyTypeChange: (type: PropertyType) => void;
  onDeedCountChange: (count: number) => void;
}

const PROPERTY_STATE_OPTIONS: { value: PropertyState; label: string; description?: string }[] = [
  { value: 'quitado', label: 'Quitado', description: 'Imóvel sem pendências financeiras' },
  { value: 'financiado', label: 'Financiado', description: 'Imóvel com financiamento ativo' },
  { value: 'herdado', label: 'Herdado', description: 'Imóvel recebido por herança' },
  { value: 'doado', label: 'Doado', description: 'Imóvel recebido por doação' },
  { value: 'em_construcao', label: 'Em Construção', description: 'Imóvel em fase de construção' },
  { value: 'com_usufruto', label: 'Com Usufruto', description: 'Imóvel com direito de usufruto' },
];

const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string; icon: React.ReactNode }[] = [
  { value: 'urbano', label: 'Urbano', icon: <Home className="w-5 h-5" /> },
  { value: 'rural', label: 'Rural', icon: <TreePine className="w-5 h-5" /> },
];

// States that require additional documents
const STATES_WITH_ALERTS: Record<PropertyState, string | null> = {
  quitado: null,
  financiado: 'Será necessária a Carta de Quitação ou Anuência Bancária do credor.',
  herdado: 'Será necessário o Formal de Partilha do inventário e averbação na matrícula.',
  doado: 'Será necessária a Escritura de Doação e verificação de cláusulas restritivas.',
  em_construcao: 'Verificar averbação de construção e habite-se.',
  com_usufruto: 'Será necessária a anuência do usufrutuário para a venda.',
};

export const PropertyForm: React.FC<PropertyFormProps> = ({
  propertyState,
  propertyType,
  deedCount,
  onPropertyStateChange,
  onPropertyTypeChange,
  onDeedCountChange,
}) => {
  const alertMessage = STATES_WITH_ALERTS[propertyState];
  const deedCountClamped = Math.min(Math.max(deedCount || 1, 1), 5);

  return (
    <div className="space-y-6">
      {/* Property Type Toggle */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4">
          <h4 className="font-semibold text-slate-800 mb-3">Tipo do Imóvel</h4>
          <div className="flex gap-2">
            {PROPERTY_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onPropertyTypeChange(opt.value)}
                className={`flex-1 gap-2 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center ${propertyType === opt.value
                  ? 'bg-primary text-white border-2 border-primary'
                  : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>

          {propertyType === 'rural' && (
            <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm text-yellow-700">Imóvel rural requer CCIR, ITR e CAR atualizados.</span>
            </div>
          )}
        </div>
      </div>

      {/* Property State */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4">
          <label className="text-slate-700 font-medium mb-2 block">Situação do Imóvel</label>
          <select
            className="select select-bordered w-full"
            value={propertyState}
            onChange={(e) => onPropertyStateChange(e.target.value as PropertyState)}
          >
            {PROPERTY_STATE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {alertMessage && (
            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span className="text-sm text-blue-700">{alertMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Deed Count */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-primary" />
              <h4 className="font-semibold text-slate-800">Número de Matrículas</h4>
            </div>
            <div className="flex items-center gap-0 border border-slate-200 rounded-lg overflow-hidden">
              <Button
                variant="link"
                size="sm"
                icon={<Minus className="w-4 h-4" />}
                className="w-10 h-10 bg-white border-r border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onClick={() => onDeedCountChange(Math.max(1, deedCountClamped - 1))}
                disabled={deedCountClamped <= 1}
              />
              <div className="w-12 h-10 bg-white flex items-center justify-center font-bold text-lg text-slate-800 border-l border-r border-slate-200">
                {deedCountClamped}
              </div>
              <Button
                variant="link"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                className="w-10 h-10 bg-white flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-colors"
                onClick={() => onDeedCountChange(Math.min(5, deedCountClamped + 1))}
                disabled={deedCountClamped >= 5}
              />
            </div>
          </div>
          {deedCountClamped > 1 && (
            <p className="text-sm text-slate-500 mt-2">
              Serão necessárias {deedCountClamped} certidões de matrícula atualizadas.
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">Máximo: 5 matrículas.</p>
        </div>
      </div>
    </div>
  );
};
