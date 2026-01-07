
import React, { useEffect, useState, useCallback } from 'react';
import {
  ChevronRight,
  FileCheck,
  GripVertical,
  AlertCircle,
  RefreshCw,
  Trash,
  Sparkles,
  RotateCcw,
  FileText,
  Copy,
  X,
  User,
  Users,
  Home,
  DollarSign,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import type {
  DealConfig,
  MappingValue,
  OcrDataByPerson,
  UploadedFile,
} from '../../../types/types';
import { dealsService } from '../services/deals.service';
import { IAMappingLoader } from '../components/IAMappingLoader';
import { UtilsService } from '@/services/utils.service';

interface MappingStepProps {
  mappings: Record<string, MappingValue>;
  onMap: (fieldId: string, value: string | null, source: 'drag' | 'manual') => void;
  dealConfig: DealConfig;
  dealId: string;
  ocrData?: OcrDataByPerson[];
  files?: UploadedFile[]; // Arquivos com document_type preservado
}

interface GroupedVariable {
  fullKey: string;
  fieldName: string;
  label: string;
}

// Interfaces para agrupamento por pessoa/documento
interface PersonDocumentGroup {
  personId: string;
  personName: string;
  role: 'buyer' | 'seller' | 'property';
  index?: number;
  documents: DocumentGroup[];
}

interface DocumentGroup {
  documentType: string; // código (ex: MATRÍCULA, RG, CPF)
  title: string; // título único exibido no UI (ex: Matrícula #2 — arquivo.pdf)
  docIcon: string;
  data: Record<string, any>;
}

// Novas interfaces para categorização de variáveis
interface PersonGroup {
  index: number;
  personName: string;
  variables: GroupedVariable[];
}

interface CategoryGroup {
  categoryName: string;
  categoryKey: string;
  icon: any;
  color: string;
  subGroups?: PersonGroup[];
  variables?: GroupedVariable[];
}

// Função para formatar nome de campo para label legível
const formatFieldLabel = (fieldName: string): string => {
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Mapeamento de códigos de document_type para nomes legíveis
const getDocumentTypeLabel = (documentType: string): string => {
  const convertedType = UtilsService.getDocumentType(documentType);
  return convertedType || documentType.replace(/_/g, ' ');
};

// Função para obter ícone baseado no tipo de documento
const getDocumentIcon = (documentType: string): string => {
  if (documentType.includes('RG') || documentType.includes('CPF') || documentType.includes('CNH')) {
    return '🪪';
  }
  if (documentType.includes('CERTIDAO')) {
    return '📜';
  }
  if (documentType.includes('COMPROVANTE') || documentType.includes('CONTRACHEQUE') || documentType.includes('IRPF')) {
    return '📄';
  }
  if (documentType.includes('MATRICULA') || documentType.includes('IPTU') || documentType.includes('ESCRITURA')) {
    return '🏠';
  }
  if (documentType.includes('CONTRATO') || documentType.includes('PROCURACAO')) {
    return '📝';
  }
  return '📄';
};

// Função para extrair nome da pessoa dos dados OCR
const extractPersonName = (data: Record<string, any>): string => {
  // Tenta diferentes campos comuns para nome
  const nameFields = [
    'nome', 
    'nome_completo', 
    'name', 
    'full_name',
    'nome_do_requerente',
    'requerente',
  ];
  
  for (const field of nameFields) {
    if (data[field] && typeof data[field] === 'string') {
      return data[field];
    }
  }
  
  // Busca recursivamente em objetos aninhados
  for (const value of Object.values(data)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nestedName = extractPersonName(value as Record<string, any>);
      if (nestedName !== 'Sem Nome') {
        return nestedName;
      }
    }
  }
  
  return 'Sem Nome';
};

// Função para agrupar arquivos por pessoa e documento (usando UploadedFile[])
const groupFilesByPerson = (
  files: UploadedFile[],
  dealConfig: DealConfig
): PersonDocumentGroup[] => {
  const groups: PersonDocumentGroup[] = [];
  
  // Filtrar apenas arquivos com OCR completo
  const completedFiles = files.filter(
    f => f.ocrStatus === 'completed' && f.ocrExtractedData
  );
  
  // Processar vendedores
  dealConfig.sellers.forEach((seller, index) => {
    const personFiles = completedFiles.filter(f => f.personId === seller.id);
    
    // Extrair nome da primeira ocorrência de nome em qualquer documento
    let personName = 'Sem Nome';
    for (const file of personFiles) {
      if (file.ocrExtractedData) {
        const extracted = extractPersonName(file.ocrExtractedData);
        if (extracted !== 'Sem Nome') {
          personName = extracted;
          break;
        }
      }
    }
    
    const typeCounts = personFiles.reduce<Record<string, number>>((acc, f) => {
      acc[f.type] = (acc[f.type] || 0) + 1;
      return acc;
    }, {});
    const typeSeen: Record<string, number> = {};

    const documents: DocumentGroup[] = personFiles.map((file) => {
      typeSeen[file.type] = (typeSeen[file.type] || 0) + 1;
      const baseLabel = getDocumentTypeLabel(file.type);
      const suffix = typeCounts[file.type] > 1 ? ` #${typeSeen[file.type]}` : '';
      const fileName = file.file?.name ? ` — ${file.file.name}` : '';

      return {
        documentType: file.type,
        title: `${baseLabel}${suffix}${fileName}`,
        docIcon: getDocumentIcon(file.type),
        data: file.ocrExtractedData || {},
      };
    });
    
    groups.push({
      personId: seller.id,
      personName,
      role: 'seller',
      index,
      documents
    });
  });
  
  // Processar compradores
  dealConfig.buyers.forEach((buyer, index) => {
    const personFiles = completedFiles.filter(f => f.personId === buyer.id);
    
    let personName = 'Sem Nome';
    for (const file of personFiles) {
      if (file.ocrExtractedData) {
        const extracted = extractPersonName(file.ocrExtractedData);
        if (extracted !== 'Sem Nome') {
          personName = extracted;
          break;
        }
      }
    }
    
    const typeCounts = personFiles.reduce<Record<string, number>>((acc, f) => {
      acc[f.type] = (acc[f.type] || 0) + 1;
      return acc;
    }, {});
    const typeSeen: Record<string, number> = {};

    const documents: DocumentGroup[] = personFiles.map((file) => {
      typeSeen[file.type] = (typeSeen[file.type] || 0) + 1;
      const baseLabel = getDocumentTypeLabel(file.type);
      const suffix = typeCounts[file.type] > 1 ? ` #${typeSeen[file.type]}` : '';
      const fileName = file.file?.name ? ` — ${file.file.name}` : '';

      return {
        documentType: file.type,
        title: `${baseLabel}${suffix}${fileName}`,
        docIcon: getDocumentIcon(file.type),
        data: file.ocrExtractedData || {},
      };
    });
    
    groups.push({
      personId: buyer.id,
      personName,
      role: 'buyer',
      index,
      documents
    });
  });
  
  // Processar imóvel
  const propertyFiles = completedFiles.filter(f => f.personId === 'property' || f.category === 'property');
  if (propertyFiles.length > 0) {
    const typeCounts = propertyFiles.reduce<Record<string, number>>((acc, f) => {
      acc[f.type] = (acc[f.type] || 0) + 1;
      return acc;
    }, {});
    const typeSeen: Record<string, number> = {};

    const documents: DocumentGroup[] = propertyFiles.map((file) => {
      typeSeen[file.type] = (typeSeen[file.type] || 0) + 1;
      const baseLabel = getDocumentTypeLabel(file.type);
      const suffix = typeCounts[file.type] > 1 ? ` #${typeSeen[file.type]}` : '';
      const fileName = file.file?.name ? ` — ${file.file.name}` : '';

      return {
        documentType: file.type,
        title: `${baseLabel}${suffix}${fileName}`,
        docIcon: getDocumentIcon(file.type),
        data: file.ocrExtractedData || {},
      };
    });
    
    groups.push({
      personId: 'property',
      personName: 'Imóvel',
      role: 'property',
      documents
    });
  }
  
  return groups;
};

// Fallback: agrupar dados OCR legados (mantém compatibilidade)
const groupOcrDataByPerson = (
  ocrData: OcrDataByPerson[],
  dealConfig: DealConfig
): PersonDocumentGroup[] => {
  const groups: PersonDocumentGroup[] = [];
  
  // Processar vendedores
  dealConfig.sellers.forEach((seller, index) => {
    const ocrForPerson = ocrData.find(ocr => ocr.personId === seller.id);
    const personName = ocrForPerson ? extractPersonName(ocrForPerson.data) : 'Sem Nome';
    
    const documents: DocumentGroup[] = [];
    if (ocrForPerson && ocrForPerson.data) {
      documents.push({
        documentType: 'LEGACY',
        title: 'Dados Extraídos',
        docIcon: '📄',
        data: ocrForPerson.data
      });
    }
    
    groups.push({
      personId: seller.id,
      personName,
      role: 'seller',
      index,
      documents
    });
  });
  
  // Processar compradores
  dealConfig.buyers.forEach((buyer, index) => {
    const ocrForPerson = ocrData.find(ocr => ocr.personId === buyer.id);
    const personName = ocrForPerson ? extractPersonName(ocrForPerson.data) : 'Sem Nome';
    
    const documents: DocumentGroup[] = [];
    if (ocrForPerson && ocrForPerson.data) {
      documents.push({
        documentType: 'LEGACY',
        title: 'Dados Extraídos',
        docIcon: '📄',
        data: ocrForPerson.data
      });
    }
    
    groups.push({
      personId: buyer.id,
      personName,
      role: 'buyer',
      index,
      documents
    });
  });
  
  // Processar imóvel
  const propertyOcr = ocrData.find(ocr => ocr.personId === 'property');
  if (propertyOcr) {
    const documents: DocumentGroup[] = [{
      documentType: 'LEGACY_PROPERTY',
      title: 'Dados do Imóvel',
      docIcon: '🏠',
      data: propertyOcr.data
    }];
    
    groups.push({
      personId: 'property',
      personName: 'Imóvel',
      role: 'property',
      documents
    });
  }
  
  return groups;
};

// Função para obter nome da pessoa do OCR por role e índice
const getPersonNameFromOcr = (
  role: 'buyer' | 'seller',
  index: number,
  ocrGroups: PersonDocumentGroup[]
): string => {
  const person = ocrGroups.find(g => g.role === role && g.index === index);
  return person?.personName || `${role === 'buyer' ? 'Comprador' : 'Vendedor'} ${index + 1}`;
};

// Função para categorizar variáveis nas 4 categorias hardcoded
const categorizeVariables = (
  variables: string[],
  ocrGroups: PersonDocumentGroup[]
): CategoryGroup[] => {
  const buyerVars: Record<number, GroupedVariable[]> = {};
  const sellerVars: Record<number, GroupedVariable[]> = {};
  const propertyVars: GroupedVariable[] = [];
  const dealVars: GroupedVariable[] = [];
  const otherVars: GroupedVariable[] = [];
  
  variables.forEach(variable => {
    // Extrair prefixo e resto (suporta formatos antigos e novos)
    // Novo (schema atual): buyers.1.nome / sellers.1.nome (índice começa em 1)
    const buyersDotMatch = variable.match(/^buyers\.(\d+)\.(.+)$/);
    const sellersDotMatch = variable.match(/^sellers\.(\d+)\.(.+)$/);
    // Variações com colchetes
    const buyersBracketMatch = variable.match(/^buyers\[(\d+)\]\.(.+)$/);
    const sellersBracketMatch = variable.match(/^sellers\[(\d+)\]\.(.+)$/);
    // Antigo (singular)
    const buyerBracketMatch = variable.match(/^buyer\[(\d+)\]\.(.+)$/);
    const sellerBracketMatch = variable.match(/^seller\[(\d+)\]\.(.+)$/);
    const buyerDotMatch = variable.match(/^buyer\.(\d+)\.(.+)$/);
    const sellerDotMatch = variable.match(/^seller\.(\d+)\.(.+)$/);
    
    const buyerMatch = buyersDotMatch || buyersBracketMatch || buyerBracketMatch || buyerDotMatch;
    const sellerMatch = sellersDotMatch || sellersBracketMatch || sellerBracketMatch || sellerDotMatch;

    // Legado (snake_case / upper): NOME_VENDEDOR_1, CPF_COMPRADOR_2, etc.
    const legacyBuyerSuffix = variable.match(/^(.+?)_(COMPRADOR|BUYER)_(\d+)$/i);
    const legacySellerSuffix = variable.match(/^(.+?)_(VENDEDOR|SELLER)_(\d+)$/i);
    const legacyBuyerPrefix = variable.match(/^(COMPRADOR|BUYER)_(\d+)_(.+)$/i);
    const legacySellerPrefix = variable.match(/^(VENDEDOR|SELLER)_(\d+)_(.+)$/i);

    if (buyerMatch) {
      const index1 = parseInt(buyerMatch[1], 10);
      const index = Number.isFinite(index1) ? Math.max(index1 - 1, 0) : 0; // template é 1-based
      const fieldName = buyerMatch[2];
      if (!buyerVars[index]) buyerVars[index] = [];
      buyerVars[index].push({
        fullKey: variable,
        fieldName,
        label: formatFieldLabel(fieldName)
      });
    } else if (sellerMatch) {
      const index1 = parseInt(sellerMatch[1], 10);
      const index = Number.isFinite(index1) ? Math.max(index1 - 1, 0) : 0; // template é 1-based
      const fieldName = sellerMatch[2];
      if (!sellerVars[index]) sellerVars[index] = [];
      sellerVars[index].push({
        fullKey: variable,
        fieldName,
        label: formatFieldLabel(fieldName)
      });
    } else if (legacyBuyerSuffix) {
      const index1 = parseInt(legacyBuyerSuffix[3], 10);
      const index = Number.isFinite(index1) ? Math.max(index1 - 1, 0) : 0;
      const fieldName = legacyBuyerSuffix[1];
      if (!buyerVars[index]) buyerVars[index] = [];
      buyerVars[index].push({
        fullKey: variable,
        fieldName,
        label: formatFieldLabel(fieldName)
      });
    } else if (legacySellerSuffix) {
      const index1 = parseInt(legacySellerSuffix[3], 10);
      const index = Number.isFinite(index1) ? Math.max(index1 - 1, 0) : 0;
      const fieldName = legacySellerSuffix[1];
      if (!sellerVars[index]) sellerVars[index] = [];
      sellerVars[index].push({
        fullKey: variable,
        fieldName,
        label: formatFieldLabel(fieldName)
      });
    } else if (legacyBuyerPrefix) {
      const index1 = parseInt(legacyBuyerPrefix[2], 10);
      const index = Number.isFinite(index1) ? Math.max(index1 - 1, 0) : 0;
      const fieldName = legacyBuyerPrefix[3];
      if (!buyerVars[index]) buyerVars[index] = [];
      buyerVars[index].push({
        fullKey: variable,
        fieldName,
        label: formatFieldLabel(fieldName)
      });
    } else if (legacySellerPrefix) {
      const index1 = parseInt(legacySellerPrefix[2], 10);
      const index = Number.isFinite(index1) ? Math.max(index1 - 1, 0) : 0;
      const fieldName = legacySellerPrefix[3];
      if (!sellerVars[index]) sellerVars[index] = [];
      sellerVars[index].push({
        fullKey: variable,
        fieldName,
        label: formatFieldLabel(fieldName)
      });
    } else if (variable.startsWith('buyers.') || variable.startsWith('sellers.')) {
      // Caso raro: buyers.<algo> sem índice válido, cai em outros para não perder visibilidade
      otherVars.push({
        fullKey: variable,
        fieldName: variable,
        label: formatFieldLabel(variable)
      });
    } else if (variable.startsWith('property.')) {
      const fieldName = variable.substring('property.'.length);
      propertyVars.push({
        fullKey: variable,
        fieldName,
        label: formatFieldLabel(fieldName)
      });
    } else if (variable.startsWith('deal.')) {
      const fieldName = variable.substring('deal.'.length);
      dealVars.push({
        fullKey: variable,
        fieldName,
        label: formatFieldLabel(fieldName)
      });
    } else {
      // Fallback para outros formatos antigos
      const parts = variable.split('.');
      if (parts.length > 1) {
        const [prefix, ...rest] = parts;
        const fieldName = rest.join('.');
        
        if (prefix === 'buyer' || prefix === 'buyers') {
          if (!buyerVars[0]) buyerVars[0] = [];
          buyerVars[0].push({
            fullKey: variable,
            fieldName,
            label: formatFieldLabel(fieldName)
          });
        } else if (prefix === 'seller' || prefix === 'sellers') {
          if (!sellerVars[0]) sellerVars[0] = [];
          sellerVars[0].push({
            fullKey: variable,
            fieldName,
            label: formatFieldLabel(fieldName)
          });
        } else {
          otherVars.push({
            fullKey: variable,
            fieldName,
            label: formatFieldLabel(fieldName)
          });
        }
      }
    }
  });

  // Se houver OCR de compradores/vendedores, manter os blocos visíveis mesmo sem variáveis do template
  // (ajuda o usuário a entender que não há campos mapeáveis daquela pessoa neste template)
  const buyerOcrGroups = ocrGroups.filter(g => g.role === 'buyer' && typeof g.index === 'number');
  const sellerOcrGroups = ocrGroups.filter(g => g.role === 'seller' && typeof g.index === 'number');

  if (Object.keys(buyerVars).length === 0 && buyerOcrGroups.length > 0) {
    buyerOcrGroups.forEach(g => { buyerVars[g.index!] = []; });
  }
  if (Object.keys(sellerVars).length === 0 && sellerOcrGroups.length > 0) {
    sellerOcrGroups.forEach(g => { sellerVars[g.index!] = []; });
  }
  
  const categories: CategoryGroup[] = [];
  
  // Compradores
  if (Object.keys(buyerVars).length > 0) {
    const subGroups: PersonGroup[] = Object.entries(buyerVars)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([indexStr, vars]) => {
        const index = parseInt(indexStr, 10);
        return {
          index,
          personName: getPersonNameFromOcr('buyer', index, ocrGroups),
          variables: vars
        };
      });
    
    categories.push({
      categoryName: 'Compradores',
      categoryKey: 'buyers',
      icon: Users,
      color: 'green',
      subGroups
    });
  }
  
  // Vendedores
  if (Object.keys(sellerVars).length > 0) {
    const subGroups: PersonGroup[] = Object.entries(sellerVars)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([indexStr, vars]) => {
        const index = parseInt(indexStr, 10);
        return {
          index,
          personName: getPersonNameFromOcr('seller', index, ocrGroups),
          variables: vars
        };
      });
    
    categories.push({
      categoryName: 'Vendedores',
      categoryKey: 'sellers',
      icon: Users,
      color: 'blue',
      subGroups
    });
  }
  
  // Condições Comerciais
  if (dealVars.length > 0) {
    categories.push({
      categoryName: 'Condições Comerciais',
      categoryKey: 'deal',
      icon: DollarSign,
      color: 'amber',
      variables: dealVars
    });
  }
  
  // Imóvel
  if (propertyVars.length > 0) {
    categories.push({
      categoryName: 'Imóvel',
      categoryKey: 'property',
      icon: Home,
      color: 'purple',
      variables: propertyVars
    });
  }
  
  // Outros (se houver)
  if (otherVars.length > 0) {
    categories.push({
      categoryName: 'Outros',
      categoryKey: 'other',
      icon: FileText,
      color: 'slate',
      variables: otherVars
    });
  }
  
  return categories;
};

