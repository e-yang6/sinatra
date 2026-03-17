import React, { createContext, useContext, useEffect, useState } from 'react';

const AUTH_USERS_KEY = 'sinatra.auth.users';
const AUTH_SESSION_KEY = 'sinatra.auth.session';

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

interface StoredAuthUser extends AuthUser {
  password: string;
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

function createAuthError(message: string, status: number): AuthError {
  return {
    message,
    name: 'AuthError',
    status,
  };
}

function readStoredUsers(): StoredAuthUser[] {
  try {
    const raw = localStorage.getItem(AUTH_USERS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[Sinatra] Failed to read local auth users:', error);
    return [];
  }
}

function writeStoredUsers(users: StoredAuthUser[]): void {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function readStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return parsed?.user ? parsed as AuthSession : null;
  } catch (error) {
    console.error('[Sinatra] Failed to read local auth session:', error);
    return null;
  }
}

function writeStoredSession(session: AuthSession | null): void {
  if (!session) {
    localStorage.removeItem(AUTH_SESSION_KEY);
    return;
  }

  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedSession = readStoredSession();
    setSession(storedSession);
    setUser(storedSession?.user ?? null);
    setLoading(false);
  }, []);

  const signUp = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      return { error: createAuthError('Email and password are required.', 400) };
    }

    const users = readStoredUsers();
    if (users.some((storedUser) => storedUser.email === normalizedEmail)) {
      return { error: createAuthError('An account with that email already exists.', 409) };
    }

    const createdUser: StoredAuthUser = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      password,
      created_at: new Date().toISOString(),
    };

    writeStoredUsers([...users, createdUser]);
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const users = readStoredUsers();
    const matchedUser = users.find(
      (storedUser) => storedUser.email === normalizedEmail && storedUser.password === password,
    );

    if (!matchedUser) {
      return { error: createAuthError('Invalid email or password.', 401) };
    }

    const nextSession: AuthSession = {
      user: {
        id: matchedUser.id,
        email: matchedUser.email,
        created_at: matchedUser.created_at,
      },
    };

    writeStoredSession(nextSession);
    setSession(nextSession);
    setUser(nextSession.user);
    return { error: null };
  };

  const signOut = async () => {
    writeStoredSession(null);
    setSession(null);
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    if (!email.trim()) {
      return { error: createAuthError('Enter an email address first.', 400) };
    }

    return { error: createAuthError('Password reset is unavailable in local mode.', 501) };
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
