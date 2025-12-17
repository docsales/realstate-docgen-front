import { useState, useEffect } from 'react';
import { ArrowLeft, Settings as SettingsIcon } from 'lucide-react';
import { settingsService } from '../../services/settings.service';
import { useAuth } from '../../hooks/useAuth';
import type {
  UserSettings,
  DocumentTemplate,
  CreateDocumentTemplateDto,
  UpdateDocumentTemplateDto,
} from '../../types/settings.types';

import { ApiKeysSection } from './components/ApiKeysSection';
import { FolderIdSection } from './components/FolderIdSection';
import { DocsalesEmailSection } from './components/DocsalesEmailSection';
import { TemplatesSection } from './components/TemplatesSection';
import { TemplateForm } from './components/TemplateForm';

interface SettingsViewProps {
  onBack: () => void;
}

export function SettingsView({ onBack }: SettingsViewProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | undefined>(undefined);

  // Dados do usuário (API Key e Folder ID estão na tabela User)
  const [apiKey, setApiKey] = useState<string>('');
  const [folderId, setFolderId] = useState<string>('');

  const userId = '00000000-0000-0000-0000-000000000000001'; // TODO: Get user ID from context

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const settings = await settingsService.getUserSettings(userId);
      setUserSettings(settings);

      const templatesData = await settingsService.getDocumentTemplates(userId);
      setTemplates(templatesData);

      setApiKey(user?.docsalesApiKey || '');
      setFolderId(user?.folderId || '');
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveApiKey = async (value: string) => {
    await settingsService.updateUser(userId, { docsalesApiKey: value });
    setApiKey(value);
  };

  const handleSaveFolderId = async (value: string) => {
    await settingsService.updateUser(userId, { folderId: value });
    setFolderId(value);
  };

  const handleSaveDocsalesEmail = async (value: string) => {
    const updated = await settingsService.updateUserSettings(userId, {
      docsalesUserEmail: value,
    });
    setUserSettings(updated);
  };

  const handleAddTemplate = () => {
    setEditingTemplate(undefined);
    setShowTemplateForm(true);
  };

  const handleEditTemplate = (template: DocumentTemplate) => {
    setEditingTemplate(template);
    setShowTemplateForm(true);
  };

  const handleSaveTemplate = async (
    data: CreateDocumentTemplateDto | UpdateDocumentTemplateDto,
  ) => {
    if (editingTemplate) {
      await settingsService.updateDocumentTemplate(editingTemplate.id, data);
    } else {
      await settingsService.createDocumentTemplate(data as CreateDocumentTemplateDto);
    }
    await loadData();
    setShowTemplateForm(false);
  };

  const handleDeleteTemplate = async (id: string) => {
    await settingsService.deleteDocumentTemplate(id);
    await loadData();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ef0474] mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="cursor-pointer flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-[#ef0474]" />
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Configurações</h1>
              <p className="text-slate-600">Gerencie suas integrações e templates</p>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          <ApiKeysSection initialValue={apiKey} onSave={handleSaveApiKey} />

          <FolderIdSection initialValue={folderId} onSave={handleSaveFolderId} />

          <DocsalesEmailSection
            initialValue={userSettings?.docsalesUserEmail || null}
            onSave={handleSaveDocsalesEmail}
          />

          <TemplatesSection
            templates={templates}
            onEdit={handleEditTemplate}
            onDelete={handleDeleteTemplate}
            onAdd={handleAddTemplate}
          />
        </div>
      </div>

      {/* Template Form Modal */}
      {showTemplateForm && (
        <TemplateForm
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onClose={() => setShowTemplateForm(false)}
        />
      )}
    </div>
  );
}

