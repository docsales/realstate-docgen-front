
import React, { useState } from 'react';
import { ChevronRight, FileCheck, FileText, GripVertical, LogOut } from 'lucide-react';
import type { 
  DealConfig, 
  MappingValue, 
  OcrDataByPerson, 
  ContractFieldSection
} from '../../../types/types';

interface MappingStepProps {
  mappings: Record<string, MappingValue>;
  onMap: (fieldId: string, value: string, source: 'drag' | 'manual') => void;
  dealConfig: DealConfig;
  ocrData?: OcrDataByPerson[];
}

// Generate contract fields dynamically based on DealConfig
const generateContractFields = (dealConfig: DealConfig): ContractFieldSection[] => {
  const sections: ContractFieldSection[] = [];

  // Generate fields for each seller
  dealConfig.sellers.forEach((seller, index) => {
    sections.push({
      section: `Vendedor ${index + 1}`,
      personId: seller.id,
      fields: [
        { id: `seller_${index + 1}_name`, label: 'Nome Completo' },
        { id: `seller_${index + 1}_cpf_cnpj`, label: 'CPF/CNPJ' },
        { id: `seller_${index + 1}_rg`, label: 'RG' },
        { id: `seller_${index + 1}_address`, label: 'Endereço Completo' },
        { id: `seller_${index + 1}_city`, label: 'Cidade' },
        { id: `seller_${index + 1}_state`, label: 'Estado' },
        { id: `seller_${index + 1}_zip`, label: 'CEP' },
      ]
    });
  });

  // Generate fields for each buyer
  dealConfig.buyers.forEach((buyer, index) => {
    sections.push({
      section: `Comprador ${index + 1}`,
      personId: buyer.id,
      fields: [
        { id: `buyer_${index + 1}_name`, label: 'Nome Completo' },
        { id: `buyer_${index + 1}_cpf_cnpj`, label: 'CPF/CNPJ' },
        { id: `buyer_${index + 1}_rg`, label: 'RG' },
        { id: `buyer_${index + 1}_address`, label: 'Endereço Completo' },
        { id: `buyer_${index + 1}_city`, label: 'Cidade' },
        { id: `buyer_${index + 1}_state`, label: 'Estado' },
        { id: `buyer_${index + 1}_zip`, label: 'CEP' },
      ]
    });
  });

  // Add property section
  sections.push({
    section: 'Imóvel',
    fields: [
      { id: 'property_address', label: 'Endereço do Imóvel' },
      { id: 'property_city', label: 'Cidade' },
      { id: 'property_state', label: 'Estado' },
      { id: 'property_zip', label: 'CEP' },
      { id: 'property_type', label: 'Tipo de Imóvel' },
      { id: 'property_registration', label: 'Matrícula' },
    ]
  });

  return sections;
};

