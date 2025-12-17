/**
 * Serviço OCR - Faz upload de documentos para o backend
 */

import type { OcrUploadParams, OcrUploadResponse, OcrStatusResponse, OcrMetadata } from '@/types/ocr.types';

// URL base da API (sem prefixo /api/v1)
const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:3004';
const API_URL = `${BASE_URL}/api/v1`;

/**
 * Serviço para upload e consulta de documentos OCR
 */
export const ocrService = {
  /**
   * Faz upload de documento para processamento OCR via backend
   */
  async uploadDocument(params: OcrUploadParams): Promise<OcrUploadResponse> {
    try {
      const uploadUrl = `${API_URL}/document/ocr/upload`;

      const formData = new FormData();
      formData.append('file', params.file);
      formData.append('documentType', params.metadata.type);
      
      if (params.metadata.customId) {
        formData.append('customId', params.metadata.customId);
      }
      if (params.metadata.category) {
        formData.append('category', params.metadata.category);
      }
      if (params.metadata.personId) {
        formData.append('personId', params.metadata.personId);
      }
      if (params.mode) {
        formData.append('mode', params.mode);
      }
      if (params.outputMode) {
        formData.append('outputMode', params.outputMode);
      }

      console.log('📤 Enviando documento para OCR:', {
        fileName: params.file.name,
        fileSize: params.file.size,
        documentType: params.metadata.type,
      });

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Erro HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Documento enviado com sucesso:', result);

      return {
        success: result.success,
        whisperHash: result.whisperHash,
        fileId: result.documentId || result.fileId, // Usar documentId (ID do banco) prioritariamente
        documentId: result.documentId,
        cached: result.cached,
      };

    } catch (error) {
      console.error('❌ Erro ao fazer upload:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  },

  /**
   * Consulta status de processamento de um documento
   */
  async getStatus(fileId: string): Promise<OcrStatusResponse> {
    try {
      const response = await fetch(`${API_URL}/document/ocr/status/${fileId}`);
      
      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('❌ Erro ao consultar status:', error);
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  },

  /**
   * Cria metadata para um documento
   */
  createMetadata(
    documentType: string,
    category: 'buyers' | 'sellers' | 'property',
    personId?: string,
    customId?: string
  ): OcrMetadata {
    return {
      type: documentType,
      category,
      personId,
      customId: customId || personId,
    };
  },
};
