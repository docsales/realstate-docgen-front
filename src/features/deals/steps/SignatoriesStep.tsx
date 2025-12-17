
import React, { useState } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Inputs';
import type { Signatory } from '@/types/types';
import { Users, X } from 'lucide-react';
import { useRemoveSignatoryFromDeal } from '../hooks/useDeals';

interface SignatoriesStepProps {
  signatories: Signatory[];
  onChange: (s: Signatory[]) => void;
  dealId?: string | null;
}

export const SignatoriesStep: React.FC<SignatoriesStepProps> = ({ signatories, onChange, dealId }) => {
  const [form, setForm] = useState({ name: '', email: '', phoneNumber: '', role: 'comprador' });
  const removeSignatoryMutation = useRemoveSignatoryFromDeal();

  const addSignatory = () => {
    if (form.name && form.email) {
      const newSignatory: Signatory = {
        ...form,
        id: Date.now().toString(),
        role: form.role as any,
        signingOrder: 0,
      };
      onChange([...signatories, newSignatory]);
      setForm({ name: '', email: '', phoneNumber: '', role: 'comprador' });
    }
  };

  const removeSignatory = async (id: string) => {
    onChange(signatories.filter(s => s.id !== id));

    if (dealId && id.length > 15) {
      try {
        await removeSignatoryMutation.mutateAsync({ dealId, signatoryId: id });
        console.log('✅ Signatário removido do banco de dados');
      } catch (error) {
        console.error('❌ Erro ao remover signatário do banco:', error);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
      {/* Left: Form */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
        <div className="flex items-center gap-2 mb-6 text-primary">
          <Users className="w-5 h-5" />
          <h3 className="font-bold text-lg">Novo Signatário</h3>
        </div>

        <div className="space-y-4">
          <Input
            label="Nome Completo *"
            placeholder="Ex: João da Silva"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Email *"
            type="email"
            placeholder="Ex: joao@exemplo.com"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Telefone *"
            placeholder="Ex: (11) 98765-4321"
            mask="phone"
            value={form.phoneNumber}
            onChange={e => setForm({ ...form, phoneNumber: e.target.value })}
          />
          <div className="flex flex-col gap-1 w-full">
            <label className="text-sm font-medium text-slate-700">Função *</label>
            <select
              className="border border-slate-600 rounded-lg px-3 py-2 bg-white text-slate-600 focus:ring-2 focus:ring-primary outline-none"
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}
            >
              <option value="buyer_part">Comprador</option>
              <option value="seller_part">Vendedor</option>
              <option value="witness">Testemunha</option>
              <option value="real_estate_agent">Corretor</option>
            </select>
          </div>

          <Button onClick={addSignatory} disabled={!form.name || !form.email} className="w-full mt-2">
            + Adicionar Signatário
          </Button>
        </div>
      </div>

      {/* Right: List */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-slate-800">Signatários ({signatories.length})</h3>
        <div className="space-y-3">
          {signatories.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
              Nenhum signatário adicionado.
            </div>
          ) : (
            signatories.map(s => (
              <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative group">
                <button
                  onClick={() => removeSignatory(s.id)}
                  className="cursor-pointer absolute top-3 right-3 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-1">
                  <span className="font-bold text-slate-800 text-lg">{s.name}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${s.role === 'buyer_part' ? 'bg-blue-100 text-blue-700' :
                      s.role === 'seller_part' ? 'bg-green-100 text-green-700' :
                        s.role === 'witness' ? 'bg-yellow-100 text-yellow-700' :
                          s.role === 'real_estate_agent' ? 'bg-purple-100 text-purple-700' :
                            'bg-slate-100 text-slate-600'
                    }`}>
                    {s.role}
                  </span>
                </div>
                <div className="text-slate-500 text-sm space-y-0.5">
                  <p>{s.email}</p>
                  <p>{s.phoneNumber}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
