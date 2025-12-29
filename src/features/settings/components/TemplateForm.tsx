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
  const [error, setError] = useState<string | null>(null);
  
  const handleExtractTemplateId = (templateUrl: string) => {
    if (!templateUrl.includes('/document/d/')) {
      if (templateUrl.includes('drive.google.com') || templateUrl.includes('http')) {
        setError('URL do template inválida. Por favor, insira a URL completa do documento no Google Docs.');
        setTemplateId('');
        return;
      }

      setError(null);
      return;
    }

    const extractedTemplateId = templateUrl.split('/document/d/')[1].split('/edit')[0];

    setTemplateId(extractedTemplateId);
    setError(null);
  }

  const handleSubmit = async () => {
    setIsSaving(true);
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
            {error && (
              <p className="text-xs text-red-500 mt-1">{error}</p>
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

