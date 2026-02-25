import { server } from '@/services/api.service';
import type { 
  ChecklistResponse, 
  ValidateResponse, 
  ChecklistRequestDTO,
  ConsolidatedChecklist,
  ChecklistResult,
  DocumentModel,
  Alert
} from '@/types/checklist.types';

export class DocumentChecklistService {
  /**
   * Gera checklist de documentos para uma configuração específica
   */
  async generateChecklist(dados: ChecklistRequestDTO): Promise<ChecklistResponse | null> {
    try {
      const response = await server.api.post<ChecklistResponse>('/document/checklist', dados);
      return response.data;
    } catch (error) {
      console.error('Erro ao gerar checklist:', error);
      return null;
    }
  }

  /**
   * Valida os dados antes de gerar o checklist
   */
  async validateData(dados: ChecklistRequestDTO): Promise<ValidateResponse | null> {
    try {
      const response = await server.api.post<ValidateResponse>('/document/validate', dados);
      return response.data;
    } catch (error) {
      console.error('Erro ao validar dados:', error);
      return null;
    }
  }

  /**
   * Consolida múltiplos checklists em uma estrutura única
   * IMPORTANTE: Remove duplicatas de documentos porque cada vendedor/comprador
   * precisa dos mesmos tipos de documentos (RG, CPF, etc.)
   * A contagem total considera que cada pessoa precisa enviar os mesmos documentos
   */
  consolidateMultipleChecklists(checklists: ChecklistResult[]): ConsolidatedChecklist {
    if (checklists.length === 0) {
      throw new Error('Nenhum checklist fornecido para consolidação');
    }

    // Encontrar a maior complexidade
    const complexidades = ['BAIXA', 'MEDIA', 'MEDIA_ALTA', 'ALTA', 'MUITO_ALTA'];
    const complexidadeMaxima = checklists.reduce((max, curr) => {
      const maxIndex = complexidades.indexOf(max.resumo.complexidade);
      const currIndex = complexidades.indexOf(curr.resumo.complexidade);
      return currIndex > maxIndex ? curr : max;
    }).resumo.complexidade;

    // Somar pontuação máxima
    const pontuacaoMaxima = Math.max(...checklists.map(c => c.resumo.pontuacaoComplexidade));

    // Usar o maior prazo estimado
    const prazoEstimadoDias = Math.max(...checklists.map(c => c.resumo.prazoEstimadoDias));

    // Calcular nova data de conclusão
    const dataEstimadaConclusao = this.calcularDataFutura(prazoEstimadoDias);

    // Consolidar documentos de vendedores (remover duplicatas por id + de)
    // Os documentos são os mesmos para todos os vendedores, mas cada um precisa enviar
    const vendedoresDocumentos = this.removeDuplicateDocuments(
      checklists.flatMap(c => c.vendedor.documentos)
    );

    // Consolidar documentos de compradores (remover duplicatas por id + de)
    // Os documentos são os mesmos para todos os compradores, mas cada um precisa enviar
    const compradoresDocumentos = this.removeDuplicateDocuments(
      checklists.flatMap(c => c.comprador.documentos)
    );

    // Documentos do imóvel (são iguais em todos os checklists)
    const imovelDocumentos = checklists[0].imovel.documentos;

    // Consolidar alertas (remover duplicatas)
    const vendedoresAlertas = this.removeDuplicateAlerts(
      checklists.flatMap(c => c.vendedor.alertas)
    );

    const compradoresAlertas = this.removeDuplicateAlerts(
      checklists.flatMap(c => c.comprador.alertas)
    );

    const imovelAlertas = this.removeDuplicateAlerts(
      checklists.flatMap(c => c.imovel.alertas)
    );

    const alertasGerais = this.removeDuplicateAlerts(
      checklists.flatMap(c => c.alertasGerais)
    );

    // Total de documentos ÚNICOS (tipos de documentos)
    // Nota: Este é o total de TIPOS de documentos, não a contagem total considerando todas as pessoas
    const totalDocumentos = 
      vendedoresDocumentos.length + 
      compradoresDocumentos.length + 
      imovelDocumentos.length;

    return {
      resumo: {
        totalDocumentos,
        complexidadeMaxima,
        pontuacaoMaxima,
        prazoEstimadoDias,
        dataEstimadaConclusao
      },
      vendedores: {
        documentos: vendedoresDocumentos,
        alertas: vendedoresAlertas
      },
      compradores: {
        documentos: compradoresDocumentos,
        alertas: compradoresAlertas
      },
      imovel: {
        documentos: imovelDocumentos,
        alertas: imovelAlertas
      },
      alertasGerais,
      metadados: {
        dataGeracao: new Date().toISOString(),
        versao: '2.0.0',
        totalCombinacoes: checklists.length
      }
    };
  }

  /**
   * Remove documentos duplicados (considera id + de como chave única)
   * Se 'de' não existir, usa apenas o id
   */
  private removeDuplicateDocuments(documents: DocumentModel[]): DocumentModel[] {
    const seen = new Map<string, DocumentModel>();
    
    documents.forEach(doc => {
      // Criar chave única - se 'de' não existir, usar apenas o id
      const key = doc.de ? `${doc.id}_${doc.de}` : doc.id;
      
      if (!seen.has(key)) {
        seen.set(key, doc);
      } else {
        // Se já existe, mesclar obrigatório (priorizar true)
        const existing = seen.get(key)!;
        if (doc.obrigatorio && !existing.obrigatorio) {
          seen.set(key, doc);
        }
      }
    });

    return Array.from(seen.values());
  }

  /**
   * Remove alertas duplicados (por mensagem)
   */
  private removeDuplicateAlerts(alerts: Alert[]): Alert[] {
    const seen = new Map<string, Alert>();
    
    alerts.forEach(alert => {
      if (!seen.has(alert.mensagem)) {
        seen.set(alert.mensagem, alert);
      }
    });

    return Array.from(seen.values());
  }

  /**
   * Calcula data futura baseada em dias
   */
  private calcularDataFutura(dias: number): string {
    const data = new Date();
    data.setDate(data.getDate() + dias);
    return data.toISOString().split('T')[0];
  }
}

export const documentChecklistService = new DocumentChecklistService();

