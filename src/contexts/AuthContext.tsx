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

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (currentSession?.user) {
          setSession(currentSession);
          fetchUser(currentSession);
        }
      } catch (error) {
        console.error('Erro ao inicializar autenticação:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Escutar mudanças de estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_, newSession) => {
        if (newSession?.user) {
          setSession(newSession);
          fetchUser(newSession);
        } else {
          setSession(null);
          setUser(null);
        }

        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUser = async (currentSession: Session | null) => {
    if (!currentSession) return;
    const { data: User }: { data: User } = await server.api.get('/users/me', { withCredentials: true })
    const payload = { ...currentSession.user, ...User }
    setUser(mapSupabaseUserToUser(payload));
  }

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.user) {
      setSession(data.session);
      setUser(mapSupabaseUserToUser(data.user));
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

    if (data.user) {
      setSession(data.session);
      setUser(mapSupabaseUserToUser(data.user));
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Erro ao fazer logout:', error);
    }

    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: !!user && !!session,
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
