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

  static getSignerBadge(role: string): { color: string; label: string } {
    switch(role) {
      case 'buyer_part':
        return { color: 'bg-green-100 text-green-700', label: 'Comprador' };
      case 'seller_part':
        return { color: 'bg-blue-100 text-blue-700', label: 'Vendedor' };
      case 'witness':
        return { color: 'bg-yellow-100 text-yellow-700', label: 'Testemunha' };
      case 'real_estate_agent':
        return { color: 'bg-purple-100 text-purple-700', label: 'Corretor' };
      default:
        return { color: 'bg-slate-100 text-slate-600', label: role };
    }
  }

  static getDocumentType(type: string): string {
    switch(type) {
      case 'RG':
        return 'RG';
      case 'CPF':
        return 'CPF';
      case 'CNH':
        return 'CNH';
      case 'PASSAPORTE':
        return 'PASSAPORTE';
      case 'RNE':
        return 'RNE';
      case 'CREA':
        return 'CREA';
      case 'MATRICULA':
        return 'MATRÍCULA';
      case 'COMPROVANTE_ENDERECO':
        return 'COMPROVANTE DE ENDEREÇO';
      case 'COMPROVANTE_RESIDENCIA':
        return 'COMPROVANTE DE RESIDÊNCIA';
      case 'IPTU':
        return 'IPTU';
      case 'IDENTIFICACAO':
        return 'DOCUMENTO DE IDENTIFICAÇÃO';
      case 'CERTIDAO_NASCIMENTO':
        return 'CERTIDÃO DE NASCIMENTO';
      case 'CERTIDAO_CASAMENTO':
        return 'CERTIDÃO DE CASAMENTO';
      case 'CERTIDAO_CASAMENTO_AVERBACAO_OBITO':
        return 'CERTIDÃO DE CASAMENTO COM AVERBAÇÃO DE ÓBITO';
      case 'CERTIDAO_CASAMENTO_AVERBACAO_DIVORCIO':
        return 'CERTIDÃO DE CASAMENTO COM AVERBAÇÃO DE DIVÓRCIO';
      case 'CERTIDAO_OBITO':
        return 'CERTIDÃO DE ÓBITO DO CÔNJUGE';
      case 'SENTENCA_DIVORCIO':
        return 'SENTENÇA DE DIVÓRCIO';
      case 'CONTRATO_DE_COMPRA_E_VENDA':
        return 'CONTRATO DE COMPRA E VENDA';
      case 'PROCURACAO':
        return 'PROCURAÇÃO';
      case 'PROCURACAO_CONJUGE':
        return 'PROCURAÇÃO DO CÔNJUGE';
      case 'COMPROVANTE_RENDA':
        return 'COMPROVANTE DE RENDA';
      case 'ALVARA':
        return 'ALVARÁ';
      case 'PLANTA':
        return 'PLANTA DO IMÓVEL';
      case 'MEMORIAL_DESCRITIVO':
        return 'MEMORIAL DESCRITIVO';
      case 'HABITE_SE':
        return 'HABITE-SE';
      default:
        return type;
    }
  }

  static getDocumentTypes(types: string[]): string {
    return types.map(type => this.getDocumentType(type)).join(', ');
  }
}
