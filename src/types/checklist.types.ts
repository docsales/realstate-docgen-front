// Tipos baseados na resposta da API de checklist de documentos

export interface DocumentModel {
  id: string;
  nome: string;
  categoria: string;
  observacao: string;
  obrigatorio: boolean;
  de: string;
}

export interface Alert {
  tipo: 'CRITICO' | 'BLOQUEIO' | 'ATENCAO' | 'PRAZO' | 'INFO';
  mensagem: string;
}

export interface ResumoChecklist {
  totalDocumentos: number;
  complexidade: string;
  pontuacaoComplexidade: number;
  prazoEstimadoDias: number;
  dataEstimadaConclusao: string;
}

export interface ParteChecklist {
  tipo: string;
  estadoCivil?: string;
  vaiFinanciar?: boolean;
  totalDocumentos: number;
  documentos: DocumentModel[];
  alertas: Alert[];
}

export interface ImovelChecklist {
  situacao: string;
  tipoImovel: string;
  totalDocumentos: number;
  documentos: DocumentModel[];
  alertas: Alert[];
}

export interface Metadados {
  dataGeracao: string;
  versao: string;
}

export interface ChecklistResult {
  resumo: ResumoChecklist;
  vendedor: ParteChecklist;
  comprador: ParteChecklist;
  imovel: ImovelChecklist;
  alertasGerais: Alert[];
  metadados: Metadados;
}

export interface ChecklistResponse {
  sucesso: boolean;
  dados: ChecklistResult;
}

export interface ValidateResponse {
  sucesso: boolean;
  valido: boolean;
  erros: string[];
}

// DTO para enviar à API
export interface ChecklistRequestDTO {
  vendedor: {
    tipo: string;
    estadoCivil?: string;
    regimeBens?: string;
    houveInventario?: boolean;
    divorcioJudicial?: boolean;
    houvePartilha?: boolean;
    temContratoConvivencia?: boolean;
  };
  comprador: {
    tipo: string;
    estadoCivil?: string;
    regimeBens?: string;
    vaiFinanciar?: boolean;
    temContratoConvivencia?: boolean;
  };
  imovel: {
    situacao: string;
    tipoImovel: string;
    areaM2?: number;
    temClausulaInalienabilidade?: boolean;
    temUsufruto?: boolean;
  };
}

// Checklist consolidado (para múltiplos vendedores/compradores)
export interface ConsolidatedChecklist {
  resumo: {
    totalDocumentos: number;
    complexidadeMaxima: string;
    pontuacaoMaxima: number;
    prazoEstimadoDias: number;
    dataEstimadaConclusao: string;
  };
  vendedores: {
    documentos: DocumentModel[];
    alertas: Alert[];
  };
  compradores: {
    documentos: DocumentModel[];
    alertas: Alert[];
  };
  imovel: {
    documentos: DocumentModel[];
    alertas: Alert[];
  };
  alertasGerais: Alert[];
  metadados: {
    dataGeracao: string;
    versao: string;
    totalCombinacoes: number;
  };
}



