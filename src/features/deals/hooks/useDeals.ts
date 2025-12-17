import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { dealsService, type CreateDealPayload, type UpdateDealStatusPayload } from '../services/deals.service';

// Query keys para cache management
export const dealKeys = {
  all: ['deals'] as const,
  lists: () => [...dealKeys.all, 'list'] as const,
  list: (ownerId: string) => [...dealKeys.lists(), ownerId] as const,
  paginated: (ownerId: string) => [...dealKeys.lists(), 'paginated', ownerId] as const,
  details: () => [...dealKeys.all, 'detail'] as const,
  detail: (id: string) => [...dealKeys.details(), id] as const,
};

/**
 * Hook para listar deals de um owner paginados
 */
export function useDealsPaginated(ownerId: string, page: number, limit: number, queryParams?: Record<string, any>) {
  return useQuery({
    queryKey: dealKeys.paginated(ownerId),
    queryFn: () => dealsService.paginateDeals(ownerId, page, limit, queryParams),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook para infinite scroll com paginação de deals
 */
export function useDealsInfinite(
  ownerId: string, 
  searchTerm?: string,
  limit: number = 20
) {
  return useInfiniteQuery({
    queryKey: [...dealKeys.paginated(ownerId), searchTerm, limit],
    queryFn: ({ pageParam = 0 }) => 
      dealsService.paginateDeals(ownerId, pageParam, limit, { searchTerm }),
    getNextPageParam: (lastPage) => lastPage.next,
    initialPageParam: 0,
    enabled: true,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook para listar deals de um owner
 */
export function useDeals(ownerId: string) {
  return useQuery({
    queryKey: dealKeys.list(ownerId),
    queryFn: () => dealsService.listDeals(ownerId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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
      // Invalida todas as queries de lista (incluindo paginadas com diferentes searchTerms)
      queryClient.invalidateQueries({ queryKey: dealKeys.lists() });
      queryClient.setQueryData(dealKeys.detail(newDeal.id), newDeal);
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
      queryClient.setQueryData(dealKeys.detail(updatedDeal.id), updatedDeal);
      // Invalida todas as queries de lista (incluindo paginadas)
      queryClient.invalidateQueries({ queryKey: dealKeys.lists() });
    },
    onError: (error) => {
      console.error('❌ Erro ao atualizar status do deal:', error.message);
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
      queryClient.invalidateQueries({ queryKey: dealKeys.detail(dealId) });
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
      queryClient.invalidateQueries({ queryKey: dealKeys.detail(dealId) });
    },
    onError: (error) => {
      console.error('❌ Erro ao remover documento do deal:', error.message);
    },
  });
}

