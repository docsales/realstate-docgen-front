import axios from 'axios';
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3004';

export class Server {
  readonly tokenPrefix = 'Bearer';
  readonly apiUrl = API_URL;

  // Cache de token para evitar chamadas desnecessárias ao Supabase
  private tokenCache: {
    token: string | null;
    expiresAt: number;
  } = { token: null, expiresAt: 0 };

  // Promise para evitar múltiplas chamadas simultâneas de refresh
  private refreshingToken: Promise<string | null> | null = null;

  // Contador de chamadas para debug (remover em produção)
  private getSessionCallCount = 0;
  private lastLogTime = Date.now();

  // Callback para obter sessão do AuthContext (evita chamar Supabase desnecessariamente)
  private getSessionFromContext: (() => { token: string; expiresAt: number } | null) | null = null;

  api = axios.create({
    baseURL: this.apiUrl,
    timeout: 30000, // 30 segundos
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  constructor() {
    this.setupInterceptors();
    // Log periódico a cada 30 segundos
    setInterval(() => {
      const elapsed = (Date.now() - this.lastLogTime) / 1000;
      if (this.getSessionCallCount > 0) {
        console.warn(
          `⚠️ [Auth Monitor] ${this.getSessionCallCount} chamadas ao Supabase nos últimos ${elapsed.toFixed(0)}s (${(this.getSessionCallCount / elapsed * 60).toFixed(1)}/min)`
        );
      }
      this.getSessionCallCount = 0;
      this.lastLogTime = Date.now();
    }, 30000);
  }

  /**
   * Registra callback para obter sessão do AuthContext
   */
  public setSessionProvider(provider: () => { token: string; expiresAt: number } | null) {
    this.getSessionFromContext = provider;
  }

  /**
   * Obtém um token válido, usando cache quando possível
   */
  private async getValidToken(): Promise<string | null> {
    const now = Date.now();

    // 1. Tenta obter do AuthContext primeiro (evita chamada ao Supabase)
    if (this.getSessionFromContext) {
      const contextSession = this.getSessionFromContext();
      if (contextSession && contextSession.expiresAt > now + 5 * 60 * 1000) {
        // Atualiza cache local
        this.tokenCache = {
          token: contextSession.token,
          expiresAt: contextSession.expiresAt,
        };
        return contextSession.token;
      }
    }

    // 2. Se token está em cache e ainda válido (com margem de 5 min)
    if (this.tokenCache.token && this.tokenCache.expiresAt > now + 5 * 60 * 1000) {
      return this.tokenCache.token;
    }

    // 3. Se já está refreshing, aguarda
    if (this.refreshingToken) {
      return this.refreshingToken;
    }

    // 4. Última opção: busca do Supabase
    this.refreshingToken = this.refreshToken();
    const token = await this.refreshingToken;
    this.refreshingToken = null;

    return token;
  }

  /**
   * Busca token do Supabase e atualiza cache
   */
  private async refreshToken(): Promise<string | null> {
    try {
      this.getSessionCallCount++;
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token) {
        this.tokenCache = {
          token: session.access_token,
          expiresAt: session.expires_at ? session.expires_at * 1000 : Date.now() + 60 * 60 * 1000,
        };
        return session.access_token;
      }

      return null;
    } catch (error) {
      console.error('Erro ao obter token:', error);
      return null;
    }
  }

  /**
   * Limpa cache de token (chamar no logout)
   */
  public clearTokenCache() {
    this.tokenCache = { token: null, expiresAt: 0 };
    this.refreshingToken = null;
  }

  private setupInterceptors() {
    // Request interceptor - adiciona token de autenticação
    this.api.interceptors.request.use(
      async (config) => {
        try {
          const token = await this.getValidToken();

          if (token) {
            config.headers.Authorization = `${this.tokenPrefix} ${token}`;
          } else {
            console.warn('Token não disponível para requisição');
          }

          // Se for FormData, remove Content-Type para o browser definir automaticamente com boundary
          if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
          }
        } catch (error) {
          console.error('Erro crítico ao obter token:', error);
          // Rejeita a requisição se não conseguir token
          return Promise.reject(new Error('Falha na autenticação'));
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - trata erros e refresh de token
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            this.tokenCache = { token: null, expiresAt: 0 };
            this.getSessionCallCount++;
            const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();

            if (refreshError || !session) {
              throw new Error('Não foi possível renovar a sessão');
            }

            // Atualiza cache
            this.tokenCache = {
              token: session.access_token,
              expiresAt: session.expires_at ? session.expires_at * 1000 : Date.now() + 60 * 60 * 1000,
            };

            // Refaz requisição com novo token
            originalRequest.headers.Authorization = `${this.tokenPrefix} ${session.access_token}`;
            return this.api(originalRequest);

          } catch (refreshError) {
            // Se refresh falhar, faz logout
            console.error('Falha ao renovar sessão, fazendo logout:', refreshError);
            await supabase.auth.signOut();
            this.clearTokenCache();
            return Promise.reject(error);
          }
        }

        // Log de erros de rede
        if (!error.response) {
          console.error('Erro de rede ou timeout:', error.message);
        }

        return Promise.reject(error);
      }
    );
  }
}

export const server = new Server();
