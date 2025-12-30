
import React, { useState } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Inputs';
import type { Signatory } from '@/types/types';
import { Users } from 'lucide-react';
import { useDeal, useRemoveSignatoryFromDeal } from '../hooks/useDeals';
import { SignerCard } from '../components/SignerCard';

interface SignatoriesStepProps {
  signatories: Signatory[];
  onChange: (signer: Signatory[]) => void;
  dealId?: string | null;
}

export const SignatoriesStep: React.FC<SignatoriesStepProps> = ({ signatories, onChange, dealId }) => {
  const [form, setForm] = useState({ name: '', email: '', phoneNumber: '', role: 'buyer_part' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const removeSignatoryMutation = useRemoveSignatoryFromDeal();
  const [removeSignerLoading, setRemoveSignerLoading] = useState(false);
  const { data: dealData } = useDeal(dealId!);

  const canRemoveSigner = (): boolean => {
    if (!dealId || (dealData && dealData.status === 'DRAFT')) return true;
    return false;
  }

  const saveSignatory = () => {
    if (form.name && form.email) {
      if (editingId) {
        // Atualizar existente
        onChange(signatories.map(s => s.id === editingId ? { ...s, ...form, role: form.role as any } : s));
        setEditingId(null);
      } else {
        // Adicionar novo
        const newSignatory: Signatory = {
          ...form,
          id: Date.now().toString(),
          role: form.role as any,
          signingOrder: 0,
        };
        onChange([...signatories, newSignatory]);
      }
      setForm({ name: '', email: '', phoneNumber: '', role: 'buyer_part' });
    }
  };

  const handleEdit = (signer: Signatory) => {
    setEditingId(signer.id);
    setForm({
      name: signer.name,
      email: signer.email,
      phoneNumber: signer.phoneNumber || '',
      role: signer.role
    });
    // Scroll suave para o formulário em mobile
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ name: '', email: '', phoneNumber: '', role: 'buyer_part' });
  };

  const removeSignatory = async (id: string) => {
    onChange(signatories.filter(signer => signer.id !== id));

    if (dealId && id.length > 15) {
      try {
        setRemoveSignerLoading(true);
        await removeSignatoryMutation.mutateAsync({ dealId, signatoryId: id });
        console.log('✅ Signatário removido do banco de dados');
      } catch (error) {
        console.error('❌ Erro ao remover signatário do banco:', error);
      } finally {
        setRemoveSignerLoading(false);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
      {/* Left: Form */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
        <div className="flex items-center gap-2 mb-6 text-primary">
          <Users className="w-5 h-5" />
          <h3 className="font-bold text-lg">{editingId ? 'Editar Signatário' : 'Novo Signatário'}</h3>
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

          <div className="flex flex-col gap-2 mt-2">
            <Button onClick={saveSignatory} disabled={!form.name || !form.email} className="w-full">
              {editingId ? 'Atualizar Signatário' : '+ Adicionar Signatário'}
            </Button>
            {editingId && (
              <Button onClick={cancelEdit} variant="secondary" className="w-full">
                Cancelar Edição
              </Button>
            )}
          </div>
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
            signatories.map(signer =>
              <SignerCard
                key={signer.id}
                signer={signer}
                dealStatus={dealData?.status || 'DRAFT'}
                canRemove={canRemoveSigner()}
                onRemove={removeSignatory}
                onClick={() => handleEdit(signer)}
                isSelected={editingId === signer.id}
                isLoading={removeSignerLoading}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
};
