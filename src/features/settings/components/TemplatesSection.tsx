import { useState } from 'react';
import { Plus, Edit2, Trash2, FileText, CheckCircle, XCircle, Menu } from 'lucide-react';
import type { DocumentTemplate } from '../../../types/settings.types';
import { Button } from '@/components/Button';
import { ConfirmModal } from '@/components/ConfirmModal';

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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDeleteClick = (id: string) => {
    setTemplateToDelete(id);
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;

    setDeletingId(templateToDelete);
    setIsLoading(true);
    setShowConfirmModal(false);

    try {
      await onDelete(templateToDelete);
    } catch (error) {
      console.error('Erro ao deletar template:', error);
    } finally {
      setDeletingId(null);
      setTemplateToDelete(null);
      setIsLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmModal(false);
    setTemplateToDelete(null);
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
          type="button"
          onClick={onAdd}
          icon={<Plus className="w-4 h-4" />}
          className="flex items-center gap-2 px-4 py-2 bg-[#ef0474] text-white border-none rounded-sm hover:bg-[#d00366] transition-colors"
          variant="primary"
        >
          Adicionar Template
        </Button>
      </div>

      <p className="text-sm text-slate-600 mb-6">
        Gerencie os templates de documentos do Google Docs utilizados na geração de contratos.
      </p>

      {/* Templates */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">
          <div className="loading loading-spinner loading-lg w-12 h-12 text-[#ef0474] mx-auto mb-4"></div>
          <p className="text-sm text-slate-500">Carregando templates...</p>
        </div>
      ) : (
        <>
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
                    <div className="flex items-center justify-between sm:justify-start gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-800">{template.label}</h3>
                      {template.isActive ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-400" />
                      )}
                      </div>

                      <div className="block sm:hidden dropdown dropdown-end">
                        <Button type="button" tabIndex={0} variant="link" size="sm" className="block sm:hidden" >
                          <span className="text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors">
                            <Menu className="w-4 h-4" />
                          </span>
                        </Button>
                        <ul tabIndex={-1} className="flex items-center justify-start dropdown-content menu bg-white rounded-box z-1 p-2 gap-2 shadow-sm border border-slate-200">
                          <li>
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              onClick={() => onEdit(template)}
                              className="tooltip tooltip-auto p-2"
                              data-tip="Editar template"
                            >
                              <span className="text-slate-600 hover:text-[#085995] hover:bg-slate-50 rounded-lg transition-colors">
                                <Edit2 className="w-4 h-4" />
                              </span>
                            </Button>
                          </li>
                          <li>
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              onClick={() => handleDeleteClick(template.id)}
                              disabled={deletingId === template.id}
                              className="tooltip tooltip-auto p-2"
                              data-tip="Deletar template"
                            >
                              <span className="text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </span>
                            </Button>

                          </li>
                        </ul>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600">
                      Template ID: <code className="px-2 py-0.5 bg-slate-100 rounded text-xs">{template.templateId}</code>
                    </p>
                    {template.description && (
                      <p className="text-sm text-slate-500 mt-1">{template.description}</p>
                    )}
                  </div>

                  <div className="hidden sm:flex items-center gap-2 ml-4">
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => onEdit(template)}
                      className="tooltip tooltip-auto p-2"
                      data-tip="Editar template"
                    >
                      <span className="text-slate-600 hover:text-[#085995] hover:bg-slate-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </span>
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => handleDeleteClick(template.id)}
                      disabled={deletingId === template.id}
                      className="tooltip tooltip-auto p-2"
                      data-tip="Deletar template"
                    >
                      <span className="text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal de Confirmação */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Deletar Template"
        message="Tem certeza que deseja deletar este template? Esta ação não pode ser desfeita."
        confirmText="Deletar"
        cancelText="Cancelar"
        confirmButtonVariant="danger"
        isLoading={deletingId !== null}
      />
    </div >
  );
}