export const MappingStep: React.FC<MappingStepProps> = ({ 
  mappings, 
  onMap, 
  dealConfig,
  ocrData 
}) => {
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);

  const displayOcrData = ocrData || [];
  const contractFieldSections = generateContractFields(dealConfig);

  // Recursive function to render JSON tree
  const renderJsonTree = (data: any, prefix = '') => {
    return Object.entries(data).map(([key, value]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return (
          <div key={fullKey} className="ml-2 mb-2">
            <details open className="group">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700 hover:text-primary list-none flex items-center gap-1">
                <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
                {key.toUpperCase().replace(/_/g, ' ')}
              </summary>
              <div className="pl-2 border-l-2 border-slate-200 mt-2">
                {renderJsonTree(value, fullKey)}
              </div>
            </details>
          </div>
        )
      }

      // Skip arrays for now (could be enhanced later)
      if (Array.isArray(value)) {
        return null;
      }

      return (
        <div
          key={fullKey}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', String(value));
            e.dataTransfer.effectAllowed = 'copy';
          }}
          className="ml-6 mb-2 flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded cursor-grab active:cursor-grabbing hover:bg-white hover:shadow-md transition-all"
        >
          <GripVertical className="w-4 h-4 text-slate-400" />
          <div className="flex flex-col pointer-events-none">
            <span className="text-[10px] uppercase text-slate-400 font-bold">{key}</span>
            <span className="text-sm text-slate-800 font-medium truncate max-w-[180px]" title={String(value)}>{String(value)}</span>
          </div>
        </div>
      );
    })
  }

  // Render OCR data grouped by person
  const renderOcrSections = () => {
    const sections: React.ReactElement[] = [];

    // Render sellers
    dealConfig.sellers.forEach((seller, index) => {
      const ocrForPerson = displayOcrData.find(ocr => ocr.personId === seller.id);
      
      sections.push(
        <div key={`seller-${seller.id}`} className="mb-4">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-3 py-2 rounded-lg sticky top-0 z-10 mb-2">
            <h4 className="font-bold text-blue-900 text-sm">
              Vendedor {index + 1}
            </h4>
          </div>
          {ocrForPerson ? (
            <div className="pl-2">
              {renderJsonTree(ocrForPerson.data)}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic pl-2">Nenhum dado extraído</p>
          )}
        </div>
      );
    });

    // Render buyers
    dealConfig.buyers.forEach((buyer, index) => {
      const ocrForPerson = displayOcrData.find(ocr => ocr.personId === buyer.id);
      
      sections.push(
        <div key={`buyer-${buyer.id}`} className="mb-4">
          <div className="bg-gradient-to-r from-green-50 to-green-100 px-3 py-2 rounded-lg sticky top-0 z-10 mb-2">
            <h4 className="font-bold text-green-900 text-sm">
              Comprador {index + 1}
            </h4>
          </div>
          {ocrForPerson ? (
            <div className="pl-2">
              {renderJsonTree(ocrForPerson.data)}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic pl-2">Nenhum dado extraído</p>
          )}
        </div>
      );
    });

    // Render property section
    const propertyOcr = displayOcrData.find(ocr => ocr.personId === 'property');
    sections.push(
      <div key="property" className="mb-4">
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-3 py-2 rounded-lg sticky top-0 z-10 mb-2">
          <h4 className="font-bold text-purple-900 text-sm">
            Imóvel
          </h4>
        </div>
        {propertyOcr ? (
          <div className="pl-2">
            {renderJsonTree(propertyOcr.data)}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic pl-2">Nenhum dado extraído</p>
        )}
      </div>
    );

    return sections;
  };

  // Render contract field with editable input
  const renderContractField = (fieldId: string, label: string) => {
    const mapping = mappings[fieldId];
    const isActive = activeDropZone === fieldId;

    return (
      <div
        key={fieldId}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          if (activeDropZone !== fieldId) setActiveDropZone(fieldId);
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setActiveDropZone(fieldId);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setActiveDropZone(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setActiveDropZone(null);
          const val = e.dataTransfer.getData('text/plain');
          if (val) onMap(fieldId, val, 'drag');
        }}
        className={`
          p-3 rounded-lg border-2 transition-all duration-200 relative
          ${mapping
            ? mapping.source === 'drag'
              ? 'bg-blue-50/50 border-blue-500 border-solid'
              : 'bg-amber-50/50 border-amber-500 border-solid'
            : isActive
              ? 'bg-blue-50 border-blue-400 border-dotted scale-[1.02] shadow-sm ring-2 ring-blue-100 z-10'
              : 'border-slate-300 border-dashed bg-transparent'
          }
        `}
      >
        <span className="text-xs font-bold text-slate-500 uppercase mb-1 block pointer-events-none">
          {label}
        </span>

        {mapping ? (
          <div className="flex items-center justify-between gap-2">
            <input
              type="text"
              value={mapping.value}
              onChange={(e) => onMap(fieldId, e.target.value, 'manual')}
              className={`
                flex-1 px-2 py-1 rounded border text-sm font-medium
                focus:outline-none focus:ring-2 focus:ring-offset-1
                ${mapping.source === 'drag'
                  ? 'border-blue-200 bg-white text-blue-900 focus:ring-blue-400'
                  : 'border-amber-200 bg-white text-amber-900 focus:ring-amber-400'
                }
              `}
              placeholder="Digite ou arraste um valor..."
            />
            <button 
              onClick={() => onMap(fieldId, '', 'manual')} 
              className="text-red-400 hover:text-red-600 p-1 z-20 relative flex-shrink-0"
              title="Remover mapeamento"
            >
              <LogOut className="w-4 h-4 rotate-180" />
            </button>
          </div>
        ) : (
          <div className={`h-8 flex items-center text-sm italic transition-colors pointer-events-none ${isActive ? 'text-primary font-medium' : 'text-slate-400'}`}>
            {isActive ? 'Soltar para mapear!' : 'Arraste um dado aqui...'}
          </div>
        )}

        {isActive && <div className="absolute inset-0 bg-blue-400/5 pointer-events-none rounded-lg" />}
      </div>
    );
  };

  return (
    <div className="h-[600px] flex flex-col md:flex-row gap-6 animate-in fade-in duration-500">
      {/* Left: OCR Source */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" />
            Dados Extraídos (OCR)
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
          {renderOcrSections()}
        </div>
      </div>

      {/* Right: Contract Target */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-primary" />
            Campos do Contrato
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
          {contractFieldSections.map((section) => (
            <div key={section.section} className="space-y-2">
              <div className="bg-gradient-to-r from-slate-100 to-slate-50 px-3 py-2 rounded-lg sticky top-0 z-10">
                <h4 className="font-bold text-slate-800 text-sm">
                  {section.section}
                </h4>
              </div>
              <div className="space-y-3 pl-1">
                {section.fields.map(field => renderContractField(field.id, field.label))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
