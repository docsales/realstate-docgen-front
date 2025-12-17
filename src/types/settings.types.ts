export interface UserSettings {
  id: string;
  userId: string;
  docsalesUserEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentTemplate {
  id: string;
  userId: string;
  label: string;
  templateId: string;
  description?: string | null;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentTemplateDto {
  label: string;
  templateId: string;
  description?: string;
  isActive?: boolean;
  order?: number;
}

export interface UpdateDocumentTemplateDto {
  label?: string;
  templateId?: string;
  description?: string;
  isActive?: boolean;
  order?: number;
}

export interface UpdateUserSettingsDto {
  docsalesUserEmail?: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  docsalesAccountId?: string;
  docsalesApiKey?: string;
  folderId?: string;
}

