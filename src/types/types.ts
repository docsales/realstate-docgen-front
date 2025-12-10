
export interface Deal {
  id: string;
  name: string;
  status: 'preparation' | 'sent' | 'signed';
  createdAt: string;
  clientName: string;
}

export interface Signatory {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'comprador' | 'vendedor' | 'testemunha' | 'corretor';
}

export interface UploadedFile {
  id: string;
  file: File;
  type: string; // The document type ID (e.g., 'RG', 'CPF', 'MATRICULA')
  category: 'buyers' | 'sellers' | 'property'; // Which category this document belongs to
  personId?: string; // Links the document to a specific Person ID
  validated?: boolean; // Whether the document has been validated by the server
  validationError?: string; // Error message if validation failed
}

// Types for person configuration
export type PersonType = 'PF' | 'PJ';
export type MaritalState = 'solteiro' | 'casado' | 'viuvo' | 'divorciado' | 'uniao_estavel';
export type PropertyRegime = 'comunhao_universal' | 'comunhao_parcial' | 'separacao_total' | 'participacao_final';
export type PropertyState = 'quitado' | 'financiado' | 'herdado' | 'doado' | 'em_construcao' | 'com_usufruto';
export type PropertyType = 'urbano' | 'rural';

export interface Person {
  id: string;
  personType: PersonType;
  maritalState?: MaritalState;
  propertyRegime?: PropertyRegime;
  isSpouse?: boolean;
}

// Mapping value with source tracking
export interface MappingValue {
  value: string;
  source: 'drag' | 'manual'; // Track if value came from drag & drop or manual editing
}

// OCR data grouped by person
export interface OcrDataByPerson {
  personId: string;
  data: any; // OCR extracted data
}

// Contract field definition
export interface ContractField {
  id: string;
  label: string;
}

// Contract fields grouped by section
export interface ContractFieldSection {
  section: string;
  personId?: string; // Optional link to person for sellers/buyers sections
  fields: ContractField[];
}

export interface DealConfig {
  name: string;
  contractModel: string;
  useFgts: boolean;
  bankFinancing: boolean;
  consortiumLetter: boolean;
  sellers: Person[];
  buyers: Person[];
  propertyState: PropertyState;
  propertyType: PropertyType;
  deedCount: number;
  activePartyTab?: 'sellers' | 'buyers' | 'property';
}

// Helper to create a default person
export const createDefaultPerson = (id?: string): Person => ({
  id: id || crypto.randomUUID(),
  personType: 'PF',
  maritalState: 'solteiro',
  isSpouse: false,
});

// Mock OCR Data Structure based on prompt
export const MOCK_OCR_DATA = {
  "nome": "ALCINO ALVES DA SILVA",
  "cpf_cnpj": "1*.. ***-71",
  "cpf_cnpj_formatado": "CPF parcialmente mascarado (últimos dígitos: 71)",
  "tipo_pessoa": "FÍSICA",
  "endereco_completo": "RUA 123, 27, SÃO PAULO, 12345-543 - SANTANA - SP",
  "documento": {
    "tipo": "CONTA DE LUZ",
    "subtipo": "Energia Elétrica",
    "empresa": "Enel Eletropaulo",
    "cnpj_empresa": "12.234567/0001-11",
    "mes_referencia": "02/2025",
    "valor_total": 236.86
  },
  "endereco": {
    "logradouro": "Rua Diogo Lara de Moraes",
    "numero": "27",
    "bairro": "Jardim São Luiz",
    "cidade": "Santana de Parnaíba",
    "estado": "SP",
    "cep_formatado": "12345-567",
    "tipo_imovel": "RESIDENCIAL"
  }
};

// Mock OCR data grouped by person (for testing)
// Note: These personIds should match the default sellers/buyers created in NewDealWizard
export const MOCK_OCR_DATA_BY_PERSON: OcrDataByPerson[] = [
  {
    personId: 'default-seller-1',
    data: {
      "nome": "ALCINO ALVES DA SILVA",
      "cpf_cnpj": "123.456.789-71",
      "rg": "12.345.678-9",
      "tipo_pessoa": "FÍSICA",
      "endereco_completo": "RUA DIOGO LARA DE MORAES, 27, JARDIM SÃO LUIZ, 06500-999 - SANTANA DE PARNAÍBA - SP",
      "documento": {
        "tipo": "CONTA DE LUZ",
        "subtipo": "Energia Elétrica",
        "empresa": "Enel Eletropaulo",
        "cnpj_empresa": "61.695.227/0001-93",
        "mes_referencia": "02/2025",
        "valor_total": 236.86
      },
      "endereco": {
        "logradouro": "Rua Diogo Lara de Moraes",
        "numero": "27",
        "bairro": "Jardim São Luiz",
        "cidade": "Santana de Parnaíba",
        "estado": "SP",
        "cep_formatado": "06500-999",
        "tipo_imovel": "RESIDENCIAL"
      }
    }
  },
  {
    personId: 'default-buyer-1',
    data: {
      "nome": "MARIA SANTOS OLIVEIRA",
      "cpf_cnpj": "987.654.321-00",
      "rg": "98.765.432-1",
      "tipo_pessoa": "FÍSICA",
      "endereco_completo": "AV PAULISTA, 1000, BELA VISTA, 01310-100 - SÃO PAULO - SP",
      "documento": {
        "tipo": "COMPROVANTE DE RESIDÊNCIA",
        "subtipo": "Conta de Água",
        "empresa": "SABESP",
        "mes_referencia": "03/2025",
        "valor_total": 89.50
      },
      "endereco": {
        "logradouro": "Avenida Paulista",
        "numero": "1000",
        "bairro": "Bela Vista",
        "cidade": "São Paulo",
        "estado": "SP",
        "cep_formatado": "01310-100",
        "tipo_imovel": "RESIDENCIAL"
      }
    }
  },
  {
    personId: 'property',
    data: {
      "endereco_completo": "RUA DAS FLORES, 123, JARDIM EUROPA, 01234-567 - SÃO PAULO - SP",
      "endereco": {
        "logradouro": "Rua das Flores",
        "numero": "123",
        "bairro": "Jardim Europa",
        "cidade": "São Paulo",
        "estado": "SP",
        "cep_formatado": "01234-567",
        "tipo_imovel": "RESIDENCIAL"
      },
      "matricula": "12345",
      "area_total": "250m²",
      "area_construida": "180m²"
    }
  }
];

export const CONTRACT_FIELDS = [
  { id: 'seller_name', label: 'Nome do Vendedor' },
  { id: 'seller_cpf', label: 'CPF do Vendedor' },
  { id: 'seller_address', label: 'Endereço Completo' },
  { id: 'property_city', label: 'Cidade do Imóvel' },
  { id: 'property_zip', label: 'CEP do Imóvel' },
  { id: 'doc_ref_month', label: 'Mês Referência (Comp. Res.)' }
];

export const MOCK_DEALS: Deal[] = [
  { id: '1', name: 'Compra Apto Jardins', status: 'preparation', createdAt: '2023-10-25', clientName: 'Roberto Carlos' },
  { id: '2', name: 'Venda Casa Morumbi', status: 'sent', createdAt: '2023-10-20', clientName: 'Ana Maria' },
  { id: '3', name: 'Aluguel Galpão', status: 'signed', createdAt: '2023-10-15', clientName: 'Empresa XYZ' },
  { id: '4', name: 'Terreno Interior', status: 'preparation', createdAt: '2023-10-26', clientName: 'João da Silva' },
];
