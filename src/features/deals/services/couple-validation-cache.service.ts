import { server } from '@/services/api.service';

export type CoupleValidationCacheStatus =
  | 'COMPLETED'
  | 'PROCESSING'
  | 'ERROR'
  | 'STALE'
  | 'NOT_FOUND';

export interface CoupleValidationCacheResponse {
  success: boolean;
  dealId: string;
  couples: Record<
    string,
    {
      status: CoupleValidationCacheStatus;
      updatedAt?: string;
      result?: any;
      error?: string;
    }
  >;
}

export async function getCoupleValidationCache(
  dealId: string,
): Promise<CoupleValidationCacheResponse> {
  const { data } = await server.api.get<CoupleValidationCacheResponse>(
    `/document/validate-couple/cache/${dealId}`,
  );
  return data;
}

