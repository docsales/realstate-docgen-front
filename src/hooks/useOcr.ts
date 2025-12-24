/**
 * Hook para gerenciar upload e status de documentos OCR
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { ocrService } from '@/services/ocr.service';
import type { UploadedFile } from '@/types/types';
import { OcrStatus } from '@/types/ocr.types';
import { Socket } from 'socket.io-client';

interface UseOcrOptions {
  autoProcess?: boolean;
  dealId?: string; // ID do deal para vincular documento imediatamente
  onComplete?: (documentId: string, extractedData: any, localFileId: string) => void;
  onError?: (fileId: string, error: string) => void;
}

export const useOcr = (
  files: UploadedFile[],
  onFilesChange: (files: UploadedFile[] | ((prevFiles: UploadedFile[]) => UploadedFile[])) => void,
  options: UseOcrOptions = {}
) => {
  const { 
    autoProcess = true, 
    dealId,
    onComplete, 
    onError 
  } = options;
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const processingRef = useRef<Set<string>>(new Set());
  const processedFilesRef = useRef<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);

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
    onFilesChange((prevFiles: any[]) => prevFiles.map(f => {
      if (f.id === fileId) {        
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
  }, [onFilesChange]);

  /**
   * Mapeamento de IDs locais para IDs do backend (documentId)
   */
  const fileIdMapRef = useRef<Map<string, string>>(new Map());

  /**
   * Verifica status de um arquivo específico (para checagem manual)
   */
  const checkFileStatus = useCallback(async (documentId: string): Promise<{ status: string; hasUpdate: boolean }> => {
    // Verificar se já existe uma requisição em andamento para este arquivo
    const requestKey = `checkStatus_${documentId}`;
    if (processingRef.current.has(requestKey)) {
      console.log('⏸️ Verificação de status já em andamento para:', documentId);
      return { status: 'processing', hasUpdate: false };
    }

    processingRef.current.add(requestKey);

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
        onComplete?.(documentId, result.extractedData, localFileId);
        console.log('✅ Arquivo concluído:', localFileId, '(documentId:', documentId, ')');
        return { status: 'completed', hasUpdate: true };
      } else if (result.status === 'error') {
        updateFileOcrStatus(localFileId, OcrStatus.ERROR, undefined, result.error);
        onError?.(localFileId, result.error || 'Erro no processamento');
        console.log('❌ Erro no arquivo:', localFileId);
        return { status: 'error', hasUpdate: true };
      } else {
        // Mesmo que esteja processando, atualizar informações disponíveis (whisperHash, etc)
        const currentFile = files.find(f => f.id === localFileId);
        if (result.whisperHash && result.whisperHash !== currentFile?.ocrWhisperHash) {
          updateFileOcrStatus(localFileId, OcrStatus.PROCESSING, result.whisperHash);
        }
        console.log('⏳ Arquivo ainda processando:', documentId, '- Status:', result.status);
        return { status: result.status, hasUpdate: false };
      }
    } catch (error) {
      console.error('❌ Erro ao verificar status:', documentId, error);
      return { status: 'error', hasUpdate: false };
    } finally {
      processingRef.current.delete(requestKey);
    }
  }, [updateFileOcrStatus, onComplete, onError, files]);

  /**
   * Processa um arquivo via OCR
   */
  const processFile = useCallback(async (file: UploadedFile) => {
    // Evitar processar o mesmo arquivo múltiplas vezes
    if (processingRef.current.has(file.id)) {
      console.log('⚠️ Arquivo já está sendo processado, ignorando:', file.id);
      return;
    }
    
    // Verificar status real do arquivo antes de bloquear
    // Permitir reprocessamento se arquivo estiver em erro ou se for uma nova ação
    const fileStatus = files.find(f => f.id === file.id)?.ocrStatus;
    const shouldBlock = processedFilesRef.current.has(file.id) && 
                       fileStatus !== OcrStatus.ERROR && 
                       fileStatus !== OcrStatus.IDLE;
    
    if (shouldBlock) {
      console.log('⚠️ Arquivo já foi processado e não precisa reprocessar:', file.id, '- Status:', fileStatus);
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
        file.id,
        dealId
      );

      const result = await ocrService.uploadDocument({
        file: file.file,
        metadata,
      });

      if (!result.success) {
        throw new Error(result.error || 'Erro ao fazer upload');
      }

      const documentId = result.documentId || result.fileId;
      
      // Mapear ID local para documentId do backend
      if (documentId && documentId !== file.id) {
        console.log(`📝 Mapeando ID: ${file.id} → ${documentId}`);
        fileIdMapRef.current.set(file.id, documentId);
        
        // Adicionar documentId aos registros para evitar reprocessamento
        processedFilesRef.current.add(documentId);
        
        // Salvar documentId no arquivo para uso posterior
        onFilesChange((prevFiles: any[]) => prevFiles.map(f => {
          if (f.id === file.id) {
            return { ...f, documentId };
          }
          return f;
        }));
      }

      const finalId = documentId || file.id;
      
      console.log('✅ Upload OK, aguardando processamento via WebSocket... ID:', finalId);
      updateFileOcrStatus(file.id, OcrStatus.PROCESSING, result.whisperHash);

    } catch (error) {
      console.error('❌ Erro no OCR:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      updateFileOcrStatus(file.id, OcrStatus.ERROR, undefined, errorMsg);
      // Remover do processedFilesRef em caso de erro para permitir retry
      processedFilesRef.current.delete(file.id);
      onError?.(file.id, errorMsg);
    } finally {
      processingRef.current.delete(file.id);
    }
  }, [updateFileOcrStatus, onError, files]);

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
      // Limpar do processedFilesRef para permitir reprocessamento
      processedFilesRef.current.delete(fileId);
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
      // Ignorar se está sendo processado agora
      const currentlyProcessing = processingRef.current.has(f.id);
      
      // Verificar status real antes de bloquear por processedFilesRef
      // Permitir processar se arquivo está em erro ou idle
      const shouldProcess = !hasStatus && !currentlyProcessing;
      
      if (!shouldProcess) {
        return false;
      }

      // Se já foi processado, verificar se precisa reprocessar
      if (processedFilesRef.current.has(f.id)) {
        // Permitir reprocessar apenas se estiver em erro
        return f.ocrStatus === OcrStatus.ERROR || f.ocrStatus === OcrStatus.IDLE;
      }
      
      return true;
    });

    if (newFiles.length > 0) {
      console.log(`📋 Detectados ${newFiles.length} novo(s) arquivo(s) para processar`);
      processMultipleFiles(newFiles);
    }
  }, [files, autoProcess, processMultipleFiles]);

  /**
   * Refresh manual - força processamento em batch de todos os arquivos em processamento
   */
  const manualRefresh = useCallback(async (currentFiles: UploadedFile[]) => {
    const processingFiles = currentFiles.filter(f => f.ocrStatus === OcrStatus.PROCESSING || f.ocrStatus === OcrStatus.UPLOADING);
    
    if (processingFiles.length === 0) {
      console.log('ℹ️ Nenhum arquivo em processamento para verificar');
      return;
    }

    console.log(`🔄 Refresh manual iniciado para ${processingFiles.length} arquivo(s) - processando em batch`);
    setIsCheckingStatus(true);
    
    try {
      // Coletar todos os documentIds (priorizar documentId salvo no arquivo)
      const documentIds = processingFiles.map(f => {
        // 1. Tentar pegar do arquivo
        if (f.documentId) return f.documentId;
        // 2. Tentar pegar do mapeamento em memória
        const mappedId = fileIdMapRef.current.get(f.id);
        if (mappedId) return mappedId;
        // 3. Usar ID local como fallback
        return f.id;
      });
      
      console.log('📋 DocumentIds para verificar:', documentIds);

      // Processar todos em batch no backend
      const batchResult = await ocrService.processBatch(documentIds);
      
      console.log('✅ Refresh manual concluído (batch)', {
        total: processingFiles.length,
        processed: batchResult.processed,
        errors: batchResult.errors,
        stillProcessing: batchResult.stillProcessing
      });

      // Após processamento em batch, verificar status atualizado de cada documento
      // (os eventos WebSocket devem atualizar automaticamente, mas fazemos uma verificação final)
      if (batchResult.processed > 0 || batchResult.errors > 0) {
        // Aguardar um pouco para os eventos WebSocket chegarem
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verificar status atualizado de cada documento
        await Promise.all(
          documentIds.map(documentId => checkFileStatus(documentId))
        );
      }
    } catch (error) {
      console.error('❌ Erro no refresh manual:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  }, [checkFileStatus]);

  /**
   * Conectar WebSocket e escutar eventos de OCR
   */
  useEffect(() => {
    let socket: Socket | null = null;
    let isMounted = true;

    const connectWebSocket = async () => {
      // Conectar apenas se houver arquivos
      if (files.length === 0) {
        return;
      }

      // Desconectar socket anterior se existir
      if (socketRef.current) {
        console.log('🔄 Desconectando WebSocket anterior antes de reconectar');
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      socket = await ocrService.connectWebSocket();
      
      if (!socket || !isMounted) {
        if (socket) {
          socket.disconnect();
        }
        console.warn('⚠️ Não foi possível conectar WebSocket ou componente foi desmontado');
        return;
      }

      socketRef.current = socket;

      // Escutar evento de OCR completado
      socket.on('ocr_completed', (data: { documentId: string; extractedData: any; status: string }) => {
        if (!isMounted) return;
        
        console.log('📊 extractedData recebido:', data.extractedData ? 'SIM' : 'NÃO', data.extractedData);
        
        // Encontrar o ID local do arquivo
        let localFileId = data.documentId;
        for (const [localId, mappedDocId] of fileIdMapRef.current.entries()) {
          if (mappedDocId === data.documentId) {
            localFileId = localId;
            break;
          }
        }

        updateFileOcrStatus(localFileId, OcrStatus.COMPLETED, undefined, undefined, data.extractedData);
        onComplete?.(data.documentId, data.extractedData, localFileId);
      });

      // Escutar evento de erro no OCR
      socket.on('ocr_error', (data: { documentId: string; error: string }) => {
        if (!isMounted) return;
        
        console.log('📨 Evento ocr_error recebido:', data);
        
        // Encontrar o ID local do arquivo
        let localFileId = data.documentId;
        for (const [localId, mappedDocId] of fileIdMapRef.current.entries()) {
          if (mappedDocId === data.documentId) {
            localFileId = localId;
            break;
          }
        }

        updateFileOcrStatus(localFileId, OcrStatus.ERROR, undefined, data.error);
        onError?.(localFileId, data.error);
      });

      // Verificar status de arquivos em processamento ao reconectar
      const processingFiles = files.filter(f => 
        f.ocrStatus === OcrStatus.PROCESSING || 
        f.ocrStatus === OcrStatus.UPLOADING
      );
      
      if (processingFiles.length > 0) {
        console.log(`🔄 Reconectado: verificando status de ${processingFiles.length} arquivo(s) em processamento`);
        // Aguardar um pouco para garantir que o WebSocket está pronto
        setTimeout(() => {
          if (isMounted) {
            processingFiles.forEach(file => {
              const documentId = fileIdMapRef.current.get(file.id) || file.id;
              checkFileStatus(documentId).catch(err => {
                console.error('❌ Erro ao verificar status após reconexão:', err);
              });
            });
          }
        }, 1000);
      }
    };

    connectWebSocket();

    // Cleanup: desconectar WebSocket quando componente desmontar
    return () => {
      isMounted = false;
      if (socket) {
        console.log('🧹 Desconectando WebSocket');
        socket.disconnect();
        socketRef.current = null;
      }
      // Não limpar processingRef aqui para não interromper requisições em andamento
      // processingRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.length]); // Usar apenas files.length para evitar reconexões desnecessárias

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
    isCheckingStatus,
    stats,
  };
};
