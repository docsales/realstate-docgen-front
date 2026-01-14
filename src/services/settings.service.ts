import { server } from './api.service';
import type {
  AccountSettings,
  UpdateAccountSettingsDto,
  DocumentTemplate,
  CreateDocumentTemplateDto,
  UpdateDocumentTemplateDto,
  UpdateUserDto,
} from '../types/settings.types';

export class SettingsService {
  async getAccount(): Promise<AccountSettings> {
    const response = await server.api.get<AccountSettings>(`/account`, { withCredentials: true });
    return response.data;
  }

  async updateAccount(
    data: UpdateAccountSettingsDto,
  ): Promise<AccountSettings> {
    const response = await server.api.put<AccountSettings>(
      `/account`, data, { withCredentials: true },
    );
    return response.data;
  }

  // User endpoints (apenas nome/email agora; mantemos para perfil básico)
  async updateUser(data: UpdateUserDto): Promise<any> {
    const response = await server.api.put(`/users/me`, data, { withCredentials: true });
    return response.data;
  }

  // Document Templates endpoints
  async getDocumentTemplates(): Promise<DocumentTemplate[]> {
    const response = await server.api.get<DocumentTemplate[]>(
      `/document-templates`, { withCredentials: true },
    );
    return response.data;
  }

  async getDocumentTemplateById(id: string): Promise<DocumentTemplate> {
    const response = await server.api.get<DocumentTemplate>(
      `/document-templates/${id}`,
      { withCredentials: true },
    );
    return response.data;
  }

  async createDocumentTemplate(
    data: CreateDocumentTemplateDto,
  ): Promise<DocumentTemplate> {
    const response = await server.api.post<DocumentTemplate>(
      '/document-templates',
      data,
      { withCredentials: true },
    );
    return response.data;
  }

  async updateDocumentTemplate(
    id: string,
    data: UpdateDocumentTemplateDto,
  ): Promise<DocumentTemplate> {
    const response = await server.api.put<DocumentTemplate>(
      `/document-templates/${id}`,
      data,
      { withCredentials: true },
    );
    return response.data;
  }

  async deleteDocumentTemplate(id: string): Promise<void> {
    await server.api.delete(`/document-templates/${id}`, { withCredentials: true });
  }
}

export const settingsService = new SettingsService();

