import { server } from '@/services/api.service';
import { UtilsService } from '@/services/utils.service';
import type { Deal, DealStatus, PaginatedResponse } from '@/types/types';

export interface CreateDealPayload {
  name?: string;
  contractModel?: string;
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
   * Lista todos os deals de um owner
   */
  async listDeals(ownerId: string): Promise<Deal[]> {
    const response = await server.api.get<Deal[]>('/deal', { withCredentials: true,
      params: { ownerId },
    });
    return response.data;
  }

  /**
   * Busca um deal específico por ID
   */
  async getDeal(dealId: string): Promise<Deal> {
    const response = await server.api.get<Deal>(`/deal/${dealId}`, { withCredentials: true });
    return response.data;
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
}

export const dealsService = new DealsService();
