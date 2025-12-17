/**
 * Hook para gerenciar upload e status de documentos OCR
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { ocrService } from '@/services/ocr.service';
import type { UploadedFile } from '@/types/types';
import { OcrStatus } from '@/types/ocr.types';

// Tipos de documentos de estado civil que devem ser salvos no localStorage
const MARITAL_STATE_DOCUMENTS = [
  'CERTIDAO_CASAMENTO',
  'CERTIDAO_NASCIMENTO',
  'CERTIDAO_CASAMENTO_AVERBACAO_OBITO',
  'CERTIDAO_CASAMENTO_AVERBACAO_DIVORCIO',
  'CERTIDAO_OBITO',
  'ESCRITURA_UNIAO_ESTAVEL',
];

interface UseOcrOptions {
  autoProcess?: boolean;
  pollingInterval?: number; // Intervalo de polling em ms (default: 3000)
  onComplete?: (documentId: string, extractedData: any, localFileId: string) => void;
  onError?: (fileId: string, error: string) => void;
}

export const useOcr = (
  files: UploadedFile[],
  onFilesChange: (files: UploadedFile[]) => void,
  options: UseOcrOptions = {}
) => {
  const { 
    autoProcess = true, 
    pollingInterval = 5 * 60 * 1000, // 5 minutos
    onComplete, 
    onError 
  } = options;
  
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef<Set<string>>(new Set());
  const pollingRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const processedFilesRef = useRef<Set<string>>(new Set());

  /**
   * Salva dados extraídos no localStorage se for documento de estado civil
   */
  const saveToLocalStorage = useCallback((
    fileId: string,
    documentType: string,
    extractedData: any
  ) => {
    // Verificar se é documento de estado civil
    if (MARITAL_STATE_DOCUMENTS.includes(documentType)) {
      try {
        const dataToSave = {
          fileId,
          documentType,
          extractedData,
          timestamp: new Date().toISOString(),
        };
        
        const key = `ocr_extracted_data_${fileId}`;
        localStorage.setItem(key, JSON.stringify(dataToSave));
        
        console.log('💾 Dados de estado civil salvos no localStorage:', {
          fileId,
          documentType,
          key,
        });
      } catch (error) {
        console.error('❌ Erro ao salvar no localStorage:', error);
      }
    }
  }, []);

  /**
   * Atualiza status OCR de um arquivo
   */
  const updateFileOcrStatus = useCallback((
    fileId: string,
    status: OcrStatus,
    whisperHash?: string,
    error?: string,
    extractedData?: any
  ) => {
    onFilesChange(prevFiles => prevFiles.map(f => {
      if (f.id === fileId) {
        // Se completou e tem dados extraídos, salvar no localStorage
        if (status === OcrStatus.COMPLETED && extractedData && f.type) {
          saveToLocalStorage(fileId, f.type, extractedData);
        }
        
        return {
          ...f,
          ocrStatus: status,
          ocrWhisperHash: whisperHash || f.ocrWhisperHash,
          ocrError: error,
          ocrExtractedData: extractedData || f.ocrExtractedData,
        };
      }
      return f;
    }));
  }, [onFilesChange, saveToLocalStorage]);

  /**
   * Verifica status de um arquivo específico
   */
  const checkFileStatus = useCallback(async (documentId: string) => {
    try {
      const result = await ocrService.getStatus(documentId);
      
      // Encontrar o ID local do arquivo (pode ser o mesmo que documentId ou diferente)
      let localFileId = documentId;
      for (const [localId, mappedDocId] of fileIdMapRef.current.entries()) {
        if (mappedDocId === documentId) {
          localFileId = localId;
          break;
        }
      }
      
      if (result.status === 'completed') {
        updateFileOcrStatus(localFileId, OcrStatus.COMPLETED, undefined, undefined, result.extractedData);
        stopPolling(documentId);
        onComplete?.(documentId, result.extractedData, localFileId);
        console.log('✅ Arquivo concluído:', localFileId, '(documentId:', documentId, ')');
      } else if (result.status === 'error') {
        updateFileOcrStatus(localFileId, OcrStatus.ERROR, undefined, result.error);
        stopPolling(documentId);
        onError?.(localFileId, result.error || 'Erro no processamento');
        console.log('❌ Erro no arquivo:', localFileId);
      } else {
        console.log('⏳ Arquivo ainda processando:', documentId, '- Status:', result.status);
      }
    } catch (error) {
      console.error('❌ Erro ao verificar status:', documentId, error);
    }
  }, [updateFileOcrStatus, onComplete, onError]);

  /**
   * Inicia polling para verificar status de um arquivo
   */
  const startPolling = useCallback((fileId: string) => {
    // Se já está fazendo polling, não iniciar outro
    if (pollingRef.current.has(fileId)) return;

    const poll = () => checkFileStatus(fileId);

    const intervalId = setInterval(poll, pollingInterval);
    pollingRef.current.set(fileId, intervalId);
    
    // Fazer primeira verificação imediatamente
    poll();
  }, [pollingInterval, checkFileStatus]);

  /**
   * Para polling de um arquivo
   */
  const stopPolling = useCallback((fileId: string) => {
    const intervalId = pollingRef.current.get(fileId);
    if (intervalId) {
      clearInterval(intervalId);
      pollingRef.current.delete(fileId);
    }
  }, []);

  // Limpar todos os intervalos quando o componente desmontar
  useEffect(() => {
    return () => {
      pollingRef.current.forEach((intervalId) => {
        clearInterval(intervalId);
      });
      pollingRef.current.clear();
    };
  }, []);

  /**
   * Mapeamento de IDs locais para IDs do backend (documentId)
   */
  const fileIdMapRef = useRef<Map<string, string>>(new Map());

  /**
   * Processa um arquivo via OCR
   */
  const processFile = useCallback(async (file: UploadedFile) => {
    // Evitar processar o mesmo arquivo múltiplas vezes
    if (processingRef.current.has(file.id)) {
      console.log('⚠️ Arquivo já está sendo processado, ignorando:', file.id);
      return;
    }
    
    // Verificar se já foi processado
    if (processedFilesRef.current.has(file.id)) {
      console.log('⚠️ Arquivo já foi processado anteriormente, ignorando:', file.id);
      return;
    }
    
    processingRef.current.add(file.id);
    processedFilesRef.current.add(file.id);

    try {
      console.log('🚀 Iniciando OCR:', file.file.name, '- ID:', file.id);
      updateFileOcrStatus(file.id, OcrStatus.UPLOADING);

      const metadata = ocrService.createMetadata(
        file.type,
        file.category,
        file.personId,
        file.id
      );

      const result = await ocrService.uploadDocument({
        file: file.file,
        metadata,
      });

      if (!result.success) {
        throw new Error(result.error || 'Erro ao fazer upload');
      }

      const documentId = result.documentId || result.fileId;
      
      // Mapear ID local para documentId do backend (sem atualizar o array files)
      if (documentId && documentId !== file.id) {
        console.log(`📝 Mapeando ID: ${file.id} → ${documentId}`);
        fileIdMapRef.current.set(file.id, documentId);
        
        // Adicionar documentId aos registros para evitar reprocessamento
        processedFilesRef.current.add(documentId);
      }

      const finalId = documentId || file.id;
      
      console.log('✅ Upload OK, aguardando processamento... ID:', finalId);
      updateFileOcrStatus(file.id, OcrStatus.PROCESSING, result.whisperHash);

      // Iniciar polling usando o documentId do backend
      startPolling(finalId);

    } catch (error) {
      console.error('❌ Erro no OCR:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      updateFileOcrStatus(file.id, OcrStatus.ERROR, undefined, errorMsg);
      onError?.(file.id, errorMsg);
    } finally {
      processingRef.current.delete(file.id);
    }
  }, [updateFileOcrStatus, startPolling, onError]);

  /**
   * Processa múltiplos arquivos
   */
  const processMultipleFiles = useCallback(async (filesToProcess: UploadedFile[]) => {
    setIsProcessing(true);
    
    try {
      // Processar arquivos em paralelo (máximo 3 por vez)
      const chunks = [];
      for (let i = 0; i < filesToProcess.length; i += 3) {
        chunks.push(filesToProcess.slice(i, i + 3));
      }

      for (const chunk of chunks) {
        await Promise.all(chunk.map(f => processFile(f)));
      }
    } finally {
      setIsProcessing(false);
    }
  }, [processFile]);

  /**
   * Reprocessa um arquivo com erro
   */
  const retryFile = useCallback(async (fileId: string, currentFiles: UploadedFile[]) => {
    const file = currentFiles.find(f => f.id === fileId);
    if (file) {
      updateFileOcrStatus(fileId, OcrStatus.IDLE);
      await processFile(file);
    }
  }, [processFile, updateFileOcrStatus]);

  /**
   * Auto-processar novos arquivos
   */
  useEffect(() => {
    if (!autoProcess) return;

    // Filtra arquivos que realmente precisam de processamento
    const newFiles = files.filter(f => {
      // Ignorar se já tiver status diferente de IDLE ou undefined
      const hasStatus = f.ocrStatus && f.ocrStatus !== OcrStatus.IDLE;
      // Ignorar se já foi processado nesta sessão (evita loop)
      const alreadyProcessed = processedFilesRef.current.has(f.id);
      // Ignorar se está sendo processado agora
      const currentlyProcessing = processingRef.current.has(f.id);
      
      return !hasStatus && !alreadyProcessed && !currentlyProcessing;
    });

    if (newFiles.length > 0) {
      console.log(`📋 Detectados ${newFiles.length} novo(s) arquivo(s) para processar`);
      processMultipleFiles(newFiles);
    }
  }, [files, autoProcess, processMultipleFiles]); // Adicionado processMultipleFiles

  /**
   * Refresh manual - verifica status de todos os arquivos em processamento
   */
  const manualRefresh = useCallback(async (currentFiles: UploadedFile[]) => {
    const processingFiles = currentFiles.filter(f => f.ocrStatus === OcrStatus.PROCESSING);
    
    if (processingFiles.length === 0) {
      console.log('ℹ️ Nenhum arquivo em processamento para verificar');
      return;
    }

    console.log(`🔄 Refresh manual iniciado para ${processingFiles.length} arquivo(s)`);
    
    // Para cada arquivo em processamento, buscar o documentId do mapeamento
    await Promise.all(
      processingFiles.map(f => {
        // Tentar obter o documentId do backend, senão usar o ID local
        const documentId = fileIdMapRef.current.get(f.id) || f.id;
        return checkFileStatus(documentId);
      })
    );
    
    console.log('✅ Refresh manual concluído');
  }, [checkFileStatus]);

  /**
   * Cleanup ao desmontar
   */
  useEffect(() => {
    return () => {
      pollingRef.current.forEach((_, fileId) => stopPolling(fileId));
    };
  }, [stopPolling]);

  // Estatísticas
  const stats = {
    total: files.length,
    idle: files.filter(f => f.ocrStatus === OcrStatus.IDLE || !f.ocrStatus).length,
    uploading: files.filter(f => f.ocrStatus === OcrStatus.UPLOADING).length,
    processing: files.filter(f => f.ocrStatus === OcrStatus.PROCESSING).length,
    completed: files.filter(f => f.ocrStatus === OcrStatus.COMPLETED).length,
    error: files.filter(f => f.ocrStatus === OcrStatus.ERROR).length,
  };

  return {
    processFile,
    processMultipleFiles,
    retryFile,
    updateFileOcrStatus,
    manualRefresh,
    isProcessing,
    stats,
  };
};
