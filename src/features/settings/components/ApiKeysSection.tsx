import { useState } from 'react';
import { Save, Eye, EyeOff, Key } from 'lucide-react';
import { Button } from '@/components/Button';

interface ApiKeysSectionProps {
  initialValue: string | null;
  onSave: (value: string) => Promise<void>;
}

export function ApiKeysSection({ initialValue, onSave }: ApiKeysSectionProps) {
  const [value, setValue] = useState(initialValue || '');
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMessage('');
    try {
      await onSave(value);
      setSuccessMessage('API Key salva com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao salvar API Key:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Key className="w-5 h-5 text-[#ef0474]" />
        <h2 className="text-xl font-semibold text-slate-800">
          DocSales API Key
        </h2>
      </div>
      <p className="text-sm text-slate-600 mb-4">
        Chave de API para integração com a plataforma DocSales.
      </p>
      
      <div className="space-y-4">
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Digite sua API Key da DocSales"
            className="w-full px-4 py-2 pr-12 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ef0474]"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={isSaving || value.length === 0}
            variant="primary"
            isLoading={isSaving}
            className="bg-[#ef0474] text-white border-none rounded-sm hover:bg-[#d00366] transition-colors"
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

