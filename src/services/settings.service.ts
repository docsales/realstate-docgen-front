import { server } from './api.service';
import type {
  UserSettings,
  UpdateUserSettingsDto,
  DocumentTemplate,
  CreateDocumentTemplateDto,
  UpdateDocumentTemplateDto,
  UpdateUserDto,
} from '../types/settings.types';

export class SettingsService {
  async getUserSettings(): Promise<UserSettings> {
    const response = await server.api.get<UserSettings>(`/user-settings`, { withCredentials: true });
    return response.data;
  }

  async updateUserSettings(
    data: UpdateUserSettingsDto,
  ): Promise<UserSettings> {
    const response = await server.api.put<UserSettings>(
      `/user-settings`, data, { withCredentials: true },
    );
    return response.data;
  }

  // User endpoints (for docsalesApiKey and folderId)
  async updateUser(data: UpdateUserDto): Promise<any> {
    const response = await server.api.put(`/user`, data, { withCredentials: true });
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
    );
    return response.data;
  }

  async createDocumentTemplate(
    data: CreateDocumentTemplateDto,
  ): Promise<DocumentTemplate> {
    const response = await server.api.post<DocumentTemplate>(
      '/document-templates',
      data,
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
    );
    return response.data;
  }

  async deleteDocumentTemplate(id: string): Promise<void> {
    await server.api.delete(`/document-templates/${id}`);
  }
}

export const settingsService = new SettingsService();

