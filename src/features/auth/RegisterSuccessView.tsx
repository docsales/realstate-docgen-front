import React, { useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';

const logoSrc = "/images/docsales-logo.png";

type RegisterSuccessLocationState = {
  name?: string;
  email?: string;
};

export const RegisterSuccessView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const state = (location.state || {}) as RegisterSuccessLocationState;

  const name = useMemo(() => state.name || user?.name || 'Usuário', [state.name, user?.name]);
  const email = useMemo(() => state.email || user?.email || '', [state.email, user?.email]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 border border-slate-100">
        <div className="flex justify-center mb-6">
          <img
            src={logoSrc}
            alt="DocSales Logo"
            className="h-16 object-contain"
          />
        </div>

        <div className="flex items-center justify-center gap-3 mb-3">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
          <h2 className="text-2xl font-semibold text-center text-slate-800">
            Parabéns! Sua conta foi criada.
          </h2>
        </div>

        <p className="text-center text-slate-500 mb-6">
          Abaixo estão as informações do cadastro. Você pode alterá-las depois em{' '}
          <Link to="/settings" className="text-primary font-semibold hover:underline">Configurações</Link>.
        </p>

        <div className="space-y-4">
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Nome</div>
            <div className="text-slate-800 font-semibold break-words">{name}</div>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Email</div>
            <div className="text-slate-800 font-semibold break-words">{email || '—'}</div>
          </div>
        </div>

        <div className="mt-8">
          <Button
            type="button"
            className="btn-md w-full text-lg"
            onClick={() => navigate('/dashboard')}
          >
            Concluir
          </Button>
        </div>
      </div>
    </div>
  );
};
