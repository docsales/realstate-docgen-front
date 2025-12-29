import { useState } from 'react';
import { Save, FolderOpen } from 'lucide-react';
import { Button } from '@/components/Button';

interface FolderIdSectionProps {
  initialValue: string | null;
  onSave: (value: string) => Promise<void>;
}

export function FolderIdSection({ initialValue, onSave }: FolderIdSectionProps) {
  const [value, setValue] = useState(initialValue || '');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleExtractFolderId = (folderUrl: string) => {
    if (!folderUrl.includes('/folders/')) {
      if (folderUrl.includes('drive.google.com') || folderUrl.includes('http')) {
        setError('URL da pasta inválida. Por favor, insira a URL completa da pasta no Google Drive.');
        setValue('');
        return;
      }

      setError(null);
      return;
    }

    const folderId = folderUrl.split('/folders/')[1];
    setValue(folderId);
    setError(null);
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
      return `Erro ao salvar Folder ID (${status}): ${JSON.stringify(data)}`;
    }

    if (error?.message) {
      if (error.message.includes('timeout') || error.message.includes('Network Error')) {
        return 'Erro de conexão. Verifique sua internet e tente novamente.';
      }
      return error.message;
    }

    return 'Erro ao salvar Folder ID. Por favor, tente novamente.';
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMessage('');
    setError(null);
    try {
      await onSave(value);
      setSuccessMessage('Folder ID salvo com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao salvar Folder ID:', error);
      const errorMessage = extractErrorMessage(error);
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <FolderOpen className="w-5 h-5 text-[#085995]" />
        <h2 className="text-xl font-semibold text-slate-800">
          Google Drive Folder ID
        </h2>
      </div>
      <p className="text-sm text-slate-600 mb-4">
        ID da pasta no Google Drive onde os documentos serão armazenados.
        Você pode encontrar este ID na URL da pasta do Google Drive.
      </p>

      <div className="space-y-4">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => handleExtractFolderId(value)}
          placeholder="Ex.: 1a2B3c4D5e6F7g8H9i0J"
          className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#085995]"
        />
        {error && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={isSaving || value.length === 0}
            variant="primary"
            isLoading={isSaving}
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>

          {successMessage && (
            <span className="text-sm text-green-600">{successMessage}</span>
          )}
        </div>
      </div>
    </div>
  );
}

