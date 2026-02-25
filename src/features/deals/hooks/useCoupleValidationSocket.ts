import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { ocrService } from '@/services/ocr.service';

export type CoupleValidationStartedEvent = { dealId: string; coupleId: string };
export type CoupleValidationCompletedEvent = {
  dealId: string;
  coupleId: string;
  result: any;
};
export type CoupleValidationErrorEvent = {
  dealId: string;
  coupleId: string;
  error: string;
};

let sharedSocket: Socket | null = null;
let sharedSocketPromise: Promise<Socket | null> | null = null;
let consumerCount = 0;

async function getSharedSocket(): Promise<Socket | null> {
  if (sharedSocket?.connected) return sharedSocket;
  if (sharedSocketPromise) return sharedSocketPromise;

  sharedSocketPromise = ocrService.connectWebSocket().then((socket) => {
    sharedSocket = socket;
    sharedSocketPromise = null;
    return socket;
  });

  return sharedSocketPromise;
}

export function useCoupleValidationSocket(handlers: {
  onStarted?: (evt: CoupleValidationStartedEvent) => void;
  onCompleted?: (evt: CoupleValidationCompletedEvent) => void;
  onError?: (evt: CoupleValidationErrorEvent) => void;
}) {
  useEffect(() => {
    let isMounted = true;
    let socket: Socket | null = null;

    consumerCount++;

    const connect = async () => {
      socket = await getSharedSocket();
      if (!socket || !isMounted) return;

      const handleStarted = (evt: CoupleValidationStartedEvent) =>
        handlers.onStarted?.(evt);
      const handleCompleted = (evt: CoupleValidationCompletedEvent) =>
        handlers.onCompleted?.(evt);
      const handleError = (evt: CoupleValidationErrorEvent) =>
        handlers.onError?.(evt);

      socket.on('couple_validation_started', handleStarted);
      socket.on('couple_validation_completed', handleCompleted);
      socket.on('couple_validation_error', handleError);

      return () => {
        socket?.off('couple_validation_started', handleStarted);
        socket?.off('couple_validation_completed', handleCompleted);
        socket?.off('couple_validation_error', handleError);
      };
    };

    let cleanupHandlers: (() => void) | undefined;
    connect().then((cleanup) => {
      cleanupHandlers = cleanup;
    });

    return () => {
      isMounted = false;
      cleanupHandlers?.();

      consumerCount--;
      if (consumerCount <= 0 && sharedSocket) {
        try {
          sharedSocket.disconnect();
        } finally {
          sharedSocket = null;
          sharedSocketPromise = null;
          consumerCount = 0;
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

