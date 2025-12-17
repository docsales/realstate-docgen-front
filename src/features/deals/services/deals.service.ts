import { server } from '@/services/api.service';
import type { Deal, DealStatus } from '@/types/types';

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
   * Cria um novo deal
   */
  async createDeal(payload: CreateDealPayload): Promise<Deal> {
    const response = await server.api.post<Deal>('/deal', payload);
    return response.data;
  }

  /**
   * Lista todos os deals de um owner
   */
  async listDeals(ownerId: string): Promise<Deal[]> {
    const response = await server.api.get<Deal[]>('/deal', {
      params: { ownerId },
    });
    return response.data;
  }

  /**
   * Busca um deal específico por ID
   */
  async getDeal(dealId: string): Promise<Deal> {
    const response = await server.api.get<Deal>(`/deal/${dealId}`);
    return response.data;
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
   * Deleta um deal
   */
  async deleteDeal(dealId: string): Promise<void> {
    await server.api.delete(`/deal/${dealId}`);
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
