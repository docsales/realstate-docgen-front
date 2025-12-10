import React from 'react';
import { Trash2, User, Building2 } from 'lucide-react';
import type { Person, PersonType, MaritalState, PropertyRegime } from '@/types/types';

interface PersonFormProps {
  person: Person;
  index: number;
  canRemove: boolean;
  showSpouseOption: boolean;
  onChange: (person: Person) => void;
  onRemove: () => void;
}

const PERSON_TYPE_OPTIONS: { value: PersonType; label: string }[] = [
  { value: 'PF', label: 'Pessoa Física' },
  { value: 'PJ', label: 'Pessoa Jurídica' },
];

const MARITAL_STATE_OPTIONS: { value: MaritalState; label: string }[] = [
  { value: 'solteiro', label: 'Solteiro(a)' },
  { value: 'casado', label: 'Casado(a)' },
  { value: 'viuvo', label: 'Viúvo(a)' },
  { value: 'divorciado', label: 'Divorciado(a)' },
  { value: 'uniao_estavel', label: 'União Estável' },
];

const PROPERTY_REGIME_OPTIONS: { value: PropertyRegime; label: string }[] = [
  { value: 'comunhao_universal', label: 'Comunhão Universal de Bens' },
  { value: 'comunhao_parcial', label: 'Comunhão Parcial de Bens' },
  { value: 'separacao_total', label: 'Separação Total de Bens' },
  { value: 'participacao_final', label: 'Participação Final nos Aquestos' },
];

// Regimes that require the pacto antenupcial document
const REGIMES_REQUIRING_PACTO: PropertyRegime[] = ['separacao_total', 'participacao_final'];

export const PersonForm: React.FC<PersonFormProps> = ({
  person,
  index,
  canRemove,
  showSpouseOption,
  onChange,
  onRemove,
}) => {
  const isPF = person.personType === 'PF';
  const isCasado = person.maritalState === 'casado';
  const isUniaoEstavel = person.maritalState === 'uniao_estavel';
  const showPropertyRegime = isPF && (isCasado || isUniaoEstavel);
  const requiresPacto = showPropertyRegime && person.propertyRegime && REGIMES_REQUIRING_PACTO.includes(person.propertyRegime);

  const handleChange = (field: keyof Person, value: any) => {
    const updated = { ...person, [field]: value };

    // Reset dependent fields when personType changes
    if (field === 'personType' && value === 'PJ') {
      updated.maritalState = undefined;
      updated.propertyRegime = undefined;
      updated.isSpouse = false;
    }

    // Reset propertyRegime when maritalState is not casado/uniao_estavel
    if (field === 'maritalState' && value !== 'casado' && value !== 'uniao_estavel') {
      updated.propertyRegime = undefined;
    }

    onChange(updated);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${
              isPF 
                ? 'bg-blue-50 text-primary border border-primary/20' 
                : 'bg-purple-50 text-purple-600 border border-purple-200'
            }`}>
              {isPF ? <User className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
              <span>Pessoa {index + 1}</span>
            </div>
            {person.isSpouse && (
              <div className="px-2 py-1 rounded text-xs font-medium bg-accent/10 text-accent border border-accent/20">
                Cônjuge
              </div>
            )}
          </div>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Person Type */}
          <div className="form-control w-full">
            <label className="label">
              <span className="text-slate-700 font-medium">Tipo de Pessoa</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={person.personType}
              onChange={(e) => handleChange('personType', e.target.value as PersonType)}
            >
              {PERSON_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Marital State - Only for PF */}
          {isPF && (
            <div className="form-control w-full">
              <label className="label">
                <span className="text-slate-700 font-medium">Estado Civil</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={person.maritalState || 'solteiro'}
                onChange={(e) => handleChange('maritalState', e.target.value as MaritalState)}
              >
                {MARITAL_STATE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Property Regime - Only for casado/uniao_estavel */}
          {showPropertyRegime && (
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Regime de Bens</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={person.propertyRegime || 'comunhao_parcial'}
                onChange={(e) => handleChange('propertyRegime', e.target.value as PropertyRegime)}
              >
                {PROPERTY_REGIME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Is Spouse Checkbox */}
          {showSpouseOption && isPF && (
            <div className="flex items-end">
              <label className="flex items-center space-x-2 cursor-pointer p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-primary rounded border-slate-300 focus:ring-primary"
                  checked={person.isSpouse || false}
                  onChange={(e) => handleChange('isSpouse', e.target.checked)}
                />
                <span className="text-sm font-medium text-slate-700">É cônjuge?</span>
              </label>
            </div>
          )}
        </div>

        {/* Info Alert for Pacto Antenupcial */}
        {requiresPacto && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span className="text-sm text-blue-700">Pacto Antenupcial será exigido para comprovar o regime de bens.</span>
          </div>
        )}
      </div>
    </div>
  );
};

