import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DealLockedModal } from '../components/DealLockedModal';
import { Button } from '../components/Button';
import { useDeal } from '../features/deals/hooks/useDeals';
import type { DealStatus } from '../types/types';

interface DealEditGuardProps {
  children: React.ReactNode;
}

const EDIT_ALLOWED_STATUS: DealStatus = 'DRAFT';

export const DealEditGuard: React.FC<DealEditGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const dealId = typeof id === 'string' ? id : '';
  const { data: deal, isLoading, isError, error } = useDeal(dealId, { enabled: !!dealId });

  const dealStatus = deal?.status;
  const isLocked = useMemo(() => {
    if (!dealStatus) return false;
    return dealStatus !== EDIT_ALLOWED_STATUS;
  }, [dealStatus]);

  // Persistência: se por algum motivo o modal “sumir” enquanto locked, manda pra home.
  const [modalOpen, setModalOpen] = useState(true);
  useEffect(() => {
    if (isLocked) setModalOpen(true);
  }, [isLocked]);

  // ID inválido: manda pra dashboard (evita chamadas quebradas)
  useEffect(() => {
    if (id === undefined) navigate('/dashboard', { replace: true });
  }, [id, navigate]);

  if (!dealId) {
    // Se não há dealId válido, sai rapidamente pra evitar “tela presa”.
    // (o effect acima já dá replace; aqui só mostramos loading momentâneo)
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg w-12 h-12 text-[#ef0474] mx-auto mb-4"></span>
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg w-12 h-12 text-[#ef0474] mx-auto mb-4"></span>
          <p className="text-slate-600">Carregando dados do contrato...</p>
        </div>
      </div>
    );
  }

  // Tratamento de erro (inclui 404, 500 etc)
  if (isError || !deal) {
    const status = (error as any)?.response?.status;
    const message =
      (error as any)?.response?.data?.message ||
      (error as any)?.response?.data?.erro ||
      (error as any)?.message ||
      'Não foi possível carregar o contrato.';
    const title = status === 404 ? 'Contrato não encontrado' : 'Erro';
    const description =
      status === 404
        ? 'Não foi possível encontrar este contrato. Ele pode ter sido removido ou você não tem acesso.'
        : 'Ocorreu um erro ao carregar este contrato.';

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm max-w-md w-full p-6">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <p className="text-slate-600 mt-2">{description}</p>
          <p className="text-slate-500 mt-2 text-sm">{message}</p>
          <div className="mt-5 flex justify-end">
            <Button
              onClick={() => navigate('/dashboard', { replace: true })}
            >
              Ir para o início
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <DealLockedModal
        isOpen={modalOpen}
        title="Documento em assinatura"
        message="Este documento já foi enviado para assinatura e não pode mais ser editado. Você ainda pode acompanhar o progresso em Detalhes."
        onGoHome={() => navigate('/dashboard', { replace: true })}
        onGoToDetails={() => navigate(`/deals/${dealId}`, { replace: true })}
        onUnexpectedClose={() => {
          setModalOpen(false);
          navigate('/dashboard', { replace: true });
        }}
      />
    );
  }

  return <>{children}</>;
};
