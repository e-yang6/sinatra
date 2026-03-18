import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, AuthError as SupabaseAuthError, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
}

export interface AuthSession {
  user: AuthUser;
}

export interface AuthError {
  message: string;
  name: string;
  status: number;
}

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toAuthUser(user: User | null): AuthUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? '',
    created_at: user.created_at,
  };
}

function toAuthError(error: SupabaseAuthError | null): AuthError | null {
  if (!error) return null;
  return {
    message: error.message,
    name: error.name ?? 'AuthError',
    status: error.status ?? 400,
  };
}

function toAuthSession(session: Session | null): AuthSession | null {
  if (!session?.user) return null;
  return {
    user: toAuthUser(session.user)!,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (error) {
          console.error('[Sinatra] Supabase getSession error:', error);
          setUser(null);
          setSession(null);
        } else {
          const authSession = toAuthSession(data.session);
          setSession(authSession);
          setUser(authSession?.user ?? null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      const authSession = toAuthSession(newSession);
      setSession(authSession);
      setUser(authSession?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      return {
        error: {
          message: 'Email and password are required.',
          name: 'AuthError',
          status: 400,
        },
      };
    }

    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    });

    return { error: toAuthError(error) };
  };

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      return {
        error: {
          message: 'Email and password are required.',
          name: 'AuthError',
          status: 400,
        },
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      return { error: toAuthError(error) };
    }

    const authSession = toAuthSession(data.session);
    setSession(authSession);
    setUser(authSession?.user ?? null);
    return { error: null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[Sinatra] Supabase signOut error:', error);
    }
    setSession(null);
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return {
        error: {
          message: 'Enter an email address first.',
          name: 'AuthError',
          status: 400,
        },
      };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);
    return { error: toAuthError(error) };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

