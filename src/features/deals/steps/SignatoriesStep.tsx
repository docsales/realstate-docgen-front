
import React, { useState } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Inputs';
import type { Signatory } from '@/types/types';
import { Users, X } from 'lucide-react';

interface SignatoriesStepProps {
    signatories: Signatory[];
    onChange: (s: Signatory[]) => void;
}

export const SignatoriesStep: React.FC<SignatoriesStepProps> = ({ signatories, onChange }) => {
    const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'comprador' });

    const addSignatory = () => {
        if(form.name && form.email) {
            const newSignatory: Signatory = { 
                ...form, 
                id: Date.now().toString(),
                role: form.role as any
            };
            onChange([...signatories, newSignatory]);
            setForm({ name: '', email: '', phone: '', role: 'comprador' });
        }
    };

    const removeSignatory = (id: string) => {
        onChange(signatories.filter(s => s.id !== id));
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
                        onChange={e => setForm({...form, name: e.target.value})} 
                    />
                    <Input 
                        label="Email *" 
                        type="email" 
                        placeholder="Ex: joao@exemplo.com"
                        value={form.email} 
                        onChange={e => setForm({...form, email: e.target.value})} 
                    />
                    <Input 
                        label="Telefone *" 
                        placeholder="Ex: (11) 98765-4321"
                        mask="phone"
                        value={form.phone} 
                        onChange={e => setForm({...form, phone: e.target.value})} 
                    />
                    <div className="flex flex-col gap-1 w-full">
                        <label className="text-sm font-medium text-slate-700">Função *</label>
                        <select 
                            className="border border-slate-600 rounded-lg px-3 py-2 bg-white text-slate-600 focus:ring-2 focus:ring-primary outline-none"
                            value={form.role}
                            onChange={e => setForm({...form, role: e.target.value})}
                        >
                            <option value="comprador">Comprador</option>
                            <option value="vendedor">Vendedor</option>
                            <option value="testemunha">Testemunha</option>
                            <option value="corretor">Corretor</option>
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
                                    className="absolute top-3 right-3 text-slate-300 hover:text-red-500 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="font-bold text-slate-800 text-lg">{s.name}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                        s.role === 'comprador' ? 'bg-blue-100 text-blue-700' :
                                        s.role === 'vendedor' ? 'bg-green-100 text-green-700' :
                                        'bg-slate-100 text-slate-600'
                                    }`}>
                                        {s.role}
                                    </span>
                                </div>
                                <div className="text-slate-500 text-sm space-y-0.5">
                                    <p>{s.email}</p>
                                    <p>{s.phone}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
