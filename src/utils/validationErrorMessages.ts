/**
 * Utilitário para melhorar mensagens de erro de validação de documentos
 * Traduz erros técnicos do backend em mensagens amigáveis para o usuário
 */

export interface ErrorTranslation {
  title: string;
  message: string;
  suggestion?: string;
}

/**
 * Traduz mensagens de erro de validação para mensagens amigáveis
 * @param error Mensagem de erro do backend
 * @returns Objeto com título, mensagem e sugestão
 */
export function translateValidationError(error: string): ErrorTranslation {
  const errorLower = error.toLowerCase();

  // 0. Erro específico de incompatibilidade de tipo (novo)
  if (errorLower.includes('document_type_mismatch')) {
    // Extrair os tipos esperado e extraído da mensagem
    const expectedMatch = error.match(/expected=([A-Z_]+)/);
    const extractedMatch = error.match(/extracted=([A-Z_]+)/);
    
    const expectedType = expectedMatch ? getDocumentTypeName(expectedMatch[1]) : 'esperado';
    const extractedType = extractedMatch ? getDocumentTypeName(extractedMatch[1]) : 'identificado';
    
    return {
      title: 'Documento Incompatível',
      message: `Este campo requer ${expectedType}, mas o documento enviado foi identificado como ${extractedType}.`,
      suggestion: 'Por favor, remova este arquivo e envie o documento correto. Certifique-se de que está enviando o tipo de documento solicitado.',
    };
  }

  // 1. Erro de campo proibido (estrutura incompatível)
  if (errorLower.includes('campo proibido') || errorLower.includes('estrutura incompatível')) {
    return {
      title: 'Documento Incorreto',
      message: 'O arquivo enviado não corresponde ao tipo de documento esperado.',
      suggestion: 'Verifique se você selecionou o arquivo correto. Por exemplo, não é possível enviar uma Certidão de Nascimento no campo de Certidão de Casamento.',
    };
  }

  // 2. Erro de tipo de documento não corresponde
  if (errorLower.includes('tipo de documento não corresponde') || errorLower.includes('tipo extraído')) {
    return {
      title: 'Tipo de Documento Inválido',
      message: 'O documento enviado não é do tipo esperado para este campo.',
      suggestion: 'Verifique se você está enviando o documento correto. O sistema identificou que o arquivo não corresponde ao tipo solicitado.',
    };
  }

  // 3. Erro de campo obrigatório ausente
  if (errorLower.includes('campo obrigatório ausente') || errorLower.includes('campo') && errorLower.includes('ausente')) {
    return {
      title: 'Documento Incompleto',
      message: 'O documento enviado está incompleto ou não possui as informações necessárias.',
      suggestion: 'Certifique-se de que o documento contém todas as informações obrigatórias e está legível.',
    };
  }

  // 4. Erro de validação de campos comuns
  if (errorLower.includes('validação de campos comuns falhou')) {
    return {
      title: 'Erro na Validação',
      message: 'Não foi possível validar as informações básicas do documento.',
      suggestion: 'O documento pode estar ilegível ou em formato incompatível. Tente enviar uma imagem de melhor qualidade.',
    };
  }

  // 5. Erro genérico de OCR/processamento
  if (errorLower.includes('ocr') || errorLower.includes('processamento')) {
    return {
      title: 'Erro no Processamento',
      message: 'Houve um erro ao processar o documento.',
      suggestion: 'Tente enviar o documento novamente. Se o erro persistir, verifique se a imagem está nítida e legível.',
    };
  }

  // 6. Timeout ou erro de conexão
  if (errorLower.includes('timeout') || errorLower.includes('conexão')) {
    return {
      title: 'Erro de Conexão',
      message: 'Não foi possível processar o documento por problema de conexão.',
      suggestion: 'Verifique sua conexão com a internet e tente novamente.',
    };
  }

  // Mensagem padrão para erros não mapeados
  return {
    title: 'Erro na Validação',
    message: error || 'Ocorreu um erro ao validar o documento.',
    suggestion: 'Tente enviar o documento novamente. Se o problema persistir, entre em contato com o suporte.',
  };
}

/**
 * Gera uma mensagem de erro formatada para exibição
 * @param error Mensagem de erro do backend
 * @returns String formatada para exibição
 */
export function formatValidationError(error: string): string {
  const translation = translateValidationError(error);
  let formatted = `${translation.title}: ${translation.message}`;
  
  if (translation.suggestion) {
    formatted += ` ${translation.suggestion}`;
  }
  
  return formatted;
}

/**
 * Extrai tipo de documento do nome do campo se possível
 * @param fieldName Nome do campo (ex: "CERTIDAO_CASAMENTO")
 * @returns Nome amigável do tipo de documento
 */
export function getDocumentTypeName(fieldName: string): string {
  const documentTypes: Record<string, string> = {
    'CERTIDAO_CASAMENTO': 'Certidão de Casamento',
    'CERTIDAO_CASAMENTO_AVERBACAO_OBITO': 'Certidão de Casamento com Averbação de Óbito',
    'CERTIDAO_CASAMENTO_AVERBACAO_DIVORCIO': 'Certidão de Casamento com Averbação de Divórcio',
    'CERTIDAO_NASCIMENTO': 'Certidão de Nascimento',
    'ESCRITURA_UNIAO_ESTAVEL': 'Escritura de União Estável',
    'RG': 'RG',
    'CNH': 'CNH',
    'CPF': 'CPF',
    'COMPROVANTE_RESIDENCIA': 'Comprovante de Residência',
    'COMPROVANTE_ESTADO_CIVIL': 'Comprovante de Estado Civil',
  };

  return documentTypes[fieldName] || fieldName.replace(/_/g, ' ');
}
