import { useMutation } from '@tanstack/react-query';
import { server } from '@/services/api.service';

interface ValidateCoupleParams {
  dealId: string;
  coupleId: string;
  titularPersonId: string;
  conjugePersonId: string;
}

interface ApiResponse {
  sucesso: boolean;
  status: 'STARTED' | 'IN_PROGRESS';
  dealId: string;
  coupleId: string;
}

export const useCoupleValidation = () => {
  const validateCouple = useMutation<ApiResponse, Error, ValidateCoupleParams>({
    mutationFn: async (params: ValidateCoupleParams) => {
      // Fire-and-forget: o resultado chega via WebSocket (couple_validation_completed).
      // Mantemos timeout curto para não travar UI em ambientes instáveis.
      const response = await server.api.post<ApiResponse>(
        '/document/validate-couple',
        params,
        { timeout: 5000 },
      );
      return response.data;
    },
  });

  return { validateCouple };
};
