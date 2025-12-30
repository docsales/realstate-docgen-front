import { server } from '@/services/api.service';
import { UtilsService } from '@/services/utils.service';
import type { Deal, DealStatus, GeneratePreviewResponse, PaginatedResponse, UpdateDealDataDto } from '@/types/types';

export interface CreateDealPayload {
  name?: string;
  docTemplateId?: string;
  expirationDate?: string; // YYYY-MM-DD format
  contractEnd?: string; // YYYY-MM-DD format
  signers?: Array<{
    name: string;
    email: string;
    phoneNumber?: string;
    signingOrder: number;
    role: string;
  }>;
  metadata?: any;
}

export interface UpdateDealStatusPayload {
  status: DealStatus;
}

export class DealsService {

  /**
   * Lista todos os deals paginados
   * @param page The page number
   * @param limit The limit of items per page
   * @param queryParams The query parameters
   * @returns The paginated response
   */
  async paginateDeals(
    page: number,
    limit: number,
    queryParams?: Record<string, any>
  ): Promise<PaginatedResponse<Deal>> {
    return await UtilsService.paginate<Deal>('deal', page, limit, queryParams);
  }

  /**
   * Cria um novo deal
   */
  async createDeal(payload: CreateDealPayload): Promise<Deal> {
    const response = await server.api.post<Deal>('/deal', payload);
    return response.data;
  }

  /**
   * Atualiza dados do deal
   */
  async updateDeal(dealId: string, payload: UpdateDealDataDto): Promise<Deal> {
    const response = await server.api.put<Deal>(`/deal/${dealId}`, payload);
    return response.data;
  }

  /**
   * Lista todos os deals
   */
  async listDeals(): Promise<Deal[]> {
    const response = await server.api.get<Deal[]>('/deal');
    return response.data;
  }

  /**
   * Busca um deal específico por ID
   */
  async getDeal(dealId: string): Promise<Deal> {
    const { data } = await server.api.get<Deal>(`/deal/${dealId}`);
    return data;
  }

  /**
   * Atualiza o status de um deal
   */
  async updateDealStatus(dealId: string, payload: UpdateDealStatusPayload): Promise<Deal> {
    const response = await server.api.patch<Deal>(`/deal/${dealId}/status`, payload);
    return response.data;
  }

  /**
   * Adiciona documento ao deal
   */
  async addDocumentToDeal(dealId: string, documentId: string): Promise<void> {
    await server.api.post(`/deal/${dealId}/document`, { documentId });
  }

  /**
   * Remove documento do deal
   */
  async removeDocumentFromDeal(dealId: string, documentId: string): Promise<void> {
    await server.api.delete(`/deal/${dealId}/document/${documentId}`);
  }

  /**
   * Remove signatário do deal
   */
  async removeSignatoryFromDeal(dealId: string, signatoryId: string): Promise<void> {
    await server.api.delete(`/deal/${dealId}/signatory/${signatoryId}`);
  }

  /**
   * Busca propriedades de documentos (mantido para compatibilidade)
   */
  async getProperties() {
    try {
      const response = await server.api.get<{ data: any }>('/document/properties');
      return response.data;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  /**
   * Obtém variáveis do template do Google Docs para mapear
   * Timeout aumentado para 120s devido ao processamento LLM de pré-mapeamento
   */
  async getDocVariables(dealId: string): Promise<any> {
    const { data }: { data: any } = await server.api.get<any>(
      `/deal/${dealId}/doc-variables`,
      { 
        withCredentials: true,
        timeout: 120000, // 120 segundos (2 minutos) para permitir processamento LLM
      }
    );

    return data;
  }

  /**
   * Limpa cache de pré-mapeamentos (força re-processamento com LLM)
   */
  async clearPreMappingsCache(dealId: string): Promise<void> {
    await server.api.delete(`/deal/${dealId}/pre-mappings`);
  }

  /**
   * Gera preview do contrato
   */
  async generatePreview(dealId: string): Promise<GeneratePreviewResponse> {
    const { data }: { data: GeneratePreviewResponse } = await server.api.post<GeneratePreviewResponse>(
      `/deal/${dealId}/preview`
    );
    return data;
  }

  /**
   * Envia contrato para assinatura
   */
  async sendContract(dealId: string): Promise<any> {
    const { data }: { data: any } = await server.api.post(`/deal/${dealId}/send`);
    return data;
  }
}

export const dealsService = new DealsService();
