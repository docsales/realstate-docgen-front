import React, { createContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { UserSettings } from '@/types/settings.types';
import { server } from '@/services/api.service';
import { useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();

  // Registra provider de sessão para o api.service usar (evita chamadas ao Supabase)
  React.useEffect(() => {
    server.setSessionProvider(() => {
      const currentSession = sessionRef.current;
      if (!currentSession?.access_token) return null;
      
      return {
        token: currentSession.access_token,
        expiresAt: currentSession.expires_at ? currentSession.expires_at * 1000 : Date.now() + 60 * 60 * 1000,
      };
    });
  }, []);

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

    // Função para inicializar o estado
    const initialize = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      
      if (!isMounted) return;

      if (initialSession) {
        setSession(initialSession);
        sessionRef.current = initialSession;
        await fetchUser(initialSession);
      }
      
      setIsLoading(false);
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
          // Só buscamos o user se for uma mudança real de usuário ou entrada
          await fetchUser(newSession);
        } else {
          setSession(null);
          sessionRef.current = null;
          setUser(null);
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

    if (error) {
      throw new Error(error.message);
    }
    // O resto é tratado pelo onAuthStateChange
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

    if (error) {
      throw new Error(error.message);
    }
    // O resto é tratado pelo onAuthStateChange
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Erro ao fazer logout:', error);
    }
    // O resto é tratado pelo onAuthStateChange (limpeza de cache e estado)
  };

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
