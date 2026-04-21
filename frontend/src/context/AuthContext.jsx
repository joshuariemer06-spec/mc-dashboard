import React, { createContext, useContext, useMemo, useState } from 'react';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [access, setAccess] = useState(localStorage.getItem('access') || '');
  const [refresh, setRefresh] = useState(localStorage.getItem('refresh') || '');
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });

  const api = useMemo(() => ({
    access, refresh, user,
    setSession: ({ access, refresh, user }) => {
      setAccess(access);
      setRefresh(refresh || '');
      setUser(user);
      localStorage.setItem('access', access);
      if (refresh) localStorage.setItem('refresh', refresh);
      localStorage.setItem('user', JSON.stringify(user));
    },
    clear: () => {
      setAccess('');
      setRefresh('');
      setUser(null);
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
      localStorage.removeItem('user');
    }
  }), [access, refresh, user]);

  return <AuthCtx.Provider value={api}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
