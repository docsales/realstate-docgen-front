/**
 * Gera um ID único para arquivos
 * Usa timestamp + contador sequencial para evitar colisões
 */
let fileCounter = 0;

export const generateFileId = (): string => {
  const timestamp = Date.now();
  const counter = fileCounter++;
  
  // Reset counter a cada 1000 arquivos para evitar números muito grandes
  if (fileCounter >= 1000) {
    fileCounter = 0;
  }
  
  return `file_${timestamp}_${counter}_${Math.random().toString(36).substring(2, 9)}`;
};

