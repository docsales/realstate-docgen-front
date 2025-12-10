import React, { useState } from 'react';
import { Button } from '../../components/Button';
import { Input } from '../../components/Inputs';
import { useAuth } from '../../hooks/useAuth';

const logoSrc = "/images/docsales-logo.png";

export const LoginView: React.FC<{ onNavigateToRegister: () => void }> = ({ onNavigateToRegister }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('corretor@docsales.com');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      console.error("Login failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 border border-slate-100">
        <div className="flex justify-center mb-8">
          <img
            src={logoSrc}
            alt="DocSales Logo"
            className="h-16 object-contain"
          />
        </div>
        <h2 className="text-2xl font-semibold text-center text-slate-800 mb-2">Bem-vindo de volta</h2>
        <p className="text-center text-slate-500 mb-8">Acesse sua conta para gerenciar contratos</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Senha"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" className="btn-md w-full text-lg" isLoading={loading}>Entrar</Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-slate-500">Não tem uma conta? </span>
          <button onClick={onNavigateToRegister} className="cursor-pointer text-primary font-semibold hover:underline">
            Cadastre-se
          </button>
        </div>

        <div className="mt-8 text-center text-xs text-slate-400">
          Versão Prototype 0.1.6
        </div>
      </div>
    </div>
  );
};