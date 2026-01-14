export interface AccountSettings {
  id: string;
  name: string | null;
  email: string;
  defaultDocsalesUserEmail: string | null;
  docsalesAccountId: string | null;
  docsalesApiKey: string | null;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentTemplate {
  id: string;
  accountId?: string;
  userId?: string;
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

export interface UpdateAccountSettingsDto {
  name?: string | null;
  docsalesAccountId?: string | null;
  docsalesApiKey?: string | null;
  folderId?: string | null;
  defaultDocsalesUserEmail?: string | null;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
}

export interface WebhookToken {
  id: string;
  accountId?: string;
  userId?: string;
  token: string;
  lastUsedAt: string | null;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEvent {
  id: string;
  accountId?: string;
  userId?: string;
  payload: any;
  headers: any;
  processedAt: string | null;
}

