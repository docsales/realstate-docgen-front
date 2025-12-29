import { useState } from 'react';
import { X, Save, FileText } from 'lucide-react';
import type { DocumentTemplate, CreateDocumentTemplateDto, UpdateDocumentTemplateDto } from '../../../types/settings.types';
import { Button } from '@/components/Button';
import { Checkbox } from '@/components/Checkbox';

interface TemplateFormProps {
  template?: DocumentTemplate;
  onSave: (data: CreateDocumentTemplateDto | UpdateDocumentTemplateDto) => Promise<void>;
  onClose: () => void;
}

export function TemplateForm({ template, onSave, onClose }: TemplateFormProps) {
  const [label, setLabel] = useState(template?.label || '');
  const [templateId, setTemplateId] = useState(template?.templateId || '');
  const [description, setDescription] = useState(template?.description || '');
  const [isActive, setIsActive] = useState(template?.isActive ?? true);
  const [order, setOrder] = useState(template?.order ?? 0);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleExtractTemplateId = (templateUrl: string) => {
    if (!templateUrl.includes('/document/d/')) {
      if (templateUrl.includes('drive.google.com') || templateUrl.includes('http')) {
        setValidationError('URL do template inválida. Por favor, insira a URL completa do documento no Google Docs.');
        setTemplateId('');
        return;
      }

      setValidationError(null);
      return;
    }

    const extractedTemplateId = templateUrl.split('/document/d/')[1].split('/edit')[0];

    setTemplateId(extractedTemplateId);
    setValidationError(null);
  }

  const extractErrorMessage = (error: any): string => {
    if (error?.response?.data) {
      const data = error.response.data;

      if (data.erro) {
        return data.erro;
      }
      if (data.mensagem) {
        return data.mensagem;
      }
      if (data.message) {
        return data.message;
      }
      if (data.error) {
        return typeof data.error === 'string' ? data.error : data.error.message || 'Erro desconhecido';
      }
      if (data.detalhes && Array.isArray(data.detalhes) && data.detalhes.length > 0) {
        return data.detalhes.join(', ');
      }

      const status = error.response.status;
      return `Erro ao salvar template (${status}): ${JSON.stringify(data)}`;
    }

    if (error?.message) {
      if (error.message.includes('timeout') || error.message.includes('Network Error')) {
        return 'Erro de conexão. Verifique sua internet e tente novamente.';
      }
      return error.message;
    }

    return 'Erro ao salvar template. Por favor, tente novamente.';
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const data = {
        label,
        templateId: templateId,
        description: description || undefined,
        isActive,
        order,
      };

      await onSave(data);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      const errorMessage = extractErrorMessage(error);
      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#ef0474]" />
            {template ? 'Editar Template' : 'Novo Template'}
          </h2>
          <button
            onClick={onClose}
            className="cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Descrição do Template *
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex.: Contrato de Financiamento"
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#ef0474]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Template ID (Google Docs) *
            </label>
            <input
              type="text"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              onBlur={() => handleExtractTemplateId(templateId)}
              placeholder="Ex.: 1a2B3c4D5e6F7g8H9i0J"
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#ef0474]"
            />
            {validationError && (
              <p className="text-xs text-red-500 mt-1">{validationError}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Encontre o ID na URL do documento no Google Docs
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Descrição Detalhada
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Informações adicionais sobre este template..."
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#ef0474] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Ordem de Exibição
              </label>
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-slate-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#ef0474]"
              />
            </div>

            <div className="flex items-center pt-8">
              <Checkbox
                label={`Template ${isActive ? 'ativo' : 'inativo'}`}
                defaultChecked={isActive}
                className="checkbox-sm rounded-sm text-white bg-[#ef0474] border-[#ef0474]"
                onChange={(e) => setIsActive(e.target.checked)}
              />
            </div>
          </div>

          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm font-medium text-red-800 mb-1">Erro ao salvar template</p>
              <p className="text-sm text-red-600">{saveError}</p>
            </div>
          )}

          <div className="divider"></div>

          <div className="flex justify-end items-center gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              className="text-slate-700 rounded-sm hover:bg-slate-50 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              variant="primary"
              isLoading={isSaving}
              className="bg-[#ef0474] text-white border-none rounded-sm hover:bg-[#d00366] transition-colors"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Salvando...' : 'Salvar Template'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

