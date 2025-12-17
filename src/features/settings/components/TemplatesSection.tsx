import { useState } from 'react';
import { Plus, Edit2, Trash2, FileText, CheckCircle, XCircle } from 'lucide-react';
import type { DocumentTemplate } from '../../../types/settings.types';
import { Button } from '@/components/Button';

interface TemplatesSectionProps {
  templates: DocumentTemplate[];
  onEdit: (template: DocumentTemplate) => void;
  onDelete: (id: string) => Promise<void>;
  onAdd: () => void;
}

export function TemplatesSection({
  templates,
  onEdit,
  onDelete,
  onAdd,
}: TemplatesSectionProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este template?')) return;

    setDeletingId(id);
    try {
      await onDelete(id);
    } catch (error) {
      console.error('Erro ao deletar template:', error);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#085995]" />
          <h2 className="text-xl font-semibold text-slate-800">
            Templates de Documentos
          </h2>
        </div>
        <Button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#ef0474] text-white border-none rounded-md hover:bg-[#d00366] transition-colors"
          variant="primary"
        >
          <Plus className="w-4 h-4" />
          Adicionar Template
        </Button>
      </div>

      <p className="text-sm text-slate-600 mb-6">
        Gerencie os templates de documentos do Google Docs utilizados na geração de contratos.
      </p>

      {templates.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum template cadastrado ainda.</p>
          <p className="text-sm mt-1">Clique em "Adicionar Template" para começar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-slate-800">{template.label}</h3>
                  {template.isActive ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <p className="text-sm text-slate-600">
                  Template ID: <code className="px-2 py-0.5 bg-slate-100 rounded text-xs">{template.templateId}</code>
                </p>
                {template.description && (
                  <p className="text-sm text-slate-500 mt-1">{template.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => onEdit(template)}
                  className="p-2 text-slate-600 hover:text-[#085995] hover:bg-slate-50 rounded-lg transition-colors"
                  title="Editar template"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  disabled={deletingId === template.id}
                  className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Deletar template"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

