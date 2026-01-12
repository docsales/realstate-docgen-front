// Deal status (matching backend DealStatus enum)
export interface PaginatedResponse<T> {
  data: T[];
  next: number | null;
  total: number;
}

export type DealStatus = 'DRAFT' | 'SENT' | 'READ' | 'PARTIALLY_SIGNED' | 'SIGNED' | 'REJECTED' | 'CANCELED';

export type SignerStatus = 'waiting' | 'signed' | 'rejected' | 'cancelled' | 'read';

export interface Deal {
  id: string;
  ownerId: string;
  name?: string;
  docTemplateId?: string;
  status: DealStatus;
  consolidated?: ConsolidatedDealData;
  metadata?: any;
  contractModel?: string;
  contractFields?: any;
  expirationDate?: string;
  createdAt: string;
  updatedAt: string;
  signers?: Signatory[];
  documents?: any[];
}

export interface GeneratePreviewResponse {
  edit_url: string;
  id: string;
  status_code: number;
}

export interface UpdateDealDataDto {
  name?: string;
  docTemplateId?: string;
  expirationDate?: string;
  metadata?: any;
  contractFields?: any;
  consolidated?: ConsolidatedDealData;
  signers?: Signatory[];
}

export interface ConsolidatedDealData {
  draftPreviewUrl: string;
  generatedDocId: string;
  docsalesPdfUrl: string;
}

export interface Signatory {
  id: string;
  dealId?: string;
  name: string;
  email: string;
  phoneNumber?: string;
  signingOrder: number;
  role: string;
  status?: SignerStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface UploadedFile {
  id: string;
  file: File;
  type: string; // The PRIMARY document type ID (e.g., 'RG', 'CPF', 'MATRICULA') - backwards compatibility
  types?: string[]; // Multiple document types this file satisfies (e.g., ['RG', 'CPF'])
  category: 'buyers' | 'sellers' | 'property' | 'proposal'; // Which category this document belongs to
  personId?: string; // Links the document to a specific Person ID
  validated?: boolean; // Whether the document has been validated by the server
  validationError?: string; // Error message if validation failed
  
  // OCR Integration fields
  ocrStatus?: import('./ocr.types').OcrStatus; // Status do processamento OCR
  ocrWhisperHash?: string; // Hash único do processamento LLMWhisperer
  ocrExtractedData?: import('./ocr.types').OcrExtractedData; // Dados extraídos pelo OCR
  ocrError?: string; // Erro no processamento OCR
  ocrProcessingTime?: number; // Tempo de processamento em ms
  documentId?: string; // ID do documento no backend (diferente do ID local)
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
  docTemplateId: string;
  expiration_date?: string;
  useFgts: boolean;
  bankFinancing: boolean;
  consortiumLetter: boolean;
  contractValue?: string;
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

export const CONTRACT_FIELDS = [
  { id: 'seller_name', label: 'Nome do Vendedor' },
  { id: 'seller_cpf', label: 'CPF do Vendedor' },
  { id: 'seller_address', label: 'Endereço Completo' },
  { id: 'property_city', label: 'Cidade do Imóvel' },
  { id: 'property_zip', label: 'CEP do Imóvel' },
  { id: 'doc_ref_month', label: 'Mês Referência (Comp. Res.)' }
];
