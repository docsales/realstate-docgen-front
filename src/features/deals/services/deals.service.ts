import { server } from '@/services/api.service';
import { UtilsService } from '@/services/utils.service';
import type { Deal, DealStatus, GeneratePreviewResponse, PaginatedResponse, UpdateDealDataDto } from '@/types/types';

export interface CreateDealPayload {
  name?: string;
  docTemplateId?: string;
  ownerId: string;
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
   * Lista todos os deals de um owner paginados
   * @param ownerId The owner ID (query param)
   * @param page The page number
   * @param limit The limit of items per page
   * @param queryParams The query parameters
   * @returns The paginated response
   */
  async paginateDeals(
    ownerId: string,
    page: number,
    limit: number,
    queryParams?: Record<string, any>
  ): Promise<PaginatedResponse<Deal>> {
    return await UtilsService.paginate<Deal>('deal', page, limit, { ownerId, ...queryParams });
  }
  /**
   * Cria um novo deal
   */
  async createDeal(payload: CreateDealPayload): Promise<Deal> {
    const response = await server.api.post<Deal>('/deal', payload, { withCredentials: true });
    return response.data;
  }

  /**
   * Atualiza dados do deal
   */
  async updateDeal(dealId: string, ownerId: string, payload: UpdateDealDataDto): Promise<Deal> {
    const params = new URLSearchParams();
    params.append('ownerId', ownerId);
    const response = await server.api.put<Deal>(`/deal/${dealId}`, payload, { withCredentials: true, params });
    return response.data;
  }

  /**
   * Lista todos os deals de um owner
   */
  async listDeals(ownerId: string): Promise<Deal[]> {
    const response = await server.api.get<Deal[]>('/deal', {
      withCredentials: true,
      params: { ownerId },
    });
    return response.data;
  }

  /**
   * Busca um deal específico por ID
   */
  async getDeal(dealId: string, ownerId: string): Promise<Deal> {
    const params = new URLSearchParams();
    params.append('ownerId', ownerId);

    const { data }: { data: Deal } = await server.api.get<Deal>(`/deal/${dealId}`, { withCredentials: true, params });
    return data;
  }

  /**
   * Atualiza o status de um deal
   */
  async updateDealStatus(dealId: string, payload: UpdateDealStatusPayload): Promise<Deal> {
    const response = await server.api.patch<Deal>(`/deal/${dealId}/status`, payload, { withCredentials: true });
    return response.data;
  }

  /**
   * Adiciona documento ao deal
   */
  async addDocumentToDeal(dealId: string, documentId: string): Promise<void> {
    await server.api.post(`/deal/${dealId}/document`, { documentId }, { withCredentials: true });
  }

  /**
   * Remove documento do deal
   */
  async removeDocumentFromDeal(dealId: string, documentId: string): Promise<void> {
    await server.api.delete(`/deal/${dealId}/document/${documentId}`, { withCredentials: true });
  }

  /**
   * Remove signatário do deal
   */
  async removeSignatoryFromDeal(dealId: string, signatoryId: string): Promise<void> {
    await server.api.delete(`/deal/${dealId}/signatory/${signatoryId}`, { withCredentials: true });
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
   * Gera preview do contrato
   */
  async generatePreview(dealId: string, ownerId: string): Promise<GeneratePreviewResponse> {
    const params = new URLSearchParams();
    params.append('ownerId', ownerId);
    const { data }: { data: GeneratePreviewResponse } = await server.api.post<GeneratePreviewResponse>(
      `/deal/${dealId}/preview`,
      undefined,
      { withCredentials: true, params }
    );
    return data;
  }

  /**
   * Envia contrato para assinatura
   */
  async sendContract(dealId: string, ownerId: string): Promise<any> {
    const params = new URLSearchParams();
    params.append('ownerId', ownerId);
    const { data }: { data: any } = await server.api.post(`/deal/${dealId}/send`, undefined, { withCredentials: true, params });
    return data;
  }
}

export const dealsService = new DealsService();
