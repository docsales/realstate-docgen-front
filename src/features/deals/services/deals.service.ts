import { server } from '@/services/api.service';

export class DealsService {
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
