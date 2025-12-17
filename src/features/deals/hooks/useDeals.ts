import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dealsService, type CreateDealPayload, type UpdateDealStatusPayload } from '../services/deals.service';
import type { Deal } from '@/types/types';

// Query keys para cache management
export const dealKeys = {
  all: ['deals'] as const,
  lists: () => [...dealKeys.all, 'list'] as const,
  list: (ownerId: string) => [...dealKeys.lists(), ownerId] as const,
  details: () => [...dealKeys.all, 'detail'] as const,
  detail: (id: string) => [...dealKeys.details(), id] as const,
};

/**
 * Hook para listar deals de um owner
 */
export function useDeals(ownerId: string) {
  return useQuery({
    queryKey: dealKeys.list(ownerId),
    queryFn: () => dealsService.listDeals(ownerId),
    staleTime: 5 * 60 * 1000, // 5 minutos - dados considerados frescos
    gcTime: 10 * 60 * 1000, // 10 minutos - tempo de cache
  });
}

/**
 * Hook para buscar um deal específico
 */
export function useDeal(dealId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: dealKeys.detail(dealId),
    queryFn: async () => {
      const deal = await dealsService.getDeal(dealId);
      console.log('📄 Documentos no deal:', deal.documents?.length || 0);
      if (deal.documents && deal.documents.length > 0) {
        deal.documents.forEach(doc => {
          console.log(`  - Doc ${doc.id}: ${doc.originalFilename}, status: ${doc.status}`);
        });
      }
      return deal;
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!dealId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook para criar um novo deal
 */
export function useCreateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateDealPayload) => dealsService.createDeal(payload),
    onSuccess: (newDeal) => {
      // Invalida a lista de deals para forçar re-fetch
      queryClient.invalidateQueries({ queryKey: dealKeys.list(newDeal.ownerId) });
      
      // Adiciona o novo deal ao cache de detalhes
      queryClient.setQueryData(dealKeys.detail(newDeal.id), newDeal);
      
      console.log('✅ Deal criado com sucesso:', newDeal.id);
    },
    onError: (error) => {
      console.error('❌ Erro ao criar deal:', error);
    },
  });
}

/**
 * Hook para atualizar status de um deal
 */
export function useUpdateDealStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dealId, payload }: { dealId: string; payload: UpdateDealStatusPayload }) =>
      dealsService.updateDealStatus(dealId, payload),
    onSuccess: (updatedDeal) => {
      // Atualiza o deal no cache de detalhes
      queryClient.setQueryData(dealKeys.detail(updatedDeal.id), updatedDeal);
      
      // Invalida a lista de deals
      queryClient.invalidateQueries({ queryKey: dealKeys.list(updatedDeal.ownerId) });
      
      console.log('✅ Status do deal atualizado:', updatedDeal.status);
    },
    onError: (error) => {
      console.error('❌ Erro ao atualizar status do deal:', error);
    },
  });
}

/**
 * Hook para adicionar documento ao deal
 */
export function useAddDocumentToDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dealId, documentId }: { dealId: string; documentId: string }) =>
      dealsService.addDocumentToDeal(dealId, documentId),
    onSuccess: (_, { dealId }) => {
      // Invalida o cache do deal específico para re-fetch com documento adicionado
      queryClient.invalidateQueries({ queryKey: dealKeys.detail(dealId) });
      
      console.log('✅ Documento vinculado ao deal');
    },
    onError: (error) => {
      console.error('❌ Erro ao vincular documento ao deal:', error);
    },
  });
}

/**
 * Hook para remover documento do deal
 */
export function useRemoveDocumentFromDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dealId, documentId }: { dealId: string; documentId: string }) =>
      dealsService.removeDocumentFromDeal(dealId, documentId),
    onSuccess: (_, { dealId }) => {
      // Invalida o cache do deal específico
      queryClient.invalidateQueries({ queryKey: dealKeys.detail(dealId) });
      
      console.log('✅ Documento removido do deal');
    },
    onError: (error) => {
      console.error('❌ Erro ao remover documento do deal:', error);
    },
  });
}

/**
 * Hook para deletar um deal
 */
export function useDeleteDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dealId: string) => dealsService.deleteDeal(dealId),
    onSuccess: (_, dealId) => {
      // Remove o deal do cache de detalhes
      queryClient.removeQueries({ queryKey: dealKeys.detail(dealId) });
      
      // Invalida todas as listas de deals
      queryClient.invalidateQueries({ queryKey: dealKeys.lists() });
      
      console.log('✅ Deal deletado');
    },
    onError: (error) => {
      console.error('❌ Erro ao deletar deal:', error);
    },
  });
}

