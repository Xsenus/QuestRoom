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
    const loadCurrentUser = async () => {
      if (!api.isAuthenticated()) {
        setLoading(false);
        return;
      }

      try {
        const profile = await api.getCurrentUser();
        const permissions = Array.isArray(profile.permissions) ? profile.permissions : [];
        setUser({
          email: profile.email,
          role: profile.role,
          permissions,
        });
        localStorage.setItem('user_email', profile.email);
        localStorage.setItem('user_role', profile.role);
        localStorage.setItem('user_permissions', JSON.stringify(permissions));
      } catch {
        api.logout();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadCurrentUser();
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
