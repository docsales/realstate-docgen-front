import { useState, useEffect, useRef } from 'react';
import { Webhook, Plus, Copy, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/Button';
import { webhooksService } from '@/services/webhooks.service';
import { useWebhookEventsInfinite } from '../hooks/useWebhooks';
import { useConfigNotification } from '@/hooks/useConfigNotification';
import type { WebhookToken } from '@/types/settings.types';

const API_URL = import.meta.env.VITE_API_URL;

export function WebhooksSection() {
  const { recheck } = useConfigNotification();
  const [tokens, setTokens] = useState<WebhookToken[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [showEvents, setShowEvents] = useState(false);

  // Refs para infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Hook para infinite scroll de eventos
  const {
    data,
    isLoading: isLoadingEvents,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useWebhookEventsInfinite(20);

  const allEvents = data?.pages.flatMap(page => page.data) ?? [];

  useEffect(() => {
    loadTokens();
  }, []);

  // Intersection Observer para infinite scroll
  useEffect(() => {
    if (!showEvents) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, showEvents]);

  const loadTokens = async () => {
    setIsLoadingTokens(true);
    try {
      const tokensData = await webhooksService.getTokens();
      setTokens(tokensData);
    } catch (error) {
      console.error('Erro ao carregar tokens:', error);
    } finally {
      setIsLoadingTokens(false);
    }
  };

  const handleGenerateToken = async () => {
    setIsGenerating(true);
    try {
      const newToken = await webhooksService.generateToken();
      setTokens([...tokens, newToken]);
      recheck(); // Revalidar configurações
    } catch (error) {
      console.error('Erro ao gerar token:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToken = (token: string, tokenId: string) => {
    const webhookUrl = `${API_URL}/webhooks/docsales/${token}`;
    navigator.clipboard.writeText(webhookUrl);
    setCopiedToken(tokenId);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Webhook className="w-5 h-5 text-[#ef0474]" />
        <h2 className="text-xl font-semibold text-slate-800">
          Webhooks
        </h2>
      </div>
      <p className="text-sm text-slate-600 mb-4">
        Configure webhooks para receber notificações de eventos externos (DocSales).
      </p>

      {/* Lista de tokens */}
      <div className="space-y-4">
        {isLoadingTokens ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#ef0474]" />
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
            <Webhook className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-600 text-sm">Nenhum webhook configurado</p>
            <p className="text-slate-500 text-xs mt-1">Clique em "Gerar Novo Webhook" para começar</p>
          </div>
        ) : (
          tokens.map((token) => (
            <div
              key={token.id}
              className="border border-slate-200 rounded-lg p-4 bg-slate-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase">
                        Webhook URL
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${token.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                        }`}>
                        {token.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopyToken(token.token, token.id)}
                      className="cursor-pointer flex items-center gap-2 px-3 py-2 text-sm bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
                      title="Copiar URL"
                    >
                      {copiedToken === token.id ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-green-600">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-white border border-slate-200 rounded px-3 py-2 font-mono text-sm text-slate-700 break-all">
                    {`${API_URL}/webhooks/docsales/${token.token}`}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    <span>Criado: {formatDate(token.createdAt)}</span>
                    {token.lastUsedAt && (
                      <span>Último uso: {formatDate(token.lastUsedAt)}</span>
                    )}
                    <span>Usos: {token.usageCount}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        <Button
          onClick={handleGenerateToken}
          disabled={isGenerating}
          variant="secondary"
          isLoading={isGenerating}
          className="w-full"
        >
          <Plus className="w-4 h-4" />
          {isGenerating ? 'Gerando...' : 'Gerar Novo Webhook'}
        </Button>
      </div>

      {/* Seção de eventos */}
      {tokens.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-200">
          <button
            onClick={() => setShowEvents(!showEvents)}
            className="cursor-pointer flex items-center justify-between w-full text-left"
          >
            <h3 className="text-lg font-semibold text-slate-800">
              Eventos Recebidos
            </h3>
            <span className="text-sm text-[#ef0474]">
              {showEvents ? 'Ocultar' : 'Mostrar'}
            </span>
          </button>

          {showEvents && (
            <div className="mt-4 space-y-3">
              {isLoadingEvents ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#ef0474]" />
                </div>
              ) : allEvents.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-slate-600 text-sm">Nenhum evento recebido ainda</p>
                </div>
              ) : (
                <>
                  <div className="max-h-96 overflow-y-auto space-y-3">
                    {allEvents.map((event) => (
                      <div
                        key={event.id}
                        className="border border-slate-200 rounded-lg p-4 bg-white"
                      >
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <span className="text-xs font-semibold text-slate-500">
                            {event.processedAt && formatDate(event.processedAt)}
                          </span>
                        </div>
                        <div className="bg-slate-50 rounded p-3 font-mono text-xs overflow-x-auto">
                          <pre className="text-slate-700">
                            {JSON.stringify(event.payload, null, 2)}
                          </pre>
                        </div>
                      </div>
                    ))}

                    {/* Loading indicator para infinite scroll */}
                    <div ref={loadMoreRef} className="py-4">
                      {isFetchingNextPage && (
                        <div className="flex items-center justify-center">
                          <span className="loading loading-spinner loading-lg w-5 h-5 text-[#ef0474] mx-auto mb-4"></span>
                          <span className="ml-2 text-sm text-slate-600">Carregando mais eventos...</span>
                        </div>
                      )}
                      {!hasNextPage && allEvents.length > 0 && (
                        <p className="text-center text-sm text-slate-500">
                          Todos os eventos foram carregados
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

