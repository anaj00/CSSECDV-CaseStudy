'use client';

import { SessionProvider, useSession } from "next-auth/react";
import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext({});

function AuthProviderInner({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const { data: session, status } = useSession();

  const checkAuthStatus = async () => {
    try {
      // First check NextAuth session
      if (session?.user) {
        setUser({
          id: session.user.id,
          username: session.user.username,
          email: session.user.email,
          role: session.user.role
        });
        setLoading(false);
        return;
      }

      // If no NextAuth session, check our custom auth
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'loading') {
      setLoading(true);
      return;
    }
    
    checkAuthStatus();
    
    // Check auth status on focus (tab switching)
    const handleFocus = () => {
      if (!document.hidden) {
        checkAuthStatus();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [session, status]);

  const login = (userData) => {
    setUser(userData);
  };

  const logout = async () => {
    setLoggingOut(true);
    try {
      // If using NextAuth session, sign out via NextAuth
      if (session?.user) {
        const { signOut } = await import('next-auth/react');
        await signOut({ redirect: false });
      } else {
        // Otherwise use our custom logout
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include'
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
    setLoggingOut(false);
    
    // Redirect to home page after logout
    window.location.href = '/';
  };

  const value = {
    user,
    loading,
    loggingOut,
    login,
    logout,
    refresh: checkAuthStatus,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default function AuthProvider({ children }) {
  return (
    <SessionProvider>
      <AuthProviderInner>
        {children}
      </AuthProviderInner>
    </SessionProvider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
