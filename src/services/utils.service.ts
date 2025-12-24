import type { Deal, PaginatedResponse } from "@/types/types";
import { server } from "./api.service";

export class UtilsService {
  static async paginate<T>(
    endpoint: string,
    page: number,
    limit: number,
    queryParams?: Record<string, any>
  ): Promise<PaginatedResponse<T>> {
    let url = `/${endpoint}/paginated?page=${page}&limit=${limit}`;
    if (queryParams) {
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
      const queryString = params.toString();
      if (queryString) {
        url += `&${queryString}`;
      }
    }
    
    const response = await server.api.get<PaginatedResponse<T>>(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: true,
    });

    if (![200, 201, 204].includes(response.status)) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.data;
    return {
      data: data.data,
      next: data.next,
      total: data.total,
    }
  }

  static getSignersCount(deal: Deal): { signed: number; waiting: number } {
    return {
      signed: deal.signers?.filter(s => s.status === 'signed').length || 0,
      waiting: deal.signers?.filter(s => s.status === 'waiting' || s.status === 'read').length || 0,
    }
  }
}
