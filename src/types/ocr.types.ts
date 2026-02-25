/**
 * Tipos para integração OCR (via Backend)
 */

/**
 * Status do processamento OCR
 */
export const OcrStatus = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  ERROR: 'error',
} as const;

export type OcrStatus = typeof OcrStatus[keyof typeof OcrStatus];

/**
 * Metadata do documento para OCR
 */
export interface OcrMetadata {
  type: string;
  customId?: string;
  category?: 'buyers' | 'sellers' | 'property' | 'proposal';
  personId?: string;
  dealId?: string;
}

/**
 * Dados extraídos pelo OCR
 */
export interface OcrExtractedData {
  [key: string]: any;
}

/**
 * Parâmetros para upload de documento
 */
export interface OcrUploadParams {
  file: File;
  metadata: OcrMetadata;
  mode?: 'high_quality' | 'low_cost' | 'native_text';
  outputMode?: 'text' | 'json';
}

/**
 * Resposta do upload
 */
export interface OcrUploadResponse {
  success: boolean;
  whisperHash?: string;
  fileId?: string; // ID usado para polling (mesmo que documentId)
  documentId?: string; // ID do documento no banco de dados
  cached?: boolean; // Se foi encontrado no cache
  error?: string;
}

/**
 * Resposta do status OCR
 */
export interface OcrStatusResponse {
  status: OcrStatus;
  whisperHash?: string;
  extractedData?: OcrExtractedData;
  error?: string;
  processedAt?: Date;
}
