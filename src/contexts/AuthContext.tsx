import React, { createContext, useState, useEffect, type ReactNode, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { server } from '@/services/api.service';
import { useQueryClient } from '@tanstack/react-query';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  accountId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isBootstrapping: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapSupabaseUserToUser = (
  supabaseUser: SupabaseUser & {
    name?: string,
  }): User => {
  return {
    id: supabaseUser.id,
    name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'Usuário',
    email: supabaseUser.email || '',
  };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [accountId, setAccountId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('docsales.accountId');
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const sessionRef = useRef<Session | null>(null);
  const accountIdRef = useRef<string | null>(accountId);
  const bootstrapPromiseRef = useRef<Promise<string> | null>(null);
  const queryClient = useQueryClient();

  // Registra provider de sessão para o api.service usar (evita chamadas ao Supabase)
  useEffect(() => {
    server.setSessionProvider(() => {
      const currentSession = sessionRef.current;
      if (!currentSession?.access_token) return null;

      return {
        token: currentSession.access_token,
        expiresAt: currentSession.expires_at ? currentSession.expires_at * 1000 : Date.now() + 60 * 60 * 1000,
      };
    });
  }, []);

  // Registra provider de accountId para o api.service usar (injeta X-Account-Id)
  useEffect(() => {
    server.setAccountIdProvider(() => accountIdRef.current);
  }, []);

  // Registra função para aguardar bootstrap (para o api.service não rejeitar prematuramente)
  useEffect(() => {
    server.setBootstrapWaiter(async () => {
      if (accountIdRef.current) return;

      if (bootstrapPromiseRef.current) {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout aguardando bootstrap')), 10000)
        );

        try {
          await Promise.race([bootstrapPromiseRef.current, timeoutPromise]);
        } catch (error) {
          console.error('[Bootstrap Waiter] ✗ Timeout ou erro:', error);
        }
      } else {
        console.log('[Bootstrap Waiter] ⚠️ Nenhum bootstrap em andamento e accountId ausente');
      }
    });
  }, []);

  useEffect(() => {
    accountIdRef.current = accountId;
  }, [accountId]);

  const bootstrapAccountId = useCallback(async (retries = 3, delay = 1000): Promise<string> => {
    const cached = accountIdRef.current;
    if (cached) return cached;

    if (bootstrapPromiseRef.current) return bootstrapPromiseRef.current;

    const bootstrapPromise = (async () => {
      setIsBootstrapping(true);
      let lastError: Error | null = null;

      try {
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            console.log(`[Bootstrap] Tentativa ${attempt}/${retries} de buscar accountId...`);

            const { data } = await server.api.get<{ accountId: string }>('/auth/bootstrap', {
              withCredentials: true,
            });

            const resolved = data?.accountId;
            if (!resolved) {
              throw new Error('Conta não provisionada (accountId ausente no bootstrap)');
            }

            accountIdRef.current = resolved;

            setAccountId(resolved);
            try {
              localStorage.setItem('docsales.accountId', resolved);
            } catch { }

            return resolved;
          } catch (error: any) {
            lastError = error;
            console.warn(`[Bootstrap] ✗ Tentativa ${attempt}/${retries} falhou:`, error?.response?.status, error?.message);

            if (attempt < retries) {
              await new Promise(resolve => setTimeout(resolve, delay * attempt));
            }
          }
        }

        throw new Error(`Falha ao buscar accountId após ${retries} tentativas: ${lastError?.message || 'Erro desconhecido'}`);
      } finally {
        setIsBootstrapping(false);
        bootstrapPromiseRef.current = null;
      }
    })();

    bootstrapPromiseRef.current = bootstrapPromise;
    return bootstrapPromise;
  }, []);

  const fetchUser = useCallback(async (currentSession: Session | null): Promise<boolean> => {
    if (!currentSession) return false;

    try {
      await bootstrapAccountId();

      const { data: User }: { data: User } = await server.api.get('/users/me', { withCredentials: true })
      const payload = { ...currentSession.user, ...User }
      setUser(mapSupabaseUserToUser(payload));

      return true;
    } catch (error) {
      console.error('[Auth] Erro ao buscar dados do usuário:', error);

      const errorMessage = error instanceof Error ? error.message : String(error);
      const isBootstrapError = errorMessage.includes('accountId') || errorMessage.includes('bootstrap');

      if (isBootstrapError) {
        await supabase.auth.signOut();
        return false;
      }

      if (currentSession?.user) {
        setUser(mapSupabaseUserToUser(currentSession.user));
        return true;
      }

      return false;
    }
  }, [bootstrapAccountId]);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (initialSession) {
          setSession(initialSession);
          sessionRef.current = initialSession;

          const success = await fetchUser(initialSession);

          if (!success && isMounted) {
            console.warn('[Auth] Inicialização falhou, usuário será deslogado');
          }
        }
      } catch (error) {
        console.error('[Auth] Erro na inicialização:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return;

        const currentSession = sessionRef.current;

        const userChanged = currentSession?.user?.id !== newSession?.user?.id;
        const sessionStatusChanged = (!!currentSession !== !!newSession);

        if (!userChanged && !sessionStatusChanged && event !== 'SIGNED_IN') {
          if (newSession) {
            sessionRef.current = newSession;
            setSession(newSession);
          }
          return;
        }

        if (newSession) {
          setSession(newSession);
          sessionRef.current = newSession;
          await fetchUser(newSession);
        } else {
          setSession(null);
          sessionRef.current = null;
          setUser(null);
          setAccountId(null);
          accountIdRef.current = null;
          try {
            localStorage.removeItem('docsales.accountId');
          } catch { }
          server.clearTokenCache();
          queryClient.clear();
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUser, queryClient]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new Error(error.message);
  };

  const register = async (name: string, email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) throw new Error(error.message);
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) console.error('Erro ao fazer logout:', error);
  };

  const isAuthenticated = !!session;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        accountId,
        isAuthenticated,
        isLoading,
        isBootstrapping,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
