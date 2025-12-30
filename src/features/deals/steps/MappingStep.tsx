
import React, { useEffect, useState, useCallback } from 'react';
import { ChevronRight, FileCheck, FileText, GripVertical, AlertCircle, RefreshCw, Trash, Sparkles, RotateCcw } from 'lucide-react';
import type {
  DealConfig,
  MappingValue,
  OcrDataByPerson,
} from '../../../types/types';
import { dealsService } from '../services/deals.service';
import { IAMappingLoader } from '../components/IAMappingLoader';

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
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [loaderStage, setLoaderStage] = useState<'fetching' | 'mapping' | 'applying'>('fetching');
  const [variablesError, setVariablesError] = useState<string | null>(null);
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [preMappedFields, setPreMappedFields] = useState<Set<string>>(new Set());

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
          <details open className="group overflow-visible">
            <summary className="list-none cursor-pointer sticky top-0 z-20 shadow-sm rounded-md group-open:rounded-b-none transition-all duration-200">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 rounded-md group-open:rounded-b-none font-bold text-blue-900 text-sm flex items-center justify-between group-open:border-b border-blue-200/50">
                <span>Vendedor {index + 1}</span>
                <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform text-blue-400" />
              </div>
            </summary>
            <div className="p-4 bg-white border-x border-b border-slate-100 rounded-b-xl animate-in fade-in slide-in-from-top-1 duration-200">
              {ocrForPerson ? (
                <div className="pl-2">
                  {renderJsonTree(ocrForPerson.data)}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic pl-2">Nenhum dado extraído</p>
              )}
            </div>
          </details>
        </div>
      );
    });

    dealConfig.buyers.forEach((buyer, index) => {
      const ocrForPerson = displayOcrData.find(ocr => ocr.personId === buyer.id);

      sections.push(
        <div key={`buyer-${buyer.id}`} className="mb-4">
          <details open className="group overflow-visible">
            <summary className="list-none cursor-pointer sticky top-0 z-20 shadow-sm rounded-md group-open:rounded-b-none transition-all duration-200">
              <div className="bg-gradient-to-r from-green-50 to-green-100 px-4 py-3 rounded-md group-open:rounded-b-none font-bold text-green-900 text-sm flex items-center justify-between group-open:border-b border-green-200/50">
                <span>Comprador {index + 1}</span>
                <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform text-green-400" />
              </div>
            </summary>
            <div className="p-4 bg-white border-x border-b border-slate-100 rounded-b-xl animate-in fade-in slide-in-from-top-1 duration-200">
              {ocrForPerson ? (
                <div className="pl-2">
                  {renderJsonTree(ocrForPerson.data)}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic pl-2">Nenhum dado extraído</p>
              )}
            </div>
          </details>
        </div>
      );
    });

    const propertyOcr = displayOcrData.find(ocr => ocr.personId === 'property');
    sections.push(
      <div key="property" className="mb-4">
        <details open className="group overflow-visible">
          <summary className="list-none cursor-pointer sticky top-0 z-20 shadow-sm rounded-md group-open:rounded-b-none transition-all duration-200">
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-4 py-3 rounded-md group-open:rounded-b-none font-bold text-purple-900 text-sm flex items-center justify-between group-open:border-b border-purple-200/50">
              <span>Imóvel</span>
              <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform text-purple-400" />
            </div>
          </summary>
          <div className="p-4 bg-white border-x border-b border-slate-100 rounded-b-xl animate-in fade-in slide-in-from-top-1 duration-200">
            {propertyOcr ? (
              <div className="pl-2">
                {renderJsonTree(propertyOcr.data)}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic pl-2">Nenhum dado extraído</p>
            )}
          </div>
        </details>
      </div>
    );

    return sections;
  };

  const renderContractField = (fieldId: string, label: string) => {
    const mapping = mappings[fieldId];
    const isActive = activeDropZone === fieldId;
    const isPreMapped = preMappedFields.has(fieldId);

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
          if (val) {
            onMap(fieldId, val, 'drag');
            // Remover da lista de pré-mapeados se o usuário sobrescrever
            if (isPreMapped) {
              setPreMappedFields(prev => {
                const newSet = new Set(prev);
                newSet.delete(fieldId);
                return newSet;
              });
            }
          }
        }}
        className={`
          p-3 rounded-lg border-2 transition-all duration-200 relative
          ${mapping
            ? isPreMapped
              ? 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-400 border-solid shadow-sm'
              : mapping.source === 'drag'
                ? 'bg-blue-50/50 border-blue-500 border-solid'
                : 'bg-amber-50/50 border-amber-500 border-solid'
            : isActive
              ? 'bg-blue-50 border-blue-400 border-dotted scale-[1.02] shadow-sm ring-2 ring-blue-100 z-10'
              : 'border-slate-300 border-dashed bg-transparent'
          }
        `}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-slate-500 uppercase pointer-events-none">
            {label}
          </span>
          {isPreMapped && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-[10px] font-bold uppercase">
              <Sparkles className="w-3 h-3" />
              IA
            </div>
          )}
        </div>

        {mapping ? (
          <div className="flex items-center justify-between gap-2">
            <input
              type="text"
              value={mapping.value}
              onChange={(e) => {
                onMap(fieldId, e.target.value, 'manual');
                // Remover da lista de pré-mapeados quando o usuário editar
                if (isPreMapped) {
                  setPreMappedFields(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(fieldId);
                    return newSet;
                  });
                }
              }}
              className={`
                flex-1 px-2 py-1 rounded border text-sm font-medium
                focus:outline-none focus:ring-2 focus:ring-offset-1
                ${isPreMapped
                  ? 'border-purple-300 bg-white text-purple-900 focus:ring-purple-400'
                  : mapping.source === 'drag'
                    ? 'border-blue-200 bg-white text-blue-900 focus:ring-blue-400'
                    : 'border-amber-200 bg-white text-amber-900 focus:ring-amber-400'
                }
              `}
              placeholder="Digite ou arraste um valor..."
            />
            <button
              onClick={() => {
                onMap(fieldId, '', 'manual');
                // Remover da lista de pré-mapeados ao limpar
                if (isPreMapped) {
                  setPreMappedFields(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(fieldId);
                    return newSet;
                  });
                }
              }}
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

  const fetchDocVariables = useCallback(async (isRefresh = false) => {
    if (!dealId) return;

    if (isRefresh) {
      setIsRefreshingVariables(true);
    } else {
      setIsLoadingVariables(true);
      setLoaderStage('fetching');
    }
    setVariablesError(null);

    const stageTimer = !isRefresh ? setTimeout(() => setLoaderStage('mapping'), 3000) : null;

    try {
      const response = await dealsService.getDocVariables(dealId);

      if (!isRefresh) setLoaderStage('applying');
      if (!isRefresh) await new Promise(resolve => setTimeout(resolve, 800));

      const variables = response?.variables || [];
      const preMappings = response?.preMappings || {};

      if (Array.isArray(variables)) {
        if (isRefresh) {
          setTemplateVariables(prevVariables => {
            const existingSet = new Set(prevVariables);
            const newVariables = variables.filter(v => !existingSet.has(v));

            if (newVariables.length > 0) {
              return [...prevVariables, ...newVariables];
            } else {
              return prevVariables;
            }
          });
        } else {
          setTemplateVariables(variables);
          setHasLoadedOnce(true);

          if (preMappings && Object.keys(preMappings).length > 0) {
            const preMappedSet = new Set<string>();

            Object.entries(preMappings).forEach(([key, suggestion]: [string, any]) => {
              const fieldId = suggestion.variable || key;

              if (!mappings[fieldId]) {
                onMap(fieldId, suggestion.value, 'drag');
                preMappedSet.add(fieldId);
              }
            });

            setPreMappedFields(preMappedSet);
          }
        }
      } else {
        console.error('Formato de variáveis inválido:', response);
        setVariablesError('Formato de resposta inválido do servidor');
      }
    } catch (error: any) {
      console.error('Erro ao obter variáveis do template do Google Docs:', error);

      if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
        setVariablesError('Tempo de processamento excedido. O pré-mapeamento pode demorar até 2 minutos. Tente novamente.');
      } else if (error?.response?.status === 404) {
        setVariablesError('Template não encontrado. Verifique se o template está configurado corretamente.');
      } else {
        setVariablesError('Erro ao buscar variáveis do template. Tente novamente.');
      }
    } finally {
      if (stageTimer) clearTimeout(stageTimer);
      setIsLoadingVariables(false);
      setIsRefreshingVariables(false);
    }
  }, [dealId, mappings, onMap]);

  useEffect(() => {
    if (dealId && !hasLoadedOnce) {
      fetchDocVariables(false);
    }
  }, [dealId, hasLoadedOnce]);

  // Função para refresh manual
  const handleRefreshVariables = useCallback(() => {
    fetchDocVariables(true);
  }, [fetchDocVariables]);

  // Função para re-processar pré-mapeamentos (limpa cache e processa novamente)
  const handleReprocessPreMappings = useCallback(async () => {
    if (!dealId || isReprocessing) return;

    setIsReprocessing(true);
    setIsLoadingVariables(true);
    setLoaderStage('fetching');

    // Simulação de transição de estágios
    const stageTimer = setTimeout(() => setLoaderStage('mapping'), 2500);

    try {
      await dealsService.clearPreMappingsCache(dealId);
      setPreMappedFields(new Set());

      const response = await dealsService.getDocVariables(dealId);

      setLoaderStage('applying');
      await new Promise(resolve => setTimeout(resolve, 800));

      const variables = response?.variables || [];
      const preMappings = response?.preMappings || {};

      setTemplateVariables(variables);

      if (preMappings && Object.keys(preMappings).length > 0) {
        const preMappedSet = new Set<string>();

        Object.entries(preMappings).forEach(([fieldId, suggestion]: [string, any]) => {
          onMap(fieldId, suggestion.value, 'drag');
          preMappedSet.add(fieldId);
        });

        setPreMappedFields(preMappedSet);
      }
    } catch (error) {
      console.error('❌ Erro ao re-processar pré-mapeamentos:', error);
      setVariablesError('Erro ao re-processar pré-mapeamentos');
    } finally {
      clearTimeout(stageTimer);
      setIsReprocessing(false);
      setIsLoadingVariables(false);
    }
  }, [dealId, isReprocessing, onMap]);

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-500">
      {/* Banner informativo de pré-mapeamento */}
      {preMappedFields.size > 0 && (
        <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 border-2 border-purple-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-purple-800 mb-1 flex items-center gap-2">
                Pré-mapeamento Inteligente Ativado
              </h4>
              <p className="text-sm text-purple-700 mb-2">
                Nossa IA analisou os documentos e sugeriu mapeamentos para{' '}
                <span className="font-bold">{preMappedFields.size} variável(is)</span>.
                Os campos com o badge <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-[10px] font-bold"><Sparkles className="w-3 h-3" />IA</span> foram preenchidos automaticamente.
              </p>
              <p className="text-xs text-purple-600">
                💡 Você pode editar ou remover qualquer sugestão. Revise os valores antes de continuar.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="h-[600px] flex flex-col md:flex-row gap-6">
        {/* Left: OCR Source */}
        <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-5 bg-slate-50 border-b border-slate-200">
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

            {/* Botões de ação */}
            {hasLoadedOnce && !isLoadingVariables && (
              <div className="flex items-center gap-2">
                {/* Botão de re-processar pré-mapeamentos */}
                {preMappedFields.size > 0 && (
                  <button
                    onClick={handleReprocessPreMappings}
                    disabled={isReprocessing}
                    className="cursor-pointer flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-700 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border border-purple-300 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Re-processar pré-mapeamentos com IA"
                  >
                    <RotateCcw className={`w-4 h-4 ${isReprocessing ? 'animate-spin' : ''}`} />
                    {isReprocessing ? 'Re-processando...' : 'Re-processar IA'}
                  </button>
                )}

                {/* Botão de refresh variáveis */}
                <button
                  onClick={handleRefreshVariables}
                  disabled={isRefreshingVariables}
                  className="cursor-pointer flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Atualizar variáveis do template"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshingVariables ? 'animate-spin' : ''}`} />
                  {isRefreshingVariables ? 'Atualizando...' : 'Atualizar'}
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
            {isLoadingVariables ? (
              <IAMappingLoader stage={loaderStage} />
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
    </div>
  );
};
