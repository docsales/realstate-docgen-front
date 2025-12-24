
import React, { useEffect, useState, useCallback } from 'react';
import { ChevronRight, FileCheck, FileText, GripVertical, AlertCircle, RefreshCw, Trash } from 'lucide-react';
import type {
  DealConfig,
  MappingValue,
  OcrDataByPerson,
} from '../../../types/types';
import { dealsService } from '../services/deals.service';
import { DocumentScanner } from '../components/DocumentScanner';

interface MappingStepProps {
  mappings: Record<string, MappingValue>;
  onMap: (fieldId: string, value: string, source: 'drag' | 'manual') => void;
  dealConfig: DealConfig;
  dealId: string;
  ocrData?: OcrDataByPerson[];
}

interface GroupedVariable {
  fullKey: string;
  fieldName: string;
  label: string;
}

interface VariableGroup {
  prefix: string;
  variables: GroupedVariable[];
}

// Função para formatar nome de campo para label legível
const formatFieldLabel = (fieldName: string): string => {
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Função para formatar nome do prefixo
const formatPrefixLabel = (prefix: string): string => {
  const prefixLabels: Record<string, string> = {
    customer: 'Cliente',
    deal: 'Negócio',
    property: 'Imóvel',
    seller: 'Vendedor',
    buyer: 'Comprador',
  };
  return prefixLabels[prefix] || prefix.charAt(0).toUpperCase() + prefix.slice(1);
};

export const MappingStep: React.FC<MappingStepProps> = ({
  mappings,
  onMap,
  dealConfig,
  dealId,
  ocrData
}) => {
  const [isLoadingVariables, setIsLoadingVariables] = useState(false);
  const [isRefreshingVariables, setIsRefreshingVariables] = useState(false);
  const [variablesError, setVariablesError] = useState<string | null>(null);
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const displayOcrData = ocrData || [];

  // Agrupar variáveis por prefixo
  const groupedVariables: VariableGroup[] = React.useMemo(() => {
    const groups: Record<string, GroupedVariable[]> = {};

    templateVariables.forEach((variable) => {
      const parts = variable.split('.');
      if (parts.length > 1) {
        const [prefix, ...rest] = parts;
        if (!groups[prefix]) {
          groups[prefix] = [];
        }
        const fieldName = rest.join('.');
        groups[prefix].push({
          fullKey: variable,
          fieldName,
          label: formatFieldLabel(fieldName),
        });
      }
    });

    return Object.entries(groups).map(([prefix, variables]) => ({
      prefix,
      variables,
    }));
  }, [templateVariables]);

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

  const renderOcrSections = () => {
    const sections: React.ReactElement[] = [];

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
              className="cursor-pointer text-red-400 hover:text-red-600 p-1 z-20 relative flex-shrink-0"
              title="Remover mapeamento"
            >
              <Trash className="w-4 h-4" />
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

  // Função para buscar variáveis do template
  const fetchDocVariables = useCallback(async (isRefresh = false) => {
    if (!dealId) return;

    if (isRefresh) {
      setIsRefreshingVariables(true);
    } else {
      setIsLoadingVariables(true);
    }
    setVariablesError(null);

    try {
      const response = await dealsService.getDocVariables(dealId);

      // O response pode vir como { variables: [...] } ou diretamente como [...]
      const variables = response?.variables || response || [];

      if (Array.isArray(variables)) {
        if (isRefresh) {
          // Em refresh, mesclar novas variáveis sem sobrescrever as existentes
          setTemplateVariables(prevVariables => {
            const existingSet = new Set(prevVariables);
            const newVariables = variables.filter(v => !existingSet.has(v));

            if (newVariables.length > 0) {
              console.log(`✨ ${newVariables.length} nova(s) variável(is) adicionada(s):`, newVariables);
              return [...prevVariables, ...newVariables];
            } else {
              console.log('ℹ️ Nenhuma nova variável encontrada');
              return prevVariables;
            }
          });
        } else {
          // Primeira carga: substituir tudo
          setTemplateVariables(variables);
          setHasLoadedOnce(true);
        }
      } else {
        console.error('Formato de variáveis inválido:', response);
        setVariablesError('Formato de resposta inválido do servidor');
      }
    } catch (error) {
      console.error('Erro ao obter variáveis do template do Google Docs:', error);
      setVariablesError('Erro ao buscar variáveis do template');
    } finally {
      setIsLoadingVariables(false);
      setIsRefreshingVariables(false);
    }
  }, [dealId]);

  // Buscar variáveis do template apenas uma vez ao montar
  useEffect(() => {
    if (dealId && !hasLoadedOnce) {
      fetchDocVariables(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId, hasLoadedOnce]); // Remover fetchDocVariables das dependências para evitar loop

  // Função para refresh manual
  const handleRefreshVariables = useCallback(() => {
    fetchDocVariables(true);
  }, [fetchDocVariables]);

  return (
    <div className="h-[600px] flex flex-col md:flex-row gap-6 animate-in fade-in duration-500">
      {/* Left: OCR Source */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <FileText className="w-5 h-5 text-secondary" />
            Dados Extraídos (OCR)
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
          {renderOcrSections()}
        </div>
      </div>

      {/* Right: Contract Target */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-secondary" />
            Variáveis do Template
          </h3>

          {/* Botão de refresh */}
          {hasLoadedOnce && !isLoadingVariables && (
            <button
              onClick={handleRefreshVariables}
              disabled={isRefreshingVariables}
              className="cursor-pointer flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Atualizar variáveis do template"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshingVariables ? 'animate-spin' : ''}`} />
              {isRefreshingVariables ? 'Atualizando...' : 'Atualizar'}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
          {isLoadingVariables ? (
            <DocumentScanner />
          ) : variablesError ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
              <p className="text-red-600 font-semibold mb-2">Erro ao carregar variáveis</p>
              <p className="text-slate-500 text-sm">{variablesError}</p>
            </div>
          ) : templateVariables.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <FileCheck className="w-16 h-16 text-slate-300 mb-4" />
              <p className="text-slate-500 font-semibold mb-2">Nenhuma variável encontrada</p>
              <p className="text-slate-400 text-sm">O template não possui variáveis para mapear</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedVariables.map((group) => (
                <div key={group.prefix} className="space-y-2">
                  <div className="bg-gradient-to-r from-slate-100 to-slate-50 px-3 py-2 rounded-lg sticky top-0 z-10">
                    <h4 className="font-bold text-slate-800 text-sm">
                      {formatPrefixLabel(group.prefix)}
                    </h4>
                  </div>
                  <div className="space-y-3 pl-1">
                    {group.variables.map((variable) =>
                      renderContractField(variable.fullKey, variable.label)
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
