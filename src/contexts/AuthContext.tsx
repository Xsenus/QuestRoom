import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../lib/api';

interface User {
  email: string;
  role: string;
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: () => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const email = localStorage.getItem('user_email');
    const role = localStorage.getItem('user_role');
    const permissionsRaw = localStorage.getItem('user_permissions');
    let permissions: string[] = [];
    if (permissionsRaw) {
      try {
        const parsed = JSON.parse(permissionsRaw);
        permissions = Array.isArray(parsed) ? parsed : [];
      } catch {
        permissions = [];
      }
    }
    const expiresAt = Number(localStorage.getItem('auth_expires_at'));

    const isExpired = Number.isFinite(expiresAt) && Date.now() > expiresAt;

    if (isExpired) {
      api.logout();
      setLoading(false);
      return;
    }

    if (token && email && role) {
      setUser({ email, role, permissions: Array.isArray(permissions) ? permissions : [] });
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const data = await api.login(email, password);
      setUser({
        email: data.email,
        role: data.role,
        permissions: Array.isArray(data.permissions) ? data.permissions : [],
      });
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    api.logout();
    setUser(null);
  };

  const isAdmin = () => {
    return user?.role === 'admin' || user?.role === 'Администратор';
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (isAdmin()) return true;
    return user.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: string[]) => {
    if (!user) return false;
    if (isAdmin()) return true;
    return permissions.some((permission) => user.permissions.includes(permission));
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signOut, isAdmin, hasPermission, hasAnyPermission }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
