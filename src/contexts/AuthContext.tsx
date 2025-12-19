import React, { createContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { UserSettings } from '@/types/settings.types';
import { server } from '@/services/api.service';

export interface User {
  id: string;
  name: string;
  email: string;
  docsalesApiKey?: string;
  folderId?: string;
  docsalesAccountId?: string;
  settings?: UserSettings;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapSupabaseUserToUser = (
  supabaseUser: SupabaseUser & {
    docsalesApiKey?: string,
    folderId?: string,
    docsalesAccountId?: string,
  }): User => {
  return {
    id: supabaseUser.id,
    name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'Usuário',
    email: supabaseUser.email || '',
    docsalesApiKey: supabaseUser.docsalesApiKey || '',
    folderId: supabaseUser.folderId || '',
    docsalesAccountId: supabaseUser.docsalesAccountId || '',
  };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const sessionRef = React.useRef<Session | null>(null);

  const fetchUser = React.useCallback(async (currentSession: Session | null) => {
    if (!currentSession) return;
    try {
      const { data: User }: { data: User } = await server.api.get('/users/me', { withCredentials: true })
      const payload = { ...currentSession.user, ...User }
      setUser(mapSupabaseUserToUser(payload));
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      // Mesmo com erro, mantém a sessão se ela existir
      if (currentSession?.user) {
        setUser(mapSupabaseUserToUser(currentSession.user));
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initializedRef = { current: false };

    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (isMounted) {
          if (currentSession?.user) {
            setSession(currentSession);
            sessionRef.current = currentSession;
            await fetchUser(currentSession);
          } else {
            setSession(null);
            sessionRef.current = null;
          }
          initializedRef.current = true;
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Erro ao inicializar autenticação:', error);
        if (isMounted) {
          initializedRef.current = true;
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Escutar mudanças de estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        // Ignora eventos durante a inicialização
        if (!initializedRef.current) return;

        // Ignora eventos que não são mudanças significativas
        if (event === 'INITIAL_SESSION') return;

        // Evita processar se a sessão não mudou realmente
        const currentSession = sessionRef.current;
        const sessionChanged = 
          (currentSession?.access_token !== newSession?.access_token) ||
          (currentSession === null && newSession !== null) ||
          (currentSession !== null && newSession === null);

        // Só processa se realmente mudou ou é um evento importante
        if (!sessionChanged && 
            event !== 'SIGNED_OUT' && 
            event !== 'SIGNED_IN' && 
            event !== 'TOKEN_REFRESHED') {
          return;
        }

        if (isMounted) {
          try {
            if (newSession?.user) {
              setSession(newSession);
              sessionRef.current = newSession;
              await fetchUser(newSession);
            } else {
              setSession(null);
              sessionRef.current = null;
              setUser(null);
            }
          } catch (error) {
            console.error('Erro ao atualizar autenticação:', error);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.user && data.session) {
      setSession(data.session);
      sessionRef.current = data.session;
      await fetchUser(data.session);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.user && data.session) {
      setSession(data.session);
      sessionRef.current = data.session;
      await fetchUser(data.session);
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Erro ao fazer logout:', error);
    }

    setSession(null);
    sessionRef.current = null;
    setUser(null);
  };

  // isAuthenticated deve considerar a sessão como suficiente
  // O user pode ainda estar carregando, mas se tem sessão válida, está autenticado
  // Isso evita redirecionamentos desnecessários durante o carregamento do user
  const isAuthenticated = !!session;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
