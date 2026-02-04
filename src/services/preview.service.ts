import { io, Socket } from 'socket.io-client';
import { supabase } from '../lib/supabase';
import { server } from './api.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3004';
// Mantém o padrão do OCR: trocar o prefixo de API para o namespace do gateway.
const GATEWAY_API_URL = API_URL.replace('api/v1', 'preview');

export type PreviewProgressStep =
  | 'getting_template_variables'
  | 'building_payload'
  | 'llm_sellers'
  | 'llm_buyers'
  | 'apps_script_generate'
  | 'updating_deal'
  | 'done';

export type PreviewJobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'ERROR';

export interface PreviewJobState {
  jobId: string;
  userId: string;
  dealId: string;
  status: PreviewJobStatus;
  step: PreviewProgressStep;
  result?: { edit_url: string; id: string; status_code: number };
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export const previewService = {
  async startJob(dealId: string): Promise<{ jobId: string }> {
    const { data } = await server.api.post<{ jobId: string }>(
      `/deal/${dealId}/preview/jobs`,
      undefined,
      { withCredentials: true },
    );
    return data;
  },

  async getJobStatus(dealId: string, jobId: string): Promise<PreviewJobState> {
    const { data } = await server.api.get<PreviewJobState>(
      `/deal/${dealId}/preview/jobs/${jobId}`,
      { withCredentials: true, timeout: 10000 },
    );
    return data;
  },

  async connectWebSocket(): Promise<Socket | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        console.error('❌ Token de autenticação não disponível para WebSocket');
        return null;
      }

      const socket = io(GATEWAY_API_URL, {
        path: '/socket.io',
        auth: { token: session.access_token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
      });

      socket.on('connect', () => {
        console.log('✅ WebSocket conectado para eventos de preview');
      });

      socket.on('disconnect', (reason) => {
        console.log('⚠️ WebSocket de preview desconectado:', reason);
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Erro ao conectar WebSocket de preview:', error.message);
      });

      return socket;
    } catch (error) {
      console.error('❌ Erro ao conectar WebSocket de preview:', error);
      return null;
    }
  },
};

