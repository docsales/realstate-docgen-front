import React, { useState } from 'react';
import { Button } from '../../components/Button';
import { Input } from '../../components/Inputs';
import { useAuth } from '../../hooks/useAuth';

const logoSrc = "/images/docsales-logo.png";

export const RegisterView: React.FC<{ onNavigateToLogin: () => void }> = ({ onNavigateToLogin }) => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.password) {
        setError('Preencha todos os campos obrigatórios.');
        return;
    }

    if (formData.password !== formData.confirmPassword) {
        setError('As senhas não coincidem.');
        return;
    }

    setLoading(true);
    try {
        await register(formData.name, formData.email, formData.password);
    } catch (err) {
        setError('Erro ao criar conta. Tente novamente.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 border border-slate-100">
        <div className="flex justify-center mb-6">
            <img 
              src={logoSrc} 
              alt="DocSales Logo" 
              className="h-16 object-contain"
            />
        </div>
        
        <h2 className="text-2xl font-semibold text-center text-slate-800 mb-2">Crie sua conta</h2>
        <p className="text-center text-slate-500 mb-6">Comece a gerar contratos inteligentes hoje mesmo.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Nome Completo" 
            placeholder="Ex: João da Silva" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
          <Input 
            label="Email" 
            type="email" 
            placeholder="seu@email.com" 
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
          <Input 
            label="Senha" 
            type="password" 
            placeholder="••••••••" 
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
          />
          <Input 
            label="Confirmar Senha" 
            type="password" 
            placeholder="••••••••" 
            value={formData.confirmPassword}
            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
          />

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <Button type="submit" className="btn-md w-full text-lg" isLoading={loading}>
            Criar Conta
          </Button>
        </form>
        
        <div className="mt-6 text-center text-sm">
          <span className="text-slate-500">Já tem uma conta? </span>
          <button onClick={onNavigateToLogin} className="cursor-pointer text-primary font-semibold hover:underline">
            Faça Login
          </button>
        </div>
      </div>
    </div>
  );
};