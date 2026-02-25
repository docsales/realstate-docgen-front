import React, { useState } from 'react';
import { Button } from '../../components/Button';
import { Input } from '../../components/Inputs';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const logoSrc = "/images/docsales-logo.png";

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      console.error("Login failed", err);
      setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
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

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <Button type="submit" className="btn-md w-full text-lg" isLoading={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        {/* TODO: Validar novo sistema de cadastro de conta e usuário */}
        <div className="mt-6 text-center text-sm flex justify-center items-center gap-2">
          <span className="text-slate-500">Não tem uma conta? </span>
          <Button variant="link" onClick={() => navigate('/register')} className="m-0 p-0 text-primary font-semibold hover:underline">
            Cadastre-se
          </Button>
        </div>
      </div>
    </div>
  );
};