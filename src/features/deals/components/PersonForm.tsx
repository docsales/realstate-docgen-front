import React from 'react';
import { Trash2, User, Building2, Heart } from 'lucide-react';
import type { Person, PersonType, MaritalState, PropertyRegime } from '@/types/types';
import { generateCoupleId, getSpouse } from '@/types/types';
import { Button } from '@/components/Button';

interface PersonFormProps {
  person: Person;
  index: number;
  canRemove: boolean;
  showSpouseOption: boolean;
  onChange: (person: Person) => void;
  onRemove: () => void;
  allPeople?: Person[]; // Para permitir seleção de titular quando é cônjuge
  role?: 'buyers' | 'sellers'; // Contexto para melhorar labels
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
  allPeople = [],
  role,
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
      updated.coupleId = undefined;
    }

    // Set default propertyRegime when maritalState becomes casado/uniao_estavel
    if (field === 'maritalState' && (value === 'casado' || value === 'uniao_estavel')) {
      if (!updated.propertyRegime) {
        updated.propertyRegime = 'comunhao_parcial'; // Define o valor padrão
      }
    }

    // Reset propertyRegime when maritalState is not casado/uniao_estavel
    if (field === 'maritalState' && value !== 'casado' && value !== 'uniao_estavel') {
      updated.propertyRegime = undefined;
    }

    // Gerenciar coupleId quando isSpouse muda
    if (field === 'isSpouse') {
      if (value === true) {
        // Se marcou como cônjuge, precisa de um coupleId
        // Se não tem coupleId, será gerado no PersonList
        if (!updated.coupleId) {
          // Tentar encontrar um titular disponível para vincular
          const availableTitular = allPeople.find((p, idx) => 
            idx !== index &&
            !p.isSpouse &&
            (p.maritalState === 'casado' || p.maritalState === 'uniao_estavel') &&
            !p.coupleId
          );
          if (availableTitular) {
            updated.coupleId = availableTitular.coupleId || generateCoupleId();
          } else {
            updated.coupleId = generateCoupleId();
          }
        }
      } else {
        // Se desmarcou como cônjuge, limpar coupleId
        updated.coupleId = undefined;
      }
    }

    onChange(updated);
  };

  // Obter o cônjuge se existir
  const spouse = person.coupleId ? getSpouse(person, allPeople) : undefined;
  
  // Obter titulares disponíveis para seleção (quando é cônjuge)
  const availableTitulars = allPeople.filter((p, idx) => 
    idx !== index &&
    !p.isSpouse &&
    (p.maritalState === 'casado' || p.maritalState === 'uniao_estavel')
  );

  const handleTitularChange = (titularId: string) => {
    const selectedTitular = allPeople.find(p => p.id === titularId);
    if (selectedTitular) {
      const coupleId = selectedTitular.coupleId || generateCoupleId();
      // Atualizar o titular também se não tiver coupleId
      if (!selectedTitular.coupleId) {
        onChange({ ...person, coupleId: coupleId });
        // Nota: A atualização do titular será feita no PersonList
      } else {
        onChange({ ...person, coupleId: selectedTitular.coupleId });
      }
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1 ${
              isPF 
                ? 'bg-blue-50 text-primary border border-primary/20' 
                : 'bg-purple-50 text-purple-600 border border-purple-200'
            }`}>
              {isPF ? <User className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
              <span>
                {role === 'buyers' ? 'Comprador' : role === 'sellers' ? 'Vendedor' : 'Pessoa'} {index + 1}
              </span>
            </div>
            {person.isSpouse && (
              <div className="px-2 py-1 rounded text-xs font-medium bg-accent/10 text-accent border border-accent/20 flex items-center gap-1">
                <Heart className="w-3 h-3" />
                Cônjuge
              </div>
            )}
            {person.coupleId && spouse && (
              <div className="px-2 py-1 rounded text-xs font-medium bg-pink-50 text-pink-700 border border-pink-200 flex items-center gap-1">
                <Heart className="w-3 h-3" />
                Casal
              </div>
            )}
          </div>
          {canRemove && (
            <Button
              variant="link"
              size="sm"
              onClick={onRemove}
              icon={<Trash2 className="w-4 h-4" />}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
            />
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
                className="select select-bordered w-full bg-white"
                value={person.propertyRegime || 'comunhao_parcial'}
                onChange={(e) => {
                  const value = e.target.value as PropertyRegime;
                  handleChange('propertyRegime', value);
                }}
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

          {/* Seletor de Titular (quando é cônjuge) */}
          {person.isSpouse && availableTitulars.length > 0 && (
            <div className="form-control w-full md:col-span-2 lg:col-span-4">
              <label className="label">
                <span className="text-slate-700 font-medium">Vincular a Titular</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={spouse?.id || ''}
                onChange={(e) => handleTitularChange(e.target.value)}
              >
                <option value="">Selecione um titular...</option>
                {availableTitulars.map((titular, idx) => (
                  <option key={titular.id} value={titular.id}>
                    {role === 'buyers' ? 'Comprador' : role === 'sellers' ? 'Vendedor' : 'Titular'} {idx + 1}
                    {titular.maritalState && ` (${titular.maritalState.replace('_', ' ')})`}
                  </option>
                ))}
              </select>
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