export const MappingStep: React.FC<MappingStepProps> = ({
  mappings,
  onMap,
  dealConfig,
  dealId,
  ocrData,
  files
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
  const [expandedOcrItem, setExpandedOcrItem] = useState<{
    fullKey: string;
    key: string;
    value: unknown;
  } | null>(null);
  const [hasCopiedExpanded, setHasCopiedExpanded] = useState(false);
  const [isAiBannerExpanded, setIsAiBannerExpanded] = useState(false);

  // Agrupar dados por pessoa - usa files se disponível, senão ocrData
  const ocrPersonGroups = React.useMemo(() => {
    if (files && files.length > 0) {
      return groupFilesByPerson(files, dealConfig);
    } else {
      const displayOcrData = ocrData || [];
      return groupOcrDataByPerson(displayOcrData, dealConfig);
    }
  }, [files, ocrData, dealConfig]);

  // Categorizar variáveis usando a nova estrutura de 4 categorias
  const categorizedVariables: CategoryGroup[] = React.useMemo(() => {
    return categorizeVariables(templateVariables, ocrPersonGroups);
  }, [templateVariables, ocrPersonGroups]);

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
          onClick={() => {
            setExpandedOcrItem({ fullKey, key, value });
            setHasCopiedExpanded(false);
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
    return ocrPersonGroups.map((personGroup) => {
      const { personId, personName, role, index, documents } = personGroup;
      
      // Definir cores baseado no papel
      const colorConfig = {
        buyer: {
          bg: 'from-green-50 to-green-100',
          text: 'text-green-900',
          border: 'border-green-200/50',
          icon: 'text-green-400'
        },
        seller: {
          bg: 'from-blue-50 to-blue-100',
          text: 'text-blue-900',
          border: 'border-blue-200/50',
          icon: 'text-blue-400'
        },
        property: {
          bg: 'from-purple-50 to-purple-100',
          text: 'text-purple-900',
          border: 'border-purple-200/50',
          icon: 'text-purple-400'
        }
      };
      
      const colors = colorConfig[role];
      const roleLabel = role === 'buyer' ? 'Comprador' : role === 'seller' ? 'Vendedor' : 'Imóvel';
      const displayName = role === 'property' 
        ? 'Imóvel' 
        : `${roleLabel} ${(index ?? 0) + 1} - ${personName}`;
      
      return (
        <div key={personId} className="mb-4">
          <details open className="group overflow-visible">
            <summary className={`bg-gradient-to-r ${colors.bg} list-none cursor-pointer sticky -top-1 z-30 shadow-sm rounded-md group-open:rounded-b-none transition-all duration-200 group-open:border-b ${colors.border} -mx-1 p-1`}>
              <div className={`px-4 py-3 font-bold ${colors.text} text-sm flex items-center justify-between gap-2`}>
                <div className="flex items-center gap-2 min-w-0">
                  <User className={`w-4 h-4 flex-shrink-0 ${colors.icon}`} />
                  <span className="truncate">{displayName}</span>
                </div>
                <ChevronRight className={`w-4 h-4 group-open:rotate-90 transition-transform ${colors.icon} flex-shrink-0`} />
              </div>
            </summary>
            <div className="p-4 bg-white border-x border-b border-slate-100 rounded-b-xl animate-in fade-in slide-in-from-top-1 duration-200">
              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc, docIndex) => (
                    <details key={docIndex} open className="group/doc">
                      <summary className="cursor-pointer text-xs font-semibold text-slate-600 hover:text-slate-800 list-none flex items-center gap-2 p-2 bg-slate-50 rounded-md hover:bg-slate-100 transition-colors">
                        <ChevronRight className="w-3 h-3 group-open/doc:rotate-90 transition-transform" />
                        <span>{doc.docIcon}</span>
                        <span className="truncate" title={doc.title}>{doc.title}</span>
                      </summary>
                      <div className="mt-2 pl-2">
                        {renderJsonTree(doc.data)}
                      </div>
                    </details>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic pl-2">Nenhum dado extraído</p>
              )}
            </div>
          </details>
        </div>
      );
    });
  };

  const renderContractField = (fieldId: string, label: string) => {
    const mapping = mappings[fieldId];
    const isActive = activeDropZone === fieldId;
    const isPreMapped = preMappedFields.has(fieldId);
    const isMapped = !!mapping;

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
            if (isPreMapped) {
              setPreMappedFields(prev => {
                const newSet = new Set(prev);
                newSet.delete(fieldId);
                return newSet;
              });
            }
          }
        }}
        onClick={() => {
          if (!mapping) {
            onMap(fieldId, '', 'manual');
          }
        }}
        className={`
          cursor-pointer p-3 rounded-lg border-2 transition-all duration-300 relative group/field
          hover:shadow-sm hover:scale-[1.02]
          ${mapping
            ? isPreMapped
              ? 'bg-purple-50/70 border-purple-300 border-solid shadow-sm'
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
          <div className="flex items-center gap-1">
            {isMapped && (
              <div className="animate-in fade-in zoom-in duration-300">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              </div>
            )}
            {isPreMapped && (
              <div className="relative group/ai">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-white text-purple-700 border border-purple-200 rounded-full text-[10px] font-bold uppercase shadow-sm">
                  <Sparkles className="w-3 h-3" />
                  IA
                </div>
                <div className="pointer-events-none hidden group-hover/ai:block absolute right-0 top-full mt-1 z-50 w-56 rounded-md bg-slate-900 text-white text-[11px] leading-snug px-2 py-1 shadow-lg">
                  Pré-preenchido pela IA. Revise o valor antes de continuar.
                </div>
              </div>
            )}
          </div>
        </div>

        {mapping ? (
          <div className="flex items-center justify-between gap-2">
            <input
              type="text"
              autoFocus
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
                transition-all duration-200
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
                onMap(fieldId, null, 'manual');
                // Remover da lista de pré-mapeados ao limpar
                if (isPreMapped) {
                  setPreMappedFields(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(fieldId);
                    return newSet;
                  });
                }
              }}
              className="cursor-pointer text-red-400 hover:text-red-600 p-1 z-10 relative flex-shrink-0 transition-colors"
              title="Remover mapeamento"
            >
              <Trash className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className={`h-8 flex items-center text-sm italic transition-colors pointer-events-none ${isActive ? 'text-primary font-medium' : 'text-slate-400'}`}>
            {isActive ? 'Soltar para mapear!' : 'Arraste uma variável ou clique aqui...'}
          </div>
        )}

        {isActive && <div className="absolute inset-0 bg-blue-400/5 pointer-events-none rounded-lg animate-pulse" />}
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
      {/* Modal: visualizar valor completo do OCR */}
      {expandedOcrItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            // Clique no backdrop fecha; clique dentro do modal não fecha
            if (e.target === e.currentTarget) setExpandedOcrItem(null);
          }}
        >
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-slate-500 font-bold uppercase">Variável (OCR)</div>
                <div className="text-sm font-semibold text-slate-800 truncate" title={expandedOcrItem.fullKey}>
                  {expandedOcrItem.fullKey}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors"
                  onClick={async () => {
                    const text =
                      typeof expandedOcrItem.value === 'string'
                        ? expandedOcrItem.value
                        : JSON.stringify(expandedOcrItem.value, null, 2);

                    try {
                      await navigator.clipboard.writeText(text);
                      setHasCopiedExpanded(true);
                      setTimeout(() => setHasCopiedExpanded(false), 1500);
                    } catch {
                      // fallback simples
                      try {
                        window.prompt('Copie o conteúdo abaixo:', text);
                      } catch {
                        // noop
                      }
                    }
                  }}
                >
                  <Copy className="w-4 h-4" />
                  {hasCopiedExpanded ? 'Copiado!' : 'Copiar'}
                </button>
                <button
                  type="button"
                  className="cursor-pointer p-2 hover:bg-slate-200 rounded-md text-slate-600"
                  onClick={() => setExpandedOcrItem(null)}
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 max-h-[70vh] overflow-auto">
              <pre className="whitespace-pre-wrap break-words text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-3">
                {typeof expandedOcrItem.value === 'string'
                  ? expandedOcrItem.value
                  : JSON.stringify(expandedOcrItem.value, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Banner informativo de pré-mapeamento - Versão melhorada */}
      {preMappedFields.size > 0 && (
        <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 border-2 border-purple-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-md">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-purple-800 mb-1 flex items-center gap-2">
                  Pré-mapeamento Inteligente Ativado
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white text-purple-700 border border-purple-200 rounded-full text-[10px] font-bold shadow-sm">
                    <Sparkles className="w-3 h-3" />
                    IA
                  </span>
                </h4>
                <p className="text-sm text-purple-700 mb-2">
                  Nossa IA analisou os documentos e sugeriu mapeamentos para{' '}
                  <span className="font-bold">{preMappedFields.size} variável(is)</span>.
                  Os campos foram preenchidos automaticamente com base nos dados extraídos.
                </p>
                <p className="text-xs text-purple-600 mb-3">
                  💡 Você pode editar ou remover qualquer sugestão. Revise os valores antes de continuar.
                </p>
                
                {/* Botão para expandir/recolher lista */}
                <button
                  onClick={() => setIsAiBannerExpanded(!isAiBannerExpanded)}
                  className="cursor-pointer text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1 transition-colors"
                >
                  <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isAiBannerExpanded ? 'rotate-90' : ''}`} />
                  {isAiBannerExpanded ? 'Ocultar detalhes' : 'Ver todos os mapeamentos'}
                </button>
              </div>
            </div>
          </div>
          
          {/* Lista expansível de campos mapeados */}
          {isAiBannerExpanded && (
            <div className="border-t border-purple-200 bg-white/50 p-4 animate-in slide-in-from-top-2 fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {Array.from(preMappedFields).map((fieldId) => {
                  const mapping = mappings[fieldId];
                  if (!mapping) return null;
                  
                  // Extrair label legível
                  const parts = fieldId.split('.');
                  const fieldLabel = parts.length > 1 
                    ? formatFieldLabel(parts[parts.length - 1])
                    : formatFieldLabel(fieldId);
                  
                  return (
                    <div 
                      key={fieldId} 
                      className="flex items-start gap-2 p-2 bg-white border border-purple-100 rounded-lg text-xs hover:shadow-sm transition-shadow"
                    >
                      <CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-purple-900 truncate" title={fieldId}>
                          {fieldLabel}
                        </div>
                        <div className="text-slate-600 truncate" title={mapping.value}>
                          {mapping.value}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
          <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-hide">
            <div className="pt-4">
              {renderOcrSections()}
            </div>
          </div>
        </div>

        {/* Right: Contract Target */}
        <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-secondary" />
                Variáveis do Template
              </h3>
            </div>

            {/* Botões de ação */}
            {hasLoadedOnce && !isLoadingVariables && (
              <div className="flex items-center gap-3">
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

          <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-hide">
            <div className="pt-4">
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
                  {categorizedVariables.map((category) => {
                    const Icon = category.icon;
                    const colorClasses = {
                      green: {
                        bg: 'bg-gradient-to-r from-green-50 to-green-100',
                        text: 'text-green-900',
                        border: 'border-green-200',
                        icon: 'text-green-600'
                      },
                      blue: {
                        bg: 'bg-gradient-to-r from-blue-50 to-blue-100',
                        text: 'text-blue-900',
                        border: 'border-blue-200',
                        icon: 'text-blue-600'
                      },
                      amber: {
                        bg: 'bg-gradient-to-r from-amber-50 to-amber-100',
                        text: 'text-amber-900',
                        border: 'border-amber-200',
                        icon: 'text-amber-600'
                      },
                      purple: {
                        bg: 'bg-gradient-to-r from-purple-50 to-purple-100',
                        text: 'text-purple-900',
                        border: 'border-purple-200',
                        icon: 'text-purple-600'
                      },
                      slate: {
                        bg: 'bg-slate-100',
                        text: 'text-slate-900',
                        border: 'border-slate-200',
                        icon: 'text-slate-600'
                      }
                    };
                    
                    const colors = colorClasses[category.color as keyof typeof colorClasses];
                    const totalVariables = category.subGroups 
                      ? category.subGroups.reduce((sum, sg) => sum + sg.variables.length, 0)
                      : category.variables?.length || 0;
                    
                    const mappedCount = category.subGroups
                      ? category.subGroups.reduce((sum, sg) => 
                          sum + sg.variables.filter(v => mappings[v.fullKey]).length, 0)
                      : category.variables?.filter(v => mappings[v.fullKey]).length || 0;
                    
                    return (
                      <details key={category.categoryKey} open className="group overflow-visible mb-4">
                        <summary className={`${colors.bg} list-none cursor-pointer sticky -top-1 z-30 shadow-sm rounded-md group-open:rounded-b-none transition-all duration-200 -mx-1 p-1 group-open:border-b ${colors.border}`}>
                          <div className={`px-4 py-3 font-bold ${colors.text} text-sm flex items-center justify-between`}>
                            <div className="flex items-center gap-2">
                              <Icon className={`w-5 h-5 ${colors.icon}`} />
                              <span>{category.categoryName}</span>
                              <span className="text-xs font-normal opacity-70">
                                ({mappedCount}/{totalVariables})
                              </span>
                            </div>
                            <ChevronRight className={`w-4 h-4 group-open:rotate-90 transition-transform ${colors.icon}`} />
                          </div>
                        </summary>
                        <div className="p-4 bg-white border-x border-b border-slate-100 rounded-b-xl animate-in fade-in slide-in-from-top-1 duration-200">
                          {category.subGroups ? (
                            <div className="space-y-3">
                              {category.subGroups.map((subGroup) => (
                                <details key={`${category.categoryKey}-${subGroup.index}`} open className="group/sub">
                                  <summary className="cursor-pointer text-sm font-semibold text-slate-700 hover:text-slate-900 list-none flex items-center gap-2 p-2 bg-slate-50 rounded-md hover:bg-slate-100 transition-colors">
                                    <ChevronDown className="w-4 h-4 group-open/sub:rotate-180 transition-transform" />
                                    <User className="w-4 h-4" />
                                    <span>{subGroup.personName}</span>
                                    <span className="text-xs font-normal text-slate-500">
                                      ({subGroup.variables.filter(v => mappings[v.fullKey]).length}/{subGroup.variables.length})
                                    </span>
                                  </summary>
                                  <div className="mt-2 ml-6 space-y-3">
                                    {subGroup.variables.length === 0 ? (
                                      <p className="text-sm text-slate-500">
                                        Nenhuma variável de {category.categoryKey === 'buyers' ? 'comprador' : 'vendedor'} encontrada neste template.
                                      </p>
                                    ) : (
                                      subGroup.variables.map((variable) =>
                                        renderContractField(variable.fullKey, variable.label)
                                      )
                                    )}
                                  </div>
                                </details>
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {category.variables?.map((variable) =>
                                renderContractField(variable.fullKey, variable.label)
                              )}
                            </div>
                          )}
                        </div>
                      </details>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
