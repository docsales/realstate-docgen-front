import { useState } from 'react';
import { Save, Mail } from 'lucide-react';
import { Button } from '@/components/Button';

interface DocsalesEmailSectionProps {
  initialValue: string | null;
  onSave: (value: string) => Promise<void>;
}

export function DocsalesEmailSection({ initialValue, onSave }: DocsalesEmailSectionProps) {
  const [value, setValue] = useState(initialValue || '');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMessage('');
    try {
      await onSave(value);
      setSuccessMessage('Email salvo com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao salvar email:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="w-5 h-5 text-[#ef0474]" />
        <h2 className="text-xl font-semibold text-slate-800">
          Email do Usuário na DocSales
        </h2>
      </div>
      <p className="text-sm text-slate-600 mb-4">
        Email da sua conta na DocSales que será utilizado para enviar documentos para assinatura.
      </p>
      
      <div className="space-y-4">
        <input
          type="email"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="seu-email@docsales.com.br"
          className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ef0474]"
        />

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

