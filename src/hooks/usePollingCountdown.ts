/**
 * Hook para exibir contador regressivo até o próximo refresh do polling
 */

import { useState, useEffect, useRef } from 'react';

interface UsePollingCountdownOptions {
  pollingInterval: number; // Intervalo de polling em ms
  isPolling: boolean; // Se há polling ativo
}

interface UsePollingCountdownReturn {
  secondsRemaining: number;
  minutesRemaining: number;
  formattedTime: string; // Formato "Xm Ys"
  percentComplete: number; // 0-100 para barra de progresso
}

/**
 * Hook que retorna contador regressivo até o próximo polling
 * 
 * @param pollingInterval Intervalo de polling em milissegundos (ex: 300000 para 5 minutos)
 * @param isPolling Se há arquivos sendo processados (ativa o contador)
 * @returns Informações sobre o tempo restante até próximo refresh
 */
export const usePollingCountdown = (
  pollingInterval: number,
  isPolling: boolean
): UsePollingCountdownReturn => {
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const startTimeRef = useRef<number>(Date.now());
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPolling) {
      // Iniciar ou resetar o tempo de início se não existir ou se estava parado
      if (!intervalIdRef.current) {
        startTimeRef.current = Date.now();
      }
      
      // Atualizar a cada segundo
      intervalIdRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, pollingInterval - elapsed);
        setSecondsRemaining(Math.ceil(remaining / 1000));
        
        // Quando chegar a zero, resetar o contador (próximo ciclo)
        if (remaining <= 0) {
          startTimeRef.current = Date.now();
        }
      }, 1000);
    } else {
      // Parar contador quando não há documentos em processamento
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      // Resetar o tempo para zero quando não há polling
      setSecondsRemaining(0);
    }

    // Cleanup
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [isPolling, pollingInterval]);

  // Calcular minutos e segundos
  const minutesRemaining = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  
  // Formato legível
  const formattedTime = minutesRemaining > 0 
    ? `${minutesRemaining}m ${seconds}s`
    : `${seconds}s`;

  // Percentual completo (para barra de progresso)
  const totalSeconds = pollingInterval / 1000;
  const percentComplete = isPolling 
    ? Math.max(0, Math.min(100, ((totalSeconds - secondsRemaining) / totalSeconds) * 100))
    : 0;

  return {
    secondsRemaining,
    minutesRemaining,
    formattedTime,
    percentComplete,
  };
};

