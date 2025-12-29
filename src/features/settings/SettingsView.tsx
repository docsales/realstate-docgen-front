import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings as SettingsIcon } from 'lucide-react';
import { settingsService } from '../../services/settings.service';
import { useAuth } from '../../hooks/useAuth';
import { useConfigNotification } from '../../hooks/useConfigNotification';
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
import { WebhooksSection } from './components/WebhooksSection';

export function SettingsView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { recheck } = useConfigNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | undefined>(undefined);

  const [apiKey, setApiKey] = useState<string>('');
  const [folderId, setFolderId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const settings = await settingsService.getUserSettings()
      setUserSettings(settings);

      const templatesData = await settingsService.getDocumentTemplates()
      setTemplates(templatesData);

      setApiKey(user?.docsalesApiKey || '');
      setFolderId(user?.folderId || '');
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const templatesData = await settingsService.getDocumentTemplates();
      setTemplates(templatesData);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    }
  };

  const handleSaveApiKey = async (value: string) => {
    await settingsService.updateUser({ docsalesApiKey: value });
    setApiKey(value);
    recheck();
  };

  const handleSaveFolderId = async (value: string) => {
    await settingsService.updateUser({ folderId: value });
    setFolderId(value);
    recheck();
  };

  const handleSaveDocsalesEmail = async (value: string) => {
    const updated = await settingsService.updateUserSettings({
      docsalesUserEmail: value,
    });
    setUserSettings(updated);
    recheck();
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

    await loadTemplates();
    setShowTemplateForm(false);
    recheck();
  };

  const handleDeleteTemplate = async (id: string) => {
    await settingsService.deleteDocumentTemplate(id);

    await loadTemplates();
    recheck();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg w-12 h-12 text-[#ef0474] mx-auto mb-4"></span>
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
            onClick={() => navigate('/dashboard')}
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

          <WebhooksSection />
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

