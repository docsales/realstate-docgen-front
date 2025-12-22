import axios from 'axios';
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3004';

export class Server {
  readonly tokenPrefix = 'Bearer';
  readonly apiUrl = API_URL;
  api = axios.create({
    baseURL: this.apiUrl,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  constructor() {
    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - adiciona token de autenticação
    this.api.interceptors.request.use(
      async (config) => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.access_token) {
            config.headers.Authorization = `${this.tokenPrefix} ${session.access_token}`;
          }

          // Se for FormData, remove Content-Type para o browser definir automaticamente com boundary
          if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
          }
        } catch (error) {
          console.error('Erro ao obter token de autenticação:', error);
        }
        
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await supabase.auth.signOut();
        }
        return Promise.reject(error);
      }
    );
  }
}

export const server = new Server();
