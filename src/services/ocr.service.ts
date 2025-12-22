/**
 * Serviço OCR - Faz upload de documentos para o backend
 */

import type { OcrUploadParams, OcrUploadResponse, OcrStatusResponse, OcrMetadata } from '@/types/ocr.types';
import { server } from './api.service';
import { io, Socket } from 'socket.io-client';
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3004';
const GATEWAY_API_URL = API_URL.replace("api/v1", "ocr");

/**
 * Serviço para upload e consulta de documentos OCR
 */
export const ocrService = {
  /**
   * Faz upload de documento para processamento OCR via backend
   */
  async uploadDocument(params: OcrUploadParams): Promise<OcrUploadResponse> {
    try {
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
      if (params.metadata.dealId) {
        formData.append('dealId', params.metadata.dealId);
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

      const response = await server.api.post('/document/ocr/upload', formData, { withCredentials: true });
      const result = response.data;
      console.log('✅ Documento enviado com sucesso:', result);

      return {
        success: result.success,
        whisperHash: result.whisperHash,
        fileId: result.documentId || result.fileId,
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
      const response = await server.api.get(`/document/ocr/status/${fileId}`, { withCredentials: true });
      
      const result = response.data;
      return result;

    } catch (error) {
      console.error('❌ Erro ao consultar status:', error);
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  },

  /**
   * Força processamento em batch de múltiplos documentos
   */
  async processBatch(documentIds: string[]): Promise<{ processed: number; errors: number; stillProcessing: number }> {
    try {
      const response = await server.api.post('/document/ocr/process-batch', 
        { documentIds }, 
        { withCredentials: true }
      );
      
      const result = response.data;
      return {
        processed: result.processed || 0,
        errors: result.errors || 0,
        stillProcessing: result.stillProcessing || 0,
      };

    } catch (error) {
      console.error('❌ Erro ao processar batch:', error);
      return {
        processed: 0,
        errors: documentIds.length,
        stillProcessing: 0,
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
    customId?: string,
    dealId?: string
  ): OcrMetadata {
    return {
      type: documentType,
      category,
      personId,
      customId: customId || personId,
      dealId,
    };
  },

  /**
   * Conecta WebSocket para receber notificações de OCR em tempo real
   */
  async connectWebSocket(): Promise<Socket | null> {
    try {
      // Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error('❌ Token de autenticação não disponível para WebSocket');
        return null;
      }

      // Conectar ao namespace /ocr
      // Socket.IO: URL completa com namespace no final, path padrão /socket.io
      const socket = io(GATEWAY_API_URL, {
        path: '/socket.io',
        auth: {
          token: session.access_token,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
      });

      socket.on('connect', () => {
        console.log('✅ WebSocket conectado para eventos OCR');
      });

      socket.on('disconnect', (reason) => {
        console.log('⚠️ WebSocket desconectado:', reason);
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Erro ao conectar WebSocket:', error.message);
      });

      return socket;
    } catch (error) {
      console.error('❌ Erro ao conectar WebSocket:', error);
      return null;
    }
  },
};
