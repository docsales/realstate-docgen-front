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
  // User Settings endpoints
  async getUserSettings(userId: string): Promise<UserSettings> {
    const response = await server.api.get<UserSettings>(`/user-settings?userId=${userId}`);
    return response.data;
  }

  async updateUserSettings(
    userId: string,
    data: UpdateUserSettingsDto,
  ): Promise<UserSettings> {
    const response = await server.api.put<UserSettings>(
      `/user-settings?userId=${userId}`,
      data,
    );
    return response.data;
  }

  // User endpoints (for docsalesApiKey and folderId)
  async updateUser(userId: string, data: UpdateUserDto): Promise<any> {
    const response = await server.api.put(`/user/${userId}`, data);
    return response.data;
  }

  // Document Templates endpoints
  async getDocumentTemplates(userId: string): Promise<DocumentTemplate[]> {
    const response = await server.api.get<DocumentTemplate[]>(
      `/document-templates?userId=${userId}`,
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

